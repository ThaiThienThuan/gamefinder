import { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import GoldBtn from "./ui/GoldBtn";
import apiClient from "../lib/apiClient";
import { findGame } from "../constants/games";

const L = ({ children }) => (
  <label style={{ display: "block", color: "#22d3ee", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{children}</label>
);

export default function EditRoomModal({ isOpen, onClose, room, onUpdated }) {
  const game = findGame(room?.game);
  const ranks = game?.ranks || [];
  const roles = game?.roles || [];
  const playStyles = game?.playStyles || [];
  const hasRanks = !!game?.hasRanks && ranks.length > 0;
  const hasRoles = !!game?.hasRoles && roles.length > 0;
  const hasPlayStyles = playStyles.length > 0;

  const [form, setForm] = useState({
    name: "", slots: 5, note: "", voiceChat: true,
    rankMin: "", rankMax: "", positions: [], style: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isOpen || !room) return;
    setForm({
      name: room.name || "",
      slots: room.slots || room.maxPlayers || 5,
      note: room.note || "",
      voiceChat: room.voiceChat !== false,
      rankMin: room.rankMin || room.rankRange?.[0] || (hasRanks ? ranks[0] : ""),
      rankMax: room.rankMax || room.rankRange?.[1] || (hasRanks ? ranks[ranks.length - 1] : ""),
      positions: Array.isArray(room.positions) ? room.positions : [],
      style: room.stylePreference || (hasPlayStyles ? playStyles[0] : ""),
    });
    setErr("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, room]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const togglePos = (p) => set("positions", form.positions.includes(p) ? form.positions.filter(x => x !== p) : [...form.positions, p]);

  const save = async () => {
    if (!form.name.trim()) { setErr("Tên phòng không được trống"); return; }
    setSaving(true); setErr("");
    try {
      const id = room._id || room.id;
      const patch = {
        name: form.name.trim(),
        slots: Number(form.slots) || 5,
        note: form.note,
        voiceChat: !!form.voiceChat,
      };
      if (hasRanks) { patch.rankMin = form.rankMin; patch.rankMax = form.rankMax; }
      if (hasRoles) { patch.positions = form.positions; }
      if (hasPlayStyles) { patch.stylePreference = form.style; }
      const res = await apiClient.patch(`/api/rooms/${id}`, patch);
      onUpdated?.(res.data?.data || res.data);
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh sửa — ${game?.name || "Phòng"}`} width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><L>Tên phòng</L>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} maxLength={60} />
        </div>
        <div><L>Số slot</L>
          <input type="number" min={1} max={16} value={form.slots} onChange={(e) => set("slots", e.target.value)} style={inp} />
        </div>

        {hasRanks && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><L>Rank Tối Thiểu</L>
              <select value={form.rankMin} onChange={(e) => set("rankMin", e.target.value)} style={inp}>
                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><L>Rank Tối Đa</L>
              <select value={form.rankMax} onChange={(e) => set("rankMax", e.target.value)} style={inp}>
                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        )}

        {hasRoles && (
          <div><L>Vị trí cần</L>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {roles.map(r => {
                const sel = form.positions.includes(r);
                return (
                  <button key={r} onClick={() => togglePos(r)} style={{
                    padding: "6px 12px", fontSize: 11, borderRadius: 4,
                    border: sel ? "1px solid #22d3ee" : "1px solid #2d1b4e",
                    background: sel ? "#22d3ee20" : "#0a0614",
                    color: sel ? "#22d3ee" : "#94a3b8", cursor: "pointer", fontWeight: 600,
                  }}>{r}</button>
                );
              })}
            </div>
          </div>
        )}

        {hasPlayStyles && (
          <div><L>Phong cách</L>
            <select value={form.style} onChange={(e) => set("style", e.target.value)} style={inp}>
              {playStyles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#dcddde", fontSize: 13 }}>
          <input type="checkbox" checked={form.voiceChat} onChange={(e) => set("voiceChat", e.target.checked)} />
          Voice chat
        </label>

        <div><L>Ghi chú</L>
          <textarea value={form.note} onChange={(e) => set("note", e.target.value)}
            rows={3} style={{ ...inp, resize: "vertical" }} maxLength={300} />
        </div>

        {err && <div style={{ color: "#f04747", fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <GoldBtn variant="ghost" size="sm" onClick={onClose} disabled={saving}>Hủy</GoldBtn>
          <GoldBtn size="sm" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</GoldBtn>
        </div>
      </div>
    </Modal>
  );
}

const inp = {
  width: "100%", padding: "8px 10px", background: "#0d0d1a", border: "1px solid #2a2a3e",
  borderRadius: 4, color: "#dcddde", fontSize: 13, outline: "none", boxSizing: "border-box",
};
