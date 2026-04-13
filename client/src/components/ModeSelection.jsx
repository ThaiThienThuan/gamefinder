import { useState } from "react";
import { CYBER, CYBER_BG, GRID_PATTERN_URL, neonGlow } from "../constants/theme";
import HexBorder from "./ui/HexBorder";

function ModeSelection({game, onSelect, onBack}){
  const [hovered,setHovered]=useState(null);
  const modes=game?.modes||[];
  const accent=game?.accent||"#c89b3c";
  const title=game?.name||"GAMEMATCHING";

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",position:"relative",background:CYBER_BG,fontFamily:"'Inter', sans-serif"}}>
      {/* Cyberpunk grid pattern */}
      <div style={{position:"absolute",inset:0,opacity:.3,
        backgroundImage:GRID_PATTERN_URL,backgroundSize:"60px 60px",pointerEvents:"none",
        maskImage:"radial-gradient(circle at center, black 20%, transparent 80%)"
      }}/>
      {/* Radial glow theo màu game */}
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:700,height:700,
        background:`radial-gradient(circle,${accent}18,${CYBER.purple}08 40%,transparent 70%)`,pointerEvents:"none"}}/>

      {/* Back button — góc phải trên để tránh đè user badge bên trái */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position:"fixed",top:14,right:18,zIndex:1500,
            padding:"9px 16px",background:`${CYBER.bgCard}dd`,
            border:`1px solid ${CYBER.magenta}60`,
            borderRadius:4,color:CYBER.magenta,fontSize:11,fontWeight:700,cursor:"pointer",
            textTransform:"uppercase",letterSpacing:2,
            fontFamily:"'JetBrains Mono', monospace",
            boxShadow:`${neonGlow(CYBER.magenta,0.4)}, inset 0 0 8px ${CYBER.magenta}15`,
            backdropFilter:"blur(10px)",
            transition:"all .2s"
          }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=`${neonGlow(CYBER.magenta,0.8)}, inset 0 0 12px ${CYBER.magenta}30`;}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow=`${neonGlow(CYBER.magenta,0.4)}, inset 0 0 8px ${CYBER.magenta}15`;}}
        >← CHỌN GAME</button>
      )}

      <div style={{textAlign:"center",marginBottom:52,position:"relative"}}>
        <div style={{marginBottom:14,display:"flex",justifyContent:"center",alignItems:"center",minHeight:72}}>
          {game?.iconUrl ? (
            <img
              src={game.iconUrl}
              alt={game.name}
              style={{width:72,height:72,objectFit:"contain",filter:`drop-shadow(0 0 16px ${accent}80)`}}
              onError={(e)=>{e.target.style.display="none";e.target.nextSibling && (e.target.nextSibling.style.display="inline");}}
            />
          ) : null}
          <span style={{fontSize:60,display:game?.iconUrl?"none":"inline"}}>{game?.icon||"🎮"}</span>
        </div>
        <div style={{fontSize:11,letterSpacing:10,textTransform:"uppercase",color:CYBER.cyan,marginBottom:14,fontWeight:600,fontFamily:"'JetBrains Mono', monospace",textShadow:neonGlow(CYBER.cyan,0.5)}}>
          // SELECT.MODE
        </div>
        <h1 style={{
          fontFamily:"'Be Vietnam Pro', sans-serif",fontSize:"clamp(30px,5vw,58px)",
          fontWeight:900,margin:0,lineHeight:1.1,letterSpacing:3,
          background:`linear-gradient(180deg, #ffffff 0%, ${accent} 60%, ${CYBER.magenta} 100%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:`drop-shadow(0 0 18px ${accent}60) drop-shadow(0 0 32px ${CYBER.magenta}30)`,
          textTransform:"uppercase"
        }}>{title}</h1>
        <div style={{width:280,height:2,margin:"18px auto",background:`linear-gradient(90deg,transparent,${accent},${CYBER.magenta},transparent)`,boxShadow:neonGlow(accent,0.4)}}/>
        <p style={{color:CYBER.textSecondary,fontSize:12,letterSpacing:2,fontFamily:"'JetBrains Mono', monospace",textTransform:"uppercase"}}>&gt; Chọn chế độ chơi để bắt đầu</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:18,maxWidth:940,width:"100%",position:"relative"}}>
        {modes.map(mode=>(
          <div key={mode.id}
            onMouseEnter={()=>setHovered(mode.id)} onMouseLeave={()=>setHovered(null)}
            onClick={()=>onSelect(mode)}
            style={{cursor:"pointer",transition:"transform .3s ease",transform:hovered===mode.id?"translateY(-6px) scale(1.02)":"none"}}
          >
            <HexBorder glow={hovered===mode.id} color={accent}>
              <div style={{padding:"32px 24px",textAlign:"center"}}>
                <div style={{
                  fontSize:44,marginBottom:14,transition:"all .3s",
                  filter:hovered===mode.id?`drop-shadow(0 0 12px ${accent}80)`:"none",
                  transform:hovered===mode.id?"scale(1.15)":"scale(1)",
                }}>{mode.icon}</div>
                <div style={{fontFamily:"'Be Vietnam Pro', sans-serif",fontSize:17,fontWeight:700,color:accent,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
                  {mode.name}
                </div>
                {mode.desc&&<div style={{color:"#5b5a56",fontSize:12,marginBottom:10}}>{mode.desc}</div>}
                <div style={{
                  display:"inline-block",padding:"3px 12px",borderRadius:12,
                  background:`${accent}12`,border:`1px solid ${accent}25`,
                  color:accent,fontSize:11,fontWeight:600,
                }}>{mode.players} người chơi</div>
              </div>
            </HexBorder>
          </div>
        ))}
      </div>

      <div style={{marginTop:60,color:CYBER.textMuted,fontSize:10,letterSpacing:3,textTransform:"uppercase",fontFamily:"'JetBrains Mono', monospace"}}>
        [ © 2026 GAMEMATCHING ] // v1.0 // FAN.PROJECT
      </div>
    </div>
  );
}

export default ModeSelection;
