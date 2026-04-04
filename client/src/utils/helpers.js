import { RANKS, POSITIONS, PLAY_STYLES, NAMES } from "../constants";

export const pick  = arr => arr[Math.floor(Math.random()*arr.length)];
export const randInt = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
export const uid = () => Math.random().toString(36).substr(2,9);

export function makeRoom(mode){
  const max = mode.players;
  const cur = randInt(1, max-1);
  const members = Array.from({length:cur},()=>({
    id:uid(), name:pick(NAMES), rank:pick(RANKS),
    position: mode.id==="tft"?"N/A":pick(POSITIONS), style:pick(PLAY_STYLES),
  }));
  const ri = Math.round(members.reduce((s,m)=>s+RANKS.indexOf(m.rank),0)/members.length);
  return {
    id:uid(),
    name:`${pick(NAMES)}'s Room`,
    mode:mode.id, maxPlayers:max, members,
    avgRank: RANKS[ri]||"Gold",
    status: pick(["looking","waiting","inactive"]),
    voiceChat: Math.random()>0.4,
    rankRange:[RANKS[Math.max(0,ri-2)], RANKS[Math.min(RANKS.length-1,ri+2)]],
    positionsNeeded: mode.id==="tft"?[]:POSITIONS.filter(()=>Math.random()>0.5),
    stylePreference: pick(PLAY_STYLES),
    createdAt: Date.now()-randInt(0,3600000),
    requests:[], note:"",
  };
}
