// Dota 2 command handler
// /<tên_hero> → dotabuff hero profile
// TODO: bạn có thể đổi URL sang stratz, opendota...

function slugify(input) {
  return String(input).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function heroUrl(slug) {
  return `https://www.dotabuff.com/heroes/${encodeURIComponent(slug)}`;
}

const handler = {
  gameId: "dota2",
  placeholder: "Nhập tin nhắn... (gõ /invoker, /pudge... để xem hero, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_hero>",
      desc: "Xem stats/build/winrate 1 hero trên dotabuff",
      examples: ["/invoker", "/pudge", "/anti-mage", "/juggernaut", "/crystal-maiden"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_hero>. Ví dụ: /invoker, /anti-mage" };
    }
    return {
      matched: true,
      display: `🛡️ Hero ${slug} → ${heroUrl(slug)}`
    };
  }
};

export default handler;
