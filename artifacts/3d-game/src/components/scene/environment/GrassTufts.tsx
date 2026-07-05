import { useMemo } from "react";
import * as THREE from "three";

/**
 * GrassTufts
 *
 * No real grass GLB was provided (the two remaining uploaded packs turned
 * out to be a second tree species set and a potted-flower prop, already
 * used elsewhere), so this fills the bare dirt between the path/temple/
 * trees with lightweight procedural grass clumps instead of leaving it
 * empty. Each tuft is 3 thin, fanned cone "blades" merged into one
 * geometry and drawn via InstancedMesh so hundreds of tufts cost a single
 * draw call — purely decorative, no collision.
 */
export interface GrassTuftsProps {
  placements: {
    position: [number, number, number];
    rotationY: number;
    scale: number;
  }[];
}

function buildTuftGeometry() {
  const blade = new THREE.ConeGeometry(0.05, 0.35, 4, 1);
  blade.translate(0, 0.175, 0);

  const blades: THREE.BufferGeometry[] = [];
  const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  const tilt = 0.35;
  for (const angle of angles) {
    const g = blade.clone();
    g.rotateX(tilt);
    g.rotateY(angle);
    blades.push(g);
  }

  return mergeGeometries(blades);
}

// Minimal manual merge (avoids pulling in BufferGeometryUtils just for
// this) — concatenates position/normal arrays from same-attribute geoms.
function mergeGeometries(geoms: THREE.BufferGeometry[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const g of geoms) {
    const pos = g.getAttribute("position");
    const norm = g.getAttribute("normal");
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return merged;
}

export default function GrassTufts({ placements }: GrassTuftsProps) {
  const geometry = useMemo(() => buildTuftGeometry(), []);

  const instanceData = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const rand = seededRand(9090);

    for (const p of placements) {
      matrix.compose(
        new THREE.Vector3(...p.position),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, p.rotationY, 0)
        ),
        new THREE.Vector3(p.scale, p.scale, p.scale)
      );
      matrices.push(matrix.clone());

      // Subtle green variation so tufts don't look like uniform copies.
      const hue = 0.28 + rand() * 0.06;
      const sat = 0.45 + rand() * 0.2;
      const light = 0.32 + rand() * 0.12;
      colors.push(new THREE.Color().setHSL(hue, sat, light));
    }
    return { matrices, colors };
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      args={[geometry, undefined, placements.length]}
      castShadow
      receiveShadow
      ref={(mesh) => {
        if (!mesh) return;
        instanceData.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        instanceData.colors.forEach((c, i) => mesh.setColorAt(i, c));
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }}
    >
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
