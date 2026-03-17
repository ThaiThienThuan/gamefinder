import { useState, useEffect, useRef, useCallback } from "react";
import { POS_ICONS } from "../constants";
import { pick, randInt } from "../utils/helpers";
import GoldBtn from "./ui/GoldBtn";
import StatusDot from "./ui/StatusDot";
import RankBadge from "./ui/RankBadge";

function RoomView({room,onLeave,onAccept,onReject,onKick,isOwner}){
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

  // ── Media / Lightbox ──────────────────────────────────────────────────
  const [lightbox,setLightbox]=useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const chatEnd=useRef(null);
  const fileInputRef=useRef(null);
  const streamRef=useRef(null);
  const audioCtxRef=useRef(null);
  const analyserRef=useRef(null);
  const speakTimerRef=useRef(null);
  const simTimerRef=useRef(null);
  const mutedRef=useRef(false);
  const pttActiveRef=useRef(false);
  const micModeRef=useRef("always"); // mirror of micMode for closures
  const nsNodesRef=useRef([]);      // Web Audio nodes for NS chain
  const nsEnabledRef=useRef(false); // mirror of nsEnabled for use in closures
  const nsLevelRef=useRef("medium");
  const speakFramesRef=useRef(0);   // for noise gate hysteresis

  // Keep refs in sync with state
  useEffect(()=>{ mutedRef.current=muted; },[muted]);
  useEffect(()=>{ pttActiveRef.current=pttActive; },[pttActive]);
  useEffect(()=>{ nsEnabledRef.current=nsEnabled; nsLevelRef.current=nsLevel; },[nsEnabled,nsLevel]);
  useEffect(()=>{ micModeRef.current=micMode; },[micMode]);

  const chatReplies=["gg","let's go!","ai jungle?","pick gì vậy?","có mic không?","rank mấy?","chơi thôi!","sẵn sàng!","team mạnh đấy","oke bro","lên rank nào","nice!","wp","ez clap","carry thôi"];

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

  useEffect(()=>{
    setVoiceMembers(prev=>prev.map(m=>m.id==="self"?{...m,muted,speaking:!muted&&speaking}:m));
  },[speaking,muted]);

  useEffect(()=>{
    if(!voiceJoined) return;
    simTimerRef.current=setInterval(()=>{
      setVoiceMembers(prev=>prev.map(m=>
        m.id!=="self"?{...m,speaking:!m.muted&&Math.random()>0.62}:m
      ));
    },1600);
    return ()=>{ if(simTimerRef.current) clearInterval(simTimerRef.current); };
  },[voiceJoined]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(()=>{
    if(!voiceJoined) return;
    let pttHeld=false;

    const onKeyDown=(e)=>{
      if(listeningFor) return;
      // Don't fire when typing in an input
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA") return;

      const key=e.key.length===1?e.key.toUpperCase():e.key;
      const pttKey=keybinds.pushToTalk.toUpperCase();
      const muteKey=keybinds.mute.toUpperCase();

      if(key===pttKey&&!pttHeld){
        e.preventDefault();
        pttHeld=true;
        pttActiveRef.current=true;
        setPttActive(true);
        // Enable mic regardless of muted state
        if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=true;});
      }
      if(key===muteKey){
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
        // Restore muted state
        const isMuted=mutedRef.current;
        if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!isMuted;});
        if(isMuted) setSpeaking(false);
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
    if(simTimerRef.current){ clearInterval(simTimerRef.current); simTimerRef.current=null; }
    teardownNsChain();
    if(audioCtxRef.current){ audioCtxRef.current.close(); audioCtxRef.current=null; }
    if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    analyserRef.current=null;
    speakFramesRef.current=0;
  };

  const startAnalyser=(stream,nsOn=false,level="medium")=>{
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const analyser=ctx.createAnalyser();
      analyser.fftSize=512;
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
    }catch(e){}
  };

  // Toggle or change NS level while already in a call
  const applyNs=async(enabled,level)=>{
    nsEnabledRef.current=enabled;
    nsLevelRef.current=level;
    setNsEnabled(enabled);
    setNsLevel(level);

    // Apply browser-native constraints
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
      if(!pttActiveRef.current&&streamRef.current)
        streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
      setSpeaking(false);
    }else{
      // Switch to always: unmute (restore open mic)
      mutedRef.current=false;
      setMuted(false);
      if(!pttActiveRef.current&&streamRef.current)
        streamRef.current.getAudioTracks().forEach(t=>{t.enabled=true;});
    }
  };

  // ── Voice actions ──────────────────────────────────────────────────────
  const joinVoice=async()=>{
    setVoiceError(null);
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
    // PTT mode: always start muted so user must hold key to speak
    const startMuted=!hasStream||(micModeRef.current==="ptt");
    if(hasStream&&micModeRef.current==="ptt"){
      streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false;});
      setMuted(true); mutedRef.current=true;
    }
    setVoiceJoined(true);
    const selfMember=room.members.find(m=>m.id==="self")||{id:"self",name:"Bạn"};
    const others=room.members.filter(m=>m.id!=="self").slice(0,randInt(1,2));
    setVoiceMembers([
      {...selfMember,id:"self",name:"Bạn",muted:startMuted,speaking:false},
      ...others.map(m=>({...m,muted:Math.random()>0.7,speaking:false}))
    ]);
    const modeHint=micModeRef.current==="ptt"?` — PTT mode, giữ [${keybinds.pushToTalk}] để nói`:"";
    addSysMsg(hasStream?`Bạn đã tham gia kênh thoại${modeHint}.`:"Bạn đã tham gia kênh thoại (chỉ nghe).");
  };

  const leaveVoice=()=>{
    cleanupAudio();
    setVoiceJoined(false);
    setMuted(false);
    setDeafened(false);
    setSpeaking(false);
    setPttActive(false);
    pttActiveRef.current=false;
    setVoiceMembers([]);
    addSysMsg("Bạn đã rời kênh thoại.");
  };

  const toggleMute=()=>{
    const next=!muted;
    mutedRef.current=next;
    if(!pttActiveRef.current){
      if(streamRef.current) streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!next;});
    }
    setMuted(next);
    if(next) setSpeaking(false);
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
    if(!input.trim()) return;
    setMsgs(p=>[...p,{id:Date.now(),sender:"Bạn",text:input,time:Date.now()}]);
    setInput("");
    setTimeout(()=>{
      const m=pick(room.members.filter(m=>m.id!=="self"));
      if(m) setMsgs(p=>[...p,{id:Date.now()+1,sender:m.name,text:pick(chatReplies),time:Date.now()}]);
    },randInt(800,2500));
  };

  const handleFiles=(e)=>{
    Array.from(e.target.files).forEach(file=>{
      const url=URL.createObjectURL(file);
      setMsgs(p=>[...p,{
        id:Date.now()+Math.random(),
        sender:"Bạn",
        type:file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":"file",
        src:url,
        fileName:file.name,
        fileSize:file.size,
        time:Date.now(),
      }]);
    });
    e.target.value="";
  };

  // ── Slot movement ──────────────────────────────────────────────────────
  const moveSelf=(toIdx)=>{
    setSlots(prev=>{
      const selfIdx=prev.findIndex(s=>s&&s.id==="self");
      if(selfIdx===-1||prev[toIdx]!==null) return prev;
      const next=[...prev];
      next[toIdx]=next[selfIdx];
      next[selfIdx]=null;
      return next;
    });
  };
  const handleDragStart=(idx)=>{ if(slots[idx]?.id==="self") setDragFromSlot(idx); };
  const handleDragEnd=()=>{ setDragFromSlot(null); setHoverSlot(null); };
  const handleDragOver=(e,idx)=>{ e.preventDefault(); if(slots[idx]===null) setHoverSlot(idx); };
  const handleDrop=(idx)=>{ if(slots[idx]===null) moveSelf(idx); setDragFromSlot(null); setHoverSlot(null); };

  // ── Render message ─────────────────────────────────────────────────────
  const renderMsg=(msg)=>{
    if(msg.system) return(
      <div key={msg.id} style={{textAlign:"center",marginBottom:10}}>
        <span style={{
          fontSize:11,color:"#c89b3c",fontStyle:"italic",fontWeight:500,
          background:"#c89b3c0e",padding:"5px 18px",borderRadius:12,
          display:"inline-block",border:"1px solid #c89b3c40",letterSpacing:0.3,
        }}>◆ {msg.text}</span>
      </div>
    );
    return(
      <div key={msg.id} style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
          <span style={{fontSize:12,fontWeight:700,color:msg.sender==="Bạn"?"#c8aa6e":"#5b9bd5"}}>{msg.sender}</span>
          <span style={{fontSize:10,color:"#333"}}>{new Date(msg.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
        {msg.type==="image"?(
          <img src={msg.src} alt={msg.fileName}
            onClick={()=>setLightbox(msg.src)}
            style={{maxWidth:280,maxHeight:200,borderRadius:6,cursor:"zoom-in",border:"1px solid #222",objectFit:"contain",background:"#0a0a14",display:"block"}}/>
        ):msg.type==="video"?(
          <video src={msg.src} controls
            style={{maxWidth:320,maxHeight:220,borderRadius:6,border:"1px solid #222",display:"block"}}/>
        ):msg.type==="file"?(
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#111",borderRadius:6,border:"1px solid #222"}}>
            <span style={{fontSize:20}}>📎</span>
            <div>
              <div style={{color:"#c8aa6e",fontSize:12}}>{msg.fileName}</div>
              <div style={{color:"#444",fontSize:10}}>{(msg.fileSize/1024).toFixed(1)} KB</div>
            </div>
          </div>
        ):(
          <div style={{color:"#a09b8c",fontSize:13,lineHeight:1.5}}>{msg.text}</div>
        )}
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

      {/* ── Top bar ── */}
      <div style={{padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid #c89b3c25",background:"linear-gradient(180deg,#1a1a2e,#0d0d1a)",flexWrap:"wrap",gap:10,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#c8aa6e"}}>{room.name}</div>
          <StatusDot status={room.status}/>
          <span style={{fontSize:12,color:"#5b5a56",fontWeight:600}}>{room.members.length}/{room.maxPlayers}</span>
          {room.requests.length>0&&isOwner&&(
            <span style={{fontSize:11,padding:"2px 10px",borderRadius:10,background:"#c89b3c20",color:"#c89b3c",fontWeight:700}}>
              {room.requests.length} yêu cầu mới
            </span>
          )}
        </div>
        <GoldBtn variant="danger" size="sm" onClick={onLeave}>{isOwner?"Đóng Phòng":"Rời Phòng"}</GoldBtn>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Sidebar ── */}
        <div style={{width:290,borderRight:"1px solid #1a1a2e",background:"#080814",overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column"}}>

          {/* Members list */}
          <div style={{padding:"16px 14px 12px"}}>
            <div style={{fontSize:11,color:"#5b5a56",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,fontWeight:700}}>
              Thành Viên ({room.members.length}/{room.maxPlayers})
            </div>
            {slots.map((m,i)=>{
              if(m){
                const inVoice=voiceMembers.find(v=>v.id===m.id);
                const isSelf=m.id==="self";
                return(
                  <div key={m.id}
                    draggable={isSelf}
                    onDragStart={()=>handleDragStart(i)}
                    onDragEnd={handleDragEnd}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"8px 10px",borderRadius:6,marginBottom:4,
                      background:isSelf?"#c89b3c0a":"transparent",
                      cursor:isSelf?"grab":"default",
                      border:`1px solid ${isSelf&&dragFromSlot===i?"#c89b3c50":"transparent"}`,
                      transition:"border-color .2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{position:"relative"}}>
                        <div style={{
                          width:34,height:34,borderRadius:"50%",
                          background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                          border:`2px solid ${inVoice?.speaking?"#3ba55d":isSelf?"#c89b3c":"#333"}`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
                          transition:"border-color .2s",
                          boxShadow:inVoice?.speaking?"0 0 8px #3ba55d50":"",
                        }}>👤</div>
                        {inVoice&&(
                          <div style={{
                            position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:"50%",
                            background:inVoice.speaking?"#3ba55d":inVoice.muted?"#f04747":"#43b581",
                            border:"2px solid #080814",transition:"background .2s",
                          }}/>
                        )}
                      </div>
                      <div>
                        <div style={{color:"#c8aa6e",fontSize:12,fontWeight:600}}>{isSelf?"Bạn":m.name}</div>
                        <div style={{fontSize:10,color:"#5b5a56"}}>{POS_ICONS[m.position]} {m.position}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <RankBadge rank={m.rank} size="sm"/>
                      {isOwner&&!isSelf&&(
                        <button onClick={()=>onKick(m.id)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:14,padding:"2px 4px"}} title="Kick">✕</button>
                      )}
                    </div>
                  </div>
                );
              }
              const isHov=hoverSlot===i;
              const hasSelf=slots.some(s=>s&&s.id==="self");
              return(
                <div key={`e${i}`}
                  onClick={()=>hasSelf&&moveSelf(i)}
                  onMouseEnter={()=>hasSelf&&setHoverSlot(i)}
                  onMouseLeave={()=>setHoverSlot(null)}
                  onDragOver={(e)=>handleDragOver(e,i)}
                  onDragLeave={()=>{ if(hoverSlot===i) setHoverSlot(null); }}
                  onDrop={()=>handleDrop(i)}
                  style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"8px 10px",borderRadius:6,marginBottom:4,
                    border:`2px dashed ${isHov?"#c89b3c70":"#252538"}`,
                    background:isHov?"#c89b3c0c":"transparent",
                    cursor:hasSelf?"pointer":"default",
                    transition:"all .2s",
                  }}>
                  <div style={{
                    width:34,height:34,borderRadius:"50%",flexShrink:0,
                    border:`2px dashed ${isHov?"#c89b3c70":"#252538"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,color:isHov?"#c89b3c":"#353550",
                    transition:"all .2s",
                  }}>{isHov?"→":"+"}</div>
                  <span style={{
                    color:isHov?"#c89b3c90":"#353550",fontSize:12,fontStyle:"italic",
                    transition:"color .2s",
                  }}>{hasSelf&&isHov?"Di chuyển đến đây":"Slot trống"}</span>
                </div>
              );
            })}
          </div>

          {/* ── Voice Channel (Discord-style) ── */}
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

            {!voiceJoined?(
              /* Join button */
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
                  {voiceMembers.map(vm=>{
                    const isSelf=vm.id==="self";
                    const isActivePtt=isSelf&&pttActive;
                    const effectiveSpeaking=isSelf?(pttActive||vm.speaking):vm.speaking;
                    return(
                      <div key={vm.id} style={{
                        display:"flex",alignItems:"center",gap:9,
                        padding:"5px 8px",borderRadius:6,marginBottom:2,
                        background:effectiveSpeaking?"#0d2610":isSelf?"#c89b3c08":"transparent",
                        border:`1px solid ${effectiveSpeaking?"#3ba55d25":"transparent"}`,
                        transition:"all .25s",
                      }}>
                        {/* Avatar */}
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{
                            width:30,height:30,borderRadius:"50%",
                            background:"linear-gradient(135deg,#1e2328,#2a2a3e)",
                            border:`2px solid ${effectiveSpeaking?"#3ba55d":isSelf?"#c89b3c40":"#252538"}`,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                            boxShadow:effectiveSpeaking?"0 0 0 2px #3ba55d50":"none",
                            transition:"all .25s",
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
                      </div>
                    );
                  })}
                </div>

                {/* PTT hint bar */}
                {pttActive&&(
                  <div style={{
                    margin:"0 8px 6px",padding:"5px 10px",
                    background:"#3ba55d18",border:"1px solid #3ba55d40",borderRadius:5,
                    display:"flex",alignItems:"center",gap:6,
                  }}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#3ba55d",flexShrink:0,animation:"pulse 0.8s ease-in-out infinite"}}/>
                    <span style={{fontSize:10,color:"#3ba55d",fontWeight:600}}>Đang phát - nhả [{kbdLabel(keybinds.pushToTalk)}] để dừng</span>
                  </div>
                )}

                {/* Discord-style control bar */}
                <div style={{
                  margin:"4px 8px 12px",padding:"6px 10px",
                  background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,
                  display:"flex",alignItems:"center",gap:4,
                }}>
                  {/* Keybind hints */}
                  <div style={{flex:1,display:"flex",gap:8}}>
                    <span style={{
                      fontSize:9,color:"#3a3a55",display:"flex",alignItems:"center",gap:3,
                    }}>
                      <span style={{
                        padding:"1px 4px",background:"#141420",border:"1px solid #252540",
                        borderRadius:3,color:"#555",fontSize:9,lineHeight:1.4,fontFamily:"monospace",
                      }}>{kbdLabel(keybinds.pushToTalk)}</span>
                      <span style={{color:"#3a3a55"}}>PTT</span>
                    </span>
                    <span style={{
                      fontSize:9,color:"#3a3a55",display:"flex",alignItems:"center",gap:3,
                    }}>
                      <span style={{
                        padding:"1px 4px",background:"#141420",border:"1px solid #252540",
                        borderRadius:3,color:"#555",fontSize:9,lineHeight:1.4,fontFamily:"monospace",
                      }}>{kbdLabel(keybinds.mute)}</span>
                      <span style={{color:"#3a3a55"}}>Mute</span>
                    </span>
                  </div>

                  {/* Mic button */}
                  <button
                    onClick={toggleMute}
                    title={`${muted?"Bật":"Tắt"} mic [${kbdLabel(keybinds.mute)}]`}
                    style={{
                      width:32,height:32,borderRadius:6,cursor:"pointer",
                      background:muted?"#f0474720":"#1a2438",
                      border:`1px solid ${muted?"#f04747":"#2a3a55"}`,
                      color:muted?"#f04747":"#7ec8e3",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",fontSize:15,flexShrink:0,
                    }}
                    onMouseOver={e=>{e.currentTarget.style.background=muted?"#f0474730":"#1e2e4a";}}
                    onMouseOut={e=>{e.currentTarget.style.background=muted?"#f0474720":"#1a2438";}}
                  >
                    {muted?
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                        <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/>
                      </svg>:
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                    }
                  </button>

                  {/* Headphones / Deafen button */}
                  <button
                    onClick={toggleDeafen}
                    title={deafened?"Bỏ điếc tai nghe":"Tắt tai nghe"}
                    style={{
                      width:32,height:32,borderRadius:6,cursor:"pointer",
                      background:deafened?"#f0474720":"#14141e",
                      border:`1px solid ${deafened?"#f04747":"#1e1e2e"}`,
                      color:deafened?"#f04747":"#72767d",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",fontSize:15,flexShrink:0,
                    }}
                    onMouseOver={e=>{e.currentTarget.style.color=deafened?"#ff6b6b":"#96989d";}}
                    onMouseOut={e=>{e.currentTarget.style.color=deafened?"#f04747":"#72767d";}}
                  >
                    {deafened?
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="23" y2="23"/>
                        <path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
                      </svg>:
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
                      </svg>
                    }
                  </button>

                  {/* Noise Suppression button */}
                  <button
                    onClick={()=>applyNs(!nsEnabled,nsLevel)}
                    title={`Giảm tiếng ồn${nsEnabled?` [${nsLevel==="low"?"Thấp":nsLevel==="medium"?"Vừa":"Cao"}] — Tắt`:"— Bật"}`}
                    style={{
                      width:32,height:32,borderRadius:6,cursor:"pointer",
                      background:nsEnabled?"#5865f220":"#14141e",
                      border:`1px solid ${nsEnabled?"#5865f2":"#1e1e2e"}`,
                      color:nsEnabled?"#7289da":"#72767d",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",flexShrink:0,
                      boxShadow:nsEnabled?"0 0 8px #5865f240":"none",
                      position:"relative",
                    }}
                    onMouseOver={e=>{e.currentTarget.style.color=nsEnabled?"#99aab5":"#96989d";}}
                    onMouseOut={e=>{e.currentTarget.style.color=nsEnabled?"#7289da":"#72767d";}}
                  >
                    {/* Filter / waveform icon */}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6"/>
                      <line x1="7" y1="12" x2="17" y2="12"/>
                      <line x1="10" y1="18" x2="14" y2="18"/>
                    </svg>
                    {nsEnabled&&(
                      <span style={{
                        position:"absolute",top:-4,right:-4,
                        width:8,height:8,borderRadius:"50%",
                        background:nsLevel==="high"?"#3ba55d":nsLevel==="medium"?"#5865f2":"#faa61a",
                        border:"1.5px solid #060610",
                        display:"block",
                      }}/>
                    )}
                  </button>

                  {/* Disconnect button */}
                  <button
                    onClick={leaveVoice}
                    title="Ngắt kết nối"
                    style={{
                      width:32,height:32,borderRadius:6,cursor:"pointer",
                      background:"#2a1010",border:"1px solid #3a1515",
                      color:"#f04747",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s",flexShrink:0,
                    }}
                    onMouseOver={e=>{e.currentTarget.style.background="#3a1515";e.currentTarget.style.borderColor="#f04747";}}
                    onMouseOut={e=>{e.currentTarget.style.background="#2a1010";e.currentTarget.style.borderColor="#3a1515";}}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.6 8.9C6.3 5.2 11.4 3 17 3s10.7 2.2 14.4 5.9l-2.8 2.8c-3-3-7.1-4.7-11.6-4.7S8.4 8.7 5.4 11.7L2.6 8.9z" transform="scale(0.65) translate(1,1)"/>
                      <path d="M12 15l-3-3 3-3 3 3-3 3z" transform="translate(0,2)"/>
                      <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Join requests */}
          {isOwner&&room.requests.length>0&&(
            <div style={{padding:"0 14px 16px",borderTop:"1px solid #1a1a2e"}}>
              <div style={{fontSize:11,color:"#c89b3c",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,fontWeight:700,paddingTop:12}}>
                Yêu Cầu Tham Gia ({room.requests.length})
              </div>
              {room.requests.map(req=>(
                <div key={req.id} style={{padding:12,background:"#c89b3c08",border:"1px solid #c89b3c20",borderRadius:8,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:"#c8aa6e",fontSize:12,fontWeight:700}}>{req.name}</span>
                    <RankBadge rank={req.rank} size="sm"/>
                  </div>
                  <div style={{fontSize:10,color:"#5b5a56",marginBottom:4}}>{POS_ICONS[req.position]} {req.position} • {req.style}</div>
                  {req.note&&<div style={{fontSize:11,color:"#8b8072",fontStyle:"italic",marginBottom:8,lineHeight:1.4}}>"{req.note}"</div>}
                  <div style={{display:"flex",gap:6}}>
                    <GoldBtn size="sm" onClick={()=>onAccept(req.id)}>Chấp nhận</GoldBtn>
                    <GoldBtn variant="danger" size="sm" onClick={()=>onReject(req.id)}>Từ chối</GoldBtn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat area ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#0b0b18"}}>
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
            {msgs.map(renderMsg)}
            <div ref={chatEnd}/>
          </div>

          {/* Input bar */}
          <div style={{padding:"10px 18px 14px",borderTop:"1px solid #1a1a2e",background:"#0a0a14"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#111520",borderRadius:8,border:"1px solid #1e1e30",padding:"2px 8px 2px 2px"}}>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFiles} style={{display:"none"}}/>
              <button onClick={()=>fileInputRef.current?.click()}
                title="Đính kèm ảnh / video"
                style={{width:36,height:36,borderRadius:6,background:"transparent",border:"none",
                  cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#555",transition:"color .2s",flexShrink:0}}
                onMouseOver={e=>e.currentTarget.style.color="#c8aa6e"}
                onMouseOut={e=>e.currentTarget.style.color="#555"}>
                📎
              </button>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                placeholder="Nhập tin nhắn..."
                style={{flex:1,padding:"8px 4px",background:"transparent",border:"none",color:"#c8aa6e",fontSize:13,outline:"none"}}/>
              <GoldBtn onClick={send} size="sm">Gửi</GoldBtn>
            </div>
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

              {/* Section label */}
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
