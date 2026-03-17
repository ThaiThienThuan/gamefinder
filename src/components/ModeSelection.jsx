import { useState } from "react";
import { GAME_MODES } from "../constants";
import HexBorder from "./ui/HexBorder";

function ModeSelection({onSelect}){
  const [hovered,setHovered]=useState(null);
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",position:"relative"}}>
      {/* Background pattern */}
      <div style={{position:"absolute",inset:0,opacity:.04,
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23c89b3c' stroke-width='.5'/%3E%3C/svg%3E")`,
        backgroundSize:"60px 60px",
      }}/>
      {/* Radial glow */}
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,
        background:"radial-gradient(circle,#c89b3c08,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{textAlign:"center",marginBottom:52,position:"relative"}}>
        <div style={{fontSize:11,letterSpacing:8,textTransform:"uppercase",color:"#5b5a56",marginBottom:14,fontWeight:500}}>
          Hệ Thống Tìm Bạn Chơi Game
        </div>
        <h1 style={{
          fontFamily:"'Playfair Display',serif",fontSize:"clamp(30px,5vw,54px)",
          fontWeight:900,margin:0,lineHeight:1.1,
          background:"linear-gradient(180deg,#f0e6d2,#c89b3c,#785a28)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 2px 8px #c89b3c40)",
        }}>LIÊN MINH TÌM ĐỒNG ĐỘI</h1>
        <div style={{width:240,height:2,margin:"18px auto",background:"linear-gradient(90deg,transparent,#c89b3c,transparent)"}}/>
        <p style={{color:"#5b5a56",fontSize:14,letterSpacing:1}}>Chọn chế độ chơi để bắt đầu</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:18,maxWidth:940,width:"100%",position:"relative"}}>
        {GAME_MODES.map(mode=>(
          <div key={mode.id}
            onMouseEnter={()=>setHovered(mode.id)} onMouseLeave={()=>setHovered(null)}
            onClick={()=>onSelect(mode)}
            style={{cursor:"pointer",transition:"transform .3s ease",transform:hovered===mode.id?"translateY(-6px) scale(1.02)":"none"}}
          >
            <HexBorder glow={hovered===mode.id} color="#c89b3c">
              <div style={{padding:"32px 24px",textAlign:"center"}}>
                <div style={{
                  fontSize:44,marginBottom:14,transition:"all .3s",
                  filter:hovered===mode.id?"drop-shadow(0 0 12px #c89b3c80)":"none",
                  transform:hovered===mode.id?"scale(1.15)":"scale(1)",
                }}>{mode.icon}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"#c8aa6e",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
                  {mode.name}
                </div>
                <div style={{color:"#5b5a56",fontSize:12,marginBottom:10}}>{mode.desc}</div>
                <div style={{
                  display:"inline-block",padding:"3px 12px",borderRadius:12,
                  background:"#c89b3c12",border:"1px solid #c89b3c25",
                  color:"#c89b3c",fontSize:11,fontWeight:600,
                }}>{mode.players} người chơi</div>
              </div>
            </HexBorder>
          </div>
        ))}
      </div>

      <div style={{marginTop:60,color:"#333",fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>
        © 2026 Liên Minh Tìm Đồng Đội — Fan Project
      </div>
    </div>
  );
}

export default ModeSelection;
