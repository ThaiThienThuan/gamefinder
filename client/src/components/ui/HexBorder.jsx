function HexBorder({children, glow=false, color="#c89b3c", className=""}){
  return(
    <div className={className} style={{position:"relative"}}>
      {glow&&<div style={{
        position:"absolute",inset:-1,borderRadius:8,
        boxShadow:`0 0 20px ${color}40, inset 0 0 20px ${color}15`,
        pointerEvents:"none",zIndex:0,
      }}/>}
      <div style={{
        border:`1px solid ${color}50`,borderRadius:8,
        background:"linear-gradient(180deg,#1a1a2e 0%,#0d0d1a 100%)",
        position:"relative",overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,
          background:`linear-gradient(90deg,transparent,${color},transparent)`
        }}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,
          background:`linear-gradient(90deg,transparent,${color}40,transparent)`
        }}/>
        {children}
      </div>
    </div>
  );
}

export default HexBorder;
