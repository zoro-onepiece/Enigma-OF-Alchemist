/**
 * FootstepAudio
 *
 * Non-visual R3F component that plays a soft footstep SFX while the player
 * is walking, WITHOUT touching Player.tsx. It detects movement purely by
 * sampling the distance PLAYER_WORLD_POS travels between frames (that
 * vector is already exported and updated every frame by Player.tsx for
 * other consumers like GlowingPuzzle's proximity check), and fires a
 * footstep sound every ~0.62 world units of ground covered — roughly a
 * walk-cycle cadence. Mount once inside <Canvas>, as a sibling of <Player />.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";
import { playSfx } from "../../../audio/sounds";

const STEP_DISTANCE = 0.62;
const MIN_SPEED_PER_SEC = 0.4; // ignore tiny jitter while idle

export default function FootstepAudio() {
  const lastPos = useRef<THREE.Vector3 | null>(null);
  const distanceAccum = useRef(0);

  useFrame((_, delta) => {
    if (!lastPos.current) {
      lastPos.current = PLAYER_WORLD_POS.clone();
      return;
    }
    const moved = PLAYER_WORLD_POS.distanceTo(lastPos.current);
    lastPos.current.copy(PLAYER_WORLD_POS);

    const speed = delta > 0 ? moved / delta : 0;
    if (speed < MIN_SPEED_PER_SEC) {
      distanceAccum.current = 0;
      return;
    }

    distanceAccum.current += moved;
    if (distanceAccum.current >= STEP_DISTANCE) {
      distanceAccum.current = 0;
      playSfx("footstep", 0.28);
    }
  });

  return null;
}
