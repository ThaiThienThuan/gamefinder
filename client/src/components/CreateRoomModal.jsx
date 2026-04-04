import { useState } from "react";
import { RANKS, POSITIONS, PLAY_STYLES } from "../constants";
import { uid } from "../utils/helpers";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import GoldBtn from "./ui/GoldBtn";

function CreateRoomModal({isOpen,onClose,mode,onCreate}){
  const [cfg,setCfg]=useState({name:"",rankMin:"Silver",rankMax:"Diamond",positions:[],style:"Farming",voiceChat:true,note:""});
  const set=(k,v)=>setCfg(p=>({...p,[k]:v}));
  const create=()=>{
    const room={
      id:uid(), name:cfg.name||`Phòng ${uid().substring(0,4).toUpperCase()}`,
      mode:mode.id, maxPlayers:mode.players,
      members:[{id:"self",name:"Bạn (Chủ phòng)",rank:cfg.rankMin,position:cfg.positions[0]||"Mid",style:cfg.style}],
      avgRank:cfg.rankMin, status:"looking", voiceChat:cfg.voiceChat,
      rankRange:[cfg.rankMin,cfg.rankMax],
      positionsNeeded:mode.id==="tft"?[]:POSITIONS.filter(p=>!cfg.positions.includes(p)),
      stylePreference:cfg.style, createdAt:Date.now(), requests:[], note:cfg.note,
    };
    onCreate(room); onClose();
  };
  return(
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Phòng Mới" width={500}>
      <div style={{marginBottom:14}}>
        <label style={{color:"#8b8072",fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6,fontWeight:600}}>Tên Phòng</label>
        <input value={cfg.name} onChange={e=>set("name",e.target.value)} placeholder="Nhập tên phòng..."
          style={{width:"100%",padding:"9px 12px",background:"#0a0a14",border:"1px solid #333",borderRadius:4,color:"#c8aa6e",fontSize:13,outline:"none"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Rank tối thiểu" value={cfg.rankMin} onChange={v=>set("rankMin",v)} options={RANKS}/>
        <Field label="Rank tối đa" value={cfg.rankMax} onChange={v=>set("rankMax",v)} options={RANKS}/>
      </div>
      {mode.id!=="tft"&&<Field label="Vị trí cần tìm" value={cfg.positions} onChange={v=>set("positions",v)} options={POSITIONS} multi/>}
      <Field label="Phong cách chơi" value={cfg.style} onChange={v=>set("style",v)} options={PLAY_STYLES}/>
      {/* Voice toggle */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <label style={{color:"#8b8072",fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Voice Chat</label>
        <button onClick={()=>set("voiceChat",!cfg.voiceChat)} style={{
          width:44,height:24,borderRadius:12,background:cfg.voiceChat?"#c89b3c":"#333",
          border:"none",cursor:"pointer",position:"relative",transition:"background .2s",
        }}>
          <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,
            left:cfg.voiceChat?22:2,transition:"left .2s",boxShadow:"0 1px 4px #00000040"}}/>
        </button>
        <span style={{fontSize:11,color:cfg.voiceChat?"#c8aa6e":"#555"}}>{cfg.voiceChat?"Bật":"Tắt"}</span>
      </div>
      <div style={{marginBottom:18}}>
        <label style={{color:"#8b8072",fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6,fontWeight:600}}>Ghi chú</label>
        <textarea value={cfg.note} onChange={e=>set("note",e.target.value)} placeholder="Mô tả thêm yêu cầu..." rows={3}
          style={{width:"100%",padding:"9px 12px",background:"#0a0a14",border:"1px solid #333",borderRadius:4,color:"#a09b8c",fontSize:12,outline:"none",resize:"vertical"}}/>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <GoldBtn variant="secondary" onClick={onClose}>Hủy</GoldBtn>
        <GoldBtn onClick={create}>Tạo Phòng</GoldBtn>
      </div>
    </Modal>
  );
}

export default CreateRoomModal;
