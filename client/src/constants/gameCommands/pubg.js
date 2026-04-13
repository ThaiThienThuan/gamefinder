// PUBG command handler
// /<tên_player> → pubg.op.gg player profile
// TODO: bạn có thể thêm platform (steam, kakao, psn, xbox)

function slugify(input) {
  return String(input).trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function profileUrl(name) {
  return `https://pubg.op.gg/user/${encodeURIComponent(name)}`;
}

const handler = {
  gameId: "pubg",
  placeholder: "Nhập tin nhắn... (gõ /<tên_player> để tra profile, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_player>",
      desc: "Tra stats 1 player PUBG trên pubg.op.gg",
      examples: ["/chocoTaco", "/shroud", "/wackyjacky101"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_player>. Ví dụ: /chocoTaco" };
    }
    return {
      matched: true,
      display: `🪂 Player ${slug} → ${profileUrl(slug)}`
    };
  }
};

export default handler;
