import { useState, useEffect, useCallback, Component } from "react";
import { CYBER, CYBER_BG } from "./constants/theme";
import GlobalStyles from "./components/ui/GlobalStyles";
import ModeSelection from "./components/ModeSelection";
import Lobby from "./components/Lobby";
import RoomView from "./components/RoomView";
import CreateRoomModal from "./components/CreateRoomModal";
import MatchFindingModal from "./components/MatchFindingModal";
import RoomDetailModal from "./components/RoomDetailModal";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GameSelectionPage from "./pages/GameSelectionPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import RiotLookupPage from "./pages/RiotLookupPage";
import UserMenu from "./components/UserMenu";
import { GAMES, findGame } from "./constants/games";
import apiClient from "./lib/apiClient";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";

// Helper: normalize ObjectId/populate → string hex
function toIdString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v._id) return toIdString(v._id);
    if (v.$oid) return v.$oid;
    if (typeof v.toString === "function") {
      const s = v.toString();
      return s === "[object Object]" ? "" : s;
    }
  }
  return String(v);
}

// Adapter: convert backend Room shape → UI Room shape mà RoomCard/RoomView đang dùng
function adaptRoom(server, extras = {}) {
  if (!server) return null;
  const idStr = toIdString(server._id || server.id);
  return {
    _id: idStr,
    id: idStr,
    name: server.name || "Phòng",
    game: server.game || extras.game || "lol",
    mode: server.mode || extras.mode || "NORMAL",
    maxPlayers: server.slots || extras.maxPlayers || 5,
    current: server.current ?? 0,
    status: (server.status || "RECRUITING").toLowerCase() === "recruiting" ? "looking" : (server.status || "looking").toLowerCase(),
    ownerId: toIdString(server.ownerId),
    createdAt: server.createdAt ? new Date(server.createdAt).getTime() : Date.now(),
    // Fields lưu trong DB, fallback từ extras nếu có
    members: Array.isArray(extras.members) && extras.members.length ? extras.members : [],
    requests: Array.isArray(extras.requests) ? extras.requests : [],
    positionsNeeded: Array.isArray(server.positions) && server.positions.length
      ? server.positions
      : (Array.isArray(extras.positionsNeeded) ? extras.positionsNeeded : []),
    avgRank: server.rankMin || extras.avgRank || "",
    voiceChat: server.voiceChat ?? extras.voiceChat ?? true,
    note: server.note || extras.note || "",
    rankRange: (server.rankMin || server.rankMax)
      ? [server.rankMin || "", server.rankMax || ""]
      : (extras.rankRange || null),
    stylePreference: server.stylePreference || extras.stylePreference || ""
  };
}

