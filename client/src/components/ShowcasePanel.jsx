import { GAMES } from "../constants/games";

const NEON = { cyan: "#22d3ee", magenta: "#a855f7", text: "#e2e8f0", sub: "#94a3b8" };

export default function ShowcasePanel() {
  return (
    <div style={wrap}>
      <div style={hero}>
        <div style={tag}>// GAMEMATCHING_v1.0</div>
        <h1 style={title}>Tìm đồng đội cho 12 tựa game</h1>
        <p style={sub}>Lobby realtime · Voice chat HD · Video call · Screen share kèm audio — tất cả trong một chỗ.</p>
      </div>

      <div style={grid}>
        {GAMES.map((g) => (
          <div key={g.id} style={{ ...card, background: `linear-gradient(135deg, ${g.gradient[0]}22, ${g.gradient[1]}22)`, borderColor: `${g.accent}55` }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>
              {g.iconUrl ? (
                <img src={g.iconUrl} alt={g.shortName}
                  style={{ width: 28, height: 28, objectFit: "contain" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : g.icon}
            </div>
            <div style={{ marginTop: 8, color: NEON.text, fontWeight: 700, fontSize: 12 }}>{g.shortName}</div>
            <div style={{ color: NEON.sub, fontSize: 10, marginTop: 2 }}>{g.name}</div>
          </div>
        ))}
      </div>

      <div style={features}>
        <Feature icon="🎤" title="Voice chat HD" desc="48kHz · noise suppression · echo cancellation" />
        <Feature icon="📹" title="Video call" desc="Camera 2K · adaptive bitrate" />
        <Feature icon="🖥️" title="Screen share + audio" desc="4K 60fps · preferCurrentTab · kèm âm thanh tab" />
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div style={fItem}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ color: NEON.text, fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ color: NEON.sub, fontSize: 11 }}>{desc}</div>
      </div>
    </div>
  );
}

const wrap = {
  flex: 1, minWidth: 0, padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28,
  overflowY: "auto", maxHeight: "100vh",
};
const hero = { display: "flex", flexDirection: "column", gap: 10 };
const tag = { color: NEON.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 5, fontWeight: 700 };
const title = {
  color: NEON.text, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 34, fontWeight: 900, margin: 0, lineHeight: 1.15,
  background: `linear-gradient(180deg, #fff, ${NEON.cyan}, ${NEON.magenta})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
};
const sub = { color: NEON.sub, fontSize: 14, margin: 0, lineHeight: 1.55, maxWidth: 560 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 };
const card = {
  padding: "14px 12px", borderRadius: 8, border: "1px solid", display: "flex", flexDirection: "column",
  alignItems: "flex-start", transition: "transform .15s",
};
const features = { display: "flex", flexDirection: "column", gap: 12, marginTop: 8 };
const fItem = {
  display: "flex", gap: 12, alignItems: "center", padding: "12px 14px",
  background: "rgba(34,211,238,.06)", border: "1px solid #22d3ee33", borderRadius: 8,
};
