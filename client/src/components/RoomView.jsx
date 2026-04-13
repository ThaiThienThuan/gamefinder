import { useState, useEffect, useRef, useCallback } from "react";
import { POS_ICONS } from "../constants";
import { CYBER, neonGlow } from "../constants/theme";
import { getCommandHandler, getPlaceholder, isHelpCommand, buildHelpText } from "../constants/gameCommands";
import GoldBtn from "./ui/GoldBtn";
import StatusDot from "./ui/StatusDot";
import RankBadge from "./ui/RankBadge";
import LiveKitRoom from "./LiveKitRoom";
import { useLiveKit } from "../hooks/useLiveKit";
import apiClient from "../lib/apiClient";
import EditRoomModal from "./EditRoomModal";
import ProfileModal from "./ProfileModal";

// ── Standalone Mic Test (Discord-style) ────────────────────────────────
function MicTestBtn(){
  const [testing,setTesting]=useState(false);
  const [level,setLevel]=useState(0);
  const refs=useRef({stream:null,ctx:null,analyser:null,timer:null});

  const start=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      await ctx.resume();
      const analyser=ctx.createAnalyser();
      analyser.fftSize=256;
      analyser.smoothingTimeConstant=0.3;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf=new Uint8Array(analyser.frequencyBinCount);
      refs.current={stream,ctx,analyser,timer:setInterval(()=>{
        analyser.getByteFrequencyData(buf);
        const avg=buf.reduce((a,b)=>a+b,0)/buf.length;
        setLevel(Math.min(100,Math.round((avg/40)*100)));
      },50)};
      setTesting(true);
    }catch(e){
      alert("Không thể truy cập mic: "+e.message);
    }
  };

  const stop=()=>{
    const r=refs.current;
    if(r.timer) clearInterval(r.timer);
    if(r.ctx) r.ctx.close();
    if(r.stream) r.stream.getTracks().forEach(t=>t.stop());
    refs.current={stream:null,ctx:null,analyser:null,timer:null};
    setTesting(false);
    setLevel(0);
  };

  useEffect(()=>()=>stop(),[]);

  return(
    <div style={{display:"flex",alignItems:"center",gap:10,width:"100%"}}>
      <button onClick={testing?stop:start}
        style={{padding:"6px 16px",borderRadius:4,cursor:"pointer",fontWeight:700,fontSize:11,
          background:testing?"#f04747":"#3ba55d",border:"none",color:"#fff",transition:"opacity .2s",
          minWidth:60}}
        onMouseOver={e=>e.currentTarget.style.opacity="0.8"}
        onMouseOut={e=>e.currentTarget.style.opacity="1"}>
        {testing?"Stop":"Test"}
      </button>
      <div style={{flex:1,height:20,background:"#141420",borderRadius:4,overflow:"hidden",display:"flex",alignItems:"center",padding:"0 4px",gap:2}}>
        {Array.from({length:20}).map((_,i)=>{
          const active=level>(i*5);
          const color=i<12?"#3ba55d":i<16?"#faa61a":"#f04747";
          return <div key={i} style={{
            flex:1,height:12,borderRadius:2,
            background:active?color:"#1e1e30",
            transition:"background .05s"
          }}/>;
        })}
      </div>
      {testing&&<span style={{fontSize:10,color:"#3ba55d",fontWeight:700,minWidth:30}}>{level}%</span>}
    </div>
  );
}

