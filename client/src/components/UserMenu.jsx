import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CYBER } from "../constants/theme";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const resolveAvatar = (a) => {
  if (!a) return "";
  if (a.startsWith("http")) return a;
  return `${API}${a.startsWith("/") ? "" : "/"}${a}`;
};

export default function UserMenu({ user, onProfile, onAdmin, onRiotLookup, onLogout }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    const onDoc = (e) => {
      const inWrap = ref.current && ref.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inWrap && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const avatar = resolveAvatar(user.avatar);
  const initials = (user.username || "?").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      {user.role === "admin" && (
        <button onClick={onAdmin} style={{
          padding: "6px 12px", background: `${CYBER.magenta}20`, border: `1px solid ${CYBER.magenta}`,
          borderRadius: 4, color: CYBER.magenta, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 1.5, fontWeight: 700, cursor: "pointer", textShadow: `0 0 6px ${CYBER.magenta}60`,
        }}>ADMIN</button>
      )}
      <button ref={btnRef} onClick={toggle} style={{
        display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px",
        background: `${CYBER.bgCard}ee`, border: `1px solid ${CYBER.cyan}60`, borderRadius: 28,
        color: CYBER.cyan, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
        fontWeight: 700, cursor: "pointer", boxShadow: `0 0 10px ${CYBER.cyan}30`,
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: "50%", overflow: "hidden",
          background: `linear-gradient(135deg, ${CYBER.cyan}, ${CYBER.magenta})`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#0a0614", fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>
          {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </span>
        <span>{user.username}</span>
        <span style={{ opacity: .5, fontSize: 8 }}>▼</span>
      </button>

      {open && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, right: pos.right, minWidth: 200,
          background: "#0a0a14", border: `1px solid ${CYBER.cyan}60`, borderRadius: 6,
          boxShadow: `0 8px 30px rgba(0,0,0,.85), 0 0 20px ${CYBER.cyan}30`,
          zIndex: 99999, overflow: "hidden",
        }}>
          <Item onClick={() => { setOpen(false); onProfile?.(); }}>Hồ sơ / Cài đặt</Item>
          <Item onClick={() => { setOpen(false); onRiotLookup?.(); }}>🔍 Tra cứu Riot (LoL)</Item>
          {user.role === "admin" && (
            <Item onClick={() => { setOpen(false); onAdmin?.(); }} color={CYBER.magenta}>Admin Dashboard</Item>
          )}
          <div style={{ height: 1, background: `${CYBER.cyan}20` }} />
          <Item onClick={() => { setOpen(false); onLogout?.(); }} color="#f04747">Đăng xuất</Item>
        </div>,
        document.body
      )}
    </div>
  );
}

const Item = ({ children, onClick, color }) => (
  <div onClick={onClick} style={{
    padding: "11px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
    fontFamily: "'Be Vietnam Pro', sans-serif", color: color || "#f0f0f0",
    transition: "background .15s",
  }}
    onMouseEnter={(e) => e.currentTarget.style.background = `${CYBER.cyan}15`}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
    {children}
  </div>
);
