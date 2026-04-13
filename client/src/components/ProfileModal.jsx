import { useEffect, useState } from "react";
import Modal from "./ui/Modal";
import apiClient from "../lib/apiClient";
import { CYBER } from "../constants/theme";
import { findGame } from "../constants/games";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const resolveAvatar = (a) => !a ? "" : a.startsWith("http") ? a : `${API}${a.startsWith("/") ? "" : "/"}${a}`;

export default function ProfileModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setData(null); setErr("");
    apiClient.get(`/api/users/${userId}`)
      .then((res) => { if (!cancelled) setData(res.data?.data); })
      .catch((e) => { if (!cancelled) setErr(e?.response?.data?.message || e.message); });
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId) return null;
  return (
    <Modal isOpen={!!userId} onClose={onClose} title="Hồ sơ người chơi" width={420}>
      {!data && !err && <div style={{ color: "#888", fontSize: 13 }}>Đang tải…</div>}
      {err && <div style={{ color: "#f04747", fontSize: 13 }}>{err}</div>}
      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `linear-gradient(135deg,${CYBER.cyan}40,#1e2328)`,
              border: `2px solid ${CYBER.cyan}60`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              overflow: "hidden",
            }}>
              {data.avatar
                ? <img src={resolveAvatar(data.avatar)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "👤"}
            </div>
            <div>
              <div style={{ color: CYBER.textPrimary, fontWeight: 700, fontSize: 16 }}>{data.username}</div>
              <div style={{ color: CYBER.cyan, fontSize: 12, marginTop: 2 }}>{data.rank || "Chưa xếp hạng"}</div>
            </div>
          </div>
          {data.bio && <div style={{ color: "#aaa", fontSize: 13, fontStyle: "italic", padding: "6px 0" }}>"{data.bio}"</div>}
          <Row k="Phòng đã tham gia" v={data.roomsJoined ?? 0} />
          <Row k="Tham gia từ" v={data.createdAt ? new Date(data.createdAt).toLocaleDateString("vi-VN") : "—"} />
          {Array.isArray(data.gameProfiles) && data.gameProfiles.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${CYBER.cyan}30` }}>
              <div style={{ color: CYBER.cyan, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Hồ sơ game</div>
              {data.gameProfiles.map((p) => {
                const g = findGame(p.game);
                if (!g || (!p.ign && !p.rank && !p.position)) return null;
                const line = [p.rank, p.position, p.playStyle].filter(Boolean).join(" · ");
                return (
                  <div key={p.game} style={{ padding: "6px 0", display: "flex", gap: 10, alignItems: "baseline", fontSize: 13 }}>
                    <span style={{ color: g.accent, fontWeight: 700, minWidth: 70 }}>{g.shortName}:</span>
                    <span style={{ color: "#dcddde", fontWeight: 600 }}>{p.ign || "—"}</span>
                    {line && <span style={{ color: "#888", fontSize: 12 }}>— {line}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e1e30" }}>
      <span style={{ color: "#888", fontSize: 12 }}>{k}</span>
      <span style={{ color: "#dcddde", fontSize: 13 }}>{v}</span>
    </div>
  );
}
