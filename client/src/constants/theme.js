// Cyberpunk neon palette — muted/modern variant
// Dịu hơn bản gốc (không còn cyan #00f0ff và hot pink #ff2a6d chói mắt).
// Tone mới: soft sky cyan + electric violet + deep plum background.

export const CYBER = {
  // Backgrounds — deep plum thay vì xanh đen
  bgDeepest: "#0a0614",
  bgDeep:    "#130a24",
  bgMid:     "#1a0f2e",
  bgCard:    "#1e1333",
  bgCardAlt: "#17102a",

  // Neon accents — softer, more sophisticated
  cyan:       "#22d3ee",   // soft sky cyan
  cyanDim:    "#0891b2",
  magenta:    "#a855f7",   // electric violet (thay hot pink)
  magentaDim: "#7c3aed",
  purple:     "#c084fc",
  violet:     "#8b5cf6",
  green:      "#5eead4",   // mint teal
  yellow:     "#fbbf24",

  // Grid / border
  gridLine:   "#1f1442",
  border:     "#2d1b4e",
  borderGlow: "#22d3ee40",

  // Text
  textPrimary:   "#e2e8f0",  // soft off-white
  textSecondary: "#94a3b8",  // slate
  textMuted:     "#64748b",
  textAccent:    "#22d3ee",

  // Danger / error
  danger:   "#f43f5e",       // rose
  dangerBg: "#2a0a14"
};

// Preset background gradient fullpage
export const CYBER_BG = `linear-gradient(135deg, ${CYBER.bgDeepest} 0%, ${CYBER.bgDeep} 45%, ${CYBER.bgMid} 100%)`;

// Glow shadow helper — softer hơn bản cũ (8px/22px thay vì 12px/28px)
export const neonGlow = (color, strength = 1) =>
  `0 0 ${8 * strength}px ${color}60, 0 0 ${22 * strength}px ${color}25`;

// SVG grid pattern — stroke mờ dùng màu violet
export const GRID_PATTERN_URL = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0H0V60' fill='none' stroke='%2322d3ee' stroke-width='.4' stroke-opacity='.18'/%3E%3C/svg%3E")`;
