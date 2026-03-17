function GoldBtn({children,onClick,disabled=false,variant="primary",size="md",style:extra={}}){
  const bg={
    primary: disabled
      ?"linear-gradient(180deg,#333,#222)"
      :"linear-gradient(180deg,#c89b3c 0%,#785a28 100%)",
    secondary:"linear-gradient(180deg,#1e2328,#0a0a14)",
    danger:"linear-gradient(180deg,#8b2020,#4a1010)",
    success:"linear-gradient(180deg,#1a6b2a,#0a3515)",
  };
  const bd={
    primary: disabled?"1px solid #444":"1px solid #c8aa6e",
    secondary:"1px solid #5b5a56",
    danger:"1px solid #c03030",
    success:"1px solid #2a9b4a",
  };
  const fg={primary:disabled?"#666":"#0a0a14",secondary:"#a09b8c",danger:"#f0d0d0",success:"#d0f0d0"};
  const pad={sm:"5px 14px",md:"8px 22px",lg:"12px 32px"};
  const fs={sm:11,md:13,lg:15};
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:bg[variant],border:bd[variant],color:fg[variant],
      padding:pad[size],fontSize:fs[size],borderRadius:4,
      fontFamily:"'Playfair Display',serif",fontWeight:700,letterSpacing:1,
      textTransform:"uppercase",cursor:disabled?"not-allowed":"pointer",
      transition:"all .2s",whiteSpace:"nowrap",...extra,
    }}
    onMouseEnter={e=>{if(!disabled&&variant==="primary"){e.target.style.filter="brightness(1.15)";e.target.style.boxShadow="0 0 15px #c89b3c50";}}}
    onMouseLeave={e=>{e.target.style.filter="none";e.target.style.boxShadow="none";}}
    >{children}</button>
  );
}

export default GoldBtn;
