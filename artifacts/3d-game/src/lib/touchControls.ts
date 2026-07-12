/**
 * touchControls
 *
 * Mobile joystick/action-button → game-input bridge. Mirrors the
 * PLAYER_WORLD_POS pattern in Player.tsx: a plain mutable module value that
 * one side writes every frame/pointer-event and another side reads inside
 * useFrame, instead of routing through React state (which would re-render
 * on every drag pixel).
 *
 * touchMove.x/z are the SAME -1..1 analog axes as the keyboard's derived
 * strafeInput/forwardInput in Player.tsx (x: right positive, z: forward
 * positive) — Player.tsx adds this vector on top of the keyboard-derived
 * one so both input sources drive the identical movement math.
 */
export const touchMove = { x: 0, z: 0 };

export function setTouchMove(x: number, z: number): void {
  touchMove.x = x;
  touchMove.z = z;
}

export function resetTouchMove(): void {
  touchMove.x = 0;
  touchMove.z = 0;
}

/**
 * Fires the same world-interact action bound to the "E" key (puzzle
 * pedestal / treasure chest proximity prompts both listen for a window
 * "keydown" with key "e") — a synthetic event is the only way to trigger
 * that existing behavior without duplicating or importing into each
 * proximity-trigger component.
 */
export function triggerInteract(): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
}
