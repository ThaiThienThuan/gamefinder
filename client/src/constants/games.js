// Danh sách game hỗ trợ — mỗi game có modes, ranks, roles, playStyles riêng.
// Icon dùng Simple Icons CDN (open source SVG brand icon), emoji fallback nếu fail.

export const GAMES = [
  {
    id: "lol",
    name: "League of Legends",
    shortName: "LoL",
    icon: "⚔️",
    iconUrl: "https://cdn.simpleicons.org/leagueoflegends/c8aa6e",
    gradient: ["#c89b3c", "#785a28"],
    accent: "#c8aa6e",
    desc: "MOBA 5v5 của Riot Games",
    modes: [
      { id: "ranked", name: "Xếp Hạng", icon: "🏆", players: 5, desc: "Ranked 5v5" },
      { id: "normal", name: "Thường",   icon: "🎮", players: 5, desc: "Normal 5v5" },
      { id: "aram",   name: "ARAM",     icon: "🌉", players: 5, desc: "Howling Abyss" },
      { id: "tft",    name: "ĐTCL",     icon: "♟️", players: 8, desc: "Teamfight Tactics" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Sắt","Đồng","Bạc","Vàng","Bạch Kim","Ngọc Lục Bảo","Kim Cương","Cao Thủ","Đại Cao Thủ","Thách Đấu"],
    roles: ["Top","Jungle","Mid","ADC","Support"],
    playStyles: ["Tấn công","Phòng thủ","Farming","Roaming","Đẩy lẻ"]
  },
  {
    id: "valorant",
    name: "Valorant",
    shortName: "VAL",
    icon: "🎯",
    iconUrl: "https://cdn.simpleicons.org/valorant/ff4655",
    gradient: ["#ff4655", "#8a1f28"],
    accent: "#ff4655",
    desc: "FPS 5v5 tactical — Riot Games",
    modes: [
      { id: "competitive", name: "Đấu Hạng",  icon: "🏆", players: 5, desc: "Ranked 5v5" },
      { id: "unrated",     name: "Thường",    icon: "🎮", players: 5, desc: "Unrated 5v5" },
      { id: "swiftplay",   name: "Swiftplay", icon: "⚡", players: 5, desc: "Rút gọn ~15 phút" },
      { id: "deathmatch",  name: "Deathmatch",icon: "💀", players: 1, desc: "FFA 14 người" },
      { id: "spike-rush",  name: "Spike Rush",icon: "💣", players: 5, desc: "4 round" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Iron","Bronze","Silver","Gold","Platinum","Diamond","Ascendant","Immortal","Radiant"],
    roles: ["Duelist","Initiator","Controller","Sentinel"],
    playStyles: ["Entry","Lurker","IGL","Anchor","Flex"]
  },
  {
    id: "cs2",
    name: "Counter-Strike 2",
    shortName: "CS2",
    icon: "🔫",
    iconUrl: "https://cdn.simpleicons.org/counterstrike/f5a623",
    gradient: ["#de9b35", "#5a3d10"],
    accent: "#f5a623",
    desc: "FPS 5v5 — Valve",
    modes: [
      { id: "premier",    name: "Premier",    icon: "🏆", players: 5, desc: "Ranked 5v5 (Valve)" },
      { id: "faceit",     name: "FACEIT",     icon: "🎯", players: 5, desc: "3rd-party MM 5v5" },
      { id: "competitive",name: "Competitive",icon: "⭐", players: 5, desc: "5v5 pick map" },
      { id: "wingman",    name: "Wingman",    icon: "👥", players: 2, desc: "2v2" },
      { id: "deathmatch", name: "Deathmatch", icon: "💀", players: 1, desc: "FFA/Team" },
      { id: "casual",     name: "Casual",     icon: "🎮", players: 5, desc: "10 người" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Silver","Gold Nova","Master Guardian","DMG","Legendary Eagle","Supreme","Global Elite","FACEIT Lv1-10"],
    roles: ["Entry Fragger","AWPer","Rifler","Support","IGL","Lurker"],
    playStyles: ["Aggressive","Passive","Trade","Anchor","Lurk"]
  },
  {
    id: "dota2",
    name: "Dota 2",
    shortName: "Dota",
    icon: "🛡️",
    iconUrl: "https://cdn.simpleicons.org/dota2/e74c3c",
    gradient: ["#a93226", "#5a1a12"],
    accent: "#e74c3c",
    desc: "MOBA 5v5 — Valve",
    modes: [
      { id: "ranked-roles", name: "Ranked Roles", icon: "🏆", players: 5, desc: "5v5 có roles" },
      { id: "ranked",       name: "Ranked",       icon: "⭐", players: 5, desc: "All pick" },
      { id: "turbo",        name: "Turbo",        icon: "⚡", players: 5, desc: "Nhanh" },
      { id: "unranked",     name: "Unranked",     icon: "🎮", players: 5, desc: "Thường" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Herald","Guardian","Crusader","Archon","Legend","Ancient","Divine","Immortal"],
    roles: ["Carry (Pos 1)","Mid (Pos 2)","Offlane (Pos 3)","Soft Support (Pos 4)","Hard Support (Pos 5)"],
    playStyles: ["Farming","Fighting","Pushing","Split push","Roaming"]
  },
  {
    id: "apex",
    name: "Apex Legends",
    shortName: "Apex",
    icon: "🎖️",
    iconUrl: "https://cdn.simpleicons.org/apexlegends/ff4747",
    gradient: ["#d92e2e", "#700000"],
    accent: "#ff4747",
    desc: "Battle Royale — EA",
    modes: [
      { id: "battle-royale", name: "Battle Royale", icon: "🎖️", players: 3, desc: "Trio BR" },
      { id: "ranked",        name: "Ranked",        icon: "🏆", players: 3, desc: "Rank trio" },
      { id: "duos",          name: "Duos",          icon: "👥", players: 2, desc: "2 người" },
      { id: "mixtape",       name: "Mixtape",       icon: "🎲", players: 6, desc: "TDM/Control" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Rookie","Bronze","Silver","Gold","Platinum","Diamond","Master","Apex Predator"],
    roles: ["Assault","Skirmisher","Recon","Support","Controller"],
    playStyles: ["Aggressive","Passive","Flanker","Sniper","IGL"]
  },
  {
    id: "overwatch2",
    name: "Overwatch 2",
    shortName: "OW2",
    icon: "🧡",
    iconUrl: "https://cdn.simpleicons.org/battledotnet/f99e1a",
    gradient: ["#f99e1a", "#8b5500"],
    accent: "#f99e1a",
    desc: "Hero FPS 5v5 — Blizzard",
    modes: [
      { id: "competitive", name: "Cạnh Tranh", icon: "🏆", players: 5, desc: "5v5 ranked" },
      { id: "quick-play",  name: "Chơi Nhanh", icon: "⚡", players: 5, desc: "5v5" },
      { id: "arcade",      name: "Arcade",     icon: "🎮", players: 5, desc: "Mode phụ" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster","Top 500"],
    roles: ["Tank","Damage","Support"],
    playStyles: ["Dive","Poke","Brawl","Flex","Main"]
  },
  {
    id: "cod",
    name: "Call of Duty",
    shortName: "CoD",
    icon: "🎖️",
    iconUrl: "https://cdn.simpleicons.org/activision/ffffff",
    gradient: ["#4b6e35", "#2a3d1f"],
    accent: "#6b8e23",
    desc: "FPS — Activision",
    modes: [
      { id: "ranked",    name: "Ranked",       icon: "🏆", players: 4, desc: "Ranked 4v4" },
      { id: "warzone",   name: "Warzone",      icon: "🪂", players: 4, desc: "Battle Royale" },
      { id: "multiplayer", name: "Multiplayer", icon: "🎮", players: 6, desc: "6v6 / 10v10" },
      { id: "zombies",   name: "Zombies",      icon: "🧟", players: 4, desc: "Co-op PvE" },
      { id: "snd",       name: "Search & Destroy", icon: "💣", players: 6, desc: "SnD 6v6" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Bronze","Silver","Gold","Platinum","Diamond","Crimson","Iridescent","Top 250"],
    roles: ["Slayer","OBJ","Support","Flex","Anchor","SMG","AR"],
    playStyles: ["Aggressive","Passive","OBJ","Slayer","Support"]
  },
  {
    id: "fortnite",
    name: "Fortnite",
    shortName: "FN",
    icon: "🏗️",
    iconUrl: "https://cdn.simpleicons.org/fortnite/b967e0",
    gradient: ["#9d4dca", "#4a1d60"],
    accent: "#b967e0",
    desc: "Battle Royale — Epic Games",
    modes: [
      { id: "br-squads",  name: "BR Squad",   icon: "🎖️", players: 4 },
      { id: "br-duos",    name: "BR Duo",     icon: "👥", players: 2 },
      { id: "br-solo",    name: "BR Solo",    icon: "👤", players: 1 },
      { id: "zero-build", name: "Zero Build", icon: "🚫", players: 4 },
      { id: "creative",   name: "Creative",   icon: "🎨", players: 5 }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Bronze","Silver","Gold","Platinum","Diamond","Elite","Champion","Unreal"],
    roles: ["IGL","Fragger","Builder","Support"],
    playStyles: ["Aggressive","Passive","Box fighter","Zone player"]
  },
  {
    id: "pubg",
    name: "PUBG",
    shortName: "PUBG",
    icon: "🪂",
    iconUrl: "https://cdn.simpleicons.org/pubg/ffc933",
    gradient: ["#f2a900", "#7a5500"],
    accent: "#ffc933",
    desc: "Battle Royale — Krafton",
    modes: [
      { id: "squads-tpp", name: "Squad TPP", icon: "👥", players: 4 },
      { id: "duos-tpp",   name: "Duo TPP",   icon: "👤", players: 2 },
      { id: "solo-tpp",   name: "Solo TPP",  icon: "👤", players: 1 },
      { id: "ranked",     name: "Ranked",    icon: "🏆", players: 4 }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Bronze","Silver","Gold","Platinum","Diamond","Crown","Ace","Conqueror"],
    roles: ["IGL","Sniper","Rusher","Support"],
    playStyles: ["Aggressive","Passive","Rotate","Camper","Fragger"]
  },
  {
    id: "r6siege",
    name: "Rainbow Six Siege",
    shortName: "R6S",
    icon: "🛡️",
    iconUrl: "https://cdn.simpleicons.org/ubisoft/ffffff",
    gradient: ["#2f6ea5", "#1a3a5c"],
    accent: "#4a90d9",
    desc: "FPS 5v5 tactical — Ubisoft",
    modes: [
      { id: "ranked",      name: "Ranked",      icon: "🏆", players: 5, desc: "Ranked 5v5" },
      { id: "unranked",    name: "Unranked",    icon: "⭐", players: 5, desc: "Unranked 5v5" },
      { id: "quick-match", name: "Quick Match", icon: "⚡", players: 5, desc: "Casual 5v5" },
      { id: "deathmatch",  name: "Deathmatch",  icon: "💀", players: 1, desc: "FFA" }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Copper","Bronze","Silver","Gold","Platinum","Emerald","Diamond","Champion"],
    roles: ["Hard Breacher","Soft Breacher","Intel","Anchor","Roamer","Support","Flex"],
    playStyles: ["Aggressive","Anchor","Roamer","Support","Flex"]
  },
  {
    id: "rocket-league",
    name: "Rocket League",
    shortName: "RL",
    icon: "🚗",
    iconUrl: "https://cdn.simpleicons.org/rocketleague/2aa1ff",
    gradient: ["#0099ff", "#003a66"],
    accent: "#2aa1ff",
    desc: "Bóng đá xe hơi — Psyonix",
    modes: [
      { id: "ranked-3v3", name: "Ranked 3v3", icon: "🏆", players: 3 },
      { id: "ranked-2v2", name: "Ranked 2v2", icon: "👥", players: 2 },
      { id: "ranked-1v1", name: "Ranked 1v1", icon: "👤", players: 1 },
      { id: "hoops",      name: "Hoops",      icon: "🏀", players: 2 }
    ],
    hasRanks: true,
    hasRoles: true,
    ranks: ["Bronze","Silver","Gold","Platinum","Diamond","Champion","Grand Champion","Supersonic Legend"],
    roles: ["Striker","Midfielder","Goalie"],
    playStyles: ["Aggressive","Mechanical","Positional","Demo","Defender"]
  },
  {
    id: "chatroom",
    name: "Chatting Room",
    shortName: "Chat",
    icon: "💬",
    gradient: ["#6c5ce7", "#2d1b69"],
    accent: "#a29bfe",
    desc: "Trò chuyện, giao lưu, chơi game khác",
    modes: [
      { id: "general",  name: "Tán Gẫu",    icon: "💬", players: 10, desc: "Chat chung" },
      { id: "gaming",   name: "Game Khác",   icon: "🎮", players: 10, desc: "Chơi game khác" },
      { id: "music",    name: "Âm Nhạc",     icon: "🎵", players: 10, desc: "Nghe nhạc cùng" },
      { id: "study",    name: "Học Tập",     icon: "📚", players: 10, desc: "Học nhóm" }
    ],
    hasRanks: false,
    hasRoles: false,
    ranks: [],
    roles: [],
    playStyles: ["Casual","Vui vẻ","Nghiêm túc","Giao lưu"]
  }
];

export function findGame(gameId) {
  if (!gameId) return null;
  return GAMES.find(g => g.id === gameId) || null;
}

export function findMode(gameId, modeId) {
  const game = findGame(gameId);
  if (!game) return null;
  return game.modes.find(m => m.id === modeId) || null;
}
