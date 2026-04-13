// Valorant command handler — dùng blitz.gg
// Cú pháp: /<agent>/<map>  hoặc  /<agent> <map>
// URL: https://blitz.gg/valorant/lineups/{agent}/{map}
//
// Data layer (agent registry) nằm ở ../valorantAgents.js

import { findAgent } from "../valorantAgents";

function buildUrl(agentSlug, mapSlug) {
  return `https://blitz.gg/valorant/lineups/${agentSlug}/${mapSlug}`;
}

function slugifyMap(input) {
  return String(input || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

const handler = {
  gameId: "valorant",
  placeholder: "Nhập tin nhắn... (gõ /viper/bind, /jett/haven... /help để xem tất cả)",

  commands: [
    {
      syntax: "/<agent>/<map>",
      desc: "Xem lineup của 1 agent trên 1 map cụ thể (blitz.gg)",
      examples: [
        "/viper/bind",
        "/jett/haven",
        "/sova/ascent",
        "/killjoy/split",
        "/viper corrode (dùng space cũng được)"
      ]
    }
  ],

  parse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed.startsWith("/")) return null;

    // Tách body theo "/" hoặc whitespace: /viper/bind hoặc /viper bind
    const parts = trimmed.slice(1).split(/[/\s]+/).filter(Boolean);
    if (parts.length === 0) return null;

    const [agentInput, mapInput] = parts;

    const agent = findAgent(agentInput);
    if (!agent) {
      return {
        matched: false,
        error: `❓ Không tìm thấy tướng "${agentInput}". Cú pháp: /<agent>/<map>. Ví dụ: /viper/bind`
      };
    }

    if (!mapInput) {
      return {
        matched: false,
        error: `❓ Cần kèm tên map. Ví dụ: /${agent.slug}/bind, /${agent.slug}/haven`
      };
    }

    const mapSlug = slugifyMap(mapInput);
    if (!mapSlug) {
      return {
        matched: false,
        error: `❓ Tên map không hợp lệ. Ví dụ: /${agent.slug}/bind`
      };
    }

    return {
      matched: true,
      display: `🎯 Lineup ${agent.name} @ ${mapSlug} → ${buildUrl(agent.slug, mapSlug)}`
    };
  }
};

export default handler;
