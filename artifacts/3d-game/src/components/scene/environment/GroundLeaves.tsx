import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";

/**
 * GroundLeaves
 *
 * Separate, standalone ground-litter system — NOT related to SprintLeaves
 * (the character's sprint fx). Scatters ~100,000 low_poly_leaves.glb leaves
 * flat across the walkable ground, GPU-instanced.
 *
 * "Lying flat" orientation was measured, not guessed: both leaf shapes'
 * local Z axis is their smallest bounding-box dimension (~1.6 vs ~2.2-2.7 on
 * X/Y — checked directly against the GLB's geometry bounds), so rotating
 * the model's local Y (its long axis) onto the horizontal plane naturally
 * leaves Z as the thin vertical axis, which reads as a flat leaf resting on
 * the ground rather than standing on edge.
 *
 * ── Performance pass: spatial-chunk frustum culling ─────────────────────
 * Previously this was 2 InstancedMeshes total (one per leaf shape, all
 * ~97,910 instances each), both with frustumCulled={false} — every leaf
 * submitted to the GPU every frame regardless of camera direction, for the
 * same reason GrassField.tsx's old single-mesh version had to disable it:
 * one InstancedMesh's bounding sphere covers the WHOLE placement set, so
 * any camera angle that sees even one leaf means nothing can be culled.
 *
 * Splitting each shape's placements into a 4x4 spatial grid (16 chunks,
 * computed from the actual placement bounding box — no dependency on
 * GameEnvironment's world-size constants) gives each chunk its own
 * InstancedMesh with its own bounding sphere, so plain frustumCulled=true
 * (three.js's default — confirmed via source in an earlier pass that
 * InstancedMesh auto-computes an instance-aware bounding sphere the first
 * time the frustum check runs) correctly skips chunks outside the camera's
 * view. 2 shapes x up to 16 chunks = up to 32 draw calls (fewer in
 * practice — see the mount-time count below) — more draw calls than the
 * old 2, but each one is skippable; the old 2 never were.
 *
 * ── Player-proximity "blow away" reaction ─────────────────────────────
 * Unchanged in spirit from the pre-chunking version, just re-scoped per
 * chunk: each chunk keeps its own fine-grained spatial-hash bucket index
 * (BUCKET_SIZE=2, independent of and much finer than the 4x4 culling
 * grid) so the proximity scan still only ever touches a handful of
 * candidates, never iterates all placements.
 */
const MODEL_PATH = "/models/low_poly_leaves.glb";
const LEAF_NODE_NAMES = ["Object_2", "Object_3"];

// Raw local Y-extent of Object_2 (measured from the GLB's accessor bounds —
// same reference value SprintLeaves.tsx uses for this asset), used as the
// common baseline both leaf shapes are scaled against.
const RAW_LEAF_SIZE = 2.69;
// Ground litter reads at greater average camera distance than the
// character-hugging sprint leaves (TARGET_LEAF_SIZE 0.09 there), so a
// slightly larger target keeps individual leaves visible across the lawn.
const TARGET_LEAF_SIZE = 0.13;
const LEAF_SCALE = TARGET_LEAF_SIZE / RAW_LEAF_SIZE;

const BUCKET_SIZE = 2; // world units per disturbance spatial-hash cell
const BLOW_RADIUS = 1.8;
const BLOW_RADIUS_SQ = BLOW_RADIUS * BLOW_RADIUS;
const DISTURB_DURATION = 0.6; // seconds: kick away, then settle back
const MAX_CONCURRENT_DISTURBED = 200;

const CHUNK_GRID = 4; // 4x4 = 16 spatial chunks for frustum culling

export interface GroundLeafPlacement {
  position: [number, number, number];
  rotationY: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  shapeIndex: number;
}

export interface GroundLeavesProps {
  placements: GroundLeafPlacement[];
}

interface DisturbedEntry {
  startTime: number;
  dirX: number;
  dirZ: number;
}

interface RenderGroup {
  key: string;
  shapeIndex: number;
  matrices: THREE.Matrix4[];
  buckets: Map<string, number[]>;
}

