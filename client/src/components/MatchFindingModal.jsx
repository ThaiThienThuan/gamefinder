import { useState, useEffect, useRef } from "react";
import { RANKS, POSITIONS, PLAY_STYLES } from "../constants";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import GoldBtn from "./ui/GoldBtn";

function MatchFindingModal({isOpen,onClose,mode,rooms,onJoinRoom,onQueue}){
  const [profile,setProfile]=useState({rank:"Gold",position:"Mid",style:"Farming"});
  const [searching,setSearching]=useState(false);
  const [found,setFound]=useState(null);
  const [qt,setQt]=useState(0);
  const timer=useRef(null);
  const set=(k,v)=>setProfile(p=>({...p,[k]:v}));

  const startSearch=()=>{
    setSearching(true); setQt(0);
    const matched=rooms.find(r=>
      r.status==="looking"&&r.members.length<r.maxPlayers&&
      RANKS.indexOf(profile.rank)>=RANKS.indexOf(r.rankRange[0])&&
      RANKS.indexOf(profile.rank)<=RANKS.indexOf(r.rankRange[1])
    );
    if(matched){
      setTimeout(()=>{setFound(matched);setSearching(false);},1800);
    }else{
      timer.current=setInterval(()=>{
        setQt(p=>{
          if(p>=12){clearInterval(timer.current);setSearching(false);onQueue(profile);onClose();return p;}
          return p+1;
        });
      },1000);
    }
  };

  useEffect(()=>()=>{if(timer.current)clearInterval(timer.current);},[]);
  const closeAll=()=>{if(timer.current)clearInterval(timer.current);setSearching(false);setFound(null);onClose();};

  return(
    <Modal isOpen={isOpen} onClose={closeAll} title="Tìm Trận Tự Động" width={460}>
      {!searching&&!found?(
        <>
          <Field label="Rank của bạn" value={profile.rank} onChange={v=>set("rank",v)} options={RANKS}/>
          {mode.id!=="tft"&&<Field label="Vị trí mong muốn" value={profile.position} onChange={v=>set("position",v)} options={POSITIONS}/>}
          <Field label="Phong cách chơi" value={profile.style} onChange={v=>set("style",v)} options={PLAY_STYLES}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18}}>
            <GoldBtn variant="secondary" onClick={closeAll}>Hủy</GoldBtn>
            <GoldBtn onClick={startSearch}>Tìm Trận</GoldBtn>
          </div>
        </>
      ):found?(
        <div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{fontSize:36,marginBottom:14}}>✅</div>
          <div style={{color:"#2aff5a",fontSize:17,fontWeight:700,marginBottom:8,fontFamily:"'Be Vietnam Pro', sans-serif"}}>Đã tìm thấy phòng!</div>
          <div style={{color:"#8b8072",fontSize:13,marginBottom:18}}>{found.name}</div>
          <GoldBtn onClick={()=>{onJoinRoom(found.id);closeAll();}}>Tham Gia Ngay</GoldBtn>
        </div>
      ):(
        <div style={{textAlign:"center",padding:"36px 0"}}>
          <div style={{position:"relative",width:90,height:90,margin:"0 auto 18px"}}>
            <div style={{width:90,height:90,borderRadius:"50%",border:"3px solid #222",borderTopColor:"#c89b3c",animation:"spin 1s linear infinite"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#c8aa6e"}}>{qt}s</div>
          </div>
          <div style={{color:"#c8aa6e",fontSize:15,marginBottom:4,fontFamily:"'Be Vietnam Pro', sans-serif"}}>Đang tìm kiếm...</div>
          <div style={{color:"#5b5a56",fontSize:12,marginBottom:18}}>Hệ thống đang so khớp yêu cầu</div>
          <GoldBtn variant="secondary" onClick={()=>{if(timer.current)clearInterval(timer.current);setSearching(false);}}>Hủy Tìm</GoldBtn>
        </div>
      )}
    </Modal>
  );
}

export default MatchFindingModal;
