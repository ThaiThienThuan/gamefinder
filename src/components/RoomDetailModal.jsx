import { useState, useEffect } from "react";
import { POS_ICONS } from "../constants";
import Modal from "./ui/Modal";
import RankBadge from "./ui/RankBadge";
import StatusDot from "./ui/StatusDot";
import GoldBtn from "./ui/GoldBtn";

function RoomDetailModal({isOpen,onClose,room,onRequestJoin,isPending,onCancelRequest}){
  const [note,setNote]=useState("");
  const [sent,setSent]=useState(false);
  useEffect(()=>{setSent(false);setNote("");},[room]);
  useEffect(()=>{if(!isPending&&sent) setSent(false);},[isPending]);
  if(!room) return null;
  return(
    <Modal isOpen={isOpen} onClose={onClose} title="Chi Tiết Phòng" width={540}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#c8aa6e"}}>{room.name}</div>
          <div style={{fontSize:11,color:"#444",marginTop:2}}>#{room.id.substring(0,6).toUpperCase()}</div>
        </div>
        <StatusDot status={room.status}/>
      </div>
      {/* Info grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,padding:14,background:"#0a0a14",borderRadius:8,border:"1px solid #1a1a2e",marginBottom:18}}>
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Rank yêu cầu</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <RankBadge rank={room.rankRange[0]} size="sm"/><span style={{color:"#333"}}>→</span><RankBadge rank={room.rankRange[1]} size="sm"/>
          </div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Phong cách</div>
          <div style={{color:"#a09b8c",fontSize:13}}>{room.stylePreference}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Voice Chat</div>
          <div style={{color:room.voiceChat?"#2aff5a":"#555",fontSize:13}}>{room.voiceChat?"🎤 Bắt buộc":"Không yêu cầu"}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Thành viên</div>
          <div style={{color:"#c8aa6e",fontSize:14,fontWeight:700}}>{room.members.length}/{room.maxPlayers}</div>
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
        {room.members.map(m=>(
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
      {/* Request to join */}
      {room.members.length<room.maxPlayers&&!sent&&(
        <>
          <div style={{marginBottom:14}}>
            <label style={{color:"#8b8072",fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6,fontWeight:600}}>Ghi chú xin vào phòng</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Giới thiệu bản thân, lý do muốn tham gia..." rows={2}
              style={{width:"100%",padding:"9px 12px",background:"#0a0a14",border:"1px solid #333",borderRadius:4,color:"#a09b8c",fontSize:12,outline:"none",resize:"none"}}/>
          </div>
          <GoldBtn onClick={()=>{onRequestJoin(room.id,note);setSent(true);}} size="lg" style={{width:"100%"}}>
            Gửi Yêu Cầu Tham Gia
          </GoldBtn>
        </>
      )}
      {sent&&(
        <div style={{textAlign:"center",padding:"18px 14px",background:"#c89b3c0c",borderRadius:8,border:"1px solid #c89b3c25"}}>
          <div style={{color:"#c8aa6e",fontSize:14,fontWeight:600,marginBottom:10}}>Đã gửi yêu cầu!</div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginBottom:12}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#c89b3c",animation:"pulse 1s infinite"}}/>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#c89b3c",animation:"pulse 1s .33s infinite"}}/>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#c89b3c",animation:"pulse 1s .66s infinite"}}/>
          </div>
          <div style={{color:"#8b8072",fontSize:12,marginBottom:14}}>Đang chờ chủ phòng phê duyệt...</div>
          <button onClick={()=>{onCancelRequest();setSent(false);onClose();}}
            style={{fontSize:11,color:"#888",background:"none",border:"1px solid #333",borderRadius:4,
              padding:"6px 18px",cursor:"pointer",transition:"border-color .2s"}}
            onMouseOver={e=>e.target.style.borderColor="#c89b3c"}
            onMouseOut={e=>e.target.style.borderColor="#333"}>
            Hủy yêu cầu
          </button>
        </div>
      )}
    </Modal>
  );
}

export default RoomDetailModal;
