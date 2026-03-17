import HexBorder from "./HexBorder";

function Modal({isOpen,onClose,title,children,width=500}){
  if(!isOpen) return null;
  return(
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"fadeIn .2s ease",
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:Math.min(width,window.innerWidth-32),maxHeight:"88vh",overflow:"auto"}}>
        <HexBorder glow color="#c89b3c">
          <div style={{padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,paddingBottom:14,borderBottom:"1px solid #222"}}>
              <h3 style={{color:"#c8aa6e",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:2,margin:0}}>{title}</h3>
              <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer",padding:4,lineHeight:1}}>✕</button>
            </div>
            {children}
          </div>
        </HexBorder>
      </div>
    </div>
  );
}

export default Modal;
