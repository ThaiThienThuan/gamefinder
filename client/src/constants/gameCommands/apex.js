// Apex Legends command handler
// /<tên_legend> → apexlegends.fandom.com/wiki/{Legend}
// Fandom wiki uy tín, đầy đủ abilities/lore/tips, URL cực kỳ ổn định.
//
// TODO: có thể đổi sang liquipedia.net/apexlegends/{Legend} nếu muốn hướng esports hơn

// Capitalize wiki-style: "mad maggie" → "Mad_Maggie", "wraith" → "Wraith"
function wikiCase(input) {
  return String(input || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("_");
}

function legendUrl(name) {
  return `https://apexlegends.fandom.com/wiki/${name}`;
}

const handler = {
  gameId: "apex",
  placeholder: "Nhập tin nhắn... (gõ /wraith, /bloodhound... /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_legend>",
      desc: "Xem thông tin Legend trên Apex Legends Wiki (abilities, lore, tips)",
      examples: ["/wraith", "/bloodhound", "/pathfinder", "/octane", "/mad-maggie"]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const raw = trimmed.slice(1).trim();
    if (!raw) {
      return { matched: false, error: "❓ Cú pháp: /<tên_legend>. Ví dụ: /wraith, /bloodhound" };
    }

    const name = wikiCase(raw);
    if (!name) {
      return { matched: false, error: "❓ Tên legend không hợp lệ. Ví dụ: /wraith" };
    }

    return {
      matched: true,
      display: `🎖️ Legend ${name.replace(/_/g, " ")} → ${legendUrl(name)}`
    };
  }
};

export default handler;
