export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Desktop layouts where the heavier scroll scenes run. */
export const desktopMotion = '(min-width: 901px) and (prefers-reduced-motion: no-preference)'
