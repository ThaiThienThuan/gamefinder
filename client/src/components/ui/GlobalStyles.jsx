const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#010a13;overflow-x:hidden;}
    ::-webkit-scrollbar{width:6px;}
    ::-webkit-scrollbar-track{background:#0a0a14;}
    ::-webkit-scrollbar-thumb{background:#333;border-radius:3px;}
    ::-webkit-scrollbar-thumb:hover{background:#555;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes slideDown{from{transform:translateY(-20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
    @keyframes glow{0%,100%{box-shadow:0 0 8px #c89b3c30;}50%{box-shadow:0 0 20px #c89b3c60;}}
    @keyframes borderShine{
      0%{background-position:200% center;}
      100%{background-position:-200% center;}
    }
    input:focus,select:focus,textarea:focus{border-color:#c89b3c!important;box-shadow:0 0 8px #c89b3c30!important;}
    ::selection{background:#c89b3c40;color:#f0e6d2;}
  `}</style>
);

export default GlobalStyles;
