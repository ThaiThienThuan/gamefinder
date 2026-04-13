const GlobalStyles = () => (
  <style>{`
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#05010f;overflow-x:hidden;font-family:'Be Vietnam Pro','Inter',sans-serif;}
    ::-webkit-scrollbar{width:6px;}
    ::-webkit-scrollbar-track{background:#0a0520;}
    ::-webkit-scrollbar-thumb{background:#2a0e4e;border-radius:3px;}
    ::-webkit-scrollbar-thumb:hover{background:#00f0ff50;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes slideDown{from{transform:translateY(-20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
    @keyframes slideUp{from{transform:translateX(-50%) translateY(30px);opacity:0;}to{transform:translateX(-50%) translateY(0);opacity:1;}}
    @keyframes glow{0%,100%{box-shadow:0 0 8px #00f0ff30;}50%{box-shadow:0 0 20px #00f0ff60;}}
    @keyframes borderShine{
      0%{background-position:200% center;}
      100%{background-position:-200% center;}
    }
    input:focus,select:focus,textarea:focus{border-color:#00f0ff!important;box-shadow:0 0 8px #00f0ff30!important;}
    ::selection{background:#00f0ff40;color:#e0e7ff;}
  `}</style>
);

export default GlobalStyles;
