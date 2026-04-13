// Fortnite command handler
// /<tên_item> → fortnite.gg item info
// TODO: bạn có thể đổi sang fnbr.co, fortnite.fandom...

function slugify(input) {
  return String(input).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function itemUrl(slug) {
  return `https://fortnite.gg/item?id=${encodeURIComponent(slug)}`;
}

const handler = {
  gameId: "fortnite",
  placeholder: "Nhập tin nhắn... (gõ /scar, /shotgun... để xem item, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_item>",
      desc: "Xem thông tin item/vũ khí trên fortnite.gg",
      examples: ["/scar", "/shotgun", "/sniper", "/launch-pad"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_item>. Ví dụ: /scar" };
    }
    return {
      matched: true,
      display: `🏗️ Item ${slug} → ${itemUrl(slug)}`
    };
  }
};

export default handler;
