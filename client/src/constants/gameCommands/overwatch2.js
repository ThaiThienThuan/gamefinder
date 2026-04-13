// Overwatch 2 command handler
// /<tên_hero> → overbuff hero stats
// TODO: bạn có thể đổi sang trang khác

function slugify(input) {
  return String(input).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function heroUrl(slug) {
  return `https://www.overbuff.com/heroes/${encodeURIComponent(slug)}`;
}

const handler = {
  gameId: "overwatch2",
  placeholder: "Nhập tin nhắn... (gõ /tracer, /reinhardt... để xem hero, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_hero>",
      desc: "Xem stats/winrate 1 Hero trên overbuff",
      examples: ["/tracer", "/reinhardt", "/mercy", "/genji", "/ana"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_hero>. Ví dụ: /tracer, /reinhardt" };
    }
    return {
      matched: true,
      display: `🧡 Hero ${slug} → ${heroUrl(slug)}`
    };
  }
};

export default handler;
