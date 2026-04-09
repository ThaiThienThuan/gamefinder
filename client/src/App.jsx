import { useState, useEffect, useCallback } from "react";
import { RANKS, POSITIONS, PLAY_STYLES, NAMES } from "./constants";
import { pick, randInt, uid, makeRoom } from "./utils/helpers";
import GlobalStyles from "./components/ui/GlobalStyles";
import ModeSelection from "./components/ModeSelection";
import Lobby from "./components/Lobby";
import RoomView from "./components/RoomView";
import CreateRoomModal from "./components/CreateRoomModal";
import MatchFindingModal from "./components/MatchFindingModal";
import RoomDetailModal from "./components/RoomDetailModal";
import apiClient from "./lib/apiClient";
import { useAuth } from "./hooks/useAuth";

export default function App(){
  const [page,setPage]=useState("modeSelect");
  const [mode,setMode]=useState(null);
  const [rooms,setRooms]=useState([]);
  const [myRoom,setMyRoom]=useState(null);
  const [isOwner,setIsOwner]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [showMatch,setShowMatch]=useState(false);
  const [selRoom,setSelRoom]=useState(null);
  const [pendingJoin,setPendingJoin]=useState(null); // {roomId,requestId,snapshot}
  const [notif,setNotif]=useState(null);
  const { user, loading } = useAuth();

  const toast=useCallback((text,type="info")=>{setNotif({text,type,id:Date.now()});setTimeout(()=>setNotif(null),3500);},[]);

  const selectMode=async(m)=>{
    setMode(m);
    setPage("lobby");
    try{
      const res=await apiClient.get('/api/rooms',{params:{mode:m.id?.toUpperCase()}});
      setRooms(res.data.data||[]);
    }catch(err){
      console.error('Failed to fetch rooms:',err);
      setRooms([]);
      toast('⚠️ Không thể tải danh sách phòng','error');
    }
  };

  // Real-time simulation: rooms appear/change/disappear while in lobby
  useEffect(()=>{
    if(page!=="lobby"||!mode) return;
    const iv=setInterval(()=>{
      setRooms(prev=>{
        let u=[...prev];
        if(Math.random()>.55) u.push(makeRoom(mode));
        if(Math.random()>.65&&u.length>4){
          const i=randInt(0,u.length-1);
          if(u[i].id!==myRoom?.id) u[i]={...u[i],status:pick(["looking","waiting","inactive"])};
        }
        if(Math.random()>.75&&u.length>4){
          const i=randInt(0,u.length-1);
          if(u[i].members.length<u[i].maxPlayers&&u[i].id!==myRoom?.id)
            u[i]={...u[i],members:[...u[i].members,{id:uid(),name:pick(NAMES),rank:pick(RANKS),position:pick(POSITIONS),style:pick(PLAY_STYLES)}]};
        }
        return u.filter(r=>!(r.members.length>=r.maxPlayers&&r.id!==myRoom?.id&&Math.random()>.85));
      });
    },4500);
    return()=>clearInterval(iv);
  },[page,mode,myRoom]);

  // Simulate incoming join requests for room owner
  useEffect(()=>{
    if(!myRoom||!isOwner||page!=="inRoom") return;
    const iv=setInterval(()=>{
      if(myRoom.members.length<myRoom.maxPlayers&&Math.random()>.45){
        setMyRoom(prev=>{
          if(!prev||prev.requests.length>=4) return prev;
          return {...prev,requests:[...prev.requests,{
            id:uid(),name:pick(NAMES),rank:pick(RANKS),position:pick(POSITIONS),style:pick(PLAY_STYLES),
            note:pick(["","Main sup uy tín","Smurf Diamond nè","Chơi vui thôi","Có mic, Gold 1 mùa trước","Cần team rank flex","Chơi nghiêm túc",""]),
          }]};
        });
        toast("📩 Có yêu cầu tham gia mới!");
      }
    },5000);
    return()=>clearInterval(iv);
  },[myRoom,isOwner,page,toast]);

  // Simulate NPC owner responding to a pending join request
  useEffect(()=>{
    if(!pendingJoin) return;
    const {roomId,requestId,snapshot}=pendingJoin;
    const delay=randInt(5000,12000);
    const timer=setTimeout(()=>{
      const accepted=Math.random()>0.4; // 60% accept, 40% reject
      if(accepted&&snapshot.members.length<snapshot.maxPlayers){
        const u={...snapshot,requests:[],members:[...snapshot.members,{id:"self",name:"Bạn",rank:"Gold",position:"Mid",style:"Farming"}]};
        setMyRoom(u);setIsOwner(false);
        setRooms(p=>p.map(x=>x.id===u.id?u:x));
        setSelRoom(null);setPage("inRoom");
        toast("✅ Chủ phòng đã chấp nhận! Bạn đã vào phòng.");
      } else {
        setRooms(p=>p.map(r=>r.id===roomId?{...r,requests:r.requests.filter(req=>req.id!==requestId)}:r));
        toast("❌ Chủ phòng đã từ chối yêu cầu của bạn.");
        setSelRoom(null);
      }
      setPendingJoin(null);
    },delay);
    return()=>clearTimeout(timer);
  },[pendingJoin]);

  // --- Room handlers ---
  const createRoom=async(roomData)=>{
    try{
      const res=await apiClient.post('/api/rooms',roomData);
      const room=res.data.data;
      setMyRoom(room);
      setIsOwner(true);
      setRooms(p=>[room,...p]);
      setPage("inRoom");
      toast("🏠 Đã tạo phòng thành công!");
    }catch(err){
      toast(`❌ ${err.response?.data?.message||'Tạo phòng thất bại'}`,'error');
    }
  };

  const joinRoom=id=>{
    const r=rooms.find(r=>r.id===id);
    if(r){
      const u={...r,members:[...r.members,{id:"self",name:"Bạn",rank:"Gold",position:"Mid",style:"Farming"}]};
      setMyRoom(u);setIsOwner(false);setRooms(p=>p.map(x=>x.id===id?u:x));setPage("inRoom");toast("✅ Đã tham gia phòng!");
    }
  };

  const requestJoin=(id,note)=>{
    const reqId=uid();
    const snapshot=rooms.find(r=>r.id===id);
    setRooms(p=>p.map(r=>r.id===id?{...r,requests:[...r.requests,{id:reqId,name:"Bạn",rank:"Gold",position:"Mid",style:"Farming",note}]}:r));
    setPendingJoin({roomId:id,requestId:reqId,snapshot});
    toast("📤 Đã gửi yêu cầu tham gia!");
  };

  const cancelRequest=()=>{
    if(!pendingJoin) return;
    setRooms(p=>p.map(r=>r.id===pendingJoin.roomId?{...r,requests:r.requests.filter(req=>req.id!==pendingJoin.requestId)}:r));
    setPendingJoin(null);
    toast("🚫 Đã hủy yêu cầu tham gia.");
  };

  const acceptReq=rid=>{
    setMyRoom(prev=>{
      if(!prev) return prev;
      const req=prev.requests.find(r=>r.id===rid);
      if(!req||prev.members.length>=prev.maxPlayers) return prev;
      const u={...prev,members:[...prev.members,{...req}],requests:prev.requests.filter(r=>r.id!==rid)};
      setRooms(p=>p.map(r=>r.id===u.id?u:r));return u;
    });toast("✅ Đã chấp nhận!");
  };

  const rejectReq=rid=>{setMyRoom(p=>p?{...p,requests:p.requests.filter(r=>r.id!==rid)}:p);toast("❌ Đã từ chối.");};

  const kick=mid=>{
    setMyRoom(prev=>{
      if(!prev) return prev;
      const u={...prev,members:prev.members.filter(m=>m.id!==mid)};
      setRooms(p=>p.map(r=>r.id===u.id?u:r));return u;
    });toast("👢 Đã loại người chơi.");
  };

  const leave=()=>{
    if(isOwner) setRooms(p=>p.filter(r=>r.id!==myRoom?.id));
    setMyRoom(null);setIsOwner(false);setPage("lobby");toast("👋 Đã rời phòng.");
  };

  const queueMatch=profile=>{
    toast("⏳ Đang trong hàng chờ...");
    setTimeout(()=>{
      const nr={
        id:uid(),name:`Auto Match ${uid().substring(0,4).toUpperCase()}`,
        mode:mode.id,maxPlayers:mode.players,
        members:[{id:"self",name:"Bạn",...profile},
          ...Array.from({length:mode.players-1},()=>({id:uid(),name:pick(NAMES),rank:profile.rank,position:pick(POSITIONS),style:pick(PLAY_STYLES)}))
        ],
        avgRank:profile.rank,status:"waiting",voiceChat:true,
        rankRange:[profile.rank,profile.rank],positionsNeeded:[],
        stylePreference:profile.style,createdAt:Date.now(),requests:[],note:"",
      };
      setMyRoom(nr);setIsOwner(false);setRooms(p=>[nr,...p]);setPage("inRoom");
      toast("🎮 Đã ghép trận thành công! Đội đủ người.");
    },randInt(4000,8000));
  };

  if(loading){
    return(
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'linear-gradient(135deg,#010a13 0%,#0a1628 50%,#091428 100%)',
        color:'#c8aa6e',
        fontFamily:"'Playfair Display', serif",
        fontSize:18
      }}>
        ⚔️ Đang kết nối...
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:"linear-gradient(135deg,#010a13 0%,#0a1628 50%,#091428 100%)",color:"#a09b8c",minHeight:"100vh"}}>
      <GlobalStyles/>

      {/* Toast notification */}
      {notif&&(
        <div style={{
          position:"fixed",top:18,right:18,zIndex:2000,padding:"11px 22px",borderRadius:8,
          background:"linear-gradient(135deg,#1a1a2e,#12121e)",
          border:"1px solid #c89b3c40",color:"#c8aa6e",fontSize:13,
          boxShadow:"0 8px 32px rgba(0,0,0,.6)",animation:"slideDown .3s ease",
          backdropFilter:"blur(10px)",
        }}>{notif.text}</div>
      )}

      {page==="modeSelect"&&<ModeSelection onSelect={selectMode}/>}

      {page==="lobby"&&mode&&(
        <>
          <Lobby
            mode={mode} rooms={rooms} myRoom={myRoom}
            onCreateRoom={()=>setShowCreate(true)}
            onViewRoom={r=>setSelRoom(r)}
            onMatchFind={()=>setShowMatch(true)}
            onBack={()=>{setPage("modeSelect");setMyRoom(null);setIsOwner(false);}}
            onEnterRoom={()=>setPage("inRoom")}
          />
          <CreateRoomModal isOpen={showCreate} onClose={()=>setShowCreate(false)} mode={mode} onCreate={createRoom}/>
          <MatchFindingModal isOpen={showMatch} onClose={()=>setShowMatch(false)} mode={mode} rooms={rooms} onJoinRoom={joinRoom} onQueue={queueMatch}/>
          <RoomDetailModal isOpen={!!selRoom} onClose={()=>setSelRoom(null)} room={selRoom} onRequestJoin={requestJoin} isPending={pendingJoin?.roomId===selRoom?.id} onCancelRequest={cancelRequest}/>
        </>
      )}

      {page==="inRoom"&&myRoom&&(
        <RoomView room={myRoom} isOwner={isOwner} onLeave={leave} onAccept={acceptReq} onReject={rejectReq} onKick={kick}/>
      )}
    </div>
  );
}
