import { POS_ICONS } from "../constants";
import Modal from "./ui/Modal";
import RankBadge from "./ui/RankBadge";
import StatusDot from "./ui/StatusDot";
import GoldBtn from "./ui/GoldBtn";

function RoomDetailModal({isOpen,onClose,room,isOwn=false,onEnter,onJoin}){
  if(!room) return null;
  const isFull=(room.current||room.members?.length||0)>=(room.maxPlayers||5);

  return(
    <Modal isOpen={isOpen} onClose={onClose} title="Chi Tiết Phòng" width={540}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Be Vietnam Pro', sans-serif",fontSize:20,fontWeight:700,color:"#c8aa6e"}}>{room.name}</div>
          <div style={{fontSize:11,color:"#444",marginTop:2}}>#{String(room.id||"").substring(0,6).toUpperCase()}</div>
        </div>
        <StatusDot status={room.status}/>
      </div>

      {/* Info grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,padding:14,background:"#0a0a14",borderRadius:8,border:"1px solid #1a1a2e",marginBottom:18}}>
        {room.rankRange?.[0] && (
          <div>
            <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Rank yêu cầu</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <RankBadge rank={room.rankRange[0]} size="sm"/><span style={{color:"#333"}}>→</span><RankBadge rank={room.rankRange[1]||room.rankRange[0]} size="sm"/>
            </div>
          </div>
        )}
        {room.stylePreference && (
          <div>
            <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Phong cách</div>
            <div style={{color:"#a09b8c",fontSize:13}}>{room.stylePreference}</div>
          </div>
        )}
        {room.positionsNeeded?.length > 0 && (
          <div>
            <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Cần vị trí</div>
            <div style={{color:"#a09b8c",fontSize:12}}>{room.positionsNeeded.join(", ")}</div>
          </div>
        )}
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Voice Chat</div>
          <div style={{color:room.voiceChat?"#2aff5a":"#555",fontSize:13}}>{room.voiceChat?"🎤 Bắt buộc":"Không yêu cầu"}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Thành viên</div>
          <div style={{color:"#c8aa6e",fontSize:14,fontWeight:700}}>{room.current||room.members?.length||0}/{room.maxPlayers||5}</div>
        </div>
      </div>

      {room.note&&(
        <div style={{padding:"10px 14px",background:"#c89b3c08",border:"1px solid #c89b3c20",borderRadius:6,marginBottom:18}}>
          <div style={{fontSize:10,color:"#c89b3c",marginBottom:4,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Ghi chú từ chủ phòng</div>
          <div style={{color:"#a09b8c",fontSize:12,lineHeight:1.5}}>{room.note}</div>
        </div>
      )}

      {/* Members */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12,color:"#8b8072",marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Thành viên hiện tại</div>
        {(room.members||[]).map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 10px",borderBottom:"1px solid #111"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#1e2328,#2a2a3e)",border:"2px solid #333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>👤</div>
              <div>
                <div style={{color:"#c8aa6e",fontSize:13,fontWeight:600}}>{m.name}</div>
                <div style={{fontSize:11,color:"#5b5a56"}}>{POS_ICONS[m.position]} {m.position} • {m.style}</div>
              </div>
            </div>
            <RankBadge rank={m.rank} size="sm"/>
          </div>
        ))}
      </div>

      {/* Owner → Vào Phòng */}
      {isOwn&&(
        <>
          <div style={{padding:"10px 14px",marginBottom:14,background:"#2aff5a10",border:"1px solid #2aff5a35",borderRadius:6,color:"#2aff5a",fontSize:12,textAlign:"center",fontWeight:600}}>
            ✦ Đây là phòng của bạn
          </div>
          <GoldBtn onClick={()=>{onEnter?.(room);onClose();}} size="lg" style={{width:"100%"}}>
            Vào Phòng
          </GoldBtn>
        </>
      )}

      {/* Non-owner → Tham Gia (join atomic, không qua approval) */}
      {!isOwn&&!isFull&&(
        <GoldBtn onClick={()=>onJoin?.(room)} size="lg" style={{width:"100%"}}>
          Tham Gia Phòng
        </GoldBtn>
      )}

      {!isOwn&&isFull&&(
        <div style={{padding:"12px 14px",background:"#3b141410",border:"1px solid #c8414140",borderRadius:6,color:"#e8908e",fontSize:13,textAlign:"center"}}>
          Phòng đã đầy
        </div>
      )}
    </Modal>
  );
}

export default RoomDetailModal;
