// weightStyle.ts — the look of a weight disc in HTML (tray + dragged weight).
// A flat colour with a small soft highlight near the top-left, like a
// painted wooden bead. The SVG weights on the mobile copy this look.

export function weightBackground(weight: number): string {
  return `radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.5) 0 12%, rgb(255 255 255 / 0) 13%), var(--weight-${weight})`
}
