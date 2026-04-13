// Riot API lookup — League of Legends only (Valorant requires Production key).
// Uses Dev API key in RIOT_API_KEY (expires every 24h — regenerate at developer.riotgames.com).

// Regional routing for account-v1 (Riot ID -> puuid)
const ACCOUNT_ROUTE = {
  vn: 'asia', kr: 'asia', jp: 'asia', tw: 'asia', sg: 'asia', ph: 'asia', th: 'asia', id: 'asia',
  euw: 'europe', eune: 'europe', tr: 'europe', ru: 'europe',
  na: 'americas', br: 'americas', lan: 'americas', las: 'americas', oce: 'americas',
};

// Platform host for summoner-v4 / league-v4
const PLATFORM_HOST = {
  vn: 'vn2', kr: 'kr', jp: 'jp1', tw: 'tw2', sg: 'sg2', ph: 'ph2', th: 'th2',
  euw: 'euw1', eune: 'eun1', tr: 'tr1', ru: 'ru',
  na: 'na1', br: 'br1', lan: 'la1', las: 'la2', oce: 'oc1',
};

function rankFromEntry(entries) {
  // entries is array from /lol/league/v4/entries/by-summoner/{id}
  if (!Array.isArray(entries) || entries.length === 0) return '';
  const solo = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5') || entries[0];
  return `${solo.tier} ${solo.rank} — ${solo.leaguePoints} LP`.trim();
}

async function riotFetch(url, key) {
  const r = await fetch(url, { headers: { 'X-Riot-Token': key } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const err = new Error(`Riot API ${r.status}: ${body.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

class RiotController {
  async lookupSummoner(req, res) {
    try {
      const key = process.env.RIOT_API_KEY;
      if (!key) {
        return res.status(503).json({ success: false, message: 'Server missing RIOT_API_KEY' });
      }
      const name = String(req.query.name || '').trim();
      const tag = String(req.query.tag || '').trim();
      const region = String(req.query.region || 'vn').toLowerCase();

      if (!name || !tag) {
        return res.status(400).json({ success: false, message: 'name and tag are required (e.g. Faker / KR1)' });
      }
      const accountRoute = ACCOUNT_ROUTE[region];
      const platform = PLATFORM_HOST[region];
      if (!accountRoute || !platform) {
        return res.status(400).json({ success: false, message: `Unsupported region: ${region}` });
      }

      const headers = { 'X-Riot-Token': key };

      // 1) Riot ID -> puuid
      const accUrl = `https://${accountRoute}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
      const accRes = await fetch(accUrl, { headers });
      if (!accRes.ok) {
        const body = await accRes.text().catch(() => '');
        return res.status(accRes.status).json({ success: false, message: `Riot account lookup failed (${accRes.status})`, detail: body.slice(0, 200) });
      }
      const acc = await accRes.json();

      // 2) puuid -> summoner (id)
      const sumUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${acc.puuid}`;
      const sumRes = await fetch(sumUrl, { headers });
      if (!sumRes.ok) {
        const body = await sumRes.text().catch(() => '');
        return res.status(sumRes.status).json({ success: false, message: `Summoner lookup failed (${sumRes.status})`, detail: body.slice(0, 200) });
      }
      const sum = await sumRes.json();

      // 3) summoner id -> league entries
      const leagueUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${sum.id}`;
      const leagueRes = await fetch(leagueUrl, { headers });
      const entries = leagueRes.ok ? await leagueRes.json() : [];

      res.status(200).json({
        success: true,
        data: {
          riotId: `${acc.gameName}#${acc.tagLine}`,
          ign: `${acc.gameName}#${acc.tagLine}`,
          puuid: acc.puuid,
          summonerLevel: sum.summonerLevel,
          rank: rankFromEntry(entries),
          region,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Rich profile: account + summoner + all league entries + champion mastery top N + recent matches
  async getProfile(req, res) {
    try {
      const key = process.env.RIOT_API_KEY;
      if (!key) return res.status(503).json({ success: false, message: 'Server missing RIOT_API_KEY' });

      const name = String(req.query.name || '').trim();
      const tag = String(req.query.tag || '').trim();
      const region = String(req.query.region || 'vn').toLowerCase();
      const matchCount = Math.min(20, Math.max(1, Number(req.query.matches) || 10));

      if (!name || !tag) return res.status(400).json({ success: false, message: 'name and tag are required' });

      const accountRoute = ACCOUNT_ROUTE[region];
      const platform = PLATFORM_HOST[region];
      if (!accountRoute || !platform) return res.status(400).json({ success: false, message: `Unsupported region: ${region}` });

      // 1) Account
      const acc = await riotFetch(
        `https://${accountRoute}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
        key
      );

      // 2) Summoner (by puuid)
      const sum = await riotFetch(
        `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${acc.puuid}`,
        key
      );

      // 3) League entries (all queues) — try by-puuid (newer) then fall back to by-summoner
      let entries = [];
      try {
        entries = await riotFetch(
          `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${acc.puuid}`,
          key
        );
      } catch {
        try {
          entries = await riotFetch(
            `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${sum.id}`,
            key
          );
        } catch {}
      }

      // 4) Champion mastery — top 5 by points
      let mastery = [];
      try {
        mastery = await riotFetch(
          `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${acc.puuid}/top?count=5`,
          key
        );
      } catch {}

      // 5) Match IDs
      let matchIds = [];
      try {
        matchIds = await riotFetch(
          `https://${accountRoute}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?start=0&count=${matchCount}`,
          key
        );
      } catch {}

      // 6) Match details — parallel
      const matches = await Promise.all(
        matchIds.map(async (id) => {
          try {
            const m = await riotFetch(
              `https://${accountRoute}.api.riotgames.com/lol/match/v5/matches/${id}`,
              key
            );
            const me = (m.info?.participants || []).find((p) => p.puuid === acc.puuid);
            if (!me) return null;
            return {
              matchId: id,
              queueId: m.info.queueId,
              gameMode: m.info.gameMode,
              gameDuration: m.info.gameDuration,
              gameCreation: m.info.gameCreation,
              win: me.win,
              championName: me.championName,
              championId: me.championId,
              champLevel: me.champLevel,
              kills: me.kills,
              deaths: me.deaths,
              assists: me.assists,
              kda: me.deaths === 0 ? (me.kills + me.assists) : ((me.kills + me.assists) / me.deaths),
              cs: (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0),
              goldEarned: me.goldEarned,
              totalDamageDealtToChampions: me.totalDamageDealtToChampions,
              visionScore: me.visionScore,
              teamPosition: me.teamPosition || me.individualPosition,
              items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6],
              summoner1Id: me.summoner1Id,
              summoner2Id: me.summoner2Id,
            };
          } catch { return null; }
        })
      );

      res.json({
        success: true,
        data: {
          region,
          account: {
            riotId: `${acc.gameName}#${acc.tagLine}`,
            gameName: acc.gameName,
            tagLine: acc.tagLine,
            puuid: acc.puuid,
          },
          summoner: {
            summonerLevel: sum.summonerLevel,
            profileIconId: sum.profileIconId,
            revisionDate: sum.revisionDate,
          },
          leagueEntries: entries,
          mastery,
          matches: matches.filter(Boolean),
        },
      });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }
}

module.exports = RiotController;
