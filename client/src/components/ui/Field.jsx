function Field({ label, value, onChange, options, multi = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        color: "#22d3ee",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        display: "block",
        marginBottom: 6,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace"
      }}>{label}</label>

      {multi ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {options.map(opt => {
            const sel = (value || []).includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  if (sel) onChange(value.filter(v => v !== opt));
                  else onChange([...(value || []), opt]);
                }}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: sel ? "1px solid #22d3ee" : "1px solid #2d1b4e",
                  background: sel ? "#22d3ee20" : "#0a0614",
                  color: sel ? "#22d3ee" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all .2s",
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontWeight: 600,
                  boxShadow: sel ? "0 0 10px #22d3ee30" : "none"
                }}
              >{opt}</button>
            );
          })}
        </div>
      ) : (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0a0614",
            border: "1px solid #2d1b4e",
            borderRadius: 4,
            color: "#e2e8f0",
            fontSize: 13,
            outline: "none",
            fontFamily: "'Be Vietnam Pro', sans-serif"
          }}
        >
          <option value="">-- Chọn --</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

export default Field;
