function StatusDot({status}){
  const c={looking:"#2aff5a",waiting:"#ffaa2a",inactive:"#666"};
  const l={looking:"Đang tìm",waiting:"Đang chờ",inactive:"Tạm dừng"};
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:c[status]}}>
      <span style={{
        width:8,height:8,borderRadius:"50%",background:c[status],
        boxShadow:`0 0 6px ${c[status]}80`,
        animation:status==="looking"?"pulse 1.5s infinite":"none",
      }}/>
      {l[status]}
    </span>
  );
}

export default StatusDot;
