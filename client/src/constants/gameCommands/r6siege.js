// Rainbow Six Siege command handler
// /<operator> → Rainbow Six Wiki (Fandom) — cộng đồng R6 lớn nhất
// Có đầy đủ: loadout, ability, tips, counters, lore
//
// URL: https://rainbowsix.fandom.com/wiki/{Operator_Name}

function capitalize(input) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function operatorUrl(name) {
  return `https://rainbowsix.fandom.com/wiki/${encodeURIComponent(name)}`;
}

const handler = {
  gameId: "r6siege",
  placeholder: "Nhập tin nhắn... (gõ /ash, /thermite, /jager... /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_operator>",
      desc: "Xem guide Operator trên Rainbow Six Wiki (loadout, ability, tips)",
      examples: ["/ash", "/thermite", "/jager", "/vigil", "/ace"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const name = capitalize(trimmed.slice(1).split(/\s+/)[0]);
    if (!name) {
      return { matched: false, error: "❓ Cú pháp: /<tên_operator>. Ví dụ: /ash, /thermite" };
    }

    return {
      matched: true,
      display: `🛡️ Operator ${name} → ${operatorUrl(name)}`
    };
  }
};

export default handler;
