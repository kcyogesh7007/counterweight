// weightStyle.ts — the look of a weight piece in HTML (tray + dragged piece).
// It copies the glossy balls on the mobile: a bright colour that is lighter
// at the top-left and darker at the bottom-right (a round look), with a crisp
// curved shine. The rim and shadow are added in CSS (WeightTray.css).

export function weightBackground(weight: number): string {
  return [
    // the small bright shine
    'radial-gradient(ellipse 34% 18% at 36% 22%, rgb(255 255 255 / 0.85), rgb(255 255 255 / 0) 100%)',
    // light top-left, shade bottom-right
    'radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.3) 0%, rgb(255 255 255 / 0) 45%, rgb(0 0 0 / 0.36) 100%)',
    // the colour
    `var(--weight-${weight})`,
  ].join(', ')
}
