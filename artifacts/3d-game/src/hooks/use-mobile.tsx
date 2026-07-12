import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Game-specific mobile-controls gate: touch capability OR narrow viewport,
 * either one is enough (a touch laptop above the breakpoint still gets a
 * mouse/keyboard; a narrow desktop dev-tools viewport with no touch still
 * gets the on-screen joystick so it's testable without a real device).
 */
export function useShowTouchControls() {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    const hasTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const evaluate = () => setShow(hasTouch || window.innerWidth < MOBILE_BREAKPOINT)

    mql.addEventListener("change", evaluate)
    evaluate()
    return () => mql.removeEventListener("change", evaluate)
  }, [])

  return show
}
