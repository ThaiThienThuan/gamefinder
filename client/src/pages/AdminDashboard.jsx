import { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import { CYBER, CYBER_BG } from "../constants/theme";
import GoldBtn from "../components/ui/GoldBtn";

export default function AdminDashboard({ onBack }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true); setErr("");
    try {
      const res = await apiClient.get("/api/admin/users", { params: { q, limit: 100 } });
      setUsers(res.data?.data?.items || []);
    } catch (e) { setErr(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };
  const loadRooms = async () => {
    setLoading(true); setErr("");
    try {
      const res = await apiClient.get("/api/admin/rooms");
      setRooms(res.data?.data || []);
    } catch (e) { setErr(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === "users") loadUsers(); else loadRooms(); /* eslint-disable-next-line */ }, [tab]);

  const setBanned = async (u, banned) => {
    try {
      await apiClient.patch(`/api/admin/users/${u._id}/ban`, { banned });
      loadUsers();
    } catch (e) { alert(e?.response?.data?.message || e.message); }
  };
  const toggleAdmin = async (u) => {
    try {
      await apiClient.patch(`/api/admin/users/${u._id}/role`, { role: u.role === "admin" ? "user" : "admin" });
      loadUsers();
    } catch (e) { alert(e?.response?.data?.message || e.message); }
  };
  const delRoom = async (r) => {
    if (!confirm(`Xoá phòng "${r.name}"?`)) return;
    try {
      await apiClient.delete(`/api/admin/rooms/${r._id}`);
      loadRooms();
    } catch (e) { alert(e?.response?.data?.message || e.message); }
  };

  return (
    <div style={{ minHeight: "100vh", background: CYBER_BG, color: CYBER.textPrimary, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <GoldBtn variant="ghost" size="sm" onClick={onBack}>← Quay lại</GoldBtn>
        <h2 style={{ margin: 0, color: CYBER.cyan, letterSpacing: 3, textTransform: "uppercase" }}>// ADMIN_DASHBOARD</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Tab active={tab === "users"} onClick={() => setTab("users")}>Users</Tab>
        <Tab active={tab === "rooms"} onClick={() => setTab("rooms")}>Rooms</Tab>
      </div>

      {err && <div style={{ color: "#f04747", marginBottom: 12 }}>{err}</div>}
      {loading && <div style={{ color: "#888" }}>Đang tải…</div>}

      {tab === "users" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              placeholder="Tìm username/email…"
              style={{ padding: "8px 12px", background: "#0d0d1a", border: `1px solid ${CYBER.border}`, borderRadius: 4, color: "#dcddde", flex: 1 }} />
            <GoldBtn size="sm" onClick={loadUsers}>Tìm</GoldBtn>
          </div>
          <Table>
            <thead><tr><Th>Username</Th><Th>Email</Th><Th>Role</Th><Th>Banned</Th><Th>OAuth</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <Td>{u.username}</Td>
                  <Td>{u.email || "—"}</Td>
                  <Td><span style={{ color: u.role === "admin" ? CYBER.cyan : "#888" }}>{u.role}</span></Td>
                  <Td>{u.banned ? <span style={{ color: "#f04747" }}>YES</span> : "—"}</Td>
                  <Td>{u.oauthProvider || "—"}</Td>
                  <Td>
                    <select value={u.banned ? "banned" : "active"}
                      onChange={(e) => setBanned(u, e.target.value === "banned")}
                      style={{ ...btn, paddingRight: 18 }}>
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                    <button onClick={() => toggleAdmin(u)} style={{ ...btn, marginLeft: 6 }}>{u.role === "admin" ? "Demote" : "Promote"}</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {tab === "rooms" && (
        <Table>
          <thead><tr><Th>Name</Th><Th>Game</Th><Th>Mode</Th><Th>Slots</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r._id}>
                <Td>{r.name}</Td>
                <Td>{r.game}</Td>
                <Td>{r.mode}</Td>
                <Td>{r.current || 0}/{r.slots}</Td>
                <Td>{r.status}</Td>
                <Td><button onClick={() => delRoom(r)} style={{ ...btn, background: "#3a1414", color: "#f04747", borderColor: "#7a2020" }}>Xoá</button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

const Tab = ({ active, children, ...p }) => (
  <button {...p} style={{
    padding: "8px 18px", background: active ? CYBER.cyan + "20" : "transparent",
    border: `1px solid ${active ? CYBER.cyan : CYBER.border}`, borderRadius: 4,
    color: active ? CYBER.cyan : "#888", fontWeight: 700, cursor: "pointer", letterSpacing: 1,
  }}>{children}</button>
);
const Table = ({ children }) => (
  <table style={{ width: "100%", borderCollapse: "collapse", background: "#0a0a14", border: `1px solid ${CYBER.border}` }}>{children}</table>
);
const Th = ({ children }) => <th style={{ textAlign: "left", padding: "10px 12px", background: "#11111e", color: CYBER.cyan, fontSize: 11, letterSpacing: 1, borderBottom: `1px solid ${CYBER.border}` }}>{children}</th>;
const Td = ({ children }) => <td style={{ padding: "10px 12px", color: "#dcddde", fontSize: 13, borderBottom: "1px solid #1e1e30" }}>{children}</td>;
const btn = { padding: "4px 10px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 3, color: "#dcddde", fontSize: 11, cursor: "pointer" };
