// Counter-Strike 2 command handler
// /<tên_map> → blitz.gg/cs2/lineups/de_{map}
// URL pattern blitz dùng prefix "de_" cho tất cả active duty maps
// TODO: có thể đổi sang leetify, liquipedia, tracker.gg...

function slugify(input) {
  return String(input).toLowerCase().trim()
    .replace(/^de_/, "")
    .replace(/[\s_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function mapUrl(slug) {
  // Luôn prepend "de_" vì blitz.gg dùng format de_mirage, de_dust2...
  return `https://blitz.gg/cs2/lineups/de_${encodeURIComponent(slug)}`;
}

const handler = {
  gameId: "cs2",
  placeholder: "Nhập tin nhắn... (gõ /dust2, /mirage... để xem nades, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_map>",
      desc: "Xem lineup nades theo map trên blitz.gg",
      examples: ["/dust2", "/mirage", "/inferno", "/nuke", "/ancient", "/anubis", "/de_vertigo"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_map>. Ví dụ: /dust2, /mirage" };
    }
    return {
      matched: true,
      display: `🗺️ Map ${slug} → ${mapUrl(slug)}`
    };
  }
};

export default handler;
