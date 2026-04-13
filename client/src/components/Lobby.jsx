import { useState, useMemo } from "react";
import { CYBER, CYBER_BG, GRID_PATTERN_URL, neonGlow } from "../constants/theme";
import GoldBtn from "./ui/GoldBtn";
import RoomCard from "./RoomCard";
import apiClient from "../lib/apiClient";

function Lobby({game,mode,rooms,onCreateRoom,onViewRoom,onMatchFind,onBack,onBackToGame,myRoom,onEnterRoom,userBadge}){
  const [search,setSearch]=useState("");
  const [fRank,setFRank]=useState("");
  const [fStatus,setFStatus]=useState("");
  const accent=game?.accent||CYBER.cyan;
  const gameRanks=game?.ranks||[];
  const hasRanks=!!game?.hasRanks&&gameRanks.length>0;

  const filtered=useMemo(()=>rooms.filter(r=>{
    if(search&&!r.name.toLowerCase().includes(search.toLowerCase())&&!String(r.id||"").includes(search)) return false;
    if(fRank&&r.rankRange&&gameRanks.indexOf(fRank)<gameRanks.indexOf(r.rankRange[0])) return false;
    if(fRank&&r.rankRange&&gameRanks.indexOf(fRank)>gameRanks.indexOf(r.rankRange[1])) return false;
    if(fStatus&&r.status!==fStatus) return false;
    return true;
  }),[rooms,search,fRank,fStatus,gameRanks]);

  const backBtnStyle=(color)=>({
    display:"inline-flex",alignItems:"center",gap:6,
    padding:"8px 14px",background:`${CYBER.bgCard}cc`,
    border:`1px solid ${color}60`,borderRadius:4,
    color:color,fontSize:11,fontWeight:700,cursor:"pointer",
    textTransform:"uppercase",letterSpacing:1.5,
    fontFamily:"'JetBrains Mono', monospace",
    boxShadow:`0 0 8px ${color}30, inset 0 0 6px ${color}10`,
    transition:"all .2s"
  });

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:CYBER_BG,fontFamily:"'Inter', sans-serif",position:"relative"}}>
      {/* Subtle grid overlay */}
      <div style={{position:"fixed",inset:0,opacity:.18,
        backgroundImage:GRID_PATTERN_URL,backgroundSize:"60px 60px",
        pointerEvents:"none",zIndex:0
      }}/>

      {/* Top bar */}
      <div style={{
        padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:`1px solid ${CYBER.border}`,
        background:`linear-gradient(180deg, ${CYBER.bgCard}ee, ${CYBER.bgDeep}dd)`,
        backdropFilter:"blur(8px)",
        flexWrap:"wrap",gap:10,position:"relative",zIndex:2
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          {/* Back buttons */}
          {onBackToGame && (
            <button
              onClick={onBackToGame}
              style={backBtnStyle(CYBER.magenta)}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 14px ${CYBER.magenta}60, inset 0 0 10px ${CYBER.magenta}20`;}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 0 8px ${CYBER.magenta}30, inset 0 0 6px ${CYBER.magenta}10`;}}
              title="Về trang chọn game"
            >
              ← GAME
            </button>
          )}
          <button
            onClick={onBack}
            style={backBtnStyle(CYBER.cyan)}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 14px ${CYBER.cyan}60, inset 0 0 10px ${CYBER.cyan}20`;}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 0 8px ${CYBER.cyan}30, inset 0 0 6px ${CYBER.cyan}10`;}}
            title="Về trang chọn chế độ"
          >
            ← CHẾ ĐỘ
          </button>

          <div style={{marginLeft:8,display:"flex",alignItems:"center",gap:10}}>
            <span style={{
              fontFamily:"'Be Vietnam Pro', sans-serif",fontSize:18,fontWeight:900,
              color:CYBER.cyan,letterSpacing:3,
              textShadow:neonGlow(CYBER.cyan,0.5)
            }}>LOBBY</span>
            {game && (
              <span style={{
                padding:"3px 10px",borderRadius:3,
                border:`1px solid ${accent}50`,
                background:`${accent}12`,
                fontSize:10,color:accent,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,
                fontFamily:"'JetBrains Mono', monospace"
              }}>
                {game.shortName||game.name}
              </span>
            )}
            <span style={{fontSize:11,color:CYBER.textSecondary,textTransform:"uppercase",letterSpacing:1,fontFamily:"'JetBrains Mono', monospace"}}>
              / {mode.icon} {mode.name}{mode.players?` / ${mode.players}p`:""}
            </span>
          </div>
        </div>

        {/* User badge — center of top bar */}
        {userBadge && (
          <div style={{display:"flex",alignItems:"center"}}>
            {userBadge}
          </div>
        )}

        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:11,color:CYBER.textMuted,fontFamily:"'JetBrains Mono', monospace",letterSpacing:1}}>{filtered.length} phòng</span>
          <GoldBtn variant="secondary" onClick={onMatchFind}>🔍 Tìm Trận</GoldBtn>
          <GoldBtn onClick={onCreateRoom}>+ Tạo Phòng</GoldBtn>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding:"10px 20px",borderBottom:`1px solid ${CYBER.border}66`,
        display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",
        background:`${CYBER.bgDeepest}cc`,position:"relative",zIndex:2
      }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm phòng..."
          style={{padding:"8px 14px",background:CYBER.bgDeepest,border:`1px solid ${CYBER.border}`,borderRadius:4,color:CYBER.textPrimary,fontSize:12,outline:"none",width:220,fontFamily:"'JetBrains Mono', monospace"}}/>
        {hasRanks && (
          <select value={fRank} onChange={e=>setFRank(e.target.value)}
            style={{padding:"8px 12px",background:CYBER.bgDeepest,border:`1px solid ${CYBER.border}`,borderRadius:4,color:CYBER.textSecondary,fontSize:12,outline:"none"}}>
            <option value="">Mọi Rank</option>
            {gameRanks.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
          style={{padding:"8px 12px",background:CYBER.bgDeepest,border:`1px solid ${CYBER.border}`,borderRadius:4,color:CYBER.textSecondary,fontSize:12,outline:"none"}}>
          <option value="">Mọi trạng thái</option>
          <option value="looking">Đang tìm</option>
          <option value="waiting">Đang chờ</option>
          <option value="inactive">Tạm dừng</option>
        </select>
        <button onClick={async()=>{
          try{
            const res=await apiClient.get("/api/users/me");
            const gp=(res.data?.data?.gameProfiles||[]).find(p=>p.game===game?.id);
            if(!gp){alert("Bạn chưa thiết lập hồ sơ cho game này. Vào Hồ sơ để cập nhật.");return;}
            if(gp.rank) setFRank(gp.rank);
            alert(`Đã áp dụng: Rank=${gp.rank||"—"}${gp.position?`, Vị trí=${gp.position}`:""}`);
          }catch(e){alert(e?.response?.data?.message||e.message);}
        }} style={{padding:"8px 12px",background:`${accent}20`,border:`1px solid ${accent}`,borderRadius:4,color:accent,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:"'JetBrains Mono', monospace"}}>
          🎯 Dùng profile
        </button>
      </div>

      {/* My room banner */}
      {myRoom&&(
        <div style={{margin:"14px 20px 0",padding:"12px 18px",
          background:`linear-gradient(90deg, ${CYBER.green}08, ${CYBER.green}18, ${CYBER.green}08)`,
          border:`1px solid ${CYBER.green}40`,borderRadius:6,
          boxShadow:`0 0 16px ${CYBER.green}20, inset 0 0 12px ${CYBER.green}08`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"relative",zIndex:1
        }}>
          <div>
            <span style={{color:CYBER.green,fontSize:13,fontWeight:700,textShadow:`0 0 8px ${CYBER.green}60`}}>✦ Phòng của bạn: {myRoom.name}</span>
            <span style={{color:CYBER.textMuted,fontSize:11,marginLeft:12,fontFamily:"'JetBrains Mono', monospace"}}>
              {myRoom.members?.length||0}/{myRoom.maxPlayers}
            </span>
          </div>
          <GoldBtn variant="success" size="sm" onClick={onEnterRoom}>Vào Phòng</GoldBtn>
        </div>
      )}

      {/* Room grid */}
      <div style={{flex:1,padding:"18px 20px",overflowY:"auto",
        display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",
        gap:14,alignContent:"start",position:"relative",zIndex:1
      }}>
        {filtered.length===0?(
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:"70px 20px"}}>
            <div style={{fontSize:44,marginBottom:14,filter:`drop-shadow(0 0 18px ${CYBER.cyan}80)`}}>🏠</div>
            <div style={{fontSize:14,color:CYBER.textSecondary,fontFamily:"'JetBrains Mono', monospace",letterSpacing:1}}>&gt; Chưa có phòng nào phù hợp</div>
            <div style={{fontSize:11,color:CYBER.textMuted,marginTop:6,fontFamily:"'JetBrains Mono', monospace"}}>Tạo phòng mới hoặc thử tìm trận tự động</div>
          </div>
        ):(
          filtered.map(room=><RoomCard key={room.id} room={room} onClick={()=>onViewRoom(room)} isOwn={myRoom?.id===room.id}/>)
        )}
      </div>
    </div>
  );
}

export default Lobby;
