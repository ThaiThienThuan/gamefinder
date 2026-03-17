function Field({label,value,onChange,options,multi=false}){
  return(
    <div style={{marginBottom:14}}>
      <label style={{color:"#8b8072",fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6,fontWeight:600}}>{label}</label>
      {multi?(
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {options.map(opt=>{
            const sel=(value||[]).includes(opt);
            return(
              <button key={opt} onClick={()=>{
                if(sel) onChange(value.filter(v=>v!==opt));
                else onChange([...(value||[]),opt]);
              }} style={{
                padding:"5px 14px",fontSize:12,borderRadius:4,
                border:sel?"1px solid #c89b3c":"1px solid #333",
                background:sel?"#c89b3c20":"#0a0a14",
                color:sel?"#c8aa6e":"#666",cursor:"pointer",transition:"all .2s",
              }}>{opt}</button>
            );
          })}
        </div>
      ):(
        <select value={value} onChange={e=>onChange(e.target.value)} style={{
          width:"100%",padding:"9px 12px",background:"#0a0a14",
          border:"1px solid #333",borderRadius:4,color:"#c8aa6e",fontSize:13,outline:"none",
        }}>
          <option value="">-- Chọn --</option>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

export default Field;
