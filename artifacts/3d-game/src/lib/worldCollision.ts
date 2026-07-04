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
