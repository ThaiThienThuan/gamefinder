import { useState } from "react";
import { GAMES } from "../constants/games";
import { CYBER, CYBER_BG, GRID_PATTERN_URL, neonGlow } from "../constants/theme";
import HexBorder from "../components/ui/HexBorder";

function GameIcon({ game }) {
  const [failed, setFailed] = useState(false);
  if (game.iconUrl && !failed) {
    return (
      <img
        src={game.iconUrl}
        alt={game.name}
        onError={() => setFailed(true)}
        style={{
          width: 48,
          height: 48,
          objectFit: "contain",
          filter: "drop-shadow(0 2px 6px #00000080)"
        }}
      />
    );
  }
  return <span style={{ fontSize: 38 }}>{game.icon}</span>;
}

export default function GameSelectionPage({ onSelectGame }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={styles.wrapper}>
      {/* Background pattern */}
      <div style={styles.pattern} />
      <div style={styles.glow} />

      <div style={styles.header}>
        <div style={styles.eyebrow}>// SELECT.GAME_ID</div>
        <h1 style={styles.title}>CHỌN GAME</h1>
        <div style={styles.divider} />
        <p style={styles.subtitle}>&gt; Chọn tựa game để kết nối đồng đội</p>
      </div>

      <div style={styles.grid}>
        {GAMES.map((game) => {
          const isHovered = hovered === game.id;
          return (
            <div
              key={game.id}
              onMouseEnter={() => setHovered(game.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectGame(game)}
              style={{
                cursor: "pointer",
                transition: "transform .3s ease",
                transform: isHovered ? "translateY(-6px) scale(1.02)" : "none"
              }}
            >
              <HexBorder glow={isHovered} color={game.accent}>
                <div
                  style={{
                    padding: "28px 22px",
                    textAlign: "center",
                    background: `linear-gradient(160deg, ${game.gradient[0]}18, ${game.gradient[1]}08)`,
                    borderRadius: 4,
                    minHeight: 210,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      margin: "0 auto 14px",
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${game.gradient[0]}22, ${game.gradient[1]}18)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isHovered
                        ? `0 0 32px ${game.accent}60, inset 0 0 14px #00000060`
                        : `0 6px 20px #00000060, inset 0 0 10px #00000060`,
                      transition: "box-shadow .3s",
                      border: `1px solid ${game.accent}40`
                    }}
                  >
                    <GameIcon game={game} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: game.accent,
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        marginBottom: 6,
                        filter: isHovered ? `drop-shadow(0 0 8px ${game.accent}80)` : "none",
                        transition: "filter .3s"
                      }}
                    >
                      {game.name}
                    </div>
                    <div style={{ color: "#5b5a56", fontSize: 11, marginBottom: 10, minHeight: 28, lineHeight: 1.4 }}>
                      {game.desc}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "3px 12px",
                        borderRadius: 12,
                        background: `${game.accent}12`,
                        border: `1px solid ${game.accent}35`,
                        color: game.accent,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.5
                      }}
                    >
                      {game.modes.length} chế độ
                    </div>
                  </div>
                </div>
              </HexBorder>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>[ © 2026 GAMEMATCHING ] // v1.0 // FAN.PROJECT</div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "80px 24px 40px",
    position: "relative",
    background: CYBER_BG,
    fontFamily: "'Inter', sans-serif"
  },
  pattern: {
    position: "absolute",
    inset: 0,
    opacity: 0.35,
    backgroundImage: GRID_PATTERN_URL,
    backgroundSize: "60px 60px",
    pointerEvents: "none",
    maskImage: "radial-gradient(circle at center, black 20%, transparent 80%)"
  },
  glow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: 900,
    height: 900,
    background: `radial-gradient(circle, ${CYBER.magenta}15 0%, ${CYBER.purple}10 30%, transparent 70%)`,
    pointerEvents: "none"
  },
  header: {
    textAlign: "center",
    marginBottom: 50,
    position: "relative",
    zIndex: 1
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 10,
    textTransform: "uppercase",
    color: CYBER.cyan,
    marginBottom: 14,
    fontWeight: 600,
    textShadow: neonGlow(CYBER.cyan, 0.6),
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
  },
  title: {
    fontFamily: "'Be Vietnam Pro', sans-serif",
    fontSize: "clamp(34px,6vw,68px)",
    fontWeight: 900,
    margin: 0,
    lineHeight: 1.1,
    background: `linear-gradient(180deg, #ffffff 0%, ${CYBER.cyan} 50%, ${CYBER.magenta} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: `drop-shadow(0 0 20px ${CYBER.cyan}60) drop-shadow(0 0 40px ${CYBER.magenta}40)`,
    letterSpacing: 4
  },
  divider: {
    width: 300,
    height: 2,
    margin: "20px auto",
    background: `linear-gradient(90deg, transparent, ${CYBER.cyan}, ${CYBER.magenta}, transparent)`,
    boxShadow: neonGlow(CYBER.cyan, 0.5)
  },
  subtitle: {
    color: CYBER.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 18,
    maxWidth: 1200,
    width: "100%",
    position: "relative",
    zIndex: 1
  },
  footer: {
    marginTop: 60,
    color: CYBER.textMuted,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    position: "relative",
    zIndex: 1,
    fontFamily: "'JetBrains Mono', monospace"
  }
};