export default function GroundLeaves({ placements }: GroundLeavesProps) {
  const { nodes } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const leafSources = useMemo(
    () => LEAF_NODE_NAMES.map((name) => nodes[name]).filter((n): n is THREE.Mesh => !!n),
    [nodes],
  );

  // Split placements into (shapeIndex x 4x4 spatial chunk) groups, each
  // with its own base transforms + fine-grained disturbance bucket index,
  // in one pass.
  const renderGroups = useMemo<RenderGroup[]>(() => {
    if (placements.length === 0) return [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of placements) {
      if (p.position[0] < minX) minX = p.position[0];
      if (p.position[0] > maxX) maxX = p.position[0];
      if (p.position[2] < minZ) minZ = p.position[2];
      if (p.position[2] > maxZ) maxZ = p.position[2];
    }
    const chunkW = Math.max(maxX - minX, 1e-6) / CHUNK_GRID;
    const chunkD = Math.max(maxZ - minZ, 1e-6) / CHUNK_GRID;

    const groupMap = new Map<string, RenderGroup>();

    for (const p of placements) {
      const shapeIndex = p.shapeIndex % LEAF_NODE_NAMES.length;
      let cx = Math.floor((p.position[0] - minX) / chunkW);
      let cz = Math.floor((p.position[2] - minZ) / chunkD);
      if (cx >= CHUNK_GRID) cx = CHUNK_GRID - 1;
      if (cz >= CHUNK_GRID) cz = CHUNK_GRID - 1;
      const key = `${shapeIndex}:${cx},${cz}`;

      let group = groupMap.get(key);
      if (!group) {
        group = { key, shapeIndex, matrices: [], buckets: new Map() };
        groupMap.set(key, group);
      }

      const localIdx = group.matrices.length;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2 + p.tiltX, p.rotationY, p.tiltZ),
        ),
        new THREE.Vector3(LEAF_SCALE * p.scale, LEAF_SCALE * p.scale, LEAF_SCALE * p.scale),
      );
      group.matrices.push(m);

      const bx = Math.floor(p.position[0] / BUCKET_SIZE);
      const bz = Math.floor(p.position[2] / BUCKET_SIZE);
      const bucketKey = `${bx},${bz}`;
      let bucket = group.buckets.get(bucketKey);
      if (!bucket) {
        bucket = [];
        group.buckets.set(bucketKey, bucket);
      }
      bucket.push(localIdx);
    }

    return Array.from(groupMap.values());
  }, [placements]);

  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());
  const disturbedRefs = useRef<Map<string, Map<number, DisturbedEntry>>>(new Map());
  const lastBucketKeyRef = useRef<string | null>(null);
  const animatedMatrixTemp = useRef(new THREE.Matrix4()).current;
  const finishedTemp = useRef<number[]>([]).current;

  useFrame((state) => {
    const px = PLAYER_WORLD_POS.x;
    const pz = PLAYER_WORLD_POS.z;
    const time = state.clock.elapsedTime;

    const centerBX = Math.floor(px / BUCKET_SIZE);
    const centerBZ = Math.floor(pz / BUCKET_SIZE);
    const playerBucketKey = `${centerBX},${centerBZ}`;
    const playerEnteredNewBucket = playerBucketKey !== lastBucketKeyRef.current;
    lastBucketKeyRef.current = playerBucketKey;

    for (const group of renderGroups) {
      const mesh = meshRefs.current.get(group.key);
      if (!mesh) continue;

      let disturbed = disturbedRefs.current.get(group.key);
      if (!disturbed) {
        disturbed = new Map();
        disturbedRefs.current.set(group.key, disturbed);
      }
      let touched = false;

      // Only scan the 3x3 bucket neighborhood around the player's current
      // bucket, and only on the frame the player actually crosses into a
      // new bucket — never the full instance list, never every frame.
      if (playerEnteredNewBucket && disturbed.size < MAX_CONCURRENT_DISTURBED) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const candidates = group.buckets.get(`${centerBX + dx},${centerBZ + dz}`);
            if (!candidates) continue;
            for (const localIdx of candidates) {
              if (disturbed.size >= MAX_CONCURRENT_DISTURBED) break;
              if (disturbed.has(localIdx)) continue;
              const base = group.matrices[localIdx];
              const ddx = base.elements[12] - px;
              const ddz = base.elements[14] - pz;
              if (ddx * ddx + ddz * ddz <= BLOW_RADIUS_SQ) {
                const len = Math.hypot(ddx, ddz) || 1;
                disturbed.set(localIdx, { startTime: time, dirX: ddx / len, dirZ: ddz / len });
              }
            }
          }
        }
      }

      if (disturbed.size > 0) {
        finishedTemp.length = 0;
        disturbed.forEach((entry, localIdx) => {
          const base = group.matrices[localIdx];
          const elapsed = time - entry.startTime;

          if (elapsed >= DISTURB_DURATION) {
            mesh.setMatrixAt(localIdx, base);
            mesh.instanceMatrix.addUpdateRange(localIdx * 16, 16);
            finishedTemp.push(localIdx);
            touched = true;
            return;
          }

          const tNorm = elapsed / DISTURB_DURATION;
          const kick = Math.sin(tNorm * Math.PI) * (1 - tNorm * 0.3);
          animatedMatrixTemp.copy(base);
          animatedMatrixTemp.elements[12] += entry.dirX * kick * 0.35;
          animatedMatrixTemp.elements[13] += kick * 0.18;
          animatedMatrixTemp.elements[14] += entry.dirZ * kick * 0.35;
          mesh.setMatrixAt(localIdx, animatedMatrixTemp);
          mesh.instanceMatrix.addUpdateRange(localIdx * 16, 16);
          touched = true;
        });
        finishedTemp.forEach((idx) => disturbed!.delete(idx));
      }

      if (touched) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  if (leafSources.length === 0 || renderGroups.length === 0) return null;

  return (
    <>
      {renderGroups.map((group) => {
        const source = leafSources[group.shapeIndex % leafSources.length];
        if (!source) return null;
        return (
          <instancedMesh
            key={group.key}
            args={[source.geometry, undefined, group.matrices.length]}
            castShadow={false}
            receiveShadow={false}
            ref={(mesh) => {
              if (!mesh) {
                meshRefs.current.delete(group.key);
                return;
              }
              meshRefs.current.set(group.key, mesh);
              group.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
              mesh.instanceMatrix.needsUpdate = true;
            }}
          >
            <primitive object={source.material} attach="material" />
          </instancedMesh>
        );
      })}
    </>
  );
}

// Deliberately NOT eagerly preloaded — see Player.tsx's identical note.
// Shares low_poly_leaves.glb with SprintLeaves.tsx, so this only adds a
// second consumer of an asset that was already being fetched during
// gameplay, not a new network cost.
