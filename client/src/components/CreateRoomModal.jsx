import { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import GoldBtn from "./ui/GoldBtn";

// Mỗi game có tên gọi "vai trò" khác nhau
function roleLabelFor(gameId) {
  switch (gameId) {
    case "lol":           return "Vị Trí (Lane)";
    case "valorant":      return "Vai Trò Agent";
    case "cs2":           return "Vai Trò";
    case "dota2":         return "Position";
    case "apex":          return "Class Legend";
    case "overwatch2":    return "Role";
    case "rocket-league": return "Vai Trò";
    case "fortnite":      return "Vai Trò";
    case "pubg":          return "Vai Trò";
    case "r6siege":       return "Vai Trò Operator";
    case "cod":           return "Vai Trò";
    default:              return "Vai Trò";
  }
}

function CreateRoomModal({ isOpen, onClose, game, mode, onCreate }) {
  const ranks = game?.ranks || [];
  const roles = game?.roles || [];
  const playStyles = game?.playStyles || [];
  const hasRanks = !!game?.hasRanks && ranks.length > 0;
  const hasRoles = !!game?.hasRoles && roles.length > 0;
  const hasPlayStyles = playStyles.length > 0;

  const [cfg, setCfg] = useState({
    name: "",
    rankMin: "",
    rankMax: "",
    positions: [],
    style: "",
    voiceChat: true,
    note: ""
  });

  // Reset khi đổi game
  useEffect(() => {
    setCfg({
      name: "",
      rankMin: hasRanks ? ranks[0] : "",
      rankMax: hasRanks ? ranks[ranks.length - 1] : "",
      positions: [],
      style: hasPlayStyles ? playStyles[0] : "",
      voiceChat: true,
      note: ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const create = () => {
    const room = {
      name: cfg.name || `Phòng ${Date.now().toString(36).toUpperCase().slice(-4)}`,
      mode: mode.id,
      maxPlayers: mode.players,
      members: [{
        id: "self",
        name: "Bạn (Chủ phòng)",
        rank: cfg.rankMin || "—",
        position: cfg.positions[0] || (roles[0] || "—"),
        style: cfg.style || "—"
      }],
      avgRank: cfg.rankMin || "—",
      status: "looking",
      voiceChat: cfg.voiceChat,
      rankRange: hasRanks ? [cfg.rankMin, cfg.rankMax] : null,
      positionsNeeded: hasRoles ? roles.filter(p => !cfg.positions.includes(p)) : [],
      stylePreference: cfg.style,
      note: cfg.note
    };
    onCreate(room);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tạo Phòng - ${game?.name || ""}`} width={500}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Tên Phòng</label>
        <input
          value={cfg.name}
          onChange={e => set("name", e.target.value)}
          placeholder="Nhập tên phòng..."
          style={inputStyle}
        />
      </div>

      {/* Rank — chỉ hiện nếu game có rank */}
      {hasRanks && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Rank Tối Thiểu" value={cfg.rankMin} onChange={v => set("rankMin", v)} options={ranks} />
          <Field label="Rank Tối Đa"    value={cfg.rankMax} onChange={v => set("rankMax", v)} options={ranks} />
        </div>
      )}

      {/* Roles — chỉ hiện nếu game có role */}
      {hasRoles && (
        <Field
          label={roleLabelFor(game?.id)}
          value={cfg.positions}
          onChange={v => set("positions", v)}
          options={roles}
          multi
        />
      )}

      {/* Play style */}
      {hasPlayStyles && (
        <Field label="Phong Cách Chơi" value={cfg.style} onChange={v => set("style", v)} options={playStyles} />
      )}

      {/* Voice toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, marginTop: 4 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Voice Chat</label>
        <button
          onClick={() => set("voiceChat", !cfg.voiceChat)}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: cfg.voiceChat ? "#22d3ee" : "#2d1b4e",
            border: "none", cursor: "pointer", position: "relative", transition: "background .2s"
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 2, left: cfg.voiceChat ? 22 : 2,
            transition: "left .2s", boxShadow: "0 1px 4px #00000040"
          }} />
        </button>
        <span style={{ fontSize: 11, color: cfg.voiceChat ? "#22d3ee" : "#64748b" }}>
          {cfg.voiceChat ? "Bật" : "Tắt"}
        </span>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Ghi Chú</label>
        <textarea
          value={cfg.note}
          onChange={e => set("note", e.target.value)}
          placeholder="Mô tả thêm yêu cầu..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical", color: "#94a3b8", fontSize: 12 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <GoldBtn variant="secondary" onClick={onClose}>Hủy</GoldBtn>
        <GoldBtn onClick={create}>Tạo Phòng</GoldBtn>
      </div>
    </Modal>
  );
}

const labelStyle = {
  color: "#22d3ee",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  display: "block",
  marginBottom: 6,
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace"
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#0a0614",
  border: "1px solid #2d1b4e",
  borderRadius: 4,
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
  fontFamily: "'Be Vietnam Pro', sans-serif"
};

export default CreateRoomModal;