function RoomView({room,onLeave,onKick,isOwner,userId,socketEmit,socketOn,onBackToLobby}){
  // Helper: check if a member is the current user
  const isSelfId=(id)=>id==="self"||String(id)===String(userId);
  // Helper: deduplicate voice members by id
  const dedupeVoice=(arr)=>{
    const seen=new Set();
    return arr.filter(m=>{
      const k=String(m.id);
      if(seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // ── Room metadata (can be updated realtime) ─────────────────────────
  const [roomData,setRoomData]=useState(room);
  useEffect(()=>{ setRoomData(room); },[room]);
  const [showEditRoom,setShowEditRoom]=useState(false);
  const [typingUsers,setTypingUsers]=useState([]); // [{userId,name}]
  const [profileUser,setProfileUser]=useState(null); // opened profile user
  // ── Pending join requests (persistent chatroom) ──────────────────────
  const [pendingList,setPendingList]=useState([]); // [{_id/id, username, avatar}]
  useEffect(()=>{
    const pm=roomData?.pendingMembers||room?.pendingMembers||[];
    if(Array.isArray(pm)){
      setPendingList(pm.map(u=>(typeof u==='object'?u:{_id:u,username:'User'})));
    }
  },[roomData,room]);

  // ── Chat ──────────────────────────────────────────────────────────────
  const [msgs,setMsgs]=useState([{id:1,sender:"Hệ thống",text:"Chào mừng đến phòng! Hãy chào nhau và sẵn sàng chiến đấu.",system:true,time:Date.now()}]);
  const [input,setInput]=useState("");

  // ── Slots (drag-to-reorder self) ──────────────────────────────────────
  const [slots,setSlots]=useState(()=>{
    const arr=Array(room.maxPlayers).fill(null);
    room.members.forEach((m,i)=>{arr[i]=m;});
    return arr;
  });
  const [dragFromSlot,setDragFromSlot]=useState(null);
  const [hoverSlot,setHoverSlot]=useState(null);

  // ── Voice ─────────────────────────────────────────────────────────────
  const [voiceJoined,setVoiceJoined]=useState(false);
  const [muted,setMuted]=useState(false);
  const [deafened,setDeafened]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [voiceMembers,setVoiceMembers]=useState([]);
  const [voiceError,setVoiceError]=useState(null);
  const [micLevel,setMicLevel]=useState(0); // 0-100 real-time volume

  // ── Voice Settings & Keybinds ─────────────────────────────────────────
  const [showVoiceSettings,setShowVoiceSettings]=useState(false);
  const [keybinds,setKeybinds]=useState(()=>{
    try{
      const s=localStorage.getItem("gf_voice_keybinds");
      return s?JSON.parse(s):{pushToTalk:"V",mute:"M"};
    }catch{return{pushToTalk:"V",mute:"M"};}
  });
  const [listeningFor,setListeningFor]=useState(null); // 'pushToTalk' | 'mute' | null
  const [pttActive,setPttActive]=useState(false);
  const [micMode,setMicMode]=useState(()=>{
    try{ return localStorage.getItem("gf_mic_mode")||"always"; }catch{ return "always"; }
  }); // "always" | "ptt"

  // ── Noise Suppression ─────────────────────────────────────────────────
  const [nsEnabled,setNsEnabled]=useState(false);
  const [nsLevel,setNsLevel]=useState("medium"); // "low" | "medium" | "high"

  // ── LiveKit ────────────────────────────────────────────────────────────
  const { token:lkToken, serverUrl:lkUrl, requestToken:lkRequestToken, reset:lkReset, error:lkError } = useLiveKit();
  const [lkConnected,setLkConnected]=useState(false);
  const lkControlsRef=useRef(null); // LiveKit mic/camera controls
  const [cameraOn,setCameraOn]=useState(false);
  const [screenSharing,setScreenSharing]=useState(false);
  const [videoHeight,setVideoHeight]=useState(300); // resizable video area height
  const [remoteTrackCount,setRemoteTrackCount]=useState(0);
  const videoDragRef=useRef(null);
  const [micGain,setMicGain]=useState(100); // input mic volume 0-200%
  const [userVolumes,setUserVolumes]=useState({}); // {userId: 0-200}
  const [volumePopup,setVolumePopup]=useState(null); // userId or null

  // ── Media / Lightbox ──────────────────────────────────────────────────
  const [lightbox,setLightbox]=useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const chatEnd=useRef(null);
  const fileInputRef=useRef(null);
  const streamRef=useRef(null);
  const audioCtxRef=useRef(null);
  const analyserRef=useRef(null);
  const speakTimerRef=useRef(null);
  const mutedRef=useRef(false);
  const pttActiveRef=useRef(false);
  const micModeRef=useRef("always"); // mirror of micMode for closures
  const nsNodesRef=useRef([]);      // Web Audio nodes for NS chain
  const nsEnabledRef=useRef(false); // mirror of nsEnabled for use in closures
  const nsLevelRef=useRef("medium");
  const speakFramesRef=useRef(0);   // for noise gate hysteresis
  const voiceJoinedRef=useRef(false);

  // Keep refs in sync with state
  useEffect(()=>{ mutedRef.current=muted; },[muted]);
  useEffect(()=>{ pttActiveRef.current=pttActive; },[pttActive]);
  useEffect(()=>{ nsEnabledRef.current=nsEnabled; nsLevelRef.current=nsLevel; },[nsEnabled,nsLevel]);
  useEffect(()=>{ micModeRef.current=micMode; },[micMode]);
  useEffect(()=>{ voiceJoinedRef.current=voiceJoined; },[voiceJoined]);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(()=>{
    setSlots(prev=>{
      const next=Array(room.maxPlayers).fill(null);
      prev.forEach((m,i)=>{ if(m&&room.members.find(rm=>rm.id===m.id)) next[i]=m; });
      room.members.forEach(m=>{
        if(!next.find(s=>s&&s.id===m.id)){
          const idx=next.findIndex(s=>s===null);
          if(idx!==-1) next[idx]=m;
        }
      });
      return next;
    });
  },[room.members,room.maxPlayers]);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);
  useEffect(()=>()=>cleanupAudio(),[]);

  // Derive speaking from micLevel directly (more reliable than VAD)
  const isSpeaking=!muted&&micLevel>8;

  // Update self muted/speaking locally + broadcast to server
  const lastBroadcast=useRef({muted:false,speaking:false});
  useEffect(()=>{
    setVoiceMembers(prev=>prev.map(m=>isSelfId(m.id)?{...m,muted,speaking:isSpeaking}:m));
    if(voiceJoinedRef.current){
      if(lastBroadcast.current.muted!==muted||lastBroadcast.current.speaking!==isSpeaking){
        lastBroadcast.current={muted,speaking:isSpeaking};
        socketEmit?.('voice:state',{roomId:room._id||room.id,userId,muted,speaking:isSpeaking});
      }
    }
  },[isSpeaking,muted]);

  // ── Voice sync — server-managed single source of truth ────────────────
  const prevVoiceIdsRef=useRef(new Set());
  useEffect(()=>{
    if(!socketOn) return;

    // Server sends full voice member list on join/leave/room-enter
    const offMembers=socketOn('voice:members',({roomId:rid,members})=>{
      if(!members) return;
      const currentRoomId=room._id||room.id;
      if(rid&&String(rid)!==String(currentRoomId)) return;

      const newIds=new Set(members.map(m=>String(m.userId)));
      const oldIds=prevVoiceIdsRef.current;

      // Detect who joined/left for system messages
      for(const m of members){
        if(!oldIds.has(String(m.userId))&&!isSelfId(m.userId)){
          addSysMsg(`${m.name||"Người chơi"} đã tham gia kênh thoại.`);
        }
      }
      for(const uid of oldIds){
        if(!newIds.has(uid)&&!isSelfId(uid)){
          addSysMsg("Người chơi đã rời kênh thoại.");
        }
      }
      prevVoiceIdsRef.current=newIds;

      // Build voice member list — preserve self's local speaking state
      setVoiceMembers(prev=>{
        const list=members.map(m=>{
          const isSelf=isSelfId(m.userId);
          const prevSelf=isSelf?prev.find(p=>isSelfId(p.id)):null;
          return {
            id:m.userId,
            name:isSelf?"Bạn":(m.name||"Người chơi"),
            muted:isSelf?mutedRef.current:(m.muted??false),
            speaking:isSelf?(prevSelf?.speaking??false):(m.speaking??false)
          };
        });
        return dedupeVoice(list);
      });

      // Auto-set voiceJoined if self is in the list
      if(members.some(m=>isSelfId(m.userId))) {
        if(!voiceJoinedRef.current){ setVoiceJoined(true); }
      }
    });

    // Individual state updates (speaking/muted) from other users
    const offState=socketOn('voice:state',(data)=>{
      if(!data||isSelfId(data.userId)) return;
      setVoiceMembers(prev=>prev.map(m=>
        String(m.id)===String(data.userId)
          ?{...m,muted:data.muted??m.muted,speaking:data.speaking??m.speaking}
          :m
      ));
    });

    // Request current voice state on mount
    socketEmit?.('voice:get-members',{roomId:room._id||room.id});

    return ()=>{ offMembers(); offState(); };
  },[socketOn,userId]);

  // ── Room lifecycle: ownership transfer & deletion ───────────────────
  useEffect(()=>{
    if(!socketOn) return;
    const myRoomId=room._id||room.id;
    const offTransfer=socketOn('room:ownership-transferred',({roomId:rid,newOwnerId,newOwnerName})=>{
      if(String(rid)!==String(myRoomId)) return;
      const mine=isSelfId(newOwnerId);
      try{ alert(mine?'Bạn là trưởng phòng mới':`${newOwnerName||'Thành viên'} là trưởng phòng mới`); }catch{}
    });
    const offDeleted=socketOn('room:deleted',({roomId:rid})=>{
      if(String(rid)!==String(myRoomId)) return;
      try{ alert('Phòng đã bị đóng'); }catch{}
      onLeave?.();
    });
    const offUpdated=socketOn('room:updated',(updated)=>{
      if(!updated) return;
      const rid=updated._id||updated.id;
      if(String(rid)!==String(myRoomId)) return;
      setRoomData(prev=>({...prev,...updated}));
    });
    return ()=>{ offTransfer(); offDeleted(); offUpdated(); };
  },[socketOn,room,onLeave]);

  // ── Typing indicator listener ───────────────────────────────────────
  useEffect(()=>{
    if(!socketOn) return;
    const timers=new Map();
    const myRoomId=room._id||room.id;
    const onStart=({roomId:rid,userId:uid,name})=>{
      if(String(rid)!==String(myRoomId)) return;
      if(isSelfId(uid)) return;
      setTypingUsers(prev=>{
        const others=prev.filter(u=>String(u.userId)!==String(uid));
        return [...others,{userId:uid,name:name||'Người chơi'}];
      });
      if(timers.has(String(uid))) clearTimeout(timers.get(String(uid)));
      timers.set(String(uid),setTimeout(()=>{
        setTypingUsers(prev=>prev.filter(u=>String(u.userId)!==String(uid)));
      },5000));
    };
    const onStop=({roomId:rid,userId:uid})=>{
      if(String(rid)!==String(myRoomId)) return;
      if(timers.has(String(uid))){ clearTimeout(timers.get(String(uid))); timers.delete(String(uid)); }
      setTypingUsers(prev=>prev.filter(u=>String(u.userId)!==String(uid)));
    };
    const offA=socketOn('chat:typing-start',onStart);
    const offB=socketOn('chat:typing-stop',onStop);
    return ()=>{ offA(); offB(); for(const t of timers.values()) clearTimeout(t); };
  },[socketOn,room,userId]);

  // ── Typing emit (debounced) ─────────────────────────────────────────
  const typingRef=useRef({lastSent:0,stopTimer:null,selfName:null});
  const getSelfName=()=>{
    if(typingRef.current.selfName) return typingRef.current.selfName;
    const m=(roomData.members||[]).find(x=>isSelfId(x.id||x._id));
    const n=m?.name||m?.username||"";
    if(n) typingRef.current.selfName=n;
    return n;
  };
  const notifyTyping=()=>{
    const rid=room._id||room.id;
    const now=Date.now();
    if(now-typingRef.current.lastSent>1500){
      typingRef.current.lastSent=now;
      socketEmit?.('chat:typing-start',{roomId:rid,name:getSelfName()});
    }
    if(typingRef.current.stopTimer) clearTimeout(typingRef.current.stopTimer);
    typingRef.current.stopTimer=setTimeout(()=>{
      socketEmit?.('chat:typing-stop',{roomId:rid});
      typingRef.current.lastSent=0;
    },3000);
  };
  const cancelTyping=()=>{
    const rid=room._id||room.id;
    if(typingRef.current.stopTimer){ clearTimeout(typingRef.current.stopTimer); typingRef.current.stopTimer=null; }
    if(typingRef.current.lastSent){ socketEmit?.('chat:typing-stop',{roomId:rid}); typingRef.current.lastSent=0; }
  };

  // ── Pending join-request listeners (persistent chatroom owner) ──────
  useEffect(()=>{
    if(!socketOn) return;
    const myRoomId=room._id||room.id;
    const offReq=socketOn('room:join-requested',({roomId:rid,user})=>{
      if(String(rid)!==String(myRoomId)||!user) return;
      setPendingList(prev=>{
        const uid=String(user.id||user._id);
        if(prev.some(p=>String(p._id||p.id)===uid)) return prev;
        return [...prev,{_id:user.id||user._id,username:user.username,avatar:user.avatar}];
      });
    });
    const offApp=socketOn('room:join-approved',({roomId:rid,userId:uid})=>{
      if(String(rid)!==String(myRoomId)) return;
      setPendingList(prev=>prev.filter(p=>String(p._id||p.id)!==String(uid)));
    });
    const offRej=socketOn('room:join-rejected',({roomId:rid,userId:uid})=>{
      if(String(rid)!==String(myRoomId)) return;
      setPendingList(prev=>prev.filter(p=>String(p._id||p.id)!==String(uid)));
    });
    return ()=>{offReq?.();offApp?.();offRej?.();};
  },[socketOn,room]);

  const approvePending=async(targetUserId)=>{
    const rid=room._id||room.id;
    try{
      await apiClient.post(`/api/rooms/${rid}/approve-join`,{targetUserId});
      setPendingList(prev=>prev.filter(p=>String(p._id||p.id)!==String(targetUserId)));
    }catch(e){ alert(e.response?.data?.error||'Duyệt thất bại'); }
  };
  const rejectPending=async(targetUserId)=>{
    const rid=room._id||room.id;
    try{
      await apiClient.post(`/api/rooms/${rid}/reject-join`,{targetUserId});
      setPendingList(prev=>prev.filter(p=>String(p._id||p.id)!==String(targetUserId)));
    }catch(e){ alert(e.response?.data?.error||'Từ chối thất bại'); }
  };

  // ── Kick listener — force leave when kicked by owner ────────────────
  useEffect(()=>{
    if(!socketOn) return;
    const off=socketOn('room:kicked',({roomId:rid,userId:kickedId})=>{
      const myRoomId=room._id||room.id;
      if(String(rid)!==String(myRoomId)) return;
      if(!isSelfId(kickedId)) return;
      try{ alert('Bạn đã bị loại khỏi tổ đội'); }catch{}
      onLeave?.();
    });
    return ()=>off();
  },[socketOn,room,onLeave]);

  // ── Chat socket — receive messages from other users ─────────────────
  useEffect(()=>{
    if(!socketOn) return;
    const apiOrigin=import.meta.env.VITE_API_URL||'http://localhost:4000';
    const resolveUrl=(u)=>!u?u:(u.startsWith('http')?u:`${apiOrigin}${u.startsWith('/')?'':'/'}${u}`);
    const offMsg=socketOn('chat:message',(msg)=>{
      if(!msg) return;
      const senderName=msg.userId?.username||msg.sender||"Người chơi";
      const isSelf=isSelfId(msg.userId?._id||msg.userId);
      const t=msg.createdAt?new Date(msg.createdAt).getTime():Date.now();
      setMsgs(prev=>{
        if(msg._id&&prev.find(m=>m._id===msg._id)) return prev;
        const items=[];
        const senderId=msg.userId?._id||msg.userId;
        if(msg.text&&msg.text.trim()){
          items.push({id:msg._id||Date.now(),_id:msg._id,sender:isSelf?"Bạn":senderName,senderId,text:msg.text,time:t,system:false});
        }
        const atts=Array.isArray(msg.attachments)?msg.attachments:[];
        atts.forEach((a,i)=>{
          const mime=a.mimetype||'';
          const kind=mime.startsWith('image/')?'image':mime.startsWith('video/')?'video':'file';
          items.push({
            id:(msg._id||Date.now())+'-a'+i,
            _id:msg._id?`${msg._id}-a${i}`:undefined,
            sender:isSelf?"Bạn":senderName,senderId,
            type:kind,src:resolveUrl(a.url),
            fileName:a.filename||a.originalname||'file',fileSize:a.size||0,
            time:t,system:false,
          });
        });
        if(items.length===0) return prev;
        return [...prev,...items];
      });
    });
    return ()=>offMsg();
  },[socketOn,userId]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(()=>{
    if(!voiceJoined) return;
    let pttHeld=false;

    const onKeyDown=(e)=>{
      if(listeningFor) return;
      const tag=document.activeElement?.tagName;
      const isTyping=tag==="INPUT"||tag==="TEXTAREA";
      const key=e.key.length===1?e.key.toUpperCase():e.key;
      const pttKey=keybinds.pushToTalk.toUpperCase();
      const muteKey=keybinds.mute.toUpperCase();

      if(key===pttKey&&micModeRef.current==="ptt"){
        e.preventDefault();
        if(isTyping) document.activeElement?.blur();
        if(!pttHeld){
          pttHeld=true;
          pttActiveRef.current=true;
          setPttActive(true);
          console.log("[PTT] Key DOWN — mic ON");
          if(lkControlsRef.current){ lkControlsRef.current.setMicMuted(false); console.log("[PTT] LiveKit mic unmuted"); }
          if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=true;});
        }
      }
      if(key===muteKey&&!isTyping){
        e.preventDefault();
        setMuted(prev=>{
          const next=!prev;
          mutedRef.current=next;
          // Only update track if PTT is not overriding
          if(!pttActiveRef.current){
            if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!next;});
          }
          if(next) setSpeaking(false);
          return next;
        });
      }
    };

    const onKeyUp=(e)=>{
      if(listeningFor) return;
      const key=e.key.length===1?e.key.toUpperCase():e.key;
      const pttKey=keybinds.pushToTalk.toUpperCase();

      if(key===pttKey&&pttHeld){
        pttHeld=false;
        pttActiveRef.current=false;
        setPttActive(false);
        console.log("[PTT] Key UP — mic OFF");
        if(lkControlsRef.current){ lkControlsRef.current.setMicMuted(true); console.log("[PTT] LiveKit mic muted"); }
        if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
        setSpeaking(false);
      }
    };

    window.addEventListener("keydown",onKeyDown);
    window.addEventListener("keyup",onKeyUp);
    return ()=>{
      window.removeEventListener("keydown",onKeyDown);
      window.removeEventListener("keyup",onKeyUp);
    };
  },[voiceJoined,keybinds,listeningFor]);

  // Keybind capture: listen for next key press
  useEffect(()=>{
    if(!listeningFor) return;
    const onKeyDown=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      // Ignore modifier-only keys
      if(["Control","Shift","Alt","Meta"].includes(e.key)) return;
      const key=e.key.length===1?e.key.toUpperCase():e.key;
      setKeybinds(prev=>{
        const next={...prev,[listeningFor]:key};
        localStorage.setItem("gf_voice_keybinds",JSON.stringify(next));
        return next;
      });
      setListeningFor(null);
    };
    window.addEventListener("keydown",onKeyDown,true);
    return ()=>window.removeEventListener("keydown",onKeyDown,true);
  },[listeningFor]);

  // ── Audio helpers ──────────────────────────────────────────────────────
  const teardownNsChain=()=>{
    nsNodesRef.current.forEach(n=>{ try{n.disconnect();}catch(e){} });
    nsNodesRef.current=[];
  };

  // Build Web-Audio NS processing chain: HPF → [LowShelf → Compressor → NotchX2] → out
  const buildNsChain=(sourceNode,ctx,level)=>{
    teardownNsChain();
    const nodes=[];
    let cur=sourceNode;

    // High-pass filter: remove low-frequency rumble
    const hpf=ctx.createBiquadFilter();
    hpf.type="highpass";
    hpf.frequency.value=level==="low"?60:level==="medium"?100:130;
    hpf.Q.value=0.7;
    cur.connect(hpf); nodes.push(hpf); cur=hpf;

    if(level==="medium"||level==="high"){
      // Low-shelf cut: attenuate remaining low rumble
      const shelf=ctx.createBiquadFilter();
      shelf.type="lowshelf";
      shelf.frequency.value=300;
      shelf.gain.value=-7;
      cur.connect(shelf); nodes.push(shelf); cur=shelf;

      // Dynamics compressor: smooth out peaks / background bursts
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=level==="high"?-38:-50;
      comp.knee.value=8;
      comp.ratio.value=level==="high"?20:10;
      comp.attack.value=0.001;
      comp.release.value=0.15;
      cur.connect(comp); nodes.push(comp); cur=comp;
    }

    if(level==="high"){
      // Notch filters for 50 Hz and 60 Hz mains hum
      [50,60].forEach(freq=>{
        const notch=ctx.createBiquadFilter();
        notch.type="notch";
        notch.frequency.value=freq;
        notch.Q.value=30;
        cur.connect(notch); nodes.push(notch); cur=notch;
      });
    }

    nsNodesRef.current=nodes;
    return cur; // last node — caller connects to analyser
  };

  // Start VAD polling; threshold and gate depend on NS level
  const startVadPolling=(analyser,nsOn,level)=>{
    if(speakTimerRef.current){ clearInterval(speakTimerRef.current); speakTimerRef.current=null; }
    speakFramesRef.current=0;
    const buf=new Uint8Array(analyser.frequencyBinCount);
    // Higher threshold → less sensitive → fewer false positives from background
    const threshold=nsOn?(level==="high"?22:level==="medium"?17:14):12;
    // Gate: require N consecutive frames above threshold to register as speaking
    const framesNeeded=nsOn?3:1;
    speakTimerRef.current=setInterval(()=>{
      if(!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(buf);
      const avg=buf.reduce((a,b)=>a+b,0)/buf.length;
      // Update volume meter (0-100 scale, capped)
      const pct=Math.min(100,Math.round((avg/50)*100));
      setMicLevel(mutedRef.current?0:pct);
      if(avg>threshold){
        speakFramesRef.current=Math.min(speakFramesRef.current+1,framesNeeded+1);
      }else{
        speakFramesRef.current=Math.max(speakFramesRef.current-2,0);
      }
      setSpeaking(speakFramesRef.current>=framesNeeded);
    },100);
  };

  const cleanupAudio=()=>{
    if(speakTimerRef.current){ clearInterval(speakTimerRef.current); speakTimerRef.current=null; }
    teardownNsChain();
    if(audioCtxRef.current){ audioCtxRef.current.close(); audioCtxRef.current=null; }
    if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    analyserRef.current=null;
    speakFramesRef.current=0;
    setMicLevel(0);
  };

  const startAnalyser=async(stream,nsOn=false,level="medium")=>{
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      // MUST await resume — browser suspends context until user gesture
      await ctx.resume();
      const analyser=ctx.createAnalyser();
      analyser.fftSize=256; // smaller = more responsive
      analyser.smoothingTimeConstant=0.3;
      const source=ctx.createMediaStreamSource(stream);

      if(nsOn){
        const lastNode=buildNsChain(source,ctx,level);
        lastNode.connect(analyser);
      }else{
        source.connect(analyser);
      }

      audioCtxRef.current=ctx;
      analyserRef.current=analyser;
      startVadPolling(analyser,nsOn,level);
    }catch(e){ console.error("startAnalyser error:",e); }
  };

  // Toggle or change NS level while already in a call
  const applyNs=async(enabled,level)=>{
    nsEnabledRef.current=enabled;
    nsLevelRef.current=level;
    setNsEnabled(enabled);
    setNsLevel(level);

    // Apply via LiveKit track
    if(lkControlsRef.current?.setNoiseSuppression){
      await lkControlsRef.current.setNoiseSuppression(enabled);
    }

    // Fallback: apply browser-native constraints on local stream
    if(streamRef.current){
      const track=streamRef.current.getAudioTracks()[0];
      if(track){
        try{
          await track.applyConstraints({
            noiseSuppression:enabled,
            echoCancellation:enabled,
            autoGainControl:enabled&&level!=="low",
          });
        }catch(e){}
      }
    }

    // Rebuild Web-Audio routing if context exists
    if(audioCtxRef.current&&streamRef.current){
      if(speakTimerRef.current){ clearInterval(speakTimerRef.current); speakTimerRef.current=null; }
      teardownNsChain();
      const source=audioCtxRef.current.createMediaStreamSource(streamRef.current);
      if(enabled){
        const lastNode=buildNsChain(source,audioCtxRef.current,level);
        lastNode.connect(analyserRef.current);
      }else{
        source.connect(analyserRef.current);
      }
      startVadPolling(analyserRef.current,enabled,level);
    }
  };

  // Change mic mode live (works while in voice too)
  const changeMicMode=(mode)=>{
    micModeRef.current=mode;
    setMicMode(mode);
    localStorage.setItem("gf_mic_mode",mode);
    if(!voiceJoined) return;
    if(mode==="ptt"){
      // Switch to PTT: mute immediately (PTT key will unmute on hold)
      mutedRef.current=true;
      setMuted(true);
      if(lkControlsRef.current) lkControlsRef.current.setMicMuted(true);
      if(!pttActiveRef.current&&streamRef.current)
        streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
      setSpeaking(false);
    }else{
      // Switch to always: unmute (restore open mic)
      mutedRef.current=false;
      setMuted(false);
      if(lkControlsRef.current) lkControlsRef.current.setMicMuted(false);
      if(!pttActiveRef.current&&streamRef.current)
        streamRef.current.getAudioTracks().forEach(t=>{t.enabled=true;});
    }
  };

  // ── Voice actions ──────────────────────────────────────────────────────
  const joinVoice=async()=>{
    if(voiceJoinedRef.current) return; // prevent double-join
    setVoiceError(null);

    // Try to connect via LiveKit first
    const roomId=room._id||room.id;
    const selfMember=room.members.find(m=>isSelfId(m.id))||{id:userId||"self",name:"Bạn"};
    const participantName=selfMember.name||"Bạn";

    console.log("[Voice] Requesting LiveKit token for room:", roomId, "participant:", participantName);
    const lkResult=await lkRequestToken({roomId, participantName});
    console.log("[Voice] LiveKit result:", lkResult?"token received":"null");
    if(lkResult?.token){
      setLkConnected(true);
      setVoiceJoined(true);
      // LiveKit handles mic entirely — no separate getUserMedia needed
      socketEmit?.('voice:join',{roomId,userId,name:participantName,muted:false});
      addSysMsg("Bạn đã kết nối LiveKit — voice/video/screen share sẵn sàng.");
      return;
    }

    // Fallback: local-only voice (LiveKit not configured)
    if(lkResult===null){
      addSysMsg("⚠ LiveKit chưa cấu hình. Dùng voice local (chỉ hiện trạng thái, không nghe được nhau).");
    }

    let hasStream=false;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;
      startAnalyser(stream,nsEnabledRef.current,nsLevelRef.current);
      hasStream=true;
    }catch(e){
      const msg=e.name==="NotAllowedError"||e.name==="PermissionDeniedError"
        ?"Không có quyền micro. Đã tham gia ở chế độ chỉ nghe."
        :"Không thể truy cập micro: "+e.message;
      setVoiceError(msg);
    }
    const startMuted=!hasStream||(micModeRef.current==="ptt");
    if(hasStream&&micModeRef.current==="ptt"){
      streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
      setMuted(true); mutedRef.current=true;
    }
    setVoiceJoined(true);
    socketEmit?.('voice:join',{roomId,userId,name:participantName,muted:startMuted});
    const modeHint=micModeRef.current==="ptt"?` — PTT mode, giữ [${keybinds.pushToTalk}] để nói`:"";
    addSysMsg(hasStream?`Bạn đã tham gia kênh thoại${modeHint}.`:"Bạn đã tham gia kênh thoại (chỉ nghe).");
  };

  const leaveVoice=()=>{
    cleanupAudio();
    if(lkConnected){ lkReset(); setLkConnected(false); }
    setVoiceJoined(false);
    setMuted(false);
    setDeafened(false);
    setSpeaking(false);
    setPttActive(false);
    pttActiveRef.current=false;
    // Tell server — server removes us and broadcasts updated list to all
    socketEmit?.('voice:leave',{roomId:room._id||room.id,userId});
    addSysMsg("Bạn đã rời kênh thoại.");
  };

  const toggleMute=()=>{
    const next=!muted;
    mutedRef.current=next;
    // Mute/unmute LiveKit track (fast, keeps track published)
    if(lkControlsRef.current) lkControlsRef.current.setMicMuted(next);
    // Fallback: local stream
    if(!pttActiveRef.current&&streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!next;});
    setMuted(next);
    if(next) setSpeaking(false);
    socketEmit?.('voice:state',{roomId:room._id||room.id,userId,muted:next,speaking:false});
  };

  const toggleDeafen=()=>{
    const next=!deafened;
    setDeafened(next);
    if(next){
      if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
      setMuted(true);
      mutedRef.current=true;
      setSpeaking(false);
    }
  };

  // ── Chat helpers ───────────────────────────────────────────────────────
  const addSysMsg=(text)=>setMsgs(p=>[...p,{id:Date.now()+Math.random(),sender:"Hệ thống",text,system:true,time:Date.now()}]);

  const send=()=>{
    const raw=input.trim();
    if(!raw) return;

    // Universal /help command — hoạt động cho mọi game
    if(isHelpCommand(raw)){
      setMsgs(p=>[...p,{id:Date.now(),sender:"Hệ thống",system:true,text:buildHelpText(room?.game),time:Date.now()}]);
      setInput("");
      return;
    }

    // Dispatch slash command qua per-game router — pass mode vào context
    const handler=getCommandHandler(room?.game);
    if(handler){
      const result=handler.parse(raw,{mode:room?.mode});
      if(result){
        if(result.matched){
          setMsgs(p=>[...p,{id:Date.now(),sender:"Bạn",text:result.display,time:Date.now()}]);
          setInput("");
          return;
        }
        // Command sai cú pháp → system message
        setMsgs(p=>[...p,{id:Date.now(),sender:"Hệ thống",system:true,text:result.error||"Command không hợp lệ. Gõ /help để xem danh sách.",time:Date.now()}]);
        setInput("");
        return;
      }
      // parse trả null → không phải command, fall through
    }

    // Gửi text bình thường — qua socket để broadcast cho tất cả
    const roomId=room._id||room.id;
    socketEmit?.('chat:message',{roomId,text:raw});
    setInput("");
  };

  const handleFiles=async(e)=>{
    const files=Array.from(e.target.files);
    e.target.value="";
    const roomId=room._id||room.id;
    const ids=[];
    for(const file of files){
      try{
        const fd=new FormData();
        fd.append('file',file);
        fd.append('roomId',roomId);
        const res=await apiClient.post('/api/upload',fd,{headers:{'Content-Type':'multipart/form-data'}});
        const att=res.data?.data;
        if(att?.id) ids.push(att.id);
      }catch(err){
        console.error('Upload failed:',err?.response?.data?.message||err.message);
        try{ alert('Upload thất bại: '+(err?.response?.data?.message||err.message)); }catch{}
      }
    }
    if(ids.length>0){
      socketEmit?.('chat:message',{roomId,text:'',attachmentIds:ids});
    }
  };

  // ── Slot movement ──────────────────────────────────────────────────────
  const moveSelf=(toIdx)=>{
    setSlots(prev=>{
      const selfIdx=prev.findIndex(s=>s&&isSelfId(s.id));
      if(selfIdx===-1||prev[toIdx]!==null) return prev;
      const next=[...prev];
      next[toIdx]=next[selfIdx];
      next[selfIdx]=null;
      return next;
    });
  };
  const handleDragStart=(idx)=>{ if(slots[idx]&&isSelfId(slots[idx].id)) setDragFromSlot(idx); };
  const handleDragEnd=()=>{ setDragFromSlot(null); setHoverSlot(null); };
  const handleDragOver=(e,idx)=>{ e.preventDefault(); if(slots[idx]===null) setHoverSlot(idx); };
  const handleDrop=(idx)=>{ if(slots[idx]===null) moveSelf(idx); setDragFromSlot(null); setHoverSlot(null); };

  // Render text có URL → clickable link
  const renderRichText=(text)=>{
    if(!text) return null;
    const urlRegex=/(https?:\/\/[^\s]+)/g;
    const parts=String(text).split(urlRegex);
    return parts.map((part,i)=>{
      if(urlRegex.test(part)){
        // reset lastIndex vì split + test có thể vướng state
        urlRegex.lastIndex=0;
        return(
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{color:"#5b9bd5",textDecoration:"underline",wordBreak:"break-all"}}
            onClick={(e)=>e.stopPropagation()}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ── Render message ─────────────────────────────────────────────────────
  const renderMsg=(msg)=>{
    if(msg.system){
      const isMultiline=String(msg.text||"").includes("\n");
      if(isMultiline){
        return(
          <div key={msg.id} style={{marginBottom:14,display:"flex",justifyContent:"center"}}>
            <pre style={{
              maxWidth:"90%",fontSize:12,color:CYBER.cyan,
              background:`${CYBER.bgCardAlt}cc`,
              padding:"14px 20px",borderRadius:6,
              border:`1px solid ${CYBER.cyan}40`,
              boxShadow:`0 0 14px ${CYBER.cyan}18, inset 0 0 10px ${CYBER.cyan}08`,
              whiteSpace:"pre-wrap",wordBreak:"break-word",textAlign:"left",
              fontFamily:"'JetBrains Mono', monospace",
              lineHeight:1.6,margin:0
            }}>{msg.text}</pre>
          </div>
        );
      }
      return(
        <div key={msg.id} style={{textAlign:"center",marginBottom:10}}>
          <span style={{
            fontSize:11,color:CYBER.cyan,fontStyle:"italic",fontWeight:500,
            background:`${CYBER.cyan}10`,padding:"5px 18px",borderRadius:12,
            display:"inline-block",border:`1px solid ${CYBER.cyan}40`,letterSpacing:0.3,
          }}>◆ {msg.text}</span>
        </div>
      );
    }
    const isMe=msg.sender==="Bạn";
    return(
      <div key={msg.id} style={{display:"flex",gap:12,marginBottom:4,padding:"4px 0",
        borderRadius:4,transition:"background .1s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#0d0d1a"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        {/* Avatar */}
        <div onClick={()=>{ const uid=msg.senderId||msg.userId; if(uid && !isMe) setProfileUser(uid); }}
          style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
          background:`linear-gradient(135deg,${isMe?CYBER.cyan+"30":"#2a2a3e"},${isMe?CYBER.cyan+"15":"#1e2328"})`,
          border:`2px solid ${isMe?CYBER.cyan+"40":"#333"}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginTop:2,
          cursor: isMe?"default":"pointer"
        }}>👤</div>
        {/* Content */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:2}}>
            <span style={{fontSize:13,fontWeight:700,color:isMe?CYBER.cyan:"#f0f0f0"}}>{msg.sender}</span>
            <span style={{fontSize:10,color:"#4a4a5a"}}>{new Date(msg.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          {msg.type==="image"?(
            <img src={msg.src} alt={msg.fileName} onClick={()=>setLightbox(msg.src)}
              style={{maxWidth:320,maxHeight:240,borderRadius:8,cursor:"zoom-in",objectFit:"contain",display:"block",marginTop:4}}/>
          ):msg.type==="video"?(
            <video src={msg.src} controls style={{maxWidth:400,maxHeight:260,borderRadius:8,display:"block",marginTop:4}}/>
          ):msg.type==="file"?(
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#111",borderRadius:6,border:"1px solid #222",marginTop:4}}>
              <span style={{fontSize:20}}>📎</span>
              <div>
                <div style={{color:"#c8aa6e",fontSize:12}}>{msg.fileName}</div>
                <div style={{color:"#444",fontSize:10}}>{(msg.fileSize/1024).toFixed(1)} KB</div>
              </div>
            </div>
          ):(
            <div style={{color:"#dcddde",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{renderRichText(msg.text)}</div>
          )}
        </div>
      </div>
    );
  };

  // ── Keybind label helper ───────────────────────────────────────────────
  const kbdLabel=(key)=>{
    const map={" ":"Space","ArrowUp":"↑","ArrowDown":"↓","ArrowLeft":"←","ArrowRight":"→",
      "Control":"Ctrl","Shift":"Shift","Alt":"Alt","Meta":"Win",
      "F1":"F1","F2":"F2","F3":"F3","F4":"F4","F5":"F5","F6":"F6",
      "F7":"F7","F8":"F8","F9":"F9","F10":"F10","F11":"F11","F12":"F12"};
    return map[key]||key;
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>

      {/* ── Top bar (Discord header style) ── */}
      <div style={{height:48,padding:"0 16px",display:"flex",alignItems:"center",
        borderBottom:`1px solid ${CYBER.border}`,
        background:`${CYBER.bgCard}ee`,
        backdropFilter:"blur(8px)",flexShrink:0,gap:12}}>
        {onBackToLobby&&(
          <button onClick={onBackToLobby}
            style={{background:"none",border:"none",color:CYBER.textMuted,cursor:"pointer",fontSize:16,padding:"4px",display:"flex",alignItems:"center"}}
            title="Quay lại lobby">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CYBER.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span style={{fontFamily:"'Be Vietnam Pro',sans-serif",fontSize:15,fontWeight:700,color:CYBER.textPrimary}}>{roomData.name}</span>
        <StatusDot status={roomData.status}/>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:CYBER.textMuted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>
          {roomData.current||roomData.members?.length||0}/{roomData.maxPlayers||roomData.slots}
        </span>
        {isOwner&&(
          <GoldBtn variant="ghost" size="sm" onClick={()=>setShowEditRoom(true)}>Chỉnh sửa</GoldBtn>
        )}
        <GoldBtn variant="danger" size="sm" onClick={onLeave}>{isOwner?"Đóng Phòng":"Rời Phòng"}</GoldBtn>
      </div>
      <EditRoomModal isOpen={showEditRoom} onClose={()=>setShowEditRoom(false)}
        room={roomData} onUpdated={(r)=>setRoomData(prev=>({...prev,...r}))}/>
      <ProfileModal userId={profileUser} onClose={()=>setProfileUser(null)}/>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ══════ LEFT SIDEBAR — Channels (Discord-style) ══════ */}
        <div style={{width:240,borderRight:`1px solid ${CYBER.border}`,background:"#080814",flexShrink:0,display:"flex",flexDirection:"column"}}>

          {/* ── Voice Channel ── */}
          <div style={{borderTop:"1px solid #14141e",background:"#060610",flexShrink:0}}>

            {/* Channel header */}
            <div style={{
              padding:"10px 14px 8px",
              display:"flex",alignItems:"center",justifyContent:"space-between",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                {/* Speaker icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11.5 3L5 8H2a1 1 0 00-1 1v6a1 1 0 001 1h3l6.5 5V3z" fill={voiceJoined?"#3ba55d":"#5b5a56"}/>
                  {voiceJoined&&<path d="M15.5 8.5a5 5 0 010 7M18.5 6a9 9 0 010 12" stroke="#3ba55d" strokeWidth="1.5" strokeLinecap="round"/>}
                </svg>
                <span style={{fontSize:11,color:voiceJoined?"#dcddde":"#72767d",textTransform:"uppercase",letterSpacing:1.4,fontWeight:700}}>
                  Kênh Thoại
                </span>
                {voiceJoined&&(
                  <span style={{
                    fontSize:9,padding:"1px 6px",borderRadius:8,
                    background:"#3ba55d25",color:"#3ba55d",fontWeight:700,letterSpacing:0.5,
                  }}>LIVE</span>
                )}
                {voiceJoined&&(
                  <span style={{
                    fontSize:9,padding:"1px 6px",borderRadius:8,fontWeight:700,letterSpacing:0.3,
                    background:micMode==="ptt"?"#5865f218":"#faa61a18",
                    color:micMode==="ptt"?"#7289da":"#faa61a",
                    border:`1px solid ${micMode==="ptt"?"#5865f230":"#faa61a30"}`,
                  }}>
                    {micMode==="ptt"?`PTT [${kbdLabel(keybinds.pushToTalk)}]`:"MIC ON"}
                  </span>
                )}
              </div>
              {voiceJoined&&(
                <button
                  onClick={()=>setShowVoiceSettings(true)}
                  title="Cài đặt phím tắt"
                  style={{
                    background:"transparent",border:"none",cursor:"pointer",
                    color:"#5b5a56",fontSize:14,padding:"2px 4px",borderRadius:4,
                    transition:"color .2s",lineHeight:1,
                  }}
                  onMouseOver={e=>e.currentTarget.style.color="#c8aa6e"}
                  onMouseOut={e=>e.currentTarget.style.color="#5b5a56"}
                >⚙</button>
              )}
            </div>

            {/* Error notice */}
            {voiceError&&(
              <div style={{margin:"0 12px 8px",fontSize:10,color:"#f04747",background:"#f0474712",border:"1px solid #f0474730",borderRadius:4,padding:"5px 8px",lineHeight:1.4}}>
                ⚠ {voiceError}
              </div>
            )}

            {/* Voice members — show to ALL users in room */}
            {voiceMembers.length>0&&!voiceJoined&&(
              <div style={{padding:"0 8px 4px"}}>
                {dedupeVoice(voiceMembers).map(vm=>(
                  <div key={vm.id} style={{
                    display:"flex",alignItems:"center",gap:9,
                    padding:"4px 8px",borderRadius:6,marginBottom:2,
                    background:vm.speaking?"#0d2610":"transparent",
                    transition:"background .15s",
                  }}>
                    <div style={{
                      width:26,height:26,borderRadius:"50%",
                      background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                      border:`3px solid ${vm.speaking?"#3ba55d":"#252538"}`,
                      boxShadow:vm.speaking?"0 0 0 3px #3ba55d60, 0 0 12px #3ba55d40":"none",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                      transition:"all .15s",
                    }}>👤</div>
                    <span style={{fontSize:11,color:vm.speaking?"#fff":"#96989d",transition:"color .15s"}}>{vm.name}</span>
                    {vm.muted&&!vm.speaking&&(
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f04747" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                      </svg>
                    )}
                    {vm.speaking&&(
                      <div style={{display:"flex",gap:2,alignItems:"flex-end",height:12}}>
                        {[3,5,4].map((h,i)=>(
                          <div key={i} style={{width:2.5,height:h,borderRadius:2,background:"#3ba55d",
                            animation:`voiceBar${i} 0.6s ease-in-out infinite alternate`}}/>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!voiceJoined?(
              <div style={{padding:"4px 12px 14px"}}>
                <button onClick={joinVoice}
                  style={{
                    width:"100%",padding:"9px 12px",
                    background:"#1a3a1a",border:"1px solid #2a5a2a",borderRadius:6,
                    color:"#3ba55d",fontSize:12,cursor:"pointer",fontWeight:600,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",
                  }}
                  onMouseOver={e=>{e.currentTarget.style.background="#1e481e";e.currentTarget.style.borderColor="#3ba55d";}}
                  onMouseOut={e=>{e.currentTarget.style.background="#1a3a1a";e.currentTarget.style.borderColor="#2a5a2a";}}>
                  <span>📞</span> Tham gia kênh thoại
                </button>
              </div>
            ):(
              <>
                {/* Voice member rows */}
                <div style={{padding:"0 8px 6px"}}>
                  {dedupeVoice(voiceMembers).map(vm=>{
                    const isSelf=isSelfId(vm.id);
                    const isActivePtt=isSelf&&pttActive;
                    const effectiveSpeaking=isSelf?isSpeaking:vm.speaking;
                    const vol=userVolumes[vm.id]??100;
                    return(
                      <div key={vm.id} style={{
                        display:"flex",alignItems:"center",gap:9,
                        padding:"5px 8px",borderRadius:6,marginBottom:2,
                        background:effectiveSpeaking?"#0d2610":isSelf?"#c89b3c08":"transparent",
                        border:`1px solid ${effectiveSpeaking?"#3ba55d25":"transparent"}`,
                        transition:"all .25s",cursor:!isSelf?"pointer":"default",position:"relative",
                      }}
                      onClick={()=>!isSelf&&setVolumePopup(volumePopup===vm.id?null:vm.id)}>
                        {/* Avatar */}
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{
                            width:30,height:30,borderRadius:"50%",
                            background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                            border:`3px solid ${effectiveSpeaking?"#3ba55d":isSelf?"#c89b3c40":"#252538"}`,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                            boxShadow:effectiveSpeaking?"0 0 0 3px #3ba55d60, 0 0 12px #3ba55d40":"none",
                            transition:"all .15s",
                          }}>👤</div>
                          {/* Muted badge */}
                          {vm.muted&&!isActivePtt&&(
                            <div style={{
                              position:"absolute",bottom:-2,right:-2,
                              width:13,height:13,borderRadius:"50%",
                              background:"#f04747",border:"2px solid #060610",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:7,lineHeight:1,
                            }}>✕</div>
                          )}
                          {/* PTT active badge */}
                          {isActivePtt&&(
                            <div style={{
                              position:"absolute",bottom:-2,right:-2,
                              width:13,height:13,borderRadius:"50%",
                              background:"#3ba55d",border:"2px solid #060610",
                              animation:"pulse 0.8s ease-in-out infinite",
                            }}/>
                          )}
                        </div>

                        {/* Name */}
                        <span style={{
                          flex:1,fontSize:12,
                          color:effectiveSpeaking?"#fff":isSelf?"#c8aa6e":"#96989d",
                          fontWeight:isSelf?700:400,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          transition:"color .25s",
                        }}>
                          {isSelf?"Bạn":vm.name}
                        </span>

                        {/* Right icons */}
                        <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                          {vm.muted&&!isActivePtt&&(
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f04747" title="Đang tắt mic">
                              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M4.222 4.222l15.556 15.556"/>
                              <line x1="4" y1="4" x2="20" y2="20" stroke="#f04747" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {isActivePtt&&(
                            <span style={{fontSize:10,color:"#3ba55d",fontWeight:700,letterSpacing:0.3}}>PTT</span>
                          )}
                          {effectiveSpeaking&&!isActivePtt&&(
                            <div style={{
                              display:"flex",gap:2,alignItems:"flex-end",height:14,
                            }}>
                              {[3,5,4].map((h,i)=>(
                                <div key={i} style={{
                                  width:3,height:h,borderRadius:2,background:"#3ba55d",
                                  animation:`voiceBar${i} 0.6s ease-in-out infinite alternate`,
                                }}/>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Volume popup for this user */}
                        {!isSelf&&volumePopup===vm.id&&(
                          <div onClick={e=>e.stopPropagation()} style={{
                            position:"absolute",left:0,right:0,top:"100%",zIndex:10,
                            padding:"8px 10px",background:"#1a1a2e",borderRadius:6,
                            border:"1px solid #2a2a45",boxShadow:"0 4px 12px rgba(0,0,0,.5)",
                            marginTop:2,
                          }}>
                            <div style={{fontSize:9,color:"#72767d",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>
                              Âm lượng — {vol}%
                            </div>
                            <input type="range" min={0} max={200} value={vol}
                              onChange={e=>{
                                const v=Number(e.target.value);
                                setUserVolumes(p=>({...p,[vm.id]:v}));
                                if(lkControlsRef.current) lkControlsRef.current.setUserVolume(vm.id,v/100);
                              }}
                              style={{width:"100%",accentColor:"#3ba55d",height:4,cursor:"pointer"}}/>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#555",marginTop:2}}>
                              <span>0%</span><span>100%</span><span>200%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Discord Voice Connected panel ── */}
                <div style={{background:"#1a2c1a",margin:"4px 8px 8px",borderRadius:6,overflow:"hidden"}}>
                  {/* Top: Voice Connected + icons */}
                  <div style={{padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M2 16.5C2 12.36 5.36 9 9.5 9H10v2H9.5C6.46 11 4 13.46 4 16.5S6.46 22 9.5 22h1v2h-1C5.36 24 2 20.64 2 16.5z" fill="#3ba55d"/>
                        <path d="M6 16.5c0-2.49 2.01-4.5 4.5-4.5H11v1.5h-.5c-1.66 0-3 1.34-3 3s1.34 3 3 3h.5V21h-.5c-2.49 0-4.5-2.01-4.5-4.5z" fill="#3ba55d"/>
                        <circle cx="12" cy="16.5" r="2" fill="#3ba55d"/>
                      </svg>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#3ba55d"}}>Voice Connected</div>
                        <div style={{fontSize:10,color:"#7a9a7e"}}>{room.name} / Kênh Thoại</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {/* Signal bars */}
                      <div style={{display:"flex",gap:1,alignItems:"flex-end",height:16,padding:"0 4px"}}>
                        {[4,7,10,14].map((h,i)=>(
                          <div key={i} style={{width:3,height:h,borderRadius:1,background:"#3ba55d"}}/>
                        ))}
                      </div>
                      {/* Disconnect */}
                      <button onClick={leaveVoice} title="Ngắt kết nối"
                        style={{background:"none",border:"none",cursor:"pointer",color:"#b9bbbe",padding:4,display:"flex",borderRadius:4,transition:"all .15s"}}
                        onMouseOver={e=>{e.currentTarget.style.background="#f0474720";e.currentTarget.style.color="#f04747";}}
                        onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#b9bbbe";}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-7.35 16.76l1.42-1.42A8 8 0 1120 12h-2a6 6 0 10-6 6v2A8 8 0 0012 2z"/><path d="M15 12l-3 3-3-3h2V8h2v4h2z" transform="rotate(90,12,12)"/></svg>
                      </button>
                    </div>
                  </div>
                  {/* Action buttons row (like Discord) */}
                  <div style={{padding:"6px 8px",display:"flex",gap:4}}>
                    {/* Screen Share */}
                    <button onClick={async()=>{
                      if(lkControlsRef.current){
                        const next=!screenSharing;
                        await lkControlsRef.current.setScreenShareEnabled(next);
                        setScreenSharing(next);
                      }
                    }}
                      title={screenSharing?"Dừng chia sẻ":"Chia sẻ màn hình"}
                      style={{flex:1,padding:"6px",borderRadius:4,cursor:"pointer",
                        background:screenSharing?"#3ba55d20":"#1a2a1a",
                        border:`1px solid ${screenSharing?"#3ba55d":"#2a4a2a"}`,
                        color:screenSharing?"#3ba55d":"#7a9a7e",fontSize:10,fontWeight:600,
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .2s"
                      }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      Screen
                    </button>
                    {/* Camera */}
                    <button onClick={async()=>{
                      if(lkControlsRef.current){
                        const next=!cameraOn;
                        await lkControlsRef.current.setCameraEnabled(next);
                        setCameraOn(next);
                      }
                    }}
                      title={cameraOn?"Tắt camera":"Bật camera"}
                      style={{flex:1,padding:"6px",borderRadius:4,cursor:"pointer",
                        background:cameraOn?"#3ba55d20":"#1a2a1a",
                        border:`1px solid ${cameraOn?"#3ba55d":"#2a4a2a"}`,
                        color:cameraOn?"#3ba55d":"#7a9a7e",fontSize:10,fontWeight:600,
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .2s"
                      }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                      Video
                    </button>
                  </div>
                  {/* Mic level bar */}
                  <div style={{height:3,background:"#0d3320"}}>
                    <div style={{height:"100%",width:`${micLevel}%`,background:micLevel>50?"#faa61a":"#3ba55d",transition:"width .08s linear",borderRadius:"0 2px 2px 0"}}/>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Spacer */}
          <div style={{flex:1}}/>

          {/* ── Mic Input Gain (when in voice) ── */}
          {voiceJoined&&(
            <div style={{padding:"6px 10px",borderTop:`1px solid ${CYBER.border}20`,background:"#060610"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#72767d" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/>
                </svg>
                <span style={{fontSize:9,color:"#72767d",textTransform:"uppercase",letterSpacing:1,flex:1}}>Mic Input</span>
                <span style={{fontSize:9,color:CYBER.cyan,fontWeight:700}}>{micGain}%</span>
              </div>
              <input type="range" min={0} max={200} value={micGain}
                onChange={e=>{
                  const v=Number(e.target.value);
                  setMicGain(v);
                  // Apply gain via LiveKit track
                  if(lkControlsRef.current){
                    const pub=lkControlsRef.current.getRoom?.()?.localParticipant?.getTrackPublication?.('microphone');
                    const track=pub?.track?.mediaStreamTrack;
                    if(track){
                      // Use audio constraint or Web Audio gain
                    }
                  }
                }}
                style={{width:"100%",accentColor:CYBER.cyan,height:3,cursor:"pointer"}}/>
            </div>
          )}

          {/* ── User Panel (Discord bottom-left) ── */}
          <div style={{
            padding:"8px 10px",borderTop:`1px solid ${CYBER.border}`,
            background:"#060610",display:"flex",alignItems:"center",gap:8,flexShrink:0
          }}>
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
              background:`linear-gradient(135deg,${CYBER.cyan}20,#1e2328)`,
              border:`2px solid ${CYBER.cyan}40`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,position:"relative"
            }}>
              👤
              <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",
                background:voiceJoined?"#3ba55d":"#43b581",border:"2px solid #060610"}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:CYBER.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Bạn</div>
              <div style={{fontSize:9,color:CYBER.textMuted}}>#{String(userId||"").slice(-4)}</div>
            </div>
            {voiceJoined&&(
              <div style={{display:"flex",gap:2}}>
                <button onClick={toggleMute} title={muted?"Bật mic":"Tắt mic"}
                  style={{width:28,height:28,borderRadius:4,background:"transparent",border:"none",cursor:"pointer",
                    color:muted?"#f04747":"#b9bbbe",display:"flex",alignItems:"center",justifyContent:"center",transition:"color .2s"}}
                  onMouseOver={e=>e.currentTarget.style.color="#fff"} onMouseOut={e=>e.currentTarget.style.color=muted?"#f04747":"#b9bbbe"}>
                  {muted?
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .3-.01.6-.04.9M12 19v4M8 23h8"/>
                    </svg>:
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                  }
                </button>
                <button onClick={toggleDeafen} title={deafened?"Bỏ điếc":"Tắt tai nghe"}
                  style={{width:28,height:28,borderRadius:4,background:"transparent",border:"none",cursor:"pointer",
                    color:deafened?"#f04747":"#b9bbbe",display:"flex",alignItems:"center",justifyContent:"center",transition:"color .2s"}}
                  onMouseOver={e=>e.currentTarget.style.color="#fff"} onMouseOut={e=>e.currentTarget.style.color=deafened?"#f04747":"#b9bbbe"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
                    {deafened&&<line x1="1" y1="1" x2="23" y2="23"/>}
                  </svg>
                </button>
                <button onClick={()=>setShowVoiceSettings(true)} title="Cài đặt"
                  style={{width:28,height:28,borderRadius:4,background:"transparent",border:"none",cursor:"pointer",
                    color:"#b9bbbe",display:"flex",alignItems:"center",justifyContent:"center",transition:"color .2s"}}
                  onMouseOver={e=>e.currentTarget.style.color="#fff"} onMouseOut={e=>e.currentTarget.style.color="#b9bbbe"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ══════ CENTER — Video + Chat ══════ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#0b0b18",overflow:"hidden"}}>
          {/* LiveKit — resizable video area */}
          {lkConnected&&lkToken&&lkUrl&&(
            <>
              <div style={{
                flexShrink:0,background:"#060610",overflow:"hidden",
                height:(cameraOn||screenSharing||remoteTrackCount>0)?videoHeight:0,
                transition:"height .3s",
              }}>
                <LiveKitRoom
                  token={lkToken}
                  serverUrl={lkUrl}
                  onDisconnect={leaveVoice}
                  onTracksChanged={setRemoteTrackCount}
                  onSpeakingChange={(sp)=>{
                    setSpeaking(sp);
                    setMicLevel(sp?60:0);
                  }}
                  onReady={(controls)=>{
                    lkControlsRef.current=controls;
                    if(micModeRef.current==="ptt") setTimeout(()=>controls.setMicMuted(true),500);
                  }}
                />
              </div>
              {/* Drag handle to resize */}
              {(cameraOn||screenSharing||remoteTrackCount>0)&&(
                <div
                  onMouseDown={e=>{
                    e.preventDefault();
                    const startY=e.clientY;
                    const startH=videoHeight;
                    const onMove=ev=>{
                      const delta=ev.clientY-startY;
                      setVideoHeight(Math.max(80,Math.min(window.innerHeight*0.85,startH+delta)));
                    };
                    const onUp=()=>{
                      window.removeEventListener("mousemove",onMove);
                      window.removeEventListener("mouseup",onUp);
                    };
                    window.addEventListener("mousemove",onMove);
                    window.addEventListener("mouseup",onUp);
                  }}
                  style={{
                    height:6,cursor:"row-resize",flexShrink:0,
                    background:`linear-gradient(90deg,transparent,${CYBER.cyan}30,transparent)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"background .2s",
                  }}
                  onMouseOver={e=>e.currentTarget.style.background=`linear-gradient(90deg,transparent,${CYBER.cyan}60,transparent)`}
                  onMouseOut={e=>e.currentTarget.style.background=`linear-gradient(90deg,transparent,${CYBER.cyan}30,transparent)`}
                >
                  <div style={{width:40,height:3,borderRadius:2,background:`${CYBER.cyan}50`}}/>
                </div>
              )}
            </>
          )}
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
            {msgs.map(renderMsg)}
            <div ref={chatEnd}/>
          </div>
          {typingUsers.length>0&&(
            <div style={{padding:"2px 18px",fontSize:11,color:CYBER.textMuted,fontStyle:"italic",background:"#0a0a14"}}>
              {typingUsers.map(u=>u.name||'Người chơi').slice(0,3).join(', ')} đang nhập…
            </div>
          )}
          <div style={{padding:"10px 18px 14px",borderTop:`1px solid ${CYBER.border}`,background:"#0a0a14"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#111520",borderRadius:8,border:"1px solid #1e1e30",padding:"2px 8px 2px 2px"}}>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFiles} style={{display:"none"}}/>
              <button onClick={()=>fileInputRef.current?.click()} title="Đính kèm"
                style={{width:36,height:36,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#555",transition:"color .2s",flexShrink:0}}
                onMouseOver={e=>e.currentTarget.style.color="#c8aa6e"} onMouseOut={e=>e.currentTarget.style.color="#555"}>📎</button>
              <input value={input}
                onChange={e=>{ setInput(e.target.value); if(e.target.value) notifyTyping(); else cancelTyping(); }}
                onBlur={cancelTyping}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(cancelTyping(),send())}
                placeholder={getPlaceholder(room?.game)}
                style={{flex:1,padding:"8px 4px",background:"transparent",border:"none",color:"#c8aa6e",fontSize:13,outline:"none"}}/>
              <GoldBtn onClick={send} size="sm">Gửi</GoldBtn>
            </div>
          </div>
        </div>

        {/* ══════ RIGHT SIDEBAR — Members (Discord-style) ══════ */}
        <div style={{width:240,borderLeft:`1px solid ${CYBER.border}`,background:"#080814",overflowY:"auto",flexShrink:0}}>
          <div style={{padding:"16px 12px 8px"}}>
            {isOwner&&(roomData?.isPersistent||room?.isPersistent)&&(
              <div style={{marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${CYBER.border}`}}>
                <div style={{fontSize:10,color:CYBER.gold||"#f0b132",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:8,
                  fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:6}}>
                  ⏳ Yêu Cầu Vào Nhóm
                  {pendingList.length>0&&(
                    <span style={{background:CYBER.gold||"#f0b132",color:"#000",borderRadius:8,padding:"1px 6px",fontSize:9}}>{pendingList.length}</span>
                  )}
                </div>
                {pendingList.length===0?(
                  <div style={{fontSize:10,color:CYBER.textMuted,fontStyle:"italic"}}>Không có yêu cầu nào</div>
                ):pendingList.map(p=>{
                  const pid=p._id||p.id;
                  return(
                    <div key={pid} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 4px",marginBottom:4,
                      background:"#0f0f1a",borderRadius:4,border:`1px solid ${CYBER.border}`}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,overflow:"hidden"}}>
                        {p.avatar?<img src={p.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
                      </div>
                      <div style={{flex:1,minWidth:0,color:"#dcddde",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {p.username||"User"}
                      </div>
                      <button onClick={()=>approvePending(pid)} title="Duyệt"
                        style={{background:"#3ba55d",border:"none",color:"#fff",cursor:"pointer",fontSize:11,
                          padding:"3px 6px",borderRadius:3,fontWeight:700}}>✓</button>
                      <button onClick={()=>rejectPending(pid)} title="Từ chối"
                        style={{background:"#ed4245",border:"none",color:"#fff",cursor:"pointer",fontSize:11,
                          padding:"3px 6px",borderRadius:3,fontWeight:700}}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{fontSize:10,color:CYBER.textMuted,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:10,
              fontFamily:"'JetBrains Mono',monospace"}}>
              Thành Viên — {room.members?.length||0}/{room.maxPlayers}
            </div>
            {slots.map((m,i)=>{
              if(m){
                const inVoice=voiceMembers.find(v=>String(v.id)===String(m.id));
                const isSelf=isSelfId(m.id);
                return(
                  <div key={m.id}
                    draggable={isSelf} onDragStart={()=>handleDragStart(i)} onDragEnd={handleDragEnd}
                    style={{display:"flex",alignItems:"center",gap:8,
                      padding:"6px 8px",borderRadius:6,marginBottom:2,
                      background:isSelf?`${CYBER.cyan}08`:"transparent",
                      cursor:isSelf?"grab":"default",
                      border:`1px solid ${isSelf&&dragFromSlot===i?`${CYBER.cyan}40`:"transparent"}`,
                      transition:"all .2s"}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <div style={{
                        width:32,height:32,borderRadius:"50%",
                        background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                        border:`2px solid ${inVoice?.speaking?"#3ba55d":isSelf?`${CYBER.cyan}60`:"#252538"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                        boxShadow:inVoice?.speaking?"0 0 6px #3ba55d40":"none",
                      }}>👤</div>
                      {/* Online dot */}
                      <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",
                        background:inVoice?"#3ba55d":"#43b581",border:"2px solid #080814"}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:isSelf?CYBER.cyan:"#dcddde",fontSize:12,fontWeight:isSelf?700:400,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isSelf?"Bạn":m.name}</div>
                      {m.position&&<div style={{fontSize:9,color:CYBER.textMuted}}>{m.position}</div>}
                    </div>
                    {isOwner&&!isSelf&&(
                      <button onClick={()=>onKick(m.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:12,padding:"2px"}} title="Kick">✕</button>
                    )}
                  </div>
                );
              }
              const isHov=hoverSlot===i;
              const hasSelf=slots.some(s=>s&&isSelfId(s.id));
              return(
                <div key={`e${i}`}
                  onClick={()=>hasSelf&&moveSelf(i)}
                  onMouseEnter={()=>hasSelf&&setHoverSlot(i)}
                  onMouseLeave={()=>setHoverSlot(null)}
                  onDragOver={(e)=>handleDragOver(e,i)}
                  onDragLeave={()=>{if(hoverSlot===i)setHoverSlot(null);}}
                  onDrop={()=>handleDrop(i)}
                  style={{display:"flex",alignItems:"center",gap:8,
                    padding:"6px 8px",borderRadius:6,marginBottom:2,
                    border:`1px dashed ${isHov?`${CYBER.cyan}50`:"#1a1a2e"}`,
                    background:isHov?`${CYBER.cyan}08`:"transparent",
                    cursor:hasSelf?"pointer":"default",transition:"all .2s"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                    border:`1px dashed ${isHov?`${CYBER.cyan}50`:"#252538"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,color:isHov?CYBER.cyan:"#353550"}}>{isHov?"→":"+"}</div>
                  <span style={{color:isHov?`${CYBER.cyan}90`:"#353550",fontSize:11,fontStyle:"italic"}}>
                    {hasSelf&&isHov?"Di chuyển":"Slot trống"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Voice Settings Modal ── */}
      {showVoiceSettings&&(
        <div
          onClick={()=>{ setShowVoiceSettings(false); setListeningFor(null); }}
          style={{
            position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
            display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,
            backdropFilter:"blur(3px)",
          }}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:10,
              width:440,maxWidth:"95vw",maxHeight:"90vh",display:"flex",flexDirection:"column",
              boxShadow:"0 16px 48px rgba(0,0,0,.7)",
              overflow:"hidden",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding:"16px 20px",
              background:"linear-gradient(180deg,#1e1e38,#141428)",
              borderBottom:"1px solid #252540",
              display:"flex",alignItems:"center",justifyContent:"space-between",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚙</span>
                <div>
                  <div style={{color:"#c8aa6e",fontSize:14,fontWeight:700}}>Cài đặt Giọng thoại</div>
                  <div style={{color:"#5b5a56",fontSize:11}}>Tùy chỉnh phím tắt nhanh</div>
                </div>
              </div>
              <button
                onClick={()=>{ setShowVoiceSettings(false); setListeningFor(null); }}
                style={{
                  width:28,height:28,borderRadius:"50%",background:"#252538",
                  border:"1px solid #333",color:"#72767d",cursor:"pointer",
                  fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all .2s",
                }}
                onMouseOver={e=>{e.currentTarget.style.background="#3a3a55";e.currentTarget.style.color="#fff";}}
                onMouseOut={e=>{e.currentTarget.style.background="#252538";e.currentTarget.style.color="#72767d";}}
              >✕</button>
            </div>

            {/* Modal body */}
            <div style={{padding:"20px",overflowY:"auto",maxHeight:"calc(90vh - 70px)"}}>

              {/* ── Mic Test (Discord-style) ── */}
              <div style={{marginBottom:20,padding:14,background:"#0d0d1a",borderRadius:8,border:"1px solid #1e1e30"}}>
                <div style={{fontSize:10,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:10}}>
                  Mic Test
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <MicTestBtn/>
                </div>
              </div>

              {/* ── Mic Mode selector ── */}
              <div style={{marginBottom:20}}>
                <div style={{
                  fontSize:10,color:"#5b5a56",textTransform:"uppercase",
                  letterSpacing:1.5,fontWeight:700,marginBottom:10,
                }}>Chế độ Microphone</div>

                <div style={{display:"flex",gap:8}}>
                  {/* Always On card */}
                  <div
                    onClick={()=>changeMicMode("always")}
                    style={{
                      flex:1,padding:"12px 10px",borderRadius:8,cursor:"pointer",
                      background:micMode==="always"?"#faa61a12":"#0d0d1a",
                      border:`1.5px solid ${micMode==="always"?"#faa61a":"#1e1e30"}`,
                      transition:"all .2s",textAlign:"center",
                    }}
                    onMouseOver={e=>{ if(micMode!=="always"){ e.currentTarget.style.borderColor="#faa61a50"; e.currentTarget.style.background="#faa61a08"; }}}
                    onMouseOut={e=>{ if(micMode!=="always"){ e.currentTarget.style.borderColor="#1e1e30"; e.currentTarget.style.background="#0d0d1a"; }}}
                  >
                    {/* Mic always-on icon */}
                    <div style={{marginBottom:6,display:"flex",justifyContent:"center"}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke={micMode==="always"?"#faa61a":"#5b5a56"} strokeWidth="2" strokeLinecap="round">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:micMode==="always"?"#faa61a":"#72767d",marginBottom:3}}>
                      Luôn bật
                    </div>
                    <div style={{fontSize:10,color:"#5b5a56",lineHeight:1.4}}>
                      Mic mở ngay khi vào kênh
                    </div>
                    {micMode==="always"&&(
                      <div style={{
                        marginTop:7,fontSize:9,padding:"2px 8px",borderRadius:10,
                        background:"#faa61a25",color:"#faa61a",fontWeight:700,display:"inline-block",
                      }}>✓ Đang dùng</div>
                    )}
                  </div>

                  {/* Push to Talk card */}
                  <div
                    onClick={()=>changeMicMode("ptt")}
                    style={{
                      flex:1,padding:"12px 10px",borderRadius:8,cursor:"pointer",
                      background:micMode==="ptt"?"#5865f212":"#0d0d1a",
                      border:`1.5px solid ${micMode==="ptt"?"#5865f2":"#1e1e30"}`,
                      transition:"all .2s",textAlign:"center",
                    }}
                    onMouseOver={e=>{ if(micMode!=="ptt"){ e.currentTarget.style.borderColor="#5865f250"; e.currentTarget.style.background="#5865f208"; }}}
                    onMouseOut={e=>{ if(micMode!=="ptt"){ e.currentTarget.style.borderColor="#1e1e30"; e.currentTarget.style.background="#0d0d1a"; }}}
                  >
                    {/* PTT icon */}
                    <div style={{marginBottom:6,display:"flex",justifyContent:"center"}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke={micMode==="ptt"?"#7289da":"#5b5a56"} strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="9" width="18" height="13" rx="2"/>
                        <path d="M12 1a3 3 0 00-3 3v3h6V4a3 3 0 00-3-3z"/>
                        <circle cx="12" cy="15" r="1.5" fill={micMode==="ptt"?"#7289da":"#5b5a56"} stroke="none"/>
                      </svg>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:micMode==="ptt"?"#7289da":"#72767d",marginBottom:3}}>
                      Push to Talk
                    </div>
                    <div style={{fontSize:10,color:"#5b5a56",lineHeight:1.4}}>
                      Giữ{" "}
                      <span style={{
                        padding:"0px 5px",borderRadius:3,
                        background:"#141420",border:"1px solid #252540",
                        color:micMode==="ptt"?"#7289da":"#555",fontFamily:"monospace",fontSize:10,
                      }}>{kbdLabel(keybinds.pushToTalk)}</span>
                      {" "}để nói
                    </div>
                    {micMode==="ptt"&&(
                      <div style={{
                        marginTop:7,fontSize:9,padding:"2px 8px",borderRadius:10,
                        background:"#5865f225",color:"#7289da",fontWeight:700,display:"inline-block",
                      }}>✓ Đang dùng</div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize:10,color:"#5b5a56",textTransform:"uppercase",
                letterSpacing:1.5,fontWeight:700,marginBottom:12,
              }}>Phím tắt</div>

              {/* Push to Talk row */}
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"12px 14px",background:"#0d0d1a",border:"1px solid #1e1e30",
                borderRadius:8,marginBottom:8,
              }}>
                <div>
                  <div style={{color:"#c8aa6e",fontSize:13,fontWeight:600,marginBottom:3}}>Push to Talk</div>
                  <div style={{color:"#5b5a56",fontSize:11}}>Giữ phím để nói · nhả phím để dừng</div>
                </div>
                <button
                  onClick={()=>setListeningFor(listeningFor==="pushToTalk"?null:"pushToTalk")}
                  style={{
                    minWidth:80,padding:"7px 14px",borderRadius:6,cursor:"pointer",
                    background:listeningFor==="pushToTalk"?"#5865f240":"#1e1e30",
                    border:`1px solid ${listeningFor==="pushToTalk"?"#5865f2":"#2a2a40"}`,
                    color:listeningFor==="pushToTalk"?"#7289da":"#c8aa6e",
                    fontSize:13,fontWeight:700,fontFamily:"monospace",
                    transition:"all .2s",
                    animation:listeningFor==="pushToTalk"?"keybindPulse 1s ease-in-out infinite":"none",
                  }}
                >
                  {listeningFor==="pushToTalk"?"Nhấn phím…":kbdLabel(keybinds.pushToTalk)}
                </button>
              </div>

              {/* Mute toggle row */}
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"12px 14px",background:"#0d0d1a",border:"1px solid #1e1e30",
                borderRadius:8,marginBottom:20,
              }}>
                <div>
                  <div style={{color:"#c8aa6e",fontSize:13,fontWeight:600,marginBottom:3}}>Tắt mic nhanh</div>
                  <div style={{color:"#5b5a56",fontSize:11}}>Nhấn để bật / tắt microphone</div>
                </div>
                <button
                  onClick={()=>setListeningFor(listeningFor==="mute"?null:"mute")}
                  style={{
                    minWidth:80,padding:"7px 14px",borderRadius:6,cursor:"pointer",
                    background:listeningFor==="mute"?"#5865f240":"#1e1e30",
                    border:`1px solid ${listeningFor==="mute"?"#5865f2":"#2a2a40"}`,
                    color:listeningFor==="mute"?"#7289da":"#c8aa6e",
                    fontSize:13,fontWeight:700,fontFamily:"monospace",
                    transition:"all .2s",
                  }}
                >
                  {listeningFor==="mute"?"Nhấn phím…":kbdLabel(keybinds.mute)}
                </button>
              </div>

              {/* ── Noise Suppression section ── */}
              <div style={{borderTop:"1px solid #1e1e30",paddingTop:20,marginBottom:20}}>
                <div style={{
                  fontSize:10,color:"#5b5a56",textTransform:"uppercase",
                  letterSpacing:1.5,fontWeight:700,marginBottom:12,
                }}>Giảm tiếng ồn (Noise Suppression)</div>

                {/* NS toggle row */}
                <div style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 14px",background:"#0d0d1a",border:"1px solid #1e1e30",
                  borderRadius:8,marginBottom:nsEnabled?8:0,
                }}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={nsEnabled?"#7289da":"#5b5a56"} strokeWidth="2" strokeLinecap="round">
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
                      </svg>
                      <span style={{color:nsEnabled?"#c8aa6e":"#96989d",fontSize:13,fontWeight:600}}>Noise Suppression</span>
                      {nsEnabled&&(
                        <span style={{
                          fontSize:9,padding:"1px 7px",borderRadius:8,fontWeight:700,
                          background:nsLevel==="high"?"#3ba55d25":nsLevel==="medium"?"#5865f225":"#faa61a25",
                          color:nsLevel==="high"?"#3ba55d":nsLevel==="medium"?"#7289da":"#faa61a",
                          border:`1px solid ${nsLevel==="high"?"#3ba55d40":nsLevel==="medium"?"#5865f240":"#faa61a40"}`,
                        }}>
                          {nsLevel==="low"?"THẤP":nsLevel==="medium"?"VỪA":"CAO"}
                        </span>
                      )}
                    </div>
                    <div style={{color:"#5b5a56",fontSize:11}}>Lọc tiếng ồn nền, tiếng quạt, tiếng bàn phím</div>
                  </div>
                  {/* Toggle switch */}
                  <div
                    onClick={()=>applyNs(!nsEnabled,nsLevel)}
                    style={{
                      width:40,height:22,borderRadius:11,cursor:"pointer",
                      background:nsEnabled?"#5865f2":"#2a2a40",
                      border:`1px solid ${nsEnabled?"#5865f2":"#3a3a55"}`,
                      position:"relative",transition:"background .2s",flexShrink:0,
                    }}
                  >
                    <div style={{
                      position:"absolute",
                      top:2,left:nsEnabled?20:2,
                      width:16,height:16,borderRadius:"50%",
                      background:"#fff",transition:"left .2s",
                      boxShadow:"0 1px 3px rgba(0,0,0,.4)",
                    }}/>
                  </div>
                </div>

                {/* NS level selector — only when enabled */}
                {nsEnabled&&(
                  <div style={{
                    padding:"12px 14px",background:"#0d0d1a",
                    border:"1px solid #1e1e30",borderRadius:8,
                  }}>
                    <div style={{fontSize:11,color:"#5b5a56",marginBottom:10,fontWeight:600}}>Mức độ lọc</div>
                    <div style={{display:"flex",gap:6}}>
                      {[
                        {id:"low",  label:"Thấp",  desc:"Lọc nhẹ\nHPF 60 Hz",         color:"#faa61a"},
                        {id:"medium",label:"Vừa",  desc:"Lọc cân bằng\nHPF + Compressor",color:"#5865f2"},
                        {id:"high", label:"Cao",   desc:"Lọc mạnh\nHPF + Comp + Notch", color:"#3ba55d"},
                      ].map(opt=>(
                        <button
                          key={opt.id}
                          onClick={()=>applyNs(true,opt.id)}
                          style={{
                            flex:1,padding:"8px 6px",borderRadius:6,cursor:"pointer",
                            background:nsLevel===opt.id?`${opt.color}18`:"#141420",
                            border:`1px solid ${nsLevel===opt.id?opt.color:"#252538"}`,
                            color:nsLevel===opt.id?opt.color:"#5b5a56",
                            transition:"all .2s",textAlign:"center",
                          }}
                        >
                          <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{opt.label}</div>
                          <div style={{fontSize:9,lineHeight:1.4,opacity:.8,whiteSpace:"pre-line"}}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* What each level filters */}
                    <div style={{
                      marginTop:10,padding:"8px 10px",
                      background:"#080814",borderRadius:5,
                      border:"1px solid #1a1a2e",
                    }}>
                      <div style={{fontSize:10,color:"#5b5a56",marginBottom:6,fontWeight:600}}>Bộ lọc đang áp dụng</div>
                      {[
                        {label:"High-pass filter",  active:true,            desc:`Cắt tần số < ${nsLevel==="low"?60:nsLevel==="medium"?100:130} Hz`},
                        {label:"Low-shelf cut",      active:nsLevel!=="low", desc:"Giảm âm trầm nền (−7 dB tại 300 Hz)"},
                        {label:"Dynamics compressor",active:nsLevel!=="low", desc:`Nén biên độ (ratio ${nsLevel==="high"?20:10}:1)`},
                        {label:"Notch 50/60 Hz",     active:nsLevel==="high",desc:"Loại tiếng hum lưới điện"},
                        {label:"Noise gate (VAD)",   active:true,            desc:`Ngưỡng nói: ${nsLevel==="high"?22:nsLevel==="medium"?17:14} avg`},
                      ].map(f=>(
                        <div key={f.label} style={{
                          display:"flex",alignItems:"center",gap:8,
                          padding:"3px 0",opacity:f.active?1:0.3,
                        }}>
                          <div style={{
                            width:7,height:7,borderRadius:"50%",flexShrink:0,
                            background:f.active?"#3ba55d":"#3a3a55",
                          }}/>
                          <span style={{fontSize:10,color:f.active?"#96989d":"#3a3a55",flex:1}}>{f.label}</span>
                          {f.active&&<span style={{fontSize:9,color:"#3a3a55"}}>{f.desc}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* How-to note */}
              <div style={{
                padding:"10px 14px",background:"#5865f210",
                border:"1px solid #5865f230",borderRadius:6,
                marginBottom:16,
              }}>
                <div style={{color:"#7289da",fontSize:11,fontWeight:600,marginBottom:4}}>💡 Cách sử dụng</div>
                <ul style={{margin:0,paddingLeft:16,color:"#72767d",fontSize:11,lineHeight:1.7}}>
                  <li>Nhấn <strong style={{color:"#dcddde"}}>ô phím</strong> rồi nhấn phím bất kỳ trên bàn phím để đổi</li>
                  <li><strong style={{color:"#dcddde"}}>Push to Talk:</strong> Giữ phím → mic bật. Nhả phím → mic tắt</li>
                  <li><strong style={{color:"#dcddde"}}>Tắt mic nhanh:</strong> Nhấn 1 lần để toggle bật/tắt mic</li>
                  <li>Phím tắt không hoạt động khi đang gõ vào ô chat</li>
                </ul>
              </div>

              {/* Reset + Close buttons */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button
                  onClick={()=>{
                    const def={pushToTalk:"V",mute:"M"};
                    setKeybinds(def);
                    localStorage.setItem("gf_voice_keybinds",JSON.stringify(def));
                    setListeningFor(null);
                  }}
                  style={{
                    padding:"7px 14px",borderRadius:6,cursor:"pointer",
                    background:"transparent",border:"1px solid #2a2a40",
                    color:"#5b5a56",fontSize:12,transition:"all .2s",
                  }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor="#c89b3c50";e.currentTarget.style.color="#c89b3c";}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor="#2a2a40";e.currentTarget.style.color="#5b5a56";}}
                >
                  Đặt lại mặc định
                </button>
                <GoldBtn onClick={()=>{ setShowVoiceSettings(false); setListeningFor(null); }} size="sm">
                  Lưu & Đóng
                </GoldBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,cursor:"zoom-out"}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative"}}>
            <img src={lightbox} style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8,display:"block"}}/>
            <button onClick={()=>setLightbox(null)}
              style={{position:"absolute",top:-16,right:-16,width:32,height:32,borderRadius:"50%",
                background:"#333",border:"2px solid #555",color:"#fff",fontSize:16,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.6;transform:scale(1.15)}
        }
        @keyframes voiceBar0 {
          from{height:3px} to{height:10px}
        }
        @keyframes voiceBar1 {
          from{height:5px} to{height:14px}
        }
        @keyframes voiceBar2 {
          from{height:4px} to{height:8px}
        }
        @keyframes keybindPulse {
          0%,100%{box-shadow:0 0 0 0 #5865f240}
          50%{box-shadow:0 0 0 4px #5865f230}
        }
      `}</style>
    </div>
  );
}

export default RoomView;
