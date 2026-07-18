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
 * flat across the walkable ground, GPU-instanced (one InstancedMesh per
 * leaf shape = 2 draw calls total, same convention FlowerField uses for its
 * opaque/transparent split).
 *
 * "Lying flat" orientation was measured, not guessed: both leaf shapes'
 * local Z axis is their smallest bounding-box dimension (~1.6 vs ~2.2-2.7 on
 * X/Y — checked directly against the GLB's geometry bounds), so rotating
 * the model's local Y (its long axis) onto the horizontal plane naturally
 * leaves Z as the thin vertical axis, which reads as a flat leaf resting on
 * the ground rather than standing on edge.
 *
 * ── Player-proximity "blow away" reaction, without a 100k-wide scan ──────
 * Placements are bucketed once (at generation time) into a spatial hash
 * keyed by floor(x/BUCKET_SIZE),floor(z/BUCKET_SIZE). Every frame, only the
 * 3x3 bucket neighborhood around the player's *current* bucket is read
 * (a handful of leaves — tens, not 100,000) to find newly-nearby leaves to
 * disturb; the neighborhood re-scan itself only runs on frames where the
 * player has actually crossed into a new bucket, not every single frame.
 * Currently-disturbed leaves (bounded by MAX_CONCURRENT_DISTURBED) animate
 * a quick kick-away-and-settle over DISTURB_DURATION seconds, then their
 * matrix is written back to the exact base (rest) transform.
 *
 * GPU upload cost: instanceMatrix.addUpdateRange() (three r159+, confirmed
 * available and honored by WebGLAttributes in this project's three@0.185.0)
 * marks only the changed instances' 16 floats for re-upload — not the
 * mesh's 100,000-instance buffer — so a typical frame (0-30 leaves
 * disturbed while sprinting past them) uploads a few KB, not the ~6.4MB the
 * full buffer would cost. On fully idle frames (nothing disturbed) the
 * instancedMesh isn't touched at all.
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

const BUCKET_SIZE = 2; // world units per spatial-hash cell
const BLOW_RADIUS = 1.8;
const BLOW_RADIUS_SQ = BLOW_RADIUS * BLOW_RADIUS;
const DISTURB_DURATION = 0.6; // seconds: kick away, then settle back
// Hard cap on simultaneously-animating leaves so a single frame's animation
// work stays bounded even in the worst case (player standing still in an
// unusually leaf-dense bucket cluster).
const MAX_CONCURRENT_DISTURBED = 200;

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

interface ShapeGroup {
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

  // Split placements per leaf shape and build each shape's base transforms
  // + spatial-hash bucket index in one pass.
  const perShape = useMemo<ShapeGroup[]>(() => {
    const groups: ShapeGroup[] = LEAF_NODE_NAMES.map(() => ({
      matrices: [],
      buckets: new Map(),
    }));

    for (const p of placements) {
      const shape = groups[p.shapeIndex % groups.length];
      const localIdx = shape.matrices.length;

      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2 + p.tiltX, p.rotationY, p.tiltZ),
        ),
        new THREE.Vector3(LEAF_SCALE * p.scale, LEAF_SCALE * p.scale, LEAF_SCALE * p.scale),
      );
      shape.matrices.push(m);

      const bx = Math.floor(p.position[0] / BUCKET_SIZE);
      const bz = Math.floor(p.position[2] / BUCKET_SIZE);
      const key = `${bx},${bz}`;
      let bucket = shape.buckets.get(key);
      if (!bucket) {
        bucket = [];
        shape.buckets.set(key, bucket);
      }
      bucket.push(localIdx);
    }

    return groups;
  }, [placements]);

  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const disturbedRefs = useRef<Map<number, DisturbedEntry>[]>(
    LEAF_NODE_NAMES.map(() => new Map()),
  );
  const lastBucketKeyRef = useRef<string | null>(null);

  useFrame((state) => {
    const px = PLAYER_WORLD_POS.x;
    const pz = PLAYER_WORLD_POS.z;
    const time = state.clock.elapsedTime;

    const centerBX = Math.floor(px / BUCKET_SIZE);
    const centerBZ = Math.floor(pz / BUCKET_SIZE);
    const playerBucketKey = `${centerBX},${centerBZ}`;
    const playerEnteredNewBucket = playerBucketKey !== lastBucketKeyRef.current;
    lastBucketKeyRef.current = playerBucketKey;

    perShape.forEach((shape, shapeIdx) => {
      const mesh = meshRefs.current[shapeIdx];
      if (!mesh) return;
      const disturbed = disturbedRefs.current[shapeIdx];
      let touched = false;

      // Only scan the 3x3 bucket neighborhood around the player's current
      // bucket, and only on the frame the player actually crosses into a
      // new bucket — never the full instance list, never every frame.
      if (playerEnteredNewBucket && disturbed.size < MAX_CONCURRENT_DISTURBED) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const candidates = shape.buckets.get(`${centerBX + dx},${centerBZ + dz}`);
            if (!candidates) continue;
            for (const localIdx of candidates) {
              if (disturbed.size >= MAX_CONCURRENT_DISTURBED) break;
              if (disturbed.has(localIdx)) continue;
              const base = shape.matrices[localIdx];
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
        const finished: number[] = [];
        disturbed.forEach((entry, localIdx) => {
          const base = shape.matrices[localIdx];
          const elapsed = time - entry.startTime;

          if (elapsed >= DISTURB_DURATION) {
            mesh.setMatrixAt(localIdx, base);
            mesh.instanceMatrix.addUpdateRange(localIdx * 16, 16);
            finished.push(localIdx);
            touched = true;
            return;
          }

          // Quick kick outward/up, eased back down — reads as a footstep
          // puff of disturbed litter rather than a global wind effect.
          const tNorm = elapsed / DISTURB_DURATION;
          const kick = Math.sin(tNorm * Math.PI) * (1 - tNorm * 0.3);
          const animated = base.clone();
          animated.elements[12] += entry.dirX * kick * 0.35;
          animated.elements[13] += kick * 0.18;
          animated.elements[14] += entry.dirZ * kick * 0.35;
          mesh.setMatrixAt(localIdx, animated);
          mesh.instanceMatrix.addUpdateRange(localIdx * 16, 16);
          touched = true;
        });
        finished.forEach((idx) => disturbed.delete(idx));
      }

      if (touched) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  });

  if (leafSources.length === 0 || placements.length === 0) return null;

  return (
    <>
      {perShape.map((shape, shapeIdx) => {
        const source = leafSources[shapeIdx % leafSources.length];
        if (!source || shape.matrices.length === 0) return null;
        return (
          <instancedMesh
            key={shapeIdx}
            args={[source.geometry, undefined, shape.matrices.length]}
            castShadow={false}
            receiveShadow={false}
            frustumCulled={false}
            ref={(mesh) => {
              meshRefs.current[shapeIdx] = mesh;
              if (!mesh) return;
              shape.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
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
