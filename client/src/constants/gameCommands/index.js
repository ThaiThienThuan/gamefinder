// Per-game slash command router.
//
// Mỗi game có 1 module riêng trong thư mục này, export default object shape:
//   {
//     gameId: "valorant",
//     placeholder: "...",                      // hint cho chat input (optional)
//     commands: [                              // metadata cho /help
//       { syntax, desc, examples: [...] }
//     ],
//     parse(text) -> null | {matched, display, error}
//   }
//
// Để thêm command cho 1 game mới:
//   1. Tạo file ./<game-id>.js (ví dụ ./lol.js, ./cs2.js, ./dota2.js)
//   2. Import vào HANDLERS map bên dưới
//   3. Thêm mục `commands` vào handler để /help tự hiện
//
// Giao diện return của parse():
//   null                                  → không phải command, gửi text như thường
//   { matched: true, display: "..." }     → thành công, thay text bằng display
//   { matched: false, error: "..." }      → command sai, hiện system message

import valorant from "./valorant";
import lol from "./lol";
import cs2 from "./cs2";
import dota2 from "./dota2";
import apex from "./apex";
import overwatch2 from "./overwatch2";
import rocketLeague from "./rocket-league";
import fortnite from "./fortnite";
import pubg from "./pubg";
import r6siege from "./r6siege";
import cod from "./cod";

const HANDLERS = {
  valorant,
  lol,
  cs2,
  dota2,
  apex,
  overwatch2,
  "rocket-league": rocketLeague,
  fortnite,
  pubg,
  r6siege,
  cod
  // chatroom: không có handler (phòng trò chuyện chung)
};

// Universal help/checkcommand — hoạt động cho MỌI game dù có handler riêng hay không
const HELP_ALIASES = new Set(["/help", "/checkcommand", "/commands", "/?"]);

export function getCommandHandler(gameId) {
  if (!gameId) return null;
  return HANDLERS[gameId] || null;
}

export function getPlaceholder(gameId) {
  const handler = getCommandHandler(gameId);
  return handler?.placeholder || "Nhập tin nhắn... (gõ /help để xem lệnh)";
}

// Map gameId → tên đẹp để hiện trong /help
const GAME_DISPLAY_NAMES = {
  "lol": "League of Legends",
  "valorant": "Valorant",
  "cs2": "Counter-Strike 2",
  "dota2": "Dota 2",
  "apex": "Apex Legends",
  "overwatch2": "Overwatch 2",
  "rocket-league": "Rocket League",
  "fortnite": "Fortnite",
  "pubg": "PUBG",
  "r6siege": "Rainbow Six Siege",
  "cod": "Call of Duty",
  "chatroom": "Chatting Room"
};

// Check nếu text là /help command
export function isHelpCommand(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  return HELP_ALIASES.has(trimmed);
}

// Build help text cho game hiện tại — trả về string nhiều dòng (dùng \n)
export function buildHelpText(gameId) {
  const gameName = GAME_DISPLAY_NAMES[gameId] || gameId || "—";
  const handler = getCommandHandler(gameId);

  const lines = [];
  lines.push(`📋 Danh sách lệnh — ${gameName}`);
  lines.push("");

  // Game-specific commands
  if (handler?.commands?.length) {
    handler.commands.forEach((cmd) => {
      lines.push(`• ${cmd.syntax}`);
      if (cmd.desc) lines.push(`  → ${cmd.desc}`);
      if (cmd.examples?.length) {
        lines.push(`  Ví dụ: ${cmd.examples.join(", ")}`);
      }
      lines.push("");
    });
  } else {
    lines.push(`⏳ Game "${gameName}" chưa có lệnh riêng.`);
    lines.push("");
  }

  // Universal commands (luôn có)
  lines.push("🌐 Lệnh chung (mọi game):");
  lines.push("• /help, /checkcommand, /commands, /?");
  lines.push("  → Hiện danh sách lệnh này");

  return lines.join("\n");
}
