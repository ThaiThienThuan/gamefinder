import { useState, useMemo } from "react";
import { RANKS } from "../constants";
import GoldBtn from "./ui/GoldBtn";
import RoomCard from "./RoomCard";

function Lobby({mode,rooms,onCreateRoom,onViewRoom,onMatchFind,onBack,myRoom,onEnterRoom}){
  const [search,setSearch]=useState("");
  const [fRank,setFRank]=useState("");
  const [fStatus,setFStatus]=useState("");

  const filtered=useMemo(()=>rooms.filter(r=>{
    if(search&&!r.name.toLowerCase().includes(search.toLowerCase())&&!r.id.includes(search)) return false;
    if(fRank&&RANKS.indexOf(fRank)<RANKS.indexOf(r.rankRange[0])) return false;
    if(fRank&&RANKS.indexOf(fRank)>RANKS.indexOf(r.rankRange[1])) return false;
    if(fStatus&&r.status!==fStatus) return false;
    return true;
  }),[rooms,search,fRank,fStatus]);

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{
        padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid #c89b3c18",background:"linear-gradient(180deg,#12121e,#0d0d1a)",
        flexWrap:"wrap",gap:10,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <button onClick={onBack} style={{background:"none",border:"1px solid #333",borderRadius:4,color:"#5b5a56",fontSize:16,cursor:"pointer",padding:"4px 10px",transition:"all .2s"}}
            onMouseEnter={e=>e.target.style.borderColor="#c89b3c"} onMouseLeave={e=>e.target.style.borderColor="#333"}>←</button>
          <div>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"#c8aa6e",letterSpacing:2}}>LOBBY</span>
            <span style={{marginLeft:12,fontSize:11,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1}}>{mode.icon} {mode.name} • {mode.players}v{mode.players === 8 ? '8' : '5'}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#444",marginRight:4}}>{filtered.length} phòng</span>
          <GoldBtn variant="secondary" onClick={onMatchFind}>🔍 Tìm Trận</GoldBtn>
          <GoldBtn onClick={onCreateRoom}>+ Tạo Phòng</GoldBtn>
        </div>
      </div>

      {/* Filters */}
      <div style={{padding:"10px 20px",borderBottom:"1px solid #111",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",background:"#080814"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm phòng..."
          style={{padding:"7px 14px",background:"#0a0a14",border:"1px solid #1a1a2e",borderRadius:4,color:"#a09b8c",fontSize:12,outline:"none",width:200}}/>
        <select value={fRank} onChange={e=>setFRank(e.target.value)}
          style={{padding:"7px 12px",background:"#0a0a14",border:"1px solid #1a1a2e",borderRadius:4,color:"#a09b8c",fontSize:12,outline:"none"}}>
          <option value="">Mọi Rank</option>
          {RANKS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
          style={{padding:"7px 12px",background:"#0a0a14",border:"1px solid #1a1a2e",borderRadius:4,color:"#a09b8c",fontSize:12,outline:"none"}}>
          <option value="">Mọi trạng thái</option>
          <option value="looking">Đang tìm</option>
          <option value="waiting">Đang chờ</option>
          <option value="inactive">Tạm dừng</option>
        </select>
      </div>

      {/* My room banner */}
      {myRoom&&(
        <div style={{margin:"14px 20px 0",padding:"12px 18px",
          background:"linear-gradient(90deg,#2aff5a06,#2aff5a12,#2aff5a06)",
          border:"1px solid #2aff5a25",borderRadius:8,
          display:"flex",justifyContent:"space-between",alignItems:"center",
        }}>
          <div>
            <span style={{color:"#2aff5a",fontSize:13,fontWeight:700}}>✦ Phòng của bạn: {myRoom.name}</span>
            <span style={{color:"#5b5a56",fontSize:11,marginLeft:12}}>
              {myRoom.members.length}/{myRoom.maxPlayers}
              {myRoom.requests.length>0&&` • 🔔 ${myRoom.requests.length} yêu cầu mới`}
            </span>
          </div>
          <GoldBtn variant="success" size="sm" onClick={onEnterRoom}>Vào Phòng</GoldBtn>
        </div>
      )}

      {/* Room grid */}
      <div style={{flex:1,padding:"18px 20px",overflowY:"auto",
        display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",
        gap:14,alignContent:"start",
      }}>
        {filtered.length===0?(
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:"70px 20px",color:"#333"}}>
            <div style={{fontSize:44,marginBottom:14}}>🏠</div>
            <div style={{fontSize:15,color:"#5b5a56",fontFamily:"'Playfair Display',serif"}}>Chưa có phòng nào phù hợp</div>
            <div style={{fontSize:12,color:"#333",marginTop:6}}>Hãy tạo phòng hoặc thử tìm trận tự động</div>
          </div>
        ):(
          filtered.map(room=><RoomCard key={room.id} room={room} onClick={()=>onViewRoom(room)} isOwn={myRoom?.id===room.id}/>)
        )}
      </div>
    </div>
  );
}

export default Lobby;
