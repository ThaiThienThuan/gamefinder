// Valorant agent registry cho slash command /tên_tướng → link tracker.gg lineup
// Slug khớp với query param agent={slug} trên tracker.gg

export const VALORANT_AGENTS = [
  // Duelists
  { slug: "jett",      name: "Jett",      role: "Duelist" },
  { slug: "raze",      name: "Raze",      role: "Duelist" },
  { slug: "phoenix",   name: "Phoenix",   role: "Duelist" },
  { slug: "reyna",     name: "Reyna",     role: "Duelist" },
  { slug: "yoru",      name: "Yoru",      role: "Duelist" },
  { slug: "neon",      name: "Neon",      role: "Duelist" },
  { slug: "iso",       name: "Iso",       role: "Duelist" },
  { slug: "waylay",    name: "Waylay",    role: "Duelist" },

  // Initiators
  { slug: "sova",      name: "Sova",      role: "Initiator" },
  { slug: "breach",    name: "Breach",    role: "Initiator" },
  { slug: "skye",      name: "Skye",      role: "Initiator" },
  { slug: "kayo",      name: "KAY/O",     role: "Initiator", aliases: ["kay/o", "kay", "kayo"] },
  { slug: "fade",      name: "Fade",      role: "Initiator" },
  { slug: "gekko",     name: "Gekko",     role: "Initiator" },
  { slug: "tejo",      name: "Tejo",      role: "Initiator" },

  // Controllers
  { slug: "brimstone", name: "Brimstone", role: "Controller", aliases: ["brim"] },
  { slug: "omen",      name: "Omen",      role: "Controller" },
  { slug: "viper",     name: "Viper",     role: "Controller" },
  { slug: "astra",     name: "Astra",     role: "Controller" },
  { slug: "harbor",    name: "Harbor",    role: "Controller" },
  { slug: "clove",     name: "Clove",     role: "Controller" },

  // Sentinels
  { slug: "sage",      name: "Sage",      role: "Sentinel" },
  { slug: "cypher",    name: "Cypher",    role: "Sentinel" },
  { slug: "killjoy",   name: "Killjoy",   role: "Sentinel", aliases: ["kj"] },
  { slug: "chamber",   name: "Chamber",   role: "Sentinel" },
  { slug: "deadlock",  name: "Deadlock",  role: "Sentinel" },
  { slug: "vyse",      name: "Vyse",      role: "Sentinel" },

  // New agents
  { slug: "miks",      name: "Miks",      role: "New" }
];

// Lookup map: mọi tên (chính + alias) → slug
const lookupMap = {};
for (const a of VALORANT_AGENTS) {
  lookupMap[a.slug.toLowerCase()] = a;
  lookupMap[a.name.toLowerCase()] = a;
  (a.aliases || []).forEach((alias) => {
    lookupMap[alias.toLowerCase()] = a;
  });
}

export function findAgent(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase().replace(/[^a-z0-9/]/g, "");
  return lookupMap[key] || null;
}

export function agentLineupUrl(slug) {
  return `https://tracker.gg/valorant/guides/clips?agent=${encodeURIComponent(slug)}&sort=ranking`;
}

// Parse một dòng chat — trả { matched, agent, url, display } nếu là slash command agent
// hoặc null nếu không phải.
// Ví dụ: "/jett" → { agent: Jett, url: "...", display: "🎯 Lineup Jett → ..." }
export function parseAgentCommand(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const cmd = trimmed.slice(1).split(/\s+/)[0];
  if (!cmd) return null;

  const agent = findAgent(cmd);
  if (!agent) return null;

  const url = agentLineupUrl(agent.slug);
  return {
    agent,
    url,
    display: `🎯 Lineup ${agent.name} → ${url}`
  };
}
