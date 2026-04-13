// Call of Duty command handler
// /<weapon> → Call of Duty Wiki (Fandom) — cộng đồng CoD lớn nhất
// Có đầy đủ: stats, attachments, loadout, tips
//
// URL: https://callofduty.fandom.com/wiki/{Weapon_Name}

function capitalize(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  return s.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("_");
}

function weaponUrl(name) {
  return `https://callofduty.fandom.com/wiki/${encodeURIComponent(name)}`;
}

function searchUrl(query) {
  return `https://callofduty.fandom.com/wiki/Special:Search?query=${encodeURIComponent(query)}`;
}

const handler = {
  gameId: "cod",
  placeholder: "Nhập tin nhắn... (gõ /m4, /ak47... hoặc /search <từ khóa> · /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_vũ_khí>",
      desc: "Xem guide vũ khí trên Call of Duty Wiki (stats, attachments, tips)",
      examples: ["/m4", "/ak47", "/mp5", "/kar98k"]
    },
    {
      syntax: "/search <từ_khóa>",
      desc: "Tìm kiếm trên Call of Duty Wiki (map, perk, killstreak...)",
      examples: ["/search Nuketown", "/search Ghost", "/search UAV"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const parts = trimmed.slice(1).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;

    // /search <query>
    if (parts[0].toLowerCase() === "search") {
      const query = parts.slice(1).join(" ");
      if (!query) {
        return { matched: false, error: "❓ Cú pháp: /search <từ khóa>. Ví dụ: /search Nuketown" };
      }
      return {
        matched: true,
        display: `🔍 Tìm kiếm "${query}" → ${searchUrl(query)}`
      };
    }

    // Default: weapon/item lookup
    const name = capitalize(parts[0]);
    if (!name) {
      return { matched: false, error: "❓ Cú pháp: /<tên_vũ_khí>. Ví dụ: /m4, /ak47" };
    }

    return {
      matched: true,
      display: `🔫 ${name} → ${weaponUrl(name)}`
    };
  }
};

export default handler;