// Error boundary để crash không làm trắng toàn bộ app
class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error("[ErrorBoundary]", error, info); }
  render(){
    if(this.state.error){
      return (
        <div style={{minHeight:"100vh",padding:32,background:"#010a13",color:"#e8908e",fontFamily:"monospace",fontSize:13,overflow:"auto"}}>
          <h2 style={{color:"#c8aa6e",fontFamily:"'Be Vietnam Pro', sans-serif"}}>⚠️ Component bị crash</h2>
          <p style={{color:"#f0e6d2"}}>{String(this.state.error?.message || this.state.error)}</p>
          <pre style={{whiteSpace:"pre-wrap",color:"#a09b8c",marginTop:20}}>{this.state.error?.stack}</pre>
          <button
            style={{marginTop:20,padding:"10px 20px",background:"#c8aa6e",border:"none",borderRadius:6,color:"#010a13",cursor:"pointer",fontWeight:700}}
            onClick={()=>{ this.setState({ error: null }); this.props.onReset?.(); }}
          >Quay lại</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App(){
  const [page,setPage]=useState("gameSelect");
  const [game,setGame]=useState(null);
  const [mode,setMode]=useState(null);
  const [rooms,setRooms]=useState([]);
  const [myRoom,setMyRoom]=useState(null);
  const [isOwner,setIsOwner]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [showMatch,setShowMatch]=useState(false);
  const [selRoom,setSelRoom]=useState(null);
  const [notif,setNotif]=useState(null);
  const [authView,setAuthView]=useState("login"); // "login" | "register"
  const [activeRoom,setActiveRoom]=useState(null); // phòng đang mở của user (ở bất kỳ game/mode nào)
  const { user, loading, login, register, logout } = useAuth();
  const { connect, disconnect, on, joinLobby, leaveLobby, joinRoom: socketJoinRoom, emit } = useSocket();

  const toast=useCallback((text,type="info")=>{setNotif({text,type,id:Date.now()});setTimeout(()=>setNotif(null),3500);},[]);

  useEffect(()=>{
    if(!user||loading) return;
    const token=localStorage.getItem('token');
    connect(token,null);
    return ()=>disconnect();
  },[user,loading,connect,disconnect]);

  // Global listener: khi có người xin vào phòng mình → hiện toast ở bất kỳ page nào
  useEffect(()=>{
    if(!user) return;
    const off=on('room:join-requested',({user:requester,roomName})=>{
      if(!requester) return;
      const name=requester.username||'Người chơi';
      const rn=roomName?` "${roomName}"`:'';
      toast(`👤 ${name} xin vào nhóm${rn}. Mở phòng để duyệt.`);
    });
    return ()=>off&&off();
  },[user,on,toast]);

  // Check phòng đang mở — khi login + mỗi khi đổi page (về lobby, gameSelect, modeSelect)
  const refreshActiveRoom=useCallback(()=>{
    if(!user) return;
    apiClient.get('/api/rooms/my-active').then(res=>{
      setActiveRoom(res.data.data||null);
    }).catch(()=>setActiveRoom(null));
  },[user]);

  useEffect(()=>{
    if(!user||loading) return;
    refreshActiveRoom();
  },[user,loading,refreshActiveRoom]);

  // Refresh khi quay lại lobby/gameSelect/modeSelect
  useEffect(()=>{
    if(page==="inRoom"||!user) return;
    refreshActiveRoom();
  },[page]);

  // Fetch danh sách thành viên thật từ backend
  const fetchMembers=useCallback(async(roomId)=>{
    if(!roomId) return;
    try{
      const res=await apiClient.get(`/api/rooms/${roomId}/members`);
      const raw=res.data.data||[];
      const members=raw.map(m=>{
        const u=m.userId||m;
        return {
          id: toIdString(u._id||u.id||m.userId),
          name: u.username||u.name||"Người chơi",
          rank: m.rank||"",
          position: m.position||"",
          style: m.style||"",
          joinedAt: m.joinedAt
        };
      });
      setMyRoom(prev=>prev?{...prev,members,current:members.length}:prev);
    }catch(e){
      console.error("Failed to fetch members:",e);
    }
  },[]);

  // Navigate tới phòng đang mở (có thể ở game/mode khác, có thể là owner hoặc member)
  const goToMyRoom=useCallback(()=>{
    if(!activeRoom) return;
    const room=adaptRoom(activeRoom);
    const g=findGame(activeRoom.game);
    const m=g?.modes?.find(md=>md.id===activeRoom.mode)||{id:activeRoom.mode,name:activeRoom.mode,players:5};
    setGame(g);
    setMode(m);
    setMyRoom(room);
    setIsOwner(!!activeRoom._isOwner);
    setPage("inRoom");
    socketJoinRoom(room._id);
    fetchMembers(room._id);
  },[activeRoom,socketJoinRoom,fetchMembers]);

  // Socket: lắng nghe member join/leave khi đang trong phòng
  useEffect(()=>{
    if(page!=="inRoom"||!myRoom?._id) return;
    const offJoin=on('room:member-joined',({member})=>{
      if(!member) return;
      setMyRoom(prev=>{
        if(!prev) return prev;
        const id=toIdString(member.id||member.userId);
        if(prev.members.find(m=>m.id===id)) return prev; // already in list
        const newMember={id, name:member.name||"Người chơi", rank:member.rank||"", position:member.position||"", style:member.style||""};
        return {...prev, members:[...prev.members, newMember], current:prev.current+1};
      });
    });
    const offLeave=on('room:member-left',({userId})=>{
      if(!userId) return;
      const uid=toIdString(userId);
      setMyRoom(prev=>{
        if(!prev) return prev;
        const filtered=prev.members.filter(m=>m.id!==uid);
        return {...prev, members:filtered, current:filtered.length};
      });
    });
    return ()=>{ offJoin(); offLeave(); };
  },[page,myRoom?._id,on]);

  const selectGame=(g)=>{
    setGame(g);
    setMode(null);
    setPage("modeSelect");
  };

  const selectMode=async(m)=>{
    setMode(m);
    setPage("lobby");
    try{
      const res=await apiClient.get('/api/rooms',{params:{game:game?.id,mode:m.id}});
      const list=(res.data.data||[]).map(r=>adaptRoom(r));
      setRooms(list);
    }catch(err){
      console.error('Failed to fetch rooms:',err);
      setRooms([]);
      toast('⚠️ Không thể tải danh sách phòng','error');
    }
  };

  // Socket.io lobby listeners: listen for real-time room updates
  useEffect(()=>{
    if(page!=="lobby"||!mode||!game) return;
    joinLobby(game.id, mode.id);

    const offCreated=on('room:created',(raw)=>{
      const room=adaptRoom(raw);
      if(!room) return;
      setRooms(prev=>[room,...prev.filter(r=>r._id!==room._id)]);
    });
    const offUpdated=on('room:updated',(raw)=>{
      const room=adaptRoom(raw);
      if(!room) return;
      setRooms(prev=>prev.map(r=>r._id===room._id?{...r,...room}:r));
    });
    const offDeleted=on('room:deleted',({roomId})=>{
      setRooms(prev=>prev.filter(r=>r._id!==roomId));
    });

    return()=>{
      leaveLobby();
      offCreated();
      offUpdated();
      offDeleted();
    };
  },[page,mode,game,joinLobby,leaveLobby,on]);

  // --- Room handlers ---
  const createRoom=async(roomData)=>{
    try{
      const payload={
        game: game?.id||"lol",
        name: roomData.name,
        mode: roomData.mode||mode.id,
        slots: Math.min(Math.max(roomData.maxPlayers||mode.players||5, 1), 16),
        rankMin: roomData.rankRange?.[0]||"",
        rankMax: roomData.rankRange?.[1]||"",
        positions: roomData.positionsNeeded||[],
        stylePreference: roomData.stylePreference||"",
        voiceChat: roomData.voiceChat??true,
        note: roomData.note||""
      };
      const res=await apiClient.post('/api/rooms',payload);
      const server=res.data.data;
      const room=adaptRoom(server,{
        members: [{ id:user?.id||"self", name:user?.username||"Bạn", rank:roomData.rankRange?.[0]||"", position:roomData.positionsNeeded?.[0]||"", style:roomData.stylePreference||"" }],
      });
      setMyRoom(room);
      setIsOwner(true);
      setActiveRoom(null);
      setRooms(p=>[room,...p]);
      setPage("inRoom");
      socketJoinRoom(room._id);
      // Fetch thành viên thật từ server
      fetchMembers(room._id);
      toast("🏠 Đã tạo phòng thành công!");
    }catch(err){
      if(err.response?.status===409){
        // Refresh active room data
        apiClient.get('/api/rooms/my-active').then(r=>setActiveRoom(r.data.data||null)).catch(()=>{});
        toast(`⚠️ ${err.response?.data?.message||"Bạn đang ở trong phòng khác!"} Bấm banner phía dưới để quay lại.`,"error");
      } else {
        toast(`❌ ${err.response?.data?.message||'Tạo phòng thất bại'}`,'error');
      }
    }
  };

  // Join trực tiếp (atomic) — backend không có approval flow
  const joinRoom=async(roomId)=>{
    if(!roomId) return;
    try{
      const res=await apiClient.post(`/api/rooms/${roomId}/join`);
      const server=res.data.data;
      // Persistent chatroom: pending owner approval
      if(server.pending){
        toast("⏳ Đã gửi yêu cầu vào nhóm. Chờ chủ phòng duyệt.");
        return;
      }
      const roomObj=server.room||server;
      const room=adaptRoom(roomObj);
      setMyRoom(room);
      setIsOwner(false);
      setSelRoom(null);
      setPage("inRoom");
      socketJoinRoom(room._id);
      // Fetch thành viên thật từ server
      fetchMembers(room._id);
      toast("✅ Đã vào phòng!");
    }catch(err){
      toast(`❌ ${err.response?.data?.message||'Không thể vào phòng'}`,'error');
    }
  };

  // Owner kick thành viên — backend POST /api/rooms/:id/kick
  const kick=async(memberUserId)=>{
    if(!myRoom?._id||!memberUserId) return;
    try{
      await apiClient.post(`/api/rooms/${myRoom._id}/kick`,{targetUserId:memberUserId});
      setMyRoom(prev=>prev?{...prev,members:prev.members.filter(m=>String(m.id)!==String(memberUserId))}:prev);
      toast("👢 Đã loại người chơi.");
    }catch(err){
      toast(`❌ ${err.response?.data?.message||'Không thể kick'}`,'error');
    }
  };

  const leave=async()=>{
    const roomId=myRoom?._id;
    if(!roomId){
      setMyRoom(null);setIsOwner(false);
      setPage(game&&mode?"lobby":"gameSelect");
      return;
    }
    try{
      if(isOwner){
        await apiClient.delete(`/api/rooms/${roomId}`);
        setRooms(p=>p.filter(r=>String(r._id)!==String(roomId)));
        toast("🗑️ Đã đóng phòng.");
      } else {
        await apiClient.post(`/api/rooms/${roomId}/leave`);
        toast("👋 Đã rời phòng.");
      }
      // Leave socket room channel
      emit('room:leave',{roomId});
    }catch(err){
      toast(`❌ ${err.response?.data?.message||'Thao tác thất bại'}`,'error');
      // Even if API fails, still reset UI state so user isn't stuck
    }
    setMyRoom(null);setIsOwner(false);setActiveRoom(null);
    // Quay về lobby và refresh danh sách phòng
    if(game&&mode){
      setPage("lobby");
      apiClient.get('/api/rooms',{params:{game:game.id,mode:mode.id}}).then(res=>{
        setRooms((res.data.data||[]).map(r=>adaptRoom(r)));
      }).catch(()=>setRooms([]));
    } else {
      setPage("gameSelect");
    }
  };

  const queueMatch=profile=>{
    toast("⏳ Đang trong hàng chờ...");
    emit('finding:start', { mode: mode.id, rank: profile.rank });
    on('finding:match-found', ({ room }) => {
      setMyRoom(room);
      setIsOwner(false);
      setPage("inRoom");
      socketJoinRoom(room._id);
      toast("🎮 Đã ghép trận thành công!");
    });
  };

  if(loading){
    return(
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:CYBER_BG,
        color:CYBER.cyan,
        fontFamily:"'JetBrains Mono', monospace",
        fontSize:14,
        letterSpacing:3,
        textTransform:"uppercase",
        textShadow:`0 0 12px ${CYBER.cyan}80`
      }}>
        &gt; Đang kết nối hệ thống...
      </div>
    );
  }

  // Auth gate — phải đăng ký/đăng nhập trước khi dùng
  if(!user){
    return (
      <>
        <GlobalStyles/>
        {authView === "login" ? (
          <LoginPage
            onLogin={login}
            onSwitchToRegister={() => setAuthView("register")}
            loading={loading}
          />
        ) : (
          <RegisterPage
            onRegister={register}
            onSwitchToLogin={() => setAuthView("login")}
            loading={loading}
          />
        )}
      </>
    );
  }

  const handleLogout=()=>{logout();setPage("gameSelect");setMyRoom(null);setMode(null);setGame(null);setRooms([]);toast("> Đã đăng xuất");};

  const userBadge=(
    <UserMenu
      user={user}
      onProfile={()=>setPage("profile")}
      onAdmin={()=>setPage("admin")}
      onRiotLookup={()=>setPage("riotLookup")}
      onLogout={handleLogout}
    />
  );

  // Chỉ floating ở top-center khi KHÔNG ở trong Lobby (Lobby sẽ render inline trong top bar)
  const showFloatingBadge=page!=="lobby";

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:CYBER_BG,color:CYBER.textPrimary,minHeight:"100vh"}}>
      <GlobalStyles/>

      {/* User badge floating — chỉ hiện trên pages không có top bar riêng */}
      {showFloatingBadge && (
        <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:1500}}>
          {userBadge}
        </div>
      )}

      {/* Toast notification */}
      {notif&&(
        <div style={{
          position:"fixed",top:18,right:18,zIndex:2000,padding:"12px 22px",borderRadius:4,
          background:`${CYBER.bgCard}ee`,
          border:`1px solid ${CYBER.cyan}80`,color:CYBER.cyan,fontSize:12,
          boxShadow:`0 0 20px ${CYBER.cyan}40, inset 0 0 10px ${CYBER.cyan}15`,
          animation:"slideDown .3s ease",
          fontFamily:"'JetBrains Mono', monospace",letterSpacing:1,
          backdropFilter:"blur(10px)",
        }}>{notif.text}</div>
      )}

      {/* Banner phòng đang mở — hiện ở mọi page trừ khi đang trong phòng đó */}
      {activeRoom && page!=="inRoom" && (()=>{
        const ag=findGame(activeRoom.game);
        const am=ag?.modes?.find(md=>md.id===activeRoom.mode);
        return (
          <div
            onClick={goToMyRoom}
            style={{
              position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:1800,
              padding:"12px 24px",borderRadius:8,cursor:"pointer",
              background:`linear-gradient(135deg, ${CYBER.bgCard}f0, ${CYBER.magenta}18)`,
              border:`1px solid ${CYBER.magenta}60`,
              boxShadow:`0 0 24px ${CYBER.magenta}30, 0 4px 20px rgba(0,0,0,.5)`,
              display:"flex",alignItems:"center",gap:14,
              fontFamily:"'JetBrains Mono', monospace",
              backdropFilter:"blur(12px)",
              animation:"slideUp .4s ease",
              transition:"all .2s",
              maxWidth:"90vw"
            }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 0 36px ${CYBER.magenta}50, 0 4px 24px rgba(0,0,0,.6)`;e.currentTarget.style.transform="translateX(-50%) translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 0 24px ${CYBER.magenta}30, 0 4px 20px rgba(0,0,0,.5)`;e.currentTarget.style.transform="translateX(-50%)";}}
          >
            <span style={{fontSize:20}}>{ag?.icon||"🏠"}</span>
            <div>
              <div style={{color:CYBER.magenta,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",textShadow:`0 0 8px ${CYBER.magenta}60`}}>
                {activeRoom._isOwner?"Phòng của bạn":`Đang trong phòng của ${activeRoom._ownerName||"người khác"}`}
              </div>
              <div style={{color:CYBER.textPrimary,fontSize:12,marginTop:2}}>
                <span style={{fontWeight:700}}>{activeRoom.name}</span>
                <span style={{color:CYBER.textMuted,margin:"0 6px"}}>·</span>
                <span style={{color:CYBER.cyan,fontSize:10}}>{ag?.shortName||activeRoom.game}</span>
                <span style={{color:CYBER.textMuted,margin:"0 4px"}}>—</span>
                <span style={{color:CYBER.textSecondary,fontSize:10}}>{am?.name||activeRoom.mode}</span>
              </div>
            </div>
            <span style={{
              padding:"5px 12px",borderRadius:4,
              background:`${CYBER.magenta}20`,border:`1px solid ${CYBER.magenta}50`,
              color:CYBER.magenta,fontSize:10,fontWeight:700,letterSpacing:1,
              textTransform:"uppercase",whiteSpace:"nowrap"
            }}>
              Vào Phòng →
            </span>
          </div>
        );
      })()}

      {page==="admin"&&user.role==="admin"&&(
        <AdminDashboard onBack={()=>setPage("gameSelect")}/>
      )}

      {page==="profile"&&(
        <ProfileSettingsPage onBack={()=>setPage("gameSelect")}/>
      )}

      {page==="riotLookup"&&(
        <RiotLookupPage onBack={()=>setPage("gameSelect")}/>
      )}

      {page==="gameSelect"&&(
        <GameSelectionPage onSelectGame={selectGame}/>
      )}

      {page==="modeSelect"&&game&&(
        <ModeSelection
          game={game}
          onSelect={selectMode}
          onBack={()=>{setPage("gameSelect");setGame(null);setMode(null);}}
        />
      )}

      {page==="lobby"&&mode&&(
        <>
          <Lobby
            mode={mode} rooms={rooms} myRoom={myRoom} game={game}
            userBadge={userBadge}
            onCreateRoom={()=>setShowCreate(true)}
            onViewRoom={r=>setSelRoom(r)}
            onMatchFind={()=>setShowMatch(true)}
            onBack={()=>{setPage("modeSelect");setMyRoom(null);setIsOwner(false);}}
            onBackToGame={()=>{setPage("gameSelect");setMyRoom(null);setIsOwner(false);setMode(null);setGame(null);setRooms([]);}}
            onEnterRoom={()=>{setPage("inRoom");socketJoinRoom(myRoom?._id);fetchMembers(myRoom?._id);}}
          />
          <CreateRoomModal isOpen={showCreate} onClose={()=>setShowCreate(false)} game={game} mode={mode} onCreate={createRoom}/>
          <MatchFindingModal isOpen={showMatch} onClose={()=>setShowMatch(false)} mode={mode} rooms={rooms} onJoinRoom={joinRoom} onQueue={queueMatch}/>
          <RoomDetailModal
            isOpen={!!selRoom}
            onClose={()=>setSelRoom(null)}
            room={selRoom}
            isOwn={!!selRoom && String(selRoom.ownerId||"")===String(user?.id||"")}
            onEnter={(r)=>{setMyRoom(r);setIsOwner(true);setSelRoom(null);setPage("inRoom");socketJoinRoom(r._id);fetchMembers(r._id);}}
            onJoin={(r)=>joinRoom(r._id||r.id)}
          />
        </>
      )}

      {page==="inRoom"&&myRoom&&(
        <ErrorBoundary onReset={()=>{setPage("lobby");setMyRoom(null);}}>
          <RoomView room={myRoom} isOwner={isOwner} onLeave={leave} onKick={kick} userId={user?.id} socketEmit={emit} socketOn={on}
            onBackToLobby={async()=>{
              const g=game||findGame(myRoom?.game);
              const m=mode||(g?.modes?.find(md=>md.id===myRoom?.mode))||null;
              if(g) setGame(g);
              if(m) setMode(m);
              setMyRoom(null);setIsOwner(false);
              if(g&&m){
                setPage("lobby");
                try{
                  const res=await apiClient.get('/api/rooms',{params:{game:g.id,mode:m.id}});
                  setRooms((res.data.data||[]).map(r=>adaptRoom(r)));
                }catch(e){ setRooms([]); }
              } else {
                setPage("gameSelect");
              }
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
