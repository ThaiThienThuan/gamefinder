import { RANK_COLORS } from "../../constants";

function RankBadge({rank,size="sm"}){
  const s=size==="sm"?20:size==="md"?28:36;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,color:RANK_COLORS[rank]||"#a09b8c",fontWeight:700,fontSize:s*.55}}>
      <span style={{
        width:s,height:s,borderRadius:"50%",
        background:`radial-gradient(circle,${RANK_COLORS[rank]}40,transparent)`,
        border:`2px solid ${RANK_COLORS[rank]}80`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:s*.45,fontWeight:900,
      }}>{rank[0]}</span>
      {rank}
    </span>
  );
}

export default RankBadge;
