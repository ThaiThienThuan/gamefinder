import { useState, useEffect } from "react";
import apiClient from "../lib/apiClient";
import { CYBER, CYBER_BG } from "../constants/theme";
import GoldBtn from "../components/ui/GoldBtn";

const DD_VER = "14.24.1"; // Data Dragon version for icon assets
const ddIcon = (type, name) => `https://ddragon.leagueoflegends.com/cdn/${DD_VER}/img/${type}/${name}.png`;
const profileIcon = (id) => `https://ddragon.leagueoflegends.com/cdn/${DD_VER}/img/profileicon/${id}.png`;
const QUEUE_NAMES = {
  420: "Ranked Solo/Duo", 440: "Ranked Flex", 400: "Normal Draft", 430: "Normal Blind",
  450: "ARAM", 700: "Clash", 900: "URF", 1700: "Arena", 1020: "One for All",
};
const TIER_COLORS = {
  IRON: "#6b5b4d", BRONZE: "#a66f3c", SILVER: "#9aa6b0", GOLD: "#e3b54b",
  PLATINUM: "#4ecdc4", EMERALD: "#3fd26a", DIAMOND: "#6ba6ff",
  MASTER: "#c26cf0", GRANDMASTER: "#ff4757", CHALLENGER: "#f5e98f",
};

const REGIONS = [
  { v: "vn", l: "VN" }, { v: "kr", l: "KR" }, { v: "jp", l: "JP" },
  { v: "euw", l: "EUW" }, { v: "eune", l: "EUNE" }, { v: "na", l: "NA" },
  { v: "br", l: "BR" }, { v: "oce", l: "OCE" }, { v: "tr", l: "TR" },
];

