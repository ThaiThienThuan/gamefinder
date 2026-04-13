// Rocket League command handler
// /<tên_player> → tracker.gg player profile (Steam)
// TODO: bạn có thể thêm platform khác: epic, psn, xbl, switch

function slugify(input) {
  return String(input).trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "");
}

function profileUrl(name) {
  return `https://rocketleague.tracker.network/rocket-league/profile/steam/${encodeURIComponent(name)}/overview`;
}

const handler = {
  gameId: "rocket-league",
  placeholder: "Nhập tin nhắn... (gõ /<tên_player> để xem stats, /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_player>",
      desc: "Tra stats Steam player trên rocketleague.tracker.network",
      examples: ["/Squishy", "/JKnaps", "/ApparentlyJack"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const slug = slugify(trimmed.slice(1));
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_player>. Ví dụ: /Squishy" };
    }
    return {
      matched: true,
      display: `🚗 Player ${slug} → ${profileUrl(slug)}`
    };
  }
};

export default handler;
