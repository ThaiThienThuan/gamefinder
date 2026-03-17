import { useState } from "react";
import { POS_ICONS } from "../constants";
import HexBorder from "./ui/HexBorder";
import RankBadge from "./ui/RankBadge";
import StatusDot from "./ui/StatusDot";

function RoomCard({room,onClick,isOwn=false}){
  const [hovered,setHovered]=useState(false);
  const pct=(room.members.length/room.maxPlayers)*100;
  return(
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onClick={onClick}
      style={{cursor:"pointer",transition:"all .3s",transform:hovered?"translateY(-4px)":"none",opacity:room.status==="inactive"?.55:1}}
    >
      <HexBorder glow={hovered||isOwn} color={isOwn?"#2aff5a":"#c89b3c"}>
        <div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:"#c8aa6e",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {room.name}
              </div>
              <div style={{fontSize:10,color:"#333",marginTop:3}}>#{room.id.substring(0,6).toUpperCase()}</div>
            </div>
            <StatusDot status={room.status}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <RankBadge rank={room.avgRank} size="sm"/>
            {room.voiceChat&&<span style={{fontSize:10,color:"#5b9bd5",display:"flex",alignItems:"center",gap:3}}>🎤 Voice</span>}
          </div>
          {/* Progress bar */}
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:11,color:"#8b8072"}}>Thành viên</span>
              <span style={{fontSize:11,color:"#c8aa6e",fontWeight:700}}>{room.members.length}/{room.maxPlayers}</span>
            </div>
            <div style={{height:4,background:"#111",borderRadius:2,overflow:"hidden"}}>
              <div style={{
                width:`${pct}%`,height:"100%",borderRadius:2,transition:"width .5s",
                background:pct>=80?"linear-gradient(90deg,#c89b3c,#f0c060)":"linear-gradient(90deg,#5b5a56,#8b8072)",
              }}/>
            </div>
          </div>
          {/* Positions needed */}
          {room.positionsNeeded.length>0&&(
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {room.positionsNeeded.slice(0,4).map(p=>(
                <span key={p} style={{fontSize:10,padding:"2px 8px",borderRadius:3,background:"#c89b3c0c",border:"1px solid #c89b3c25",color:"#c89b3c"}}>
                  {POS_ICONS[p]} {p}
                </span>
              ))}
            </div>
          )}
          {isOwn&&(
            <div style={{marginTop:10,padding:"4px 10px",borderRadius:3,background:"#2aff5a12",border:"1px solid #2aff5a35",color:"#2aff5a",fontSize:10,textAlign:"center",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>
              ✦ Phòng của bạn
            </div>
          )}
        </div>
      </HexBorder>
    </div>
  );
}

export default RoomCard;
