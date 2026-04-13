// League of Legends command handler — dùng blitz.gg cho cả LoL và TFT
//
// LoL mode:    /<tên_tướng>        → blitz.gg/lol/champions/{Name}/build
// TFT mode:    /<tên_tướng>        → blitz.gg/tft/set{N}/champions/TFT{N}_{Name}
// TFT mode:    /doihinh            → blitz.gg/tft/set{N}/comps
//
// Khi Riot ra set TFT mới, chỉ cần đổi CURRENT_TFT_SET bên dưới.

const CURRENT_TFT_SET = 16;
const TFT_META_COMPS_URL = `https://blitz.gg/tft/set${CURRENT_TFT_SET}/comps`;

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function slugify(input) {
  return String(input).toLowerCase().trim()
    .replace(/[\s_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buildLolUrl(slug) {
  // blitz.gg dùng champion name capitalize: Kayle, Jinx, Ahri
  return `https://blitz.gg/lol/champions/${capitalize(slug)}/build`;
}

function buildTftUrl(slug) {
  // blitz.gg TFT: /tft/setN/champions/TFTN_{CapitalizedName}
  return `https://blitz.gg/tft/set${CURRENT_TFT_SET}/champions/TFT${CURRENT_TFT_SET}_${capitalize(slug)}`;
}

const handler = {
  gameId: "lol",
  placeholder: "Nhập tin nhắn... (gõ /jinx, /aatrox... /help để xem tất cả)",

  commands: [
    {
      syntax: "/<tên_tướng>",
      desc: "LoL: xem build trên blitz.gg · TFT: xem unit trên blitz.gg",
      examples: ["/jinx", "/yasuo", "/ahri", "/kayle", "/sylas"]
    },
    {
      syntax: "/doihinh",
      desc: "ĐTCL: xem meta đội hình trên blitz.gg (chỉ hoạt động trong mode TFT)",
      examples: ["/doihinh"]
    }
  ],

  parse(text, context = {}) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    const firstWord = trimmed.slice(1).split(/\s+/)[0].toLowerCase();
    const isTft = context.mode === "tft";

    // /doihinh chỉ trong TFT mode
    if (isTft && firstWord === "doihinh") {
      return {
        matched: true,
        display: `♟️ TFT Meta Đội Hình → ${TFT_META_COMPS_URL}`
      };
    }

    // Default: lookup tướng / unit
    const slug = slugify(firstWord);
    if (!slug) {
      return { matched: false, error: "❓ Cú pháp: /<tên_tướng>. Ví dụ: /jinx, /sylas" };
    }

    if (isTft) {
      return {
        matched: true,
        display: `♟️ TFT Unit ${capitalize(slug)} → ${buildTftUrl(slug)}`
      };
    }
    return {
      matched: true,
      display: `🛡️ Build ${capitalize(slug)} → ${buildLolUrl(slug)}`
    };
  }
};

export default handler;
