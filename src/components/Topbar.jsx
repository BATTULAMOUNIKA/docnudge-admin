export default function Topbar({patientSearch="",onPatientSearch,onSearchFocus}){
  const now=new Date();
  const greet=now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
  const date=now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return(
    <div style={s.bar}>
      <div>
        <div style={s.greet}>{greet}, Dr. Hima Bindu 👋</div>
        <div style={s.date}>{date}</div>
      </div>
      <div style={s.right}>
        <div style={s.search}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            style={s.sInp}
            value={patientSearch}
            onFocus={onSearchFocus}
            onChange={e=>onPatientSearch?.(e.target.value)}
            placeholder="Search patients..."
          />
        </div>
        <div style={s.notifBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div style={s.notifDot}/>
        </div>
        <div style={s.profilePic}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
    </div>
  );
}
const s={
  bar:       {background:"#fff",borderBottom:"1px solid var(--border)",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50},
  greet:     {fontSize:16,fontWeight:600,color:"#111827"},
  date:      {fontSize:12,color:"#9ca3af",marginTop:2},
  right:     {display:"flex",alignItems:"center",gap:12},
  search:    {display:"flex",alignItems:"center",gap:8,background:"#f9fafb",border:"1px solid var(--border)",borderRadius:20,padding:"8px 16px",width:240,cursor:"text"},
  sInp:      {border:"none",outline:"none",background:"transparent",fontSize:13,color:"#111827",fontFamily:"Inter,sans-serif",width:"100%"},
  notifBtn:  {width:36,height:36,borderRadius:"50%",background:"#f9fafb",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"},
  notifDot:  {width:8,height:8,background:"#ef4444",borderRadius:"50%",position:"absolute",top:6,right:6,border:"2px solid white"},
  profilePic:{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#1a56db,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
};
