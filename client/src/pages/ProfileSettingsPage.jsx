import { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import { CYBER, CYBER_BG } from "../constants/theme";
import { GAMES, findGame } from "../constants/games";
import GoldBtn from "../components/ui/GoldBtn";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const resolveAvatar = (a) => {
  if (!a) return "";
  if (a.startsWith("http")) return a;
  return `${API}${a.startsWith("/") ? "" : "/"}${a}`;
};

export default function ProfileSettingsPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ username: "", bio: "", avatar: "", gameProfiles: [] });
  const [riotLoading, setRiotLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/api/users/me");
        const u = res.data?.data;
        setMe(u);
        setForm({
          username: u.username || "",
          bio: u.bio || "",
          avatar: u.avatar || "",
          gameProfiles: Array.isArray(u.gameProfiles) ? u.gameProfiles : [],
        });
      } catch (e) { setErr(e?.response?.data?.message || e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const getProfile = (gameId) =>
    form.gameProfiles.find((p) => p.game === gameId) || { game: gameId, ign: "", rank: "", position: "", playStyle: "" };

  const setProfile = (gameId, patch) => {
    setForm((f) => {
      const exists = f.gameProfiles.some((p) => p.game === gameId);
      const next = exists
        ? f.gameProfiles.map((p) => (p.game === gameId ? { ...p, ...patch } : p))
        : [...f.gameProfiles, { game: gameId, ign: "", rank: "", position: "", playStyle: "", ...patch }];
      return { ...f, gameProfiles: next };
    });
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiClient.post("/api/upload/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const att = res.data?.data;
      if (att?.url) setForm((f) => ({ ...f, avatar: att.url }));
    } catch (e) { setErr(e?.response?.data?.message || e.message); }
  };

  const fetchRiot = async () => {
    const p = getProfile("lol");
    const raw = (p.ign || "").trim();
    if (!raw.includes("#")) { setErr("Riot ID phải có dạng Name#Tag (ví dụ: Faker#KR1)"); return; }
    const [name, tag] = raw.split("#");
    const region = (p.region || "vn").toLowerCase();
    setRiotLoading(true); setErr(""); setMsg("");
    try {
      const res = await apiClient.get("/api/riot/summoner", { params: { name, tag, region } });
      const d = res.data?.data;
      if (d) {
        setProfile("lol", { ign: d.ign, rank: d.rank || p.rank });
        setMsg(`Đã đồng bộ LoL: ${d.ign} — ${d.rank || "Chưa xếp hạng"}`);
      }
    } catch (e) { setErr(e?.response?.data?.message || e.message); }
    finally { setRiotLoading(false); }
  };

  const save = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      const patch = {
        username: form.username.trim(),
        bio: form.bio,
        avatar: form.avatar,
        gameProfiles: form.gameProfiles.filter((p) => p.ign || p.rank || p.position || p.playStyle),
      };
      const res = await apiClient.patch("/api/users/me", patch);
      setMe(res.data?.data);
      setMsg("Đã lưu.");
    } catch (e) { setErr(e?.response?.data?.message || e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, background: CYBER_BG, color: "#888", minHeight: "100vh" }}>Đang tải...</div>;

  const avatarUrl = resolveAvatar(form.avatar);

  return (
    <div style={{ minHeight: "100vh", background: CYBER_BG, color: CYBER.textPrimary, padding: "28px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <GoldBtn variant="ghost" size="sm" onClick={onBack}>← Quay lại</GoldBtn>
        <h2 style={{ margin: 0, color: CYBER.cyan, letterSpacing: 3, textTransform: "uppercase" }}>// HỒ SƠ CỦA TÔI</h2>
      </div>

      {err && <Box color="#f04747">{err}</Box>}
      {msg && <Box color="#3ba55d">{msg}</Box>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, maxWidth: 1200 }}>
        {/* LEFT — avatar + basic */}
        <Section title="Thông tin cơ bản">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 140, height: 140, borderRadius: "50%", overflow: "hidden",
              background: `linear-gradient(135deg, ${CYBER.cyan}, ${CYBER.magenta})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0a0614", fontSize: 48, fontWeight: 900, border: `2px solid ${CYBER.cyan}`,
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (form.username || "?").slice(0, 2).toUpperCase()}
            </div>
            <label style={{
              padding: "8px 14px", background: `${CYBER.cyan}20`, border: `1px solid ${CYBER.cyan}`,
              borderRadius: 4, color: CYBER.cyan, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
            }}>
              Đổi avatar
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </label>
          </div>
          <div style={{ height: 16 }} />
          <Label>Tên tài khoản</Label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={inp} />
          <div style={{ height: 12 }} />
          <Label>Giới thiệu</Label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4} maxLength={300} style={{ ...inp, resize: "vertical" }} />
        </Section>

        {/* RIGHT — game profiles */}
        <Section title="Hồ sơ theo game">
          <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
            Điền IGN/Rank theo từng game bạn chơi. Bỏ trống cho game không chơi.
          </div>
          {GAMES.filter((g) => g.hasRanks).map((g) => {
            const p = getProfile(g.id);
            const isLol = g.id === "lol";
            return (
              <div key={g.id} style={{
                display: "grid",
                gridTemplateColumns: "120px 1.2fr 1fr 1fr 1fr" + (isLol ? " auto" : ""),
                gap: 8, alignItems: "center", marginBottom: 8,
                padding: "10px 12px", background: "#0a0a14", border: `1px solid ${CYBER.border}`, borderRadius: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: g.accent, fontWeight: 700, fontSize: 12 }}>
                  <span>{g.icon}</span><span>{g.shortName}</span>
                </div>
                <input placeholder={isLol ? "IGN#Tag (vd: Faker#KR1)" : "IGN"} value={p.ign}
                  onChange={(e) => setProfile(g.id, { ign: e.target.value })} style={inp} />
                <Select value={p.rank} onChange={(v) => setProfile(g.id, { rank: v })} options={g.ranks} placeholder="Rank" />
                <Select value={p.position} onChange={(v) => setProfile(g.id, { position: v })} options={g.roles} placeholder="Vị trí" />
                <Select value={p.playStyle} onChange={(v) => setProfile(g.id, { playStyle: v })} options={g.playStyles} placeholder="Phong cách" />
                {isLol && (
                  <button onClick={fetchRiot} disabled={riotLoading || !(p.ign || "").includes("#")}
                    title="Đồng bộ từ Riot API (cần RIOT_API_KEY ở server)"
                    style={{
                      padding: "6px 10px", background: `${CYBER.magenta}20`, border: `1px solid ${CYBER.magenta}`,
                      borderRadius: 4, color: CYBER.magenta, fontSize: 10, fontWeight: 700, cursor: "pointer",
                      whiteSpace: "nowrap", opacity: riotLoading ? 0.5 : 1,
                    }}>
                    {riotLoading ? "..." : "⚡ Riot"}
                  </button>
                )}
              </div>
            );
          })}
        </Section>
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10, maxWidth: 1200 }}>
        <GoldBtn onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</GoldBtn>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div style={{ background: "#0a0a14", border: `1px solid ${CYBER.border}`, borderRadius: 6, padding: 20 }}>
    <h3 style={{ margin: "0 0 16px", color: CYBER.cyan, fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>{title}</h3>
    {children}
  </div>
);
const Label = ({ children }) => (
  <label style={{ display: "block", color: CYBER.cyan, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{children}</label>
);
const Select = ({ value, onChange, options, placeholder }) => (
  <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={inp}>
    <option value="">{placeholder || "--"}</option>
    {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Box = ({ color, children }) => (
  <div style={{ padding: "10px 14px", marginBottom: 14, background: `${color}20`, border: `1px solid ${color}`, borderRadius: 4, color, fontSize: 13, maxWidth: 1200 }}>{children}</div>
);
const inp = {
  width: "100%", padding: "8px 10px", background: "#0d0d1a", border: "1px solid #2a2a3e",
  borderRadius: 4, color: "#dcddde", fontSize: 12, outline: "none",
  fontFamily: "'Be Vietnam Pro', sans-serif", boxSizing: "border-box",
};
