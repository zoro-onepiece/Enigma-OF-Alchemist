/**
 * MobileControls
 *
 * On-screen joystick (bottom-left) + interact action button (bottom-right)
 * for touch devices. Standalone component — like AudioMuteToggle/
 * FinaleOverlay — mounted alongside GameHUD rather than folded into it.
 *
 * The joystick is a lightweight hand-rolled drag tracker (no nipplejs/
 * react-joystick libraries): pointer-down on the base captures the
 * pointer, pointer-move computes an offset from the base's center clamped
 * to its radius, and that normalized -1..1 vector is written straight into
 * touchControls.touchMove — the SAME value Player.tsx's useFrame adds on
 * top of its keyboard-derived forward/strafe axes, so there is exactly one
 * movement pipeline, not two.
 */
import { useEffect, useRef, useState } from "react";
import { setTouchMove, resetTouchMove, triggerInteract } from "../../lib/touchControls";

const BASE_SIZE = 112; // px
const KNOB_SIZE = 48; // px
const MAX_OFFSET = (BASE_SIZE - KNOB_SIZE) / 2;

export default function MobileControls() {
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    return () => resetTouchMove();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    activePointerId.current = e.pointerId;
    base.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    let dx = clientX - centerRef.current.x;
    let dy = clientY - centerRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_OFFSET) {
      const scale = MAX_OFFSET / dist;
      dx *= scale;
      dy *= scale;
    }
    setKnobOffset({ x: dx, y: dy });
    // Screen-right (+dx) => strafe right; screen-up (-dy) => forward, both
    // matching the same sign convention as keyboard D/right and W/forward.
    setTouchMove(dx / MAX_OFFSET, -dy / MAX_OFFSET);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    resetTouchMove();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[55] select-none">
      {/* ── Joystick base — bottom-left ─────────────────────────────── */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ width: BASE_SIZE, height: BASE_SIZE, touchAction: "none" }}
        className="pointer-events-auto absolute bottom-6 left-6 rounded-full border-2 border-amber-500/50 bg-stone-900/40 backdrop-blur-sm"
      >
        <div
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 -ml-6 -mt-6 rounded-full border border-amber-300/70 bg-amber-500/40 shadow-[0_0_10px_rgba(217,119,6,0.5)] transition-transform duration-75 ease-out"
        />
      </div>

      {/* ── Interact action button — bottom-right ───────────────────── */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          triggerInteract();
        }}
        style={{ touchAction: "none" }}
        className="pointer-events-auto absolute bottom-8 right-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/70 bg-stone-900/50 text-lg font-bold text-amber-200 shadow-[0_0_14px_rgba(217,119,6,0.4)] backdrop-blur-sm active:scale-90 active:bg-amber-500/30"
        aria-label="Interact"
      >
        E
      </button>
    </div>
  );
}