export default function RiotLookupPage({ onBack }) {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("vn");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [champMap, setChampMap] = useState({}); // id -> {id: "Aatrox", name: "Aatrox"}

  useEffect(() => {
    fetch(`https://ddragon.leagueoflegends.com/cdn/${DD_VER}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((j) => {
        const m = {};
        Object.values(j.data || {}).forEach((c) => { m[Number(c.key)] = c; });
        setChampMap(m);
      })
      .catch(() => {});
  }, []);

  const search = async () => {
    const raw = riotId.trim();
    if (!raw.includes("#")) { setErr("Riot ID phải có dạng Name#Tag (vd: Faker#KR1)"); return; }
    const [name, tag] = raw.split("#");
    setLoading(true); setErr(""); setData(null);
    try {
      const res = await apiClient.get("/api/riot/profile", { params: { name, tag, region, matches: 15 } });
      setData(res.data?.data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  const soloEntry = data?.leagueEntries?.find((e) => e.queueType === "RANKED_SOLO_5x5");
  const flexEntry = data?.leagueEntries?.find((e) => e.queueType === "RANKED_FLEX_SR");

  return (
    <div style={{ minHeight: "100vh", background: CYBER_BG, color: CYBER.textPrimary, padding: "28px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <GoldBtn variant="ghost" size="sm" onClick={onBack}>← Quay lại</GoldBtn>
        <h2 style={{ margin: 0, color: CYBER.cyan, letterSpacing: 3, textTransform: "uppercase" }}>// RIOT LOOKUP — LEAGUE OF LEGENDS</h2>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, maxWidth: 800 }}>
        <input value={riotId} onChange={(e) => setRiotId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Game name + #TAG (vd: Faker#KR1)"
          style={{ flex: 1, padding: "10px 14px", background: "#0d0d1a", border: `1px solid ${CYBER.border}`, borderRadius: 4, color: "#dcddde", fontSize: 14, outline: "none" }} />
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          style={{ padding: "10px 14px", background: "#0d0d1a", border: `1px solid ${CYBER.border}`, borderRadius: 4, color: "#dcddde", fontSize: 14, outline: "none" }}>
          {REGIONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <GoldBtn onClick={search} disabled={loading}>{loading ? "Đang tra..." : "Tra cứu"}</GoldBtn>
      </div>

      {err && <Box color="#f04747">{err}</Box>}
      {loading && <div style={{ color: "#888", padding: 20 }}>Đang tải dữ liệu từ Riot API...</div>}

      {data && (
        <div style={{ maxWidth: 1200, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header card */}
          <Section>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <img src={profileIcon(data.summoner.profileIconId)} alt=""
                  onError={(e) => { e.target.style.display = "none"; }}
                  style={{ width: 100, height: 100, borderRadius: 8, border: `2px solid ${CYBER.cyan}`, background: "#0a0614" }} />
                <div style={{
                  position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                  padding: "2px 10px", background: CYBER.cyan, color: "#0a0614",
                  borderRadius: 10, fontSize: 11, fontWeight: 900,
                }}>{data.summoner.summonerLevel}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>
                  {data.account.gameName}<span style={{ color: "#888" }}>#{data.account.tagLine}</span>
                </div>
                <div style={{ color: CYBER.cyan, fontSize: 12, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>
                  {data.region} · Level {data.summoner.summonerLevel}
                </div>
                {data.matches?.length > 0 && (() => {
                  const wins = data.matches.filter((m) => m.win).length;
                  const losses = data.matches.length - wins;
                  const avgK = (data.matches.reduce((s, m) => s + m.kills, 0) / data.matches.length).toFixed(1);
                  const avgD = (data.matches.reduce((s, m) => s + m.deaths, 0) / data.matches.length).toFixed(1);
                  const avgA = (data.matches.reduce((s, m) => s + m.assists, 0) / data.matches.length).toFixed(1);
                  return (
                    <div style={{ marginTop: 10, display: "flex", gap: 18, color: "#aaa", fontSize: 13 }}>
                      <span>📊 {data.matches.length} trận gần nhất</span>
                      <span style={{ color: "#3ba55d" }}>{wins}W</span>
                      <span style={{ color: "#f04747" }}>{losses}L</span>
                      <span>KDA TB: <b style={{ color: "#fff" }}>{avgK}/{avgD}/{avgA}</b></span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </Section>

          {/* Rank cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <RankCard title="Ranked Solo/Duo" entry={soloEntry} />
            <RankCard title="Ranked Flex" entry={flexEntry} />
          </div>

          {/* Champion mastery */}
          {data.mastery?.length > 0 && (
            <Section title="Top Champion Mastery">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {data.mastery.map((m) => {
                  const champ = champMap[m.championId];
                  const champName = champ?.name || `#${m.championId}`;
                  const champIconId = champ?.id;
                  return (
                    <div key={m.championId} style={{
                      background: "#0a0a14", border: `1px solid ${CYBER.border}`,
                      borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}>
                      {champIconId && (
                        <img src={ddIcon("champion", champIconId)} alt={champName}
                          onError={(e) => { e.target.style.display = "none"; }}
                          style={{ width: 56, height: 56, borderRadius: 6, border: `1px solid ${CYBER.cyan}60` }} />
                      )}
                      <div style={{ fontSize: 11, color: CYBER.cyan, letterSpacing: 1, fontWeight: 700 }}>LVL {m.championLevel}</div>
                      <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{champName}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{m.championPoints.toLocaleString()} pts</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Match history */}
          {data.matches?.length > 0 && (
            <Section title={`Trận gần nhất (${data.matches.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.matches.map((m) => <MatchRow key={m.matchId} m={m} />)}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function RankCard({ title, entry }) {
  if (!entry) {
    return (
      <div style={{ background: "#0a0a14", border: `1px solid ${CYBER.border}`, borderRadius: 6, padding: 16 }}>
        <div style={{ color: CYBER.cyan, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: "#888", fontSize: 14 }}>Unranked</div>
      </div>
    );
  }
  const color = TIER_COLORS[entry.tier] || CYBER.cyan;
  const total = (entry.wins || 0) + (entry.losses || 0);
  const wr = total ? Math.round((entry.wins / total) * 100) : 0;
  return (
    <div style={{ background: "#0a0a14", border: `1px solid ${color}60`, borderRadius: 6, padding: 16, boxShadow: `0 0 14px ${color}22` }}>
      <div style={{ color: CYBER.cyan, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, textTransform: "capitalize", letterSpacing: 1 }}>
        {entry.tier.toLowerCase()} {entry.rank}
      </div>
      <div style={{ marginTop: 4, color: "#aaa", fontSize: 13 }}>{entry.leaguePoints} LP</div>
      <div style={{ marginTop: 10, display: "flex", gap: 12, fontSize: 12 }}>
        <span style={{ color: "#3ba55d" }}>{entry.wins}W</span>
        <span style={{ color: "#f04747" }}>{entry.losses}L</span>
        <span style={{ color: "#fff" }}>{wr}%</span>
        {entry.hotStreak && <span style={{ color: "#ff9500" }}>🔥 Hot streak</span>}
      </div>
    </div>
  );
}

function MatchRow({ m }) {
  const ago = timeAgo(m.gameCreation);
  const mins = Math.floor(m.gameDuration / 60);
  const secs = m.gameDuration % 60;
  const kda = m.deaths === 0 ? "Perfect" : m.kda.toFixed(2);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "80px 60px 1fr auto auto auto",
      gap: 14, alignItems: "center", padding: "10px 14px",
      background: m.win ? "#0f1e1580" : "#1e0f0f80",
      border: `1px solid ${m.win ? "#3ba55d40" : "#f0474740"}`, borderRadius: 6,
    }}>
      <div>
        <div style={{ color: m.win ? "#3ba55d" : "#f04747", fontSize: 13, fontWeight: 900 }}>{m.win ? "Victory" : "Defeat"}</div>
        <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{QUEUE_NAMES[m.queueId] || `Q${m.queueId}`}</div>
        <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>{mins}:{secs.toString().padStart(2, "0")} · {ago}</div>
      </div>
      <div style={{ position: "relative" }}>
        <img src={ddIcon("champion", m.championName)} alt={m.championName}
          onError={(e) => { e.target.style.display = "none"; }}
          style={{ width: 52, height: 52, borderRadius: 6, border: "1px solid #333" }} />
        <div style={{
          position: "absolute", bottom: -4, right: -4, background: "#000",
          color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 3, border: "1px solid #444",
        }}>{m.champLevel}</div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{m.championName}</div>
        <div style={{ color: "#ccc", fontSize: 12, marginTop: 2 }}>
          <b>{m.kills}</b> / <span style={{ color: "#f04747" }}>{m.deaths}</span> / <b>{m.assists}</b>
        </div>
        <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{kda} KDA · {m.cs} CS · {m.teamPosition || "—"}</div>
      </div>
      <div style={{ color: "#aaa", fontSize: 11, textAlign: "right" }}>
        <div>💰 {(m.goldEarned / 1000).toFixed(1)}k</div>
        <div>⚔️ {(m.totalDamageDealtToChampions / 1000).toFixed(1)}k</div>
        <div>👁 {m.visionScore}</div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {m.items.filter((i) => i > 0).map((item, i) => (
          <img key={i} src={ddIcon("item", item)} alt=""
            onError={(e) => { e.target.style.display = "none"; }}
            style={{ width: 24, height: 24, borderRadius: 3, border: "1px solid #222" }} />
        ))}
      </div>
      <div />
    </div>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

const Section = ({ title, children }) => (
  <div style={{ background: "#0a0a14", border: `1px solid ${CYBER.border}`, borderRadius: 6, padding: 18 }}>
    {title && <h3 style={{ margin: "0 0 14px", color: CYBER.cyan, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>{title}</h3>}
    {children}
  </div>
);
const Box = ({ color, children }) => (
  <div style={{ padding: "10px 14px", marginBottom: 14, background: `${color}20`, border: `1px solid ${color}`, borderRadius: 4, color, fontSize: 13, maxWidth: 800 }}>{children}</div>
);
