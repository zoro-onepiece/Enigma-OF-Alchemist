/**
 * worldCollision
 *
 * Minimal, allocation-free AABB collision so solid world objects (trees,
 * the temple, etc.) actually block the player instead of letting her walk
 * through them. There's still no physics engine — this is a small shared
 * registry of axis-aligned rectangular "blockers" in world X/Z space, each
 * with an `isSolid()` check (so an object could flip from solid to passable
 * without re-registering, e.g. a future door). Player.tsx queries
 * `resolveMove` once per frame to slide movement along obstacles instead of
 * clipping through them.
 */
// How much bigger the island is than the original 90-unit ground plane.
// Single source of truth for GameEnvironment.tsx's ground/prop layout and
// this file's circular playable boundary, so they can never drift apart.
export const ISLAND_SCALE = 2.75;
export const GROUND_SIZE = 90 * ISLAND_SCALE; // 247.5

// Circular playable boundary, a few units inside the literal ground edge so
// the player never visually clips past the mesh before being stopped.
export const BOUNDARY_RADIUS = GROUND_SIZE / 2 - 3;

export interface WallBlocker {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  isSolid: () => boolean;
}

const blockers: WallBlocker[] = [];

export function registerBlocker(blocker: WallBlocker): () => void {
  blockers.push(blocker);
  return () => {
    const i = blockers.indexOf(blocker);
    if (i !== -1) blockers.splice(i, 1);
  };
}

// Rough capsule radius for the player against walls — doesn't need to be
// exact, just enough that she doesn't visually clip into a wall face.
const PLAYER_RADIUS = 0.35;

function collidesAt(x: number, z: number): boolean {
  for (const b of blockers) {
    if (!b.isSolid()) continue;
    if (
      x + PLAYER_RADIUS > b.minX &&
      x - PLAYER_RADIUS < b.maxX &&
      z + PLAYER_RADIUS > b.minZ &&
      z - PLAYER_RADIUS < b.maxZ
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Attempts to move from (x, z) by (dx, dz). Each axis is resolved
 * independently so the player slides along a wall instead of stopping dead
 * when moving diagonally into it.
 */
export function resolveMove(
  x: number,
  z: number,
  dx: number,
  dz: number,
): { x: number; z: number } {
  let nx = x;
  let nz = z;
  if (dx !== 0) {
    const tryX = x + dx;
    if (!collidesAt(tryX, z)) nx = tryX;
  }
  if (dz !== 0) {
    const tryZ = z + dz;
    if (!collidesAt(nx, tryZ)) nz = tryZ;
  }
  return { x: nx, z: nz };
}

/**
 * Clamps (x, z) to within the circular playable boundary so the character
 * can't walk off the edge of the island. No-op while inside the radius;
 * otherwise projects back onto the boundary circle along the same
 * direction from the origin.
 */
export function clampToBoundary(x: number, z: number): { x: number; z: number } {
  const dist = Math.hypot(x, z);
  if (dist <= BOUNDARY_RADIUS || dist === 0) return { x, z };
  const scale = BOUNDARY_RADIUS / dist;
  return { x: x * scale, z: z * scale };
}
