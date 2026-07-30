import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../AuthContext";
import { admin as adminApi, courses as coursesApi } from "../../api";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile, Ico, Badge, StatCard, GlowRow } from "../../components/UI";
import { Btn, Logo } from "../../components/Layout";
import { GROWTH_DATA, CHURN_DATA } from "../../constants";
import { buildAdminAnalyticsViewModel } from "../../analytics/adminDashboard";
import CreateAdminForm from "../../components/admin/CreateAdminForm";
import AdminTicketsTab from "../../components/admin/AdminTicketsTab";
import CreateUserForm from "../../components/CreateUserForm";
import LessonEditPanel from "../../components/LessonEditPanel";

function AdminPanel(props) {
  var go = props.go;
  var courses = props.courses;
  var setCourses = props.setCourses;
  var mob = useIsMobile();
  var _tab = useState("dash"); var tab = _tab[0]; var setTab = _tab[1];
  var _search = useState(""); var search = _search[0]; var setSearch = _search[1];
  var _pay = useState([]); var payouts = _pay[0]; var setPayouts = _pay[1];
  var _sel = useState([]); var sel = _sel[0]; var setSel = _sel[1];
  var _toast = useState(null); var toast = _toast[0]; var setToast = _toast[1];
  var _em = useState(null); var editingModule = _em[0]; var setEditingModule = _em[1];
  var _el = useState(null); var editingLesson = _el[0]; var setEditingLesson = _el[1];
  var _ex = useState(null); var expandedModule = _ex[0]; var setExpandedModule = _ex[1];
  var _sam = useState(false); var showAddModule = _sam[0]; var setShowAddModule = _sam[1];
  var _sal = useState(null); var showAddLesson = _sal[0]; var setShowAddLesson = _sal[1];
  var _nm = useState({module:"",icon:"book"}); var newModule = _nm[0]; var setNewModule = _nm[1];
  var _nl = useState({title:"",dur:"10",pdfUrl:"",notes:""}); var newLesson = _nl[0]; var setNewLesson = _nl[1];
  var _cd = useState(null); var confirmDelete = _cd[0]; var setConfirmDelete = _cd[1];
  var _mm = useState(null); var manageMedia = _mm[0]; var setManageMedia = _mm[1];
  var _confirmPay = useState(false); var confirmPayout = _confirmPay[0]; var setConfirmPayout = _confirmPay[1];
  var _payoutToProcess = useState(null); var payoutToProcess = _payoutToProcess[0]; var setPayoutToProcess = _payoutToProcess[1];
  var _payoutProcessing = useState(false); var payoutProcessing = _payoutProcessing[0]; var setPayoutProcessing = _payoutProcessing[1];
  var _payoutProcessError = useState(""); var payoutProcessError = _payoutProcessError[0]; var setPayoutProcessError = _payoutProcessError[1];
  var _verifyResult = useState(null); var verifyResult = _verifyResult[0]; var setVerifyResult = _verifyResult[1];
  var _upl = useState(null); var uploading = _upl[0]; var setUploading = _upl[1];
  var _selUser = useState(null); var selectedUser = _selUser[0]; var setSelectedUser = _selUser[1];
  var adminContentRef = useRef(null);

  // Admin action states
  var _actionPanel = useState(null); var actionPanel = _actionPanel[0]; var setActionPanel = _actionPanel[1]; // "resetPass"|"changeEmail"|"reassignRef"|"updateIban"|"extendSub"|"viewProgress"
  var _tempPass = useState(""); var tempPass = _tempPass[0]; var setTempPass = _tempPass[1];
  var _newEmail = useState(""); var newEmail = _newEmail[0]; var setNewEmail = _newEmail[1];
  var _newRefCode = useState(""); var newRefCode = _newRefCode[0]; var setNewRefCode = _newRefCode[1];
  var _newIban = useState(""); var newIban = _newIban[0]; var setNewIban = _newIban[1];
  var _newIbanName = useState(""); var newIbanName = _newIbanName[0]; var setNewIbanName = _newIbanName[1];
  var _extendDays = useState("7"); var extendDays = _extendDays[0]; var setExtendDays = _extendDays[1];
  var _actionLoading = useState(false); var actionLoading = _actionLoading[0]; var setActionLoading = _actionLoading[1];
  var _actionResult = useState(null); var actionResult = _actionResult[0]; var setActionResult = _actionResult[1];
  var _auditEntries = useState([]); var auditEntries = _auditEntries[0]; var setAuditEntries = _auditEntries[1];
  var _auditFilter = useState(""); var auditFilter = _auditFilter[0]; var setAuditFilter = _auditFilter[1];
  var _adminUsers = useState([]); var adminUsers = _adminUsers[0]; var setAdminUsers = _adminUsers[1];
  var _adminStats = useState(null); var adminStats = _adminStats[0]; var setAdminStats = _adminStats[1];
  var _adminLoading = useState(true); var adminLoading = _adminLoading[0]; var setAdminLoading = _adminLoading[1];
  var _adminAnalytics = useState(null); var adminAnalytics = _adminAnalytics[0]; var setAdminAnalytics = _adminAnalytics[1];
  var { user: adminAuthUser } = useAuth();

  useEffect(function(){
    if (!adminAuthUser || adminAuthUser.role !== "admin") return;
    Promise.allSettled([
      adminApi.users(),
      adminApi.dashboard(),
      adminApi.payouts(),
      coursesApi.list(),
      adminApi.analytics({range:"12m", bucket:"month", timezone:"Asia/Dubai", topLimit:10}),
    ]).then(function(results){
      if(results[0].status==="fulfilled" && Array.isArray(results[0].value)){
        setAdminUsers(results[0].value.map(function(u){
          return {
            name: u.full_name||u.email, email: u.email, code: u.referral_code||"",
            l1: u.referral_count||0, l2: u.l2_referral_count||0, earned: u.total_earned||0, pending: u.pending_payout||0,
            status: u.subscription_status||"inactive", joined: u.created_at ? new Date(u.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "",
            referrer: u.referred_by_name||null, l1Names:[], l2Names:[], id: u.id, role: u.role,
            iban: u.payout_iban||"", ibanName: u.payout_name||"",
          };
        }));
      }
      if(results[1].status==="fulfilled") setAdminStats(results[1].value);
      if(results[2].status==="fulfilled" && Array.isArray(results[2].value)) setPayouts(results[2].value);
      if(results[3].status==="fulfilled" && Array.isArray(results[3].value)){
        setCourses(results[3].value.map(function(c){
          return { id:c.id, module:c.title, icon:c.category||"book", lessons:[] };
        }));
      }
      if(results[4].status==="fulfilled"){
        setAdminAnalytics(results[4].value);
      }
      setAdminLoading(false);
    });
  }, [adminAuthUser]);

  var analyticsView = buildAdminAnalyticsViewModel(adminAnalytics);
  var financialSeries = analyticsView.financialSeries;
  var payoutSeries = analyticsView.payoutSeries;
  var referralSegments = analyticsView.referralSegments;
  var topReferrers = analyticsView.topReferrers;
  var totalLessons = courses.reduce(function(s,c){return s+c.lessons.length},0);
  function isProcessablePayout(p) { return p && p.status === "requested"; }
  function payoutAmount(p) { return Number((p && p.amount) || 0); }

  function flash(msg) { setToast(msg); setTimeout(function(){setToast(null)},3000); }

  async function processPayouts() {
    var targetIds = sel.length > 0 ? sel : payouts.filter(isProcessablePayout).map(function(p){return p.id});
    if (targetIds.length === 0) {
      flash("No requested payouts to process");
      setConfirmPayout(false);
      return;
    }
    setPayouts(function(prev) {
      return prev.map(function(x) {
        var targeted = targetIds.includes(x.id);
        return targeted ? Object.assign({}, x, {status: "processing"}) : x;
      });
    });
    try {
      var results = await Promise.allSettled(targetIds.map(function(id){ return adminApi.processPayout(id); }));
      var submitted = results.filter(function(r){ return r.status === "fulfilled"; }).length;
      var failed = results.length - submitted;
      if (failed > 0) {
        flash("Payouts submitted: " + submitted + ", failed: " + failed);
      } else if (submitted > 0) {
        flash("Payouts submitted to MamoPay: " + submitted);
      } else {
        flash("No payouts submitted");
      }
    } catch(e) {
      flash("Error: " + (e.message || "Failed to process payouts"));
    }
    // Always re-fetch true status from server after payout submission attempts
    try {
      var updated = await adminApi.payouts();
      if (Array.isArray(updated)) setPayouts(updated);
    } catch(_) {}
    setSel([]);
  }

  async function processSinglePayout() {
    if (!payoutToProcess || payoutProcessing) return;
    setPayoutProcessing(true);
    setPayoutProcessError("");
    try {
      var result = await adminApi.processPayout(payoutToProcess.id);
      setPayouts(function(prev){
        return prev.map(function(p){
          return p.id === payoutToProcess.id
            ? Object.assign({}, p, {status:"processing", mamopay_transfer_id:result.transfer_id})
            : p;
        });
      });
      setSel(function(prev){return prev.filter(function(id){return id !== payoutToProcess.id})});
      setPayoutToProcess(null);
      flash("Payout submitted to MamoPay");
    } catch(err) {
      setPayoutProcessError(err.message || "MamoPay could not process this payout");
    } finally {
      setPayoutProcessing(false);
    }
  }

  async function addModule() {
    if (!newModule.module.trim()) return;
    try {
      var slug = newModule.module.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
      var created = await adminApi.createCourse({ title: newModule.module, slug: slug, category: newModule.icon, is_published: true, sort_order: courses.length });
      setCourses(function(p){ return p.concat([{ id: created.id, module: created.title, icon: created.category || newModule.icon, lessons: [] }]) });
      setNewModule({module:"",icon:"book"});
      setShowAddModule(false);
      flash("Module added!");
    } catch(e) {
      flash("Error: " + (e.message || "Failed to create module"));
    }
  }

  function updateModule(cid, field, value) {
    setCourses(function(p){return p.map(function(c){if(c.id!==cid) return c; var n=Object.assign({},c); n[field]=value; return n;})});
  }

  async function deleteModule(cid) {
    try {
      await adminApi.deleteCourse(cid);
      setCourses(function(p){return p.filter(function(c){return c.id!==cid})});
      setConfirmDelete(null); setExpandedModule(null);
      flash("Module deleted");
    } catch(e) {
      flash("Error: " + (e.message || "Failed to delete module"));
      setConfirmDelete(null);
    }
  }

  async function addLessonTo(cid) {
    if (!newLesson.title.trim()) return;
    var durMins = parseInt(newLesson.dur) || 10;
    try {
      var created = await adminApi.createLesson(cid, {
        title: newLesson.title,
        video_url: newLesson.pdfUrl || null,
        content_md: newLesson.notes || null,
        duration_minutes: durMins,
        sort_order: (courses.find(function(c){return c.id===cid})||{lessons:[]}).lessons.length,
        is_published: true,
      });
      setCourses(function(p){return p.map(function(c){
        return c.id===cid ? Object.assign({},c,{lessons:c.lessons.concat([{
          id: created.id, title: created.title,
          dur: created.duration_minutes + " min",
          video_url: created.video_url, done: false,
        }])}) : c;
      })});
      setNewLesson({title:"",dur:"10",pdfUrl:"",notes:""});
      setShowAddLesson(null);
      flash("Lesson added!");
    } catch(e) {
      flash("Error: " + (e.message || "Failed to add lesson"));
    }
  }

  function updateLesson(cid,lid,field,value) {
    setCourses(function(p){return p.map(function(c){return c.id===cid ? Object.assign({},c,{lessons:c.lessons.map(function(l){if(l.id!==lid) return l; var n=Object.assign({},l); n[field]=value; return n;})}) : c})});
  }

  async function deleteLessonFrom(cid, lid) {
    try {
      await adminApi.deleteLesson(cid, lid);
      setCourses(function(p){return p.map(function(c){return c.id===cid ? Object.assign({},c,{lessons:c.lessons.filter(function(l){return l.id!==lid})}) : c})});
      setConfirmDelete(null);
      flash("Lesson deleted");
    } catch(e) {
      flash("Error: " + (e.message || "Failed to delete lesson"));
      setConfirmDelete(null);
    }
  }

  function moveLesson(cid,lid,dir) {
    setCourses(function(p){return p.map(function(c){
      if(c.id!==cid) return c;
      var idx = c.lessons.findIndex(function(l){return l.id===lid});
      if((dir===-1 && idx===0)||(dir===1 && idx===c.lessons.length-1)) return c;
      var arr = c.lessons.slice();
      var tmp = arr[idx]; arr[idx] = arr[idx+dir]; arr[idx+dir] = tmp;
      return Object.assign({},c,{lessons:arr});
    })});
  }

  async function moveModule(cid,dir) {
    var newCourses;
    setCourses(function(p){
      var idx = p.findIndex(function(c){return c.id===cid});
      if((dir===-1 && idx===0)||(dir===1 && idx===p.length-1)) return p;
      var arr = p.slice();
      var tmp = arr[idx]; arr[idx] = arr[idx+dir]; arr[idx+dir] = tmp;
      newCourses = arr;
      return arr;
    });
    // Persist new sort_order for all courses
    if (newCourses) {
      newCourses.forEach(function(c, i) {
        adminApi.patchCourse(c.id, { sort_order: i }).catch(function(){});
      });
    }
  }

  function simulateUpload(cid,lid,type,file) { flash("Use PDF URL instead — click the lesson to edit"); }
  function removeMedia(cid,lid,type) { flash("Edit the lesson to update the PDF URL"); }

  var ICONS = ["book","globe","shield","target","dollar","rocket","book","target","lightbulb","globe","bank","shield","chart","users","phone","bank","phone","lock","chart","sparkle"];

  function doAction(label, cb) {
    setActionLoading(true); setActionResult(null);
    setTimeout(function(){
      setActionLoading(false);
      var msg = cb();
      setActionResult({ok:true, msg:msg});
      flash(msg);
      setTimeout(function(){setActionResult(null)},4000);
    }, 800);
  }

  function clearActionPanel() { setActionPanel(null); setActionResult(null); setTempPass(""); setNewEmail(""); setNewRefCode(""); setNewIban(""); setNewIbanName(""); setExtendDays("7"); }

  var DEMO_AUDIT = [];

  var admSide = [["dash","chart","Dashboard"],["users","users","Users"],["tickets","chat","Tickets"],["courses","book","Courses"],["payouts","dollar","Payouts"],["audit","shield","Audit Log"],["api","gear","API Config"]];

  return (
    <div style={{ display:"flex", flexDirection:mob?"column":"row", minHeight:"100vh", background:"#000000" }}>
      {!mob && <div style={{ width:230, background:"#0d0d0d", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <Logo light />
          <div style={{ fontSize:10, color:"#94a3b8", letterSpacing:1.5, marginTop:4 }}>ADMIN PANEL</div>
        </div>
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {admSide.map(function(item){ return (
            <button key={item[0]} onClick={function(){setTab(item[0])}} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", textAlign:"left",
              background: tab===item[0] ? "rgba(255,255,255,0.08)" : "transparent", color: tab===item[0] ? "#ffffff" : "#64748b",
              fontSize:13, fontWeight: tab===item[0]?600:500, cursor:"pointer", marginBottom:2
            }}><Ico name={item[1]} size={16} color={tab===item[0] ? "rgb(0,228,193)" : "#64748b"} />{" "+item[2]}</button>
          )})}
        </nav>
        <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#fff", marginBottom:8 }}>{adminAuthUser ? (adminAuthUser.full_name || adminAuthUser.email) : "Admin"}</div>
          <button onClick={function(){go("landing")}} style={{ width:"100%", padding:"8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#94a3b8", fontSize:12, cursor:"pointer" }}>Log Out</button>
        </div>
      </div>}

      {mob && <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#0d0d0d", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, zIndex:50 }}>
        <div><Logo light /><div style={{ fontSize:9, color:"#64748b", letterSpacing:1, marginTop:2 }}>ADMIN</div></div>
        <button onClick={function(){go("landing")}} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:11, cursor:"pointer" }}>Log Out</button>
      </div>}

      {/* ADMIN MOBILE BOTTOM TAB BAR */}
      {mob && <div style={{ position:"fixed", bottom:0, left:0, right:0, display:"flex", justifyContent:"space-around", alignItems:"center", background:"rgba(17,17,19,0.95)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"6px 0 8px", zIndex:60 }}>
        {admSide.map(function(item){ return (
          <button key={item[0]} onClick={function(){setTab(item[0]);if(adminContentRef.current)adminContentRef.current.scrollTop=0}} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", padding:"6px 4px", minWidth:52 }}>
            <Ico name={item[1]} size={18} color={tab===item[0]?"rgb(0,228,193)":"#64748b"} />
            <span style={{ fontSize:9, fontWeight:tab===item[0]?700:500, color:tab===item[0]?"rgb(0,228,193)":"#64748b" }}>{item[2]}</span>
          </button>
        )})}
      </div>}

      <div ref={adminContentRef} style={{ flex:1, padding:mob?16:28, overflow:"auto", maxHeight:"100vh", paddingBottom:mob?80:28, overflowX:"hidden", boxSizing:"border-box", minWidth:0, width:mob?"100%":"auto" }}>

        {tab === "dash" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>Analytics Dashboard</h2>
              <p style={{ fontSize:mob?11:12, color:"#94a3b8", marginTop:4 }}>Live data from your database</p>
            </div>
          </div>

          {/* KPI CARDS ROW 1 */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:12, marginBottom:16, alignItems:"stretch" }}>
            {[
              ["dollar","Total Revenue","AED "+(adminStats?adminStats.total_revenue_aed.toFixed(2):"—"),"All time payments","#059669","#064e3b"],
              ["users","Total Users",adminStats?adminStats.total_users:"—","Registered accounts","#8b5cf6","#2e1065"],
              ["shield","Active Subscribers",adminStats?adminStats.active_subscribers:"—","Current active subs","#00e4c1","#451a03"],
              ["book","Total Courses",adminStats?adminStats.total_courses:"—","Published modules","rgb(0,228,193)","rgba(0,228,193,0.12)"],
            ].map(function(c){ return (
              <div key={c[1]} style={{ background:"linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderRadius:14, padding:mob?"12px 10px":"18px 20px", border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:mob?8:14, boxSizing:"border-box", overflow:"hidden" }}>
                <div style={{ width:mob?30:38, height:mob?30:38, borderRadius:mob?8:10, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.12)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0, flexShrink:0 }}><Ico name={c[0]} size={16} color="rgb(0,228,193)" /></div>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#64748b", marginBottom:2 }}>{c[1]}</div>
                  <div style={{ fontSize:mob?16:20, fontWeight:500, color:"#ffffff", lineHeight:1.2 }}>{c[2]}</div>
                  <div style={{ fontSize:10, color:c[4], marginTop:2, fontWeight:500 }}>{c[3]}</div>
                </div>
              </div>
            )})}
          </div>

          {/* KPI CARDS ROW 2 */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:12, marginBottom:20, alignItems:"stretch" }}>
            {[
              ["dollar","Commissions Pending","AED "+(adminStats?adminStats.pending_commissions_aed.toFixed(2):"—"),"Awaiting payout","#00e4c1"],
              ["bank","Total Paid Out","AED "+(adminStats?adminStats.total_payouts_aed.toFixed(2):"—"),"Completed payouts","#00e4c1"],
              ["link","Avg Referrals/User",(adminUsers.length>0?(adminUsers.reduce(function(s,u){return s+u.l1},0)/adminUsers.length).toFixed(1):"—"),"L1 referrals per user","#8b5cf6"],
              ["refresh","Active Rate",(adminUsers.length>0?((adminUsers.filter(function(u){return u.status==="active"}).length/adminUsers.length)*100).toFixed(1)+"%":"—"),"Subscribers / total users","#10b981"],
            ].map(function(c){ return (
              <div key={c[1]} style={{ background:"linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", borderRadius:14, padding:mob?"12px 10px":"18px 20px", border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:mob?8:14, boxSizing:"border-box", overflow:"hidden" }}>
                <div style={{ width:mob?30:38, height:mob?30:38, borderRadius:mob?8:10, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.12)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0, flexShrink:0 }}><Ico name={c[0]} size={16} color="rgb(0,228,193)" /></div>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#64748b", marginBottom:2 }}>{c[1]}</div>
                  <div style={{ fontSize:mob?16:20, fontWeight:500, color:"#ffffff", lineHeight:1.2 }}>{c[2]}</div>
                  <div style={{ fontSize:10, color:c[4], marginTop:2, fontWeight:500 }}>{c[3]}</div>
                </div>
              </div>
            )})}
          </div>

          {/* CHARTS ROW 1: User Growth + Revenue */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14, marginBottom:14 }}>
            {/* User Growth Over Time */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?"14px 10px 10px":"20px 20px 12px", border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:"#ffffff", margin:0 }}>User Growth</h3>
                <span style={{ fontSize:mob?9:10, color:"#64748b", padding:"3px 10px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", whiteSpace:mob?"nowrap":"normal", overflow:"hidden", textOverflow:"ellipsis", maxWidth:mob?120:"none" }}>Total users, active & cancelled</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={GROWTH_DATA} margin={{top:5,right:5,left:mob?-25:-15,bottom:5}}>
                  <defs>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(0,228,193)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="rgb(0,228,193)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(0,228,193)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="rgb(0,228,193)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return v.replace("Feb ","F").replace("Mar ","M")}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} />
                  <Tooltip contentStyle={{background:"#000000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:12,color:"#ffffff"}} />
                  <Area type="monotone" dataKey="users" stroke="rgb(0,228,193)" fill="url(#gUsers)" strokeWidth={2} name="Total Users" />
                  <Area type="monotone" dataKey="active" stroke="rgb(0,228,193)" fill="url(#gActive)" strokeWidth={2} name="Active" />
                  <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Cancelled" />
                  <Legend iconSize={8} wrapperStyle={{fontSize:10,color:"#64748b"}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue & Profit */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?"14px 10px 10px":"20px 20px 12px", border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:"#ffffff", margin:0 }}>Revenue vs Commissions vs Profit</h3>
                <span style={{ fontSize:mob?9:10, color:"#64748b", padding:"3px 10px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", whiteSpace:mob?"nowrap":"normal", overflow:"hidden", textOverflow:"ellipsis", maxWidth:mob?120:"none" }}>Where the money goes</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={financialSeries} margin={{top:5,right:5,left:mob?-25:-15,bottom:5}}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(0,228,193)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="rgb(0,228,193)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(0,228,193)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="rgb(0,228,193)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return v.replace("Feb ","F").replace("Mar ","M")}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} />
                  <Tooltip contentStyle={{background:"#000000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:12,color:"#ffffff"}} formatter={function(v){return "AED "+v.toFixed(2)}} />
                  <Area type="monotone" dataKey="revenue" stroke="rgb(0,228,193)" fill="url(#gRev)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="rgb(0,228,193)" fill="url(#gProf)" strokeWidth={2} name="Net Profit" />
                  <Line type="monotone" dataKey="commissions" stroke="#00e4c1" strokeWidth={2} dot={false} name="Commissions" />
                  <Legend iconSize={8} wrapperStyle={{fontSize:10,color:"#64748b"}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHARTS ROW 2: Signups Bar + Churn Trend + Payouts */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
            {/* Daily Signups */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?"14px 10px 10px":"20px 20px 12px", border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#ffffff", margin:0 }}>New Signups</h3>
                <span style={{ fontSize:9, color:"#64748b", padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>Per period</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={GROWTH_DATA} margin={{top:5,right:5,left:mob?-25:-15,bottom:5}}>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:9}} tickFormatter={function(v){return v.replace("Feb ","").replace("Mar ","")}} />
                  <YAxis tick={{fill:"#64748b",fontSize:9}} />
                  <Tooltip contentStyle={{background:"#000000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:11,color:"#ffffff"}} />
                  <Bar dataKey="signups" fill="rgb(0,228,193)" radius={[3,3,0,0]} name="Signups" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Churn Rate Trend */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?"14px 10px 10px":"20px 20px 12px", border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#ffffff", margin:0 }}>Churn Rate Trend</h3>
                <span style={{ fontSize:9, color:"#10b981", padding:"2px 8px", borderRadius:4, background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.1)" }}>Trending down</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={CHURN_DATA} margin={{top:5,right:5,left:mob?-25:-15,bottom:5}}>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:10}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return v+"%"}} />
                  <Tooltip contentStyle={{background:"#000000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:11,color:"#ffffff"}} formatter={function(v){return v+"%"}} />
                  <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{fill:"#ef4444",r:4}} name="Churn %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Payouts */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?"14px 10px 10px":"20px 20px 12px", border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#ffffff", margin:0 }}>Payouts to Users</h3>
                <span style={{ fontSize:9, color:"#64748b", padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>Monthly disbursed</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={payoutSeries} margin={{top:5,right:5,left:mob?-25:-15,bottom:5}}>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:10}} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} />
                  <Tooltip contentStyle={{background:"#000000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,fontSize:11,color:"#ffffff"}} formatter={function(v){return "AED "+v}} />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[3,3,0,0]} name="Paid Out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROW 3: Referral Network + Leaderboard */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 2fr", gap:14 }}>
            {/* Referral Network Breakdown Pie */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?12:20, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box", overflow:"hidden" }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Referral Network</h3>
              <div style={{ display:"flex", flexDirection:mob?"column":"row", alignItems:"center", gap:mob?8:0 }}>
                <ResponsiveContainer width={mob?"100%":"50%"} height={mob?130:180}>
                  <PieChart>
                    <Pie data={referralSegments} cx="50%" cy="50%" innerRadius={mob?25:45} outerRadius={mob?48:75} paddingAngle={3} dataKey="value">
                      {referralSegments.map(function(entry,i){return <Cell key={i} fill={entry.color} />})}
                    </Pie>
                    <Tooltip contentStyle={{background:"rgba(10,10,12,0.95)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,fontSize:11,color:"#ffffff",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",padding:"8px 12px"}} itemStyle={{color:"#ffffff"}} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:mob?"row":"column", gap:mob?6:8, flexWrap:"wrap", justifyContent:mob?"center":"flex-start" }}>
                  {referralSegments.map(function(item){ return (
                    <div key={item.name} style={{ display:"flex", alignItems:"center", gap:4, padding:mob?"3px 6px":"4px 10px", borderRadius:6, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:item.color, flexShrink:0 }} />
                      <span style={{ fontSize:mob?9:10, color:"#64748b" }}>{item.name}</span>
                      <span style={{ fontSize:mob?10:11, fontWeight:700, color:"#ffffff" }}>{item.value}</span>
                    </div>
                  )})}
                </div>
              </div>
            </div>

            {/* Top Referrers Leaderboard */}
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?12:20, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box", overflow:"hidden" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#ffffff", margin:0 }}>Top Referrers</h3>
                {!mob && <span style={{ fontSize:9, color:"#64748b", padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>By network size (L1 + L2)</span>}
              </div>
              <div style={{ width:"100%" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{(mob?["#","Name","L1","L2","Tot","Earned"]:["#","Name","Level 1","Level 2","Total","Earned","Status"]).map(function(h){return <th key={h} style={{ padding:mob?"6px 5px":"8px 8px", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#94a3b8", textAlign:"left", verticalAlign:"middle", borderBottom:"1px solid rgba(255,255,255,0.06)", whiteSpace:"nowrap" }}>{h}</th>})}</tr></thead>
                <tbody>{topReferrers.map(function(r,i){ return (
                  <tr key={r.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", verticalAlign:"middle" }}>
                      <div style={{ width:mob?18:22, height:mob?18:22, borderRadius:"50%", background:i===0?"#00e4c1":i===1?"#9ca3af":i===2?"#b45309":"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:mob?8:10, fontWeight:700, color:i<3?"#000000":"#9ca3af" }}>{i+1}</div>
                    </td>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", fontSize:mob?11:12, fontWeight:600, color:"#ffffff", verticalAlign:"middle", whiteSpace:"nowrap" }}>{r.name}</td>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", fontSize:mob?11:12, color:"#ffffff", fontWeight:600, verticalAlign:"middle" }}>{r.l1}</td>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", fontSize:mob?11:12, color:"#8b5cf6", fontWeight:600, verticalAlign:"middle" }}>{r.l2}</td>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", fontSize:mob?12:13, fontWeight:700, color:"#fff", verticalAlign:"middle" }}>{r.total}</td>
                    <td style={{ padding:mob?"7px 5px":"10px 8px", fontSize:mob?11:12, fontWeight:500, color:"#ffffff", verticalAlign:"middle", whiteSpace:"nowrap" }}>{"AED "+(r.earned||0).toFixed(2)}</td>
                    {!mob && <td style={{ padding:"10px 8px", verticalAlign:"middle" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <Badge s={r.status} />
                      </div>
                    </td>}
                  </tr>
                )})}</tbody>
              </table>
              </div>
            </div>
          </div>
        </div>}

        {tab === "users" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:mob?10:0, marginBottom:20 }}>
            <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>{"Users ("+adminUsers.length+")"}</h2>
            <div style={{ display:"flex", gap:8, alignItems:"center", width:mob?"100%":"auto" }}>
              <div style={{ position:"relative", flex:mob?1:"none" }}>
                <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", lineHeight:0, pointerEvents:"none" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
                <input value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="Search name, email, or code..." style={{ padding:"9px 14px 9px 34px", borderRadius:8, border:"1px solid "+(search ? "rgba(0,228,193,0.2)" : "rgba(255,255,255,0.06)"), background:search ? "rgba(255,255,255,0.03)" : "#000000", color:"#fff", fontSize:13, width:mob?"100%":280, outline:"none", boxSizing:"border-box" }} />
                {search && <button onClick={function(){setSearch("")}} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", lineHeight:0, padding:2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
              </div>
              <button onClick={function(){setActionPanel(actionPanel==="createUser"?null:"createUser");setSelectedUser(null)}} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>+ Create User</button>
            </div>
          </div>

          {actionPanel === "createUser" && <CreateUserForm onSuccess={function(newUser){
            setAdminUsers(function(p){ return [{ name:newUser.full_name, email:newUser.email, code:newUser.referral_code, l1:0, l2:0, earned:0, pending:0, status:"inactive", joined:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), referrer:null, l1Names:[], l2Names:[], id:newUser.id, role:newUser.role, iban:"", ibanName:"" }].concat(p) });
            setActionPanel(null);
            flash("User created: "+newUser.email);
          }} onClose={function(){setActionPanel(null)}} />}
          {(function(){
            var q = search.toLowerCase().trim();
            var filtered = adminUsers.filter(function(u){
              if (!q) return true;
              return u.name.toLowerCase().includes(q) ||
                     u.email.toLowerCase().includes(q) ||
                     u.code.toLowerCase().includes(q) ||
                     u.status.toLowerCase().includes(q);
            });
            return (
              <div>
                {search && <div style={{ fontSize:11, color:"#64748b", marginBottom:10 }}>{"Showing "+filtered.length+" of "+adminUsers.length+" users"+(filtered.length===0 ? " — try a different search" : "")}</div>}
                <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:mob?700:"auto" }}>
                    <thead><tr>{["User","Code","Level 1","Level 2","Earned","Pending","Status","Actions"].map(function(h){return <th key={h} style={{ padding:"12px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", textAlign:"left", verticalAlign:"middle", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{h}</th>})}</tr></thead>
                    <tbody>{filtered.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:13 }}>
                        <div style={{ marginBottom:8 }}><Ico name="users" size={28} color="#27272a" /></div>
                        {"No users match \u201C"+search+"\u201D"}
                      </td></tr>
                    ) : filtered.map(function(u){ return (
                <tr key={u.name} onClick={function(){setSelectedUser(selectedUser && selectedUser.name===u.name ? null : u)}} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", cursor:"pointer", background:selectedUser && selectedUser.name===u.name ? "rgba(0,228,193,0.06)" : "transparent", transition:"background 0.2s" }}>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>{u.name}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{u.email}</div></td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><code style={{ fontSize:11, background:"#000000", padding:"2px 8px", borderRadius:4, color:"#64748b" }}>{u.code}</code></td>
                  <td style={{ padding:"12px", fontSize:13, color:"#ffffff", verticalAlign:"middle" }}>{u.l1}</td>
                  <td style={{ padding:"12px", fontSize:13, color:"#ffffff", verticalAlign:"middle" }}>{u.l2}</td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:500, color:"#ffffff", verticalAlign:"middle" }}>{"AED "+u.earned.toFixed(2)}</td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:500, color:"#00e4c1", verticalAlign:"middle" }}>{u.pending>0 ? "AED "+u.pending.toFixed(2) : <span style={{color:"#64748b"}}>—</span>}</td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><Badge s={u.status}/></td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={function(e){e.stopPropagation();setSelectedUser(selectedUser && selectedUser.name===u.name ? null : u)}} style={{ width:26, height:26, borderRadius:6, border:"1px solid "+(selectedUser && selectedUser.name===u.name?"rgba(0,228,193,0.3)":"rgba(255,255,255,0.06)"), background:selectedUser && selectedUser.name===u.name?"rgba(0,228,193,0.1)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="chart" size={11} color={selectedUser && selectedUser.name===u.name?"rgb(0,228,193)":"#64748b"} /></button>
                      <button onClick={async function(e){e.stopPropagation();
                        var isActive = u.status==="active";
                        try {
                          if (isActive) { await adminApi.cancelSubscription(u.id); } else { await adminApi.activateSubscription(u.id); }
                          setAdminUsers(function(p){return p.map(function(x){return x.id===u.id?Object.assign({},x,{status:isActive?"inactive":"active"}):x})});
                          if (selectedUser && selectedUser.id===u.id) setSelectedUser(function(x){return Object.assign({},x,{status:isActive?"inactive":"active"})});
                          setAdminStats(function(s){ if(!s) return s; return Object.assign({},s,{active_subscribers:(s.active_subscribers||0)+(isActive?-1:1)}); });
                          flash((isActive?"Deactivated ":"Reactivated ")+u.name);
                        } catch(e){ flash("Error: "+(e.message||"Failed")); }
                      }} style={{ width:26, height:26, borderRadius:6, border:"1px solid "+(u.status==="active"?"rgba(248,113,113,0.2)":"rgba(0,228,193,0.2)"), background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name={u.status==="active"?"lock":"shield"} size={11} color={u.status==="active"?"#f87171":"rgb(0,228,193)"} /></button>
                      <button onClick={async function(e){ e.stopPropagation(); if(!window.confirm("Delete "+u.name+"? This cannot be undone.")) return; try { await adminApi.deleteUser(u.id); setAdminUsers(function(p){return p.filter(function(x){return x.id!==u.id})}); if(selectedUser && selectedUser.id===u.id) setSelectedUser(null); flash("Deleted "+u.name); } catch(err){ flash("Error: "+(err.message||"Failed to delete")); } }} style={{ width:26, height:26, borderRadius:6, border:"1px solid rgba(248,113,113,0.2)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                      <button onClick={function(e){e.stopPropagation();flash("Manual payout initiated for "+u.name)}} style={{ width:26, height:26, borderRadius:6, border:"1px solid rgba(0,228,193,0.2)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="dollar" size={11} color="rgb(0,228,193)" /></button>
                    </div>
                  </td>
                </tr>
              )})}
              </tbody>
                  </table></div>
                </div>
              </div>
            );
          })()}

          {/* USER DETAIL PANEL WITH REFERRAL TREE */}
          {selectedUser && (
            <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.08)", marginTop:14, overflow:"hidden", animation:"scaleIn 0.3s ease-out" }}>
              {/* Header */}
              <div style={{ padding:mob?"14px 14px":"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <h3 style={{ fontSize:mob?16:18, fontWeight:700, color:"#ffffff", margin:0 }}>{selectedUser.name}</h3>
                  <div style={{ display:"flex", gap:mob?8:16, marginTop:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, color:"#94a3b8" }}>{selectedUser.email}</span>
                    <span style={{ fontSize:11, color:"#64748b" }}>{"Joined "+selectedUser.joined}</span>
                    <span style={{ fontSize:11, color:"#64748b" }}>{"Code: "+selectedUser.code}</span>
                  </div>
                </div>
                <button onClick={function(){setSelectedUser(null);clearActionPanel()}} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:mob?"repeat(3,1fr)":"repeat(5,1fr)", gap:1, background:"rgba(255,255,255,0.04)" }}>
                {[["Level 1",selectedUser.l1,"rgb(0,228,193)"],["Level 2",selectedUser.l2,"#a78bfa"],["Total",selectedUser.l1+selectedUser.l2,"#ffffff"],["Earned","AED "+selectedUser.earned.toFixed(2),"#059669"],["Pending","AED "+selectedUser.pending.toFixed(2),"#00e4c1"]].map(function(s){return (
                  <div key={s[0]} style={{ background:"#0d0d0d", padding:mob?"10px 8px":"14px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#64748b", marginBottom:4 }}>{s[0]}</div>
                    <div style={{ fontSize:mob?16:20, fontWeight:600, color:s[2] }}>{s[1]}</div>
                  </div>
                )})}
              </div>

              {/* ═══ ADMIN ACTIONS ═══ */}
              <div style={{ padding:mob?"14px":"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#64748b", marginBottom:12 }}>Admin Actions</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: actionPanel ? 16 : 0 }}>
                  {[
                    ["resetPass","lock","Reset Password","#00e4c1"],
                    ["changeEmail","chat","Change Email","#3b82f6"],
                    ["reassignRef","link","Reassign Referrer","#a78bfa"],
                    ["updateIban","bank","Update IBAN","rgb(0,228,193)"],
                    ["toggleActive",selectedUser.status==="active"?"lock":"shield",selectedUser.status==="active"?"Deactivate":"Reactivate",selectedUser.status==="active"?"#ef4444":"#10b981"],
                    ["cancelSub","dollar","Cancel Sub","#ef4444"],
                    ["activateSub","shield","Activate Sub","#10b981"],
                    ["extendSub","chart","Extend Sub","#3b82f6"],
                    ["viewProgress","book","View Progress","#10b981"],
                  ].map(function(a){
                    var isActive = actionPanel === a[0];
                    return (
                      <button key={a[0]} onClick={async function(){
                        if (a[0]==="toggleActive") {
                          setActionLoading(true);
                          var isActive = selectedUser.status==="active";
                          try {
                            if (isActive) { await adminApi.cancelSubscription(selectedUser.id); } else { await adminApi.activateSubscription(selectedUser.id); }
                            var newStatus = isActive ? "inactive" : "active";
                            setAdminUsers(function(p){return p.map(function(u){return u.id===selectedUser.id?Object.assign({},u,{status:newStatus}):u})});
                            setSelectedUser(function(u){return Object.assign({},u,{status:newStatus})});
                            setAdminStats(function(s){ if(!s) return s; return Object.assign({},s,{active_subscribers:(s.active_subscribers||0)+(isActive?-1:1)}); });
                            flash((isActive?"Deactivated ":"Reactivated ")+selectedUser.name);
                          } catch(e){ flash("Error: "+(e.message||"Failed")); }
                          setActionLoading(false); return;
                        }
                        if (a[0]==="cancelSub") {
                          setActionLoading(true);
                          try {
                            await adminApi.cancelSubscription(selectedUser.id);
                            setAdminUsers(function(p){return p.map(function(u){return u.id===selectedUser.id?Object.assign({},u,{status:"inactive"}):u})});
                            setSelectedUser(function(u){return Object.assign({},u,{status:"inactive"})});
                            setAdminStats(function(s){ if(!s) return s; return Object.assign({},s,{active_subscribers:Math.max(0,(s.active_subscribers||0)-1)}); });
                            flash("Subscription cancelled for "+selectedUser.name);
                          } catch(e){ flash("Error: "+(e.message||"Failed")); }
                          setActionLoading(false); return;
                        }
                        if (a[0]==="activateSub") {
                          setActionLoading(true);
                          try {
                            await adminApi.activateSubscription(selectedUser.id);
                            setAdminUsers(function(p){return p.map(function(u){return u.id===selectedUser.id?Object.assign({},u,{status:"active"}):u})});
                            setSelectedUser(function(u){return Object.assign({},u,{status:"active"})});
                            setAdminStats(function(s){ if(!s) return s; return Object.assign({},s,{active_subscribers:(s.active_subscribers||0)+1}); });
                            flash("Subscription activated for "+selectedUser.name);
                          } catch(e){ flash("Error: "+(e.message||"Failed")); }
                          setActionLoading(false); return;
                        }
                        clearActionPanel(); setActionPanel(isActive ? null : a[0]);
                      }} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"1px solid "+(isActive ? a[3]+"40" : "rgba(255,255,255,0.06)"), background:isActive ? a[3]+"15" : "transparent", fontSize:11, fontWeight:600, color:isActive ? a[3] : "#94a3b8", cursor:"pointer", transition:"all 0.2s" }}>
                        <Ico name={a[1]} size={12} color={isActive ? a[3] : "#64748b"} />
                        {a[2]}
                      </button>
                    );
                  })}
                </div>

                {/* Action Result Banner */}
                {actionResult && (
                  <div style={{ padding:"10px 14px", borderRadius:8, background:actionResult.ok?"rgba(16,185,129,0.08)":"rgba(248,113,113,0.08)", border:"1px solid "+(actionResult.ok?"rgba(16,185,129,0.15)":"rgba(248,113,113,0.15)"), marginBottom:12, fontSize:12, fontWeight:600, color:actionResult.ok?"#10b981":"#f87171", display:"flex", alignItems:"center", gap:8 }}>
                    <span>{actionResult.ok ? "\u2713" : "\u2717"}</span>
                    {actionResult.msg}
                  </div>
                )}

                {/* Reset Password Panel */}
                {actionPanel === "resetPass" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:8 }}>Reset Password for {selectedUser.name}</div>
                    <p style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>Generate a temporary password or enter one manually. You will need to communicate this to the user securely (WhatsApp, phone, etc.).</p>
                    <input value={tempPass} onChange={function(e){setTempPass(e.target.value)}} placeholder="Leave blank to auto-generate" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"monospace" }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={function(){ doAction("Reset", function(){ var p = tempPass || "Tut" + Math.random().toString(36).slice(2,6).toUpperCase() + "9A"; setTempPass(p); return "Password reset. Temporary: " + p; }) }} disabled={actionLoading} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#00e4c1", color:"#000000", fontSize:12, fontWeight:700, cursor:"pointer", opacity:actionLoading?0.6:1 }}>{actionLoading ? "Resetting..." : "Reset Password"}</button>
                      <button onClick={clearActionPanel} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                    {actionResult && actionResult.msg && actionResult.msg.includes("Temporary") && (
                      <div style={{ marginTop:12, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:8, padding:"10px 14px" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#00e4c1", marginBottom:4 }}>TEMPORARY PASSWORD</div>
                        <code style={{ fontSize:16, fontWeight:700, color:"#ffffff", letterSpacing:1 }}>{tempPass}</code>
                        <div style={{ fontSize:10, color:"#64748b", marginTop:6 }}>User should change this on first login.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Change Email Panel */}
                {actionPanel === "changeEmail" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:4 }}>Change Email for {selectedUser.name}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>{"Current: "}<strong style={{color:"#94a3b8"}}>{selectedUser.email}</strong></div>
                    <p style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>Use this when a user has lost access to their registration email. They can then use forgot-password with the new email.</p>
                    <input value={newEmail} onChange={function(e){setNewEmail(e.target.value)}} placeholder="New email address" type="email" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={function(){ if(!newEmail.trim()||!newEmail.includes("@")){flash("Enter a valid email");return;} doAction("Change", function(){ return "Email changed to "+newEmail; }) }} disabled={actionLoading} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#3b82f6", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:actionLoading?0.6:1 }}>{actionLoading ? "Updating..." : "Update Email"}</button>
                      <button onClick={clearActionPanel} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Reassign Referrer Panel */}
                {actionPanel === "reassignRef" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:4 }}>Reassign Referrer for {selectedUser.name}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>{"Current referrer: "}<strong style={{color:"#94a3b8"}}>{selectedUser.referrer || "None"}</strong></div>
                    <p style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>Enter the new referrer's code, or leave blank and click "Remove Referrer" to unlink.</p>
                    <input value={newRefCode} onChange={function(e){setNewRefCode(e.target.value.toUpperCase())}} placeholder="Referral code (e.g. ABC12345)" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"monospace", textTransform:"uppercase" }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={function(){ if(!newRefCode.trim()){flash("Enter a referral code");return;} doAction("Reassign", function(){ return "Referrer changed to "+newRefCode; }) }} disabled={actionLoading} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#a78bfa", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:actionLoading?0.6:1 }}>Assign Referrer</button>
                      <button onClick={function(){ doAction("Remove", function(){ return "Referrer removed for "+selectedUser.name; }) }} disabled={actionLoading} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(248,113,113,0.2)", background:"transparent", color:"#f87171", fontSize:12, fontWeight:600, cursor:"pointer" }}>Remove Referrer</button>
                      <button onClick={clearActionPanel} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                    <div style={{ marginTop:10, fontSize:10, color:"#64748b", fontStyle:"italic" }}>Note: Past commissions are not retroactively recalculated.</div>
                  </div>
                )}

                {/* Update IBAN Panel */}
                {actionPanel === "updateIban" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:8 }}>Update Payout Info for {selectedUser.name}</div>
                    <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:10, marginBottom:10 }}>
                      <div>
                        <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#64748b", marginBottom:4 }}>IBAN</label>
                        <input value={newIban} onChange={function(e){setNewIban(e.target.value.toUpperCase().replace(/\s/g,""))}} placeholder="AE070331234567890123456" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"monospace" }} />
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#64748b", marginBottom:4 }}>Account Holder Name</label>
                        <input value={newIbanName} onChange={function(e){setNewIbanName(e.target.value)}} placeholder="Full name on account" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", boxSizing:"border-box" }} />
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={async function(){ if(!newIban.trim()){flash("Enter an IBAN");return;} setActionLoading(true); try { await adminApi.updatePayoutInfo(selectedUser.id, { payout_iban: newIban, payout_name: newIbanName||undefined }); setAdminUsers(function(p){return p.map(function(u){return u.id===selectedUser.id?Object.assign({},u,{iban:newIban,ibanName:newIbanName||u.ibanName}):u})}); flash("IBAN updated for "+selectedUser.name); clearActionPanel(); } catch(err){ flash("Failed: "+(err.message||"Could not update IBAN")); } finally { setActionLoading(false); } }} disabled={actionLoading} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:12, fontWeight:700, cursor:"pointer", opacity:actionLoading?0.6:1 }}>{actionLoading?"Saving...":"Update Payout Info"}</button>
                      <button onClick={clearActionPanel} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Extend Subscription Panel */}
                {actionPanel === "extendSub" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:8 }}>Extend Subscription for {selectedUser.name}</div>
                    <p style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>Add extra days to the current billing period. Use for goodwill, service issues, or compensation.</p>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                      <input type="number" value={extendDays} onChange={function(e){setExtendDays(e.target.value)}} min="1" max="365" style={{ width:80, padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:14, fontWeight:600, outline:"none", textAlign:"center" }} />
                      <span style={{ fontSize:13, color:"#94a3b8" }}>days</span>
                      <div style={{ display:"flex", gap:4, marginLeft:8 }}>
                        {["7","14","30"].map(function(d){return <button key={d} onClick={function(){setExtendDays(d)}} style={{ padding:"6px 10px", borderRadius:6, border:"1px solid "+(extendDays===d?"rgba(59,130,246,0.3)":"rgba(255,255,255,0.06)"), background:extendDays===d?"rgba(59,130,246,0.1)":"transparent", fontSize:11, fontWeight:600, color:extendDays===d?"#3b82f6":"#64748b", cursor:"pointer" }}>{d+"d"}</button>})}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={function(){ var d=parseInt(extendDays); if(!d||d<1||d>365){flash("Enter 1-365 days");return;} doAction("Extend", function(){ return "Subscription extended by "+d+" days for "+selectedUser.name; }) }} disabled={actionLoading} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#3b82f6", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:actionLoading?0.6:1 }}>Extend</button>
                      <button onClick={clearActionPanel} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* View Progress Panel */}
                {actionPanel === "viewProgress" && (
                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>Course Progress for {selectedUser.name}</div>
                        <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Click any lesson to toggle its completion status</div>
                      </div>
                      <button onClick={clearActionPanel} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:11, cursor:"pointer" }}>Close</button>
                    </div>

                    {(function(){
                      var totalL = courses.reduce(function(s,c){return s+c.lessons.length},0);
                      var doneL = courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return l.done}).length},0);
                      var pct = totalL > 0 ? Math.round((doneL/totalL)*100) : 0;

                      return (
                        <div>
                          {/* Progress bar */}
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"12px 14px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ width:"100%", height:6, borderRadius:3, background:"rgba(255,255,255,0.06)" }}>
                                <div style={{ height:6, borderRadius:3, background:"rgb(0,228,193)", width:pct+"%", transition:"width 0.3s" }} />
                              </div>
                            </div>
                            <span style={{ fontSize:13, fontWeight:700, color:"rgb(0,228,193)", minWidth:48, textAlign:"right" }}>{pct+"%"}</span>
                            <span style={{ fontSize:11, color:"#64748b" }}>{doneL+"/"+totalL+" lessons"}</span>
                          </div>

                          {/* Course list */}
                          {courses.map(function(c){
                            var courseDone = c.lessons.filter(function(l){return l.done}).length;
                            var coursePct = c.lessons.length > 0 ? Math.round((courseDone/c.lessons.length)*100) : 0;
                            return (
                              <div key={c.id} style={{ marginBottom:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}>
                                  <Ico name={c.icon} size={16} color="rgb(0,228,193)" />
                                  <span style={{ fontSize:12, fontWeight:600, color:"#ffffff", flex:1 }}>{c.module}</span>
                                  <span style={{ fontSize:10, color:coursePct===100?"#10b981":"#64748b", fontWeight:600 }}>{courseDone+"/"+c.lessons.length}</span>
                                  <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.06)" }}>
                                    <div style={{ height:4, borderRadius:2, background:coursePct===100?"#10b981":"rgb(0,228,193)", width:coursePct+"%", transition:"width 0.3s" }} />
                                  </div>
                                </div>
                                <div style={{ paddingLeft:mob?20:38 }}>
                                  {c.lessons.map(function(l){
                                    return (
                                      <div key={l.id} onClick={function(){
                                        var newDone = !l.done;
                                        setCourses(function(prev){return prev.map(function(cc){return cc.id===c.id?Object.assign({},cc,{lessons:cc.lessons.map(function(ll){return ll.id===l.id?Object.assign({},ll,{done:newDone}):ll})}):cc})});
                                        flash("Lesson '"+ l.title +"' marked " + (newDone ? "complete" : "incomplete"));
                                      }} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.02)" }}>
                                        <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid "+(l.done?"#10b981":"#64748b"), background:l.done?"#10b981":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", flexShrink:0, transition:"all 0.2s", cursor:"pointer" }}>{l.done ? "\u2713" : ""}</div>
                                        <span style={{ fontSize:11, color:l.done?"#94a3b8":"#ffffff", textDecoration:l.done?"line-through":"none", flex:1, transition:"color 0.2s" }}>{l.title}</span>
                                        <span style={{ fontSize:9, color:"#64748b" }}>{l.dur}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Referral Tree */}
              <div style={{ padding:mob?"14px":"20px 24px" }}>
                <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#64748b", marginBottom:16 }}>Referral Tree</div>

                {/* Referrer (who brought this user in) */}
                {selectedUser.referrer ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:"#94a3b8", marginBottom:8 }}>REFERRED BY</div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      <div style={{ width:28, height:28, borderRadius:8, background:"rgba(0,228,193,0.1)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"rgb(0,228,193)" }}>{selectedUser.referrer.split(" ").map(function(n){return n[0]}).join("")}</div>
                      <span style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>{selectedUser.referrer}</span>
                      <span style={{ fontSize:10, color:"#64748b", marginLeft:"auto" }}>Upline</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:"#94a3b8", marginBottom:8 }}>REFERRED BY</div>
                    <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.06)", fontSize:12, color:"#64748b", fontStyle:"italic" }}>Direct signup — no referrer</div>
                  </div>
                )}

                {/* This user (the root node) */}
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:12, background:"linear-gradient(135deg, rgba(0,228,193,0.1), rgba(255,255,255,0.03))", border:"1px solid rgba(0,228,193,0.2)", marginBottom:4 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(0,228,193,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"rgb(0,228,193)" }}>{selectedUser.name.split(" ").map(function(n){return n[0]}).join("")}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#ffffff" }}>{selectedUser.name}</div>
                    <div style={{ fontSize:11, color:"rgb(0,228,193)" }}>{selectedUser.code}</div>
                  </div>
                  <Badge s={selectedUser.status} />
                </div>

                {/* L1 Tree */}
                {selectedUser.l1Names.length > 0 ? (
                  <div style={{ marginLeft:mob?12:24, borderLeft:"2px solid rgba(255,255,255,0.08)", paddingLeft:mob?12:20, paddingTop:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgb(0,228,193)", marginBottom:8, letterSpacing:0.5 }}>{"LEVEL 1 — "+selectedUser.l1Names.length+" DIRECT REFERRALS"}</div>
                    {selectedUser.l1Names.map(function(name){
                      var l2Group = selectedUser.l2Names.find(function(g){return g.ref===name});
                      return (
                        <div key={name} style={{ marginBottom: l2Group ? 12 : 4 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", marginBottom:l2Group?4:0 }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:"rgb(0,228,193)", flexShrink:0 }} />
                            <div style={{ width:24, height:24, borderRadius:6, background:"rgba(0,228,193,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#ffffff", flexShrink:0 }}>{name.split(" ").map(function(n){return n[0]}).join("")}</div>
                            <span style={{ fontSize:12, fontWeight:500, color:"#ffffff", flex:1 }}>{name}</span>
                            {l2Group && <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, background:"rgba(167,139,250,0.1)", color:"#a78bfa", fontWeight:600 }}>{l2Group.subs.length+" L2"}</span>}
                            <span style={{ fontSize:10, color:"#64748b" }}>L1</span>
                          </div>

                          {/* L2 under this L1 */}
                          {l2Group && (
                            <div style={{ marginLeft:mob?16:28, borderLeft:"2px solid rgba(167,139,250,0.12)", paddingLeft:mob?10:16, paddingTop:4 }}>
                              {l2Group.subs.map(function(sub){return (
                                <div key={sub} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", marginBottom:2 }}>
                                  <div style={{ width:4, height:4, borderRadius:"50%", background:"#a78bfa", flexShrink:0 }} />
                                  <span style={{ fontSize:11, color:"#94a3b8" }}>{sub}</span>
                                  <span style={{ fontSize:9, color:"#64748b", marginLeft:"auto" }}>L2</span>
                                </div>
                              )})}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginLeft:mob?12:24, paddingLeft:mob?12:20, paddingTop:12 }}>
                    <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.06)", fontSize:12, color:"#64748b", fontStyle:"italic" }}>No referrals yet</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>}

        {tab === "tickets" && <AdminTicketsTab mob={mob} flash={flash} adminUsers={adminUsers} />}

        {tab === "courses" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:mob?10:0, marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>Course Management</h2>
              <p style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>{courses.length+" modules - "+totalLessons+" total lessons"}</p>
            </div>
            <button onClick={function(){setShowAddModule(true)}} style={{ background:"rgb(0,228,193)", color:"#000000", border:"none", padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Add Module</button>
          </div>

          {showAddModule && (
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.2)", marginBottom:16, boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:"#ffffff", margin:"0 0 16px" }}>New Module</h3>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
                {ICONS.map(function(ic){ return (
                  <button key={ic} onClick={function(){setNewModule(function(p){return {module:p.module,icon:ic}})}} style={{ width:32, height:32, borderRadius:6, border: newModule.icon===ic ? "2px solid rgb(0,228,193)" : "1px solid rgba(255,255,255,0.06)", background: newModule.icon===ic ? "rgba(0,228,193,0.12)" : "#000000", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name={ic} size={14} color={newModule.icon===ic ? "rgb(0,228,193)" : "#64748b"} /></button>
                )})}
              </div>
              <input value={newModule.module} onChange={function(e){setNewModule(function(p){return {module:e.target.value,icon:p.icon}})}} placeholder="Module name" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 }} />
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={function(){setShowAddModule(false)}} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                <button onClick={addModule} style={{ padding:"8px 20px", borderRadius:8, border:"none", background:"rgb(0,228,193)", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Add Module</button>
              </div>
            </div>
          )}

          {courses.map(function(c, ci){ return (
            <div key={c.id} style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:mob?8:12, padding:mob?"12px 10px":"16px 20px", minHeight:mob?44:56, flexWrap:"wrap" }}>
                <span style={{ lineHeight:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40, borderRadius:10, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.1)", flexShrink:0 }} onClick={async function(){
                  var next = expandedModule===c.id ? null : c.id;
                  setExpandedModule(next);
                  if (next && c.lessons.length === 0) {
                    try {
                      var lessons = await adminApi.getLessons(c.id);
                      setCourses(function(p){return p.map(function(x){return x.id===c.id ? Object.assign({},x,{lessons: lessons.map(function(l){return {id:l.id,title:l.title,dur:l.duration_minutes+" min",video_url:l.video_url,done:false}})}) : x})});
                    } catch(e) { /* not subscribed as admin is fine, lessons may still load */ }
                  }
                }}><Ico name={c.icon} size={20} color="rgb(0,228,193)" /></span>
                <div style={{ flex:1, cursor:"pointer" }} onClick={async function(){
                  var next = expandedModule===c.id ? null : c.id;
                  setExpandedModule(next);
                  if (next && c.lessons.length === 0) {
                    try {
                      var lessons = await adminApi.getLessons(c.id);
                      setCourses(function(p){return p.map(function(x){return x.id===c.id ? Object.assign({},x,{lessons: lessons.map(function(l){return {id:l.id,title:l.title,dur:l.duration_minutes+" min",video_url:l.video_url,done:false}})}) : x})});
                    } catch(e) {}
                  }
                }}>
                  {editingModule === c.id ? (
                    <input value={c.module} onChange={function(e){updateModule(c.id,"module",e.target.value)}} onBlur={function(){setEditingModule(null)}} autoFocus style={{ background:"#000000", border:"1px solid rgb(0,228,193)", borderRadius:6, padding:"6px 10px", color:"#fff", fontSize:15, fontWeight:700, outline:"none", width:"100%" }} />
                  ) : (
                    <div style={{ fontSize:15, fontWeight:700, color:"#ffffff" }}>{c.module}</div>
                  )}
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{c.lessons.length+" lessons"}</div>
                </div>
                <div style={{ display:"flex", gap:mob?2:4, flexShrink:0 }}>
                  <button onClick={function(){moveModule(c.id,-1);flash("Moved up")}} disabled={ci===0} title="Move Up" style={{ width:28, height:28, borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:ci===0?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ci===0?"rgba(255,255,255,0.1)":"#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg></button>
                  <button onClick={function(){moveModule(c.id,1);flash("Moved down")}} disabled={ci===courses.length-1} title="Move Down" style={{ width:28, height:28, borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:ci===courses.length-1?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ci===courses.length-1?"rgba(255,255,255,0.1)":"#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
                  <button onClick={function(){setEditingModule(c.id);flash("Editing module name")}} title="Edit Name" style={{ width:28, height:28, borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                  <button onClick={function(){setConfirmDelete({type:"module",cid:c.id,name:c.module})}} title="Delete Module" style={{ width:28, height:28, borderRadius:6, border:"1px solid #7f1d1d", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                </div>
              </div>

              {expandedModule === c.id && (
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                  {c.lessons.map(function(l, li){ return (
                    <div key={l.id}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:mob?"10px 10px 10px 16px":"10px 20px 10px 56px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:"#000000" }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", border:"2px solid "+(l.done?"#059669":"rgba(255,255,255,0.06)"), background:l.done?"#059669":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", flexShrink:0 }}>{l.done ? "\u2713" : ""}</div>
                        {editingLesson === l.id ? (
                          <div style={{ flex:1, display:"flex", gap:8 }}>
                            <input value={l.title} onChange={function(e){updateLesson(c.id,l.id,"title",e.target.value)}} onBlur={function(){setEditingLesson(null)}} autoFocus style={{ flex:1, background:"#0d0d0d", border:"1px solid rgb(0,228,193)", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:13, outline:"none" }} />
                            <input value={l.dur} onChange={function(e){updateLesson(c.id,l.id,"dur",e.target.value)}} style={{ width:80, background:"#0d0d0d", border:"1px solid rgb(0,228,193)", borderRadius:6, padding:"5px 8px", color:"#fff", fontSize:12, outline:"none" }} />
                          </div>
                        ) : (
                          <div style={{ flex:1, cursor:"pointer" }} onClick={function(){setManageMedia(manageMedia && manageMedia.lid===l.id ? null : {cid:c.id,lid:l.id})}}>
                            <div style={{ fontSize:13, fontWeight:500, color:"#ffffff" }}>{l.title}</div>
                            <div style={{ display:"flex", gap:8, marginTop:3 }}>
                              <span style={{ fontSize:10, color:"#94a3b8" }}>{l.dur}</span>
                              {!mob && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background:l.video_url?"rgba(0,228,193,0.12)":"rgba(255,255,255,0.04)", color:l.video_url?"rgb(0,228,193)":"#64748b" }}>{l.video_url ? "PDF ✓" : "No PDF"}</span>}
                            </div>
                          </div>
                        )}
                        <div style={{ display:"flex", gap:mob?2:3, flexShrink:0 }}>
                          <button onClick={function(){setManageMedia(manageMedia && manageMedia.lid===l.id ? null : {cid:c.id,lid:l.id});flash(manageMedia && manageMedia.lid===l.id?"Closed media":"Manage media")}} title="Manage Media" style={{ width:24, height:24, borderRadius:4, border:"1px solid "+(manageMedia && manageMedia.lid===l.id?"rgb(0,228,193)":"rgba(255,255,255,0.06)"), background:manageMedia && manageMedia.lid===l.id?"rgba(0,228,193,0.12)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={manageMedia && manageMedia.lid===l.id?"rgb(0,228,193)":"#6b7280"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></button>
                          <button onClick={function(){moveLesson(c.id,l.id,-1);flash("Lesson moved up")}} disabled={li===0} title="Move Up" style={{ width:24, height:24, borderRadius:4, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:li===0?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={li===0?"rgba(255,255,255,0.1)":"#6b7280"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg></button>
                          <button onClick={function(){moveLesson(c.id,l.id,1);flash("Lesson moved down")}} disabled={li===c.lessons.length-1} title="Move Down" style={{ width:24, height:24, borderRadius:4, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:li===c.lessons.length-1?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={li===c.lessons.length-1?"rgba(255,255,255,0.1)":"#6b7280"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
                          <button onClick={function(){setEditingLesson(l.id);flash("Editing lesson")}} title="Edit Lesson" style={{ width:24, height:24, borderRadius:4, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                          <button onClick={function(){setConfirmDelete({type:"lesson",cid:c.id,lid:l.id,name:l.title})}} title="Delete Lesson" style={{ width:24, height:24, borderRadius:4, border:"1px solid #7f1d1d", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                        </div>
                      </div>

                      {manageMedia && manageMedia.lid === l.id && (
                        <LessonEditPanel key={l.id} lesson={l} cid={c.id} onSave={async function(updates){
                          try {
                            var updated = await adminApi.updateLesson(c.id, l.id, updates);
                            setCourses(function(p){return p.map(function(x){return x.id===c.id ? Object.assign({},x,{lessons:x.lessons.map(function(ls){return ls.id===l.id ? Object.assign({},ls,{title:updated.title,dur:updated.duration_minutes+" min",video_url:updated.video_url}) : ls})}) : x})});
                            setManageMedia(null);
                            flash("Lesson updated!");
                          } catch(e){ flash("Error: "+(e.message||"Failed to save")); }
                        }} onClose={function(){setManageMedia(null)}} />
                      )}
                    </div>
                  )})}

                  {showAddLesson === c.id ? (
                    <div style={{ padding:"16px 20px", background:"#000000", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#ffffff", marginBottom:12 }}>New Lesson</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:8, marginBottom:8 }}>
                        <input value={newLesson.title} onChange={function(e){setNewLesson(function(p){return Object.assign({},p,{title:e.target.value})})}} placeholder="Lesson title" style={{ padding:"8px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"#0d0d0d", color:"#fff", fontSize:13, outline:"none" }} />
                        <input value={newLesson.dur} onChange={function(e){setNewLesson(function(p){return Object.assign({},p,{dur:e.target.value})})}} placeholder="Mins" style={{ padding:"8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"#0d0d0d", color:"#fff", fontSize:12, outline:"none" }} />
                      </div>
                      <input value={newLesson.pdfUrl} onChange={function(e){setNewLesson(function(p){return Object.assign({},p,{pdfUrl:e.target.value})})}} placeholder="PDF URL (e.g. https://drive.google.com/file/d/FILE_ID/preview)" style={{ width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"#0d0d0d", color:"#fff", fontSize:12, outline:"none", boxSizing:"border-box", marginBottom:8 }} />
                      <textarea value={newLesson.notes} onChange={function(e){setNewLesson(function(p){return Object.assign({},p,{notes:e.target.value})})}} placeholder="Lesson notes / description (optional)" rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"#0d0d0d", color:"#fff", fontSize:12, outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit", marginBottom:8 }} />
                      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                        <button onClick={function(){setShowAddLesson(null)}} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Cancel</button>
                        <button onClick={function(){addLessonTo(c.id)}} style={{ padding:"8px 20px", borderRadius:6, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:12, fontWeight:600, cursor:"pointer" }}>Add Lesson</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={function(){setShowAddLesson(c.id)}} style={{ width:"100%", padding:mob?"10px 10px 10px 16px":"10px 20px 10px 56px", background:"#000000", border:"none", borderTop:"1px solid rgba(255,255,255,0.04)", color:"rgb(0,228,193)", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left" }}>+ Add Lesson</button>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>}

        {tab === "payouts" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:mob?10:0, marginBottom:20 }}>
            <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>Payouts</h2>
            <button onClick={function(){setConfirmPayout(true)}} style={{ background:"rgb(0,228,193)", color:"#000000", border:"none", padding:mob?"8px 16px":"10px 22px", borderRadius:10, fontSize:mob?12:13, fontWeight:600, cursor:"pointer" }}>{"Process "+(sel.length>0?"("+sel.length+")":"All Requested")}</button>
          </div>
          <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
            <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:mob?750:"auto" }}>
              <thead><tr>
                <th style={{ padding:"12px", width:40, verticalAlign:"middle", borderBottom:"1px solid rgba(255,255,255,0.06)" }}><input type="checkbox" onChange={function(e){setSel(e.target.checked ? payouts.filter(isProcessablePayout).map(function(p){return p.id}) : [])}} /></th>
                {["User","IBAN","Amount","Status","Date","Actions"].map(function(h){return <th key={h} style={{ padding:"12px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", textAlign:"left", verticalAlign:"middle", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{h}</th>})}
              </tr></thead>
              <tbody>{payouts.map(function(p){ return (
                <tr key={p.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", background:sel.includes(p.id)?"rgba(0,228,193,0.12)":"transparent" }}>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><input type="checkbox" checked={sel.includes(p.id)} disabled={!isProcessablePayout(p)} onChange={function(e){setSel(function(v){return e.target.checked ? v.concat([p.id]) : v.filter(function(x){return x!==p.id})})}} /></td>
                  <td style={{ padding:"12px", fontSize:13, fontWeight:600, color:"#ffffff", verticalAlign:"middle" }}>{p.user}</td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><code style={{ fontSize:11, color:"#64748b" }}>{p.iban}</code></td>
                  <td style={{ padding:"12px", fontSize:14, fontWeight:500, color:"#ffffff", verticalAlign:"middle" }}>{"AED "+payoutAmount(p).toFixed(2)}</td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}><Badge s={p.status}/></td>
                  <td style={{ padding:"12px", fontSize:12, color:"#94a3b8", verticalAlign:"middle" }}>{p.date}</td>
                  <td style={{ padding:"12px", verticalAlign:"middle" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      {isProcessablePayout(p) && <button onClick={function(e){e.stopPropagation();setPayoutProcessError("");setPayoutToProcess(p)}} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid rgba(200,180,140,0.3)", background:"rgba(200,180,140,0.1)", fontSize:10, fontWeight:700, color:"rgb(200,180,140)", cursor:"pointer", whiteSpace:"nowrap" }}>Process</button>}
                      {(p.status === "failed" || (p.status === "completed" && !p.mamopay_transfer_id)) && <button onClick={async function(e){e.stopPropagation(); if (!window.confirm("Reset this payout? Commissions will return to pending so the user can request again.")) return; try { await adminApi.resetPayout(p.id); var updated = await adminApi.payouts(); if (Array.isArray(updated)) setPayouts(updated); flash("Payout reset. Amount returned to user's pending balance."); } catch(err) { flash("Reset failed: "+(err.message||"unknown error")); }}} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.06)", fontSize:10, fontWeight:600, color:"#f87171", cursor:"pointer", whiteSpace:"nowrap" }}>Reset</button>}
                      {p.mamopay_transfer_id && <button onClick={async function(e){e.stopPropagation(); try { var r = await adminApi.verifyPayout(p.id); setVerifyResult(r); if (r && r.local_status) { setPayouts(function(prev){ return prev.map(function(x){ return x.id===p.id ? Object.assign({},x,{status:r.local_status}) : x; }); }); } } catch(err){ flash("Verify failed: "+(err.message||"No MamoPay ID on record")); }}} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid rgba(139,92,246,0.2)", background:"rgba(139,92,246,0.06)", fontSize:10, fontWeight:600, color:"#a78bfa", cursor:"pointer", whiteSpace:"nowrap" }}>Verify</button>}
                      {p.status === "completed" && <span style={{ fontSize:10, color:"#64748b" }}>{"\u2014"}</span>}
                      {p.status === "processing" && <span style={{ fontSize:10, color:"#64748b" }}>Use Verify</span>}
                    </div>
                  </td>
                </tr>
              )})}</tbody>
            </table></div>
          </div>
        </div>}

        {tab === "audit" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:mob?10:0, marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>Audit Log</h2>
              <p style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>All admin actions are recorded here</p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={auditFilter} onChange={function(e){setAuditFilter(e.target.value)}} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#ffffff", fontSize:12, outline:"none", cursor:"pointer" }}>
                <option value="">All actions</option>
                <option value="reset_password">Reset Password</option>
                <option value="change_email">Change Email</option>
                <option value="reassign_referrer">Reassign Referrer</option>
                <option value="activate_user">Activate User</option>
                <option value="deactivate_user">Deactivate User</option>
                <option value="activate_subscription">Activate Subscription</option>
                <option value="cancel_subscription">Cancel Subscription</option>
                <option value="extend_subscription">Extend Subscription</option>
                <option value="retry_payout">Retry Payout</option>
                <option value="manual_payout_complete">Manual Payout</option>
                <option value="update_payout_info">Update IBAN</option>
                <option value="mark_lesson_complete">Mark Lesson</option>
                <option value="trigger_payouts">Trigger Payouts</option>
              </select>
            </div>
          </div>

          <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
            <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:mob?700:"auto" }}>
                <thead><tr>{["Time","Action","Admin","Target","Detail"].map(function(h){return <th key={h} style={{ padding:"12px 14px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#94a3b8", textAlign:"left", verticalAlign:"middle", borderBottom:"1px solid rgba(255,255,255,0.06)", whiteSpace:"nowrap" }}>{h}</th>})}</tr></thead>
                <tbody>
                  {DEMO_AUDIT.filter(function(e){return !auditFilter || e.action === auditFilter}).map(function(entry){
                    var actionColors = {
                      reset_password:"#00e4c1", change_email:"#3b82f6", reassign_referrer:"#a78bfa",
                      deactivate_user:"#ef4444", activate_user:"#10b981", cancel_subscription:"#ef4444",
                      activate_subscription:"#10b981", extend_subscription:"#3b82f6",
                      retry_payout:"rgb(0,228,193)", retry_payout_failed:"#ef4444",
                      manual_payout_complete:"rgb(0,228,193)", update_payout_info:"rgb(0,228,193)",
                      trigger_payouts:"#94a3b8", mark_lesson_complete:"#10b981", mark_lesson_incomplete:"#00e4c1",
                    };
                    var color = actionColors[entry.action] || "#94a3b8";
                    var actionLabel = entry.action.replace(/_/g," ").replace(/\b\w/g, function(c){return c.toUpperCase()});
                    var d = new Date(entry.created_at);
                    var timeStr = d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) + " " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
                    var targetName = "";
                    if(entry.target_user_id){
                      var found = adminUsers.find(function(u){return "u"+adminUsers.indexOf(u) === entry.target_user_id || u.email === (entry.detail||"").match(/for (\S+@\S+)/)?.[1]});
                      targetName = found ? found.name : (entry.detail||"").match(/for (.+?)(?:\.|$)/)?.[1] || entry.target_user_id;
                    }
                    return (
                      <tr key={entry.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#64748b", whiteSpace:"nowrap", verticalAlign:"middle" }}>{timeStr}</td>
                        <td style={{ padding:"10px 14px", verticalAlign:"middle" }}>
                          <span style={{ display:"inline-block", padding:"4px 10px", borderRadius:6, fontSize:10, fontWeight:700, background:color+"15", color:color, letterSpacing:0.3, lineHeight:1.4, textAlign:"center" }}>{actionLabel}</span>
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:12, color:"#ffffff", verticalAlign:"middle", whiteSpace:"nowrap" }}>{entry.admin_email}</td>
                        <td style={{ padding:"10px 14px", fontSize:12, color:"#ffffff", fontWeight:500, verticalAlign:"middle", whiteSpace:"nowrap" }}>{targetName || "\u2014"}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8", verticalAlign:"middle", maxWidth:300 }}>
                          <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.detail}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {DEMO_AUDIT.filter(function(e){return !auditFilter || e.action === auditFilter}).length === 0 && (
              <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:13 }}>No audit entries found for this filter.</div>
            )}
          </div>
          <div style={{ marginTop:12, fontSize:11, color:"#64748b", textAlign:"right" }}>{"Showing "+DEMO_AUDIT.filter(function(e){return !auditFilter || e.action === auditFilter}).length+" of "+DEMO_AUDIT.length+" entries"}</div>
        </div>}

        {tab === "api" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <h2 style={{ fontSize:22, fontWeight:700, margin:"0 0 20px", color:"#ffffff" }}>Admin Management</h2>

          {/* Create Admin */}
          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?16:22, border:"1px solid rgba(255,255,255,0.06)", marginBottom:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 6px", color:"#ffffff" }}>Create New Admin</h3>
            <p style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>The user must already have a registered account. This will promote their role to admin.</p>
            <CreateAdminForm mob={mob} adminApi={adminApi} />
          </div>

          <h2 style={{ fontSize:18, fontWeight:700, margin:"24px 0 16px", color:"#ffffff" }}>MamoPay API Config</h2>
          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?16:22, border:"1px solid rgba(255,255,255,0.06)", marginBottom:20, boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px", color:"#ffffff" }}>Connection</h3>
            <div style={{ display:"grid", gap:16, maxWidth:mob?"100%":480 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>ENVIRONMENT</label>
                <div style={{ display:"flex", gap:8 }}>
                  <div style={{ flex:1, padding:"10px 16px", borderRadius:8, border:"1px solid rgba(0,228,193,0.2)", background:"rgba(0,228,193,0.12)", fontSize:12, fontWeight:600, color:"rgb(0,228,193)", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><Ico name="gear" size={12} color="rgb(0,228,193)" />Sandbox</div>
                  <div style={{ flex:1, padding:"10px 16px", borderRadius:8, border:"2px solid rgba(255,255,255,0.06)", fontSize:12, fontWeight:600, color:"#94a3b8", textAlign:"center", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><Ico name="lock" size={12} color="#94a3b8" />Production</div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:mob?"column":"row", alignItems:mob?"flex-start":"center", gap:mob?4:14 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#94a3b8", minWidth:mob?"auto":90, flexShrink:0 }}>API KEY</label>
                <input type="password" placeholder="sk-xxxxxxxx-xxxx" style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#fff", fontSize:12, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", flexDirection:mob?"column":"row", alignItems:mob?"flex-start":"center", gap:mob?4:14 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#94a3b8", minWidth:mob?"auto":90, flexShrink:0 }}>WEBHOOK URL</label>
                <input placeholder="https://tutorii.com/api/webhooks/mamopay" style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"#000000", color:"#fff", fontSize:12, fontFamily:"monospace", outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
          </div>
          <div style={{ background:"#000000", borderRadius:14, padding:mob?16:22 }}>
            <h3 style={{ fontSize:13, fontWeight:600, color:"rgb(0,228,193)", margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}><Ico name="link" size={14} color="rgb(0,228,193)" />MamoPay Endpoints</h3>
            <div style={{ fontSize:mob?11:12, color:"#94a3b8", lineHeight:2.2, fontFamily:"monospace" }}>
              <div>{"PAY-IN  POST /manage_api/v1/links"}</div>
              <div>{"        POST /manage_api/v1/webhooks"}</div>
              <div>{"        GET  /manage_api/v1/charges/:id"}</div>
              <div style={{ height:8 }} />
              <div>{"PAYOUT  POST /manage_api/v1/disbursements"}</div>
              <div>{"        GET  /manage_api/v1/disbursements/:id"}</div>
            </div>
          </div>
        </div>}

        {payoutToProcess && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.68)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }} onClick={function(){if(!payoutProcessing)setPayoutToProcess(null)}}>
            <div onClick={function(e){e.stopPropagation()}} role="dialog" aria-modal="true" aria-labelledby="process-payout-title" style={{ background:"#131315", borderRadius:16, padding:mob?20:28, maxWidth:460, width:"100%", border:"1px solid rgba(200,180,140,0.2)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:18 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(200,180,140,0.1)", border:"1px solid rgba(200,180,140,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico name="bank" size={17} color="rgb(200,180,140)" /></div>
                <div>
                  <h3 id="process-payout-title" style={{ fontSize:18, fontWeight:700, color:"#d4d4d8", margin:"0 0 4px" }}>Process payout?</h3>
                  <p style={{ fontSize:12, color:"#71717a", lineHeight:1.5, margin:0 }}>This submits a bank transfer through MamoPay for admin settlement.</p>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:14, marginBottom:14, border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:16, paddingBottom:10, marginBottom:10, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:12, color:"#71717a" }}>Recipient</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#d4d4d8", textAlign:"right" }}>{payoutToProcess.user}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", gap:16, paddingBottom:10, marginBottom:10, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:12, color:"#71717a" }}>IBAN</span>
                  <code style={{ fontSize:11, color:"#a1a1aa", textAlign:"right", wordBreak:"break-all" }}>{payoutToProcess.iban || "—"}</code>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:16 }}>
                  <span style={{ fontSize:12, color:"#71717a" }}>Amount</span>
                  <span style={{ fontSize:22, fontWeight:700, color:"rgb(200,180,140)" }}>{"AED "+payoutAmount(payoutToProcess).toFixed(2)}</span>
                </div>
              </div>
              {payoutProcessError && <div style={{ fontSize:12, color:"#f87171", marginBottom:14, padding:"10px 12px", borderRadius:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.16)" }}>{payoutProcessError}</div>}
              <div style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.5, padding:"10px 12px", borderRadius:8, background:"rgba(200,180,140,0.06)", border:"1px solid rgba(200,180,140,0.12)", marginBottom:18 }}>Confirm the recipient and amount carefully. The payout stays <strong style={{ color:"#d4d4d8" }}>Processing</strong> until MamoPay confirms settlement.</div>
              <div style={{ display:"flex", flexDirection:mob?"column-reverse":"row", gap:10 }}>
                <button disabled={payoutProcessing} onClick={function(){setPayoutToProcess(null)}} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#d4d4d8", fontSize:13, fontWeight:600, cursor:payoutProcessing?"not-allowed":"pointer", opacity:payoutProcessing?0.5:1 }}>Cancel</button>
                <button disabled={payoutProcessing} onClick={processSinglePayout} style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:"rgb(200,180,140)", color:"#0a0a0c", fontSize:13, fontWeight:700, cursor:payoutProcessing?"not-allowed":"pointer", opacity:payoutProcessing?0.65:1 }}>{payoutProcessing ? "Submitting…" : "Submit to MamoPay"}</button>
              </div>
            </div>
          </div>
        )}

        {confirmPayout && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={function(){setConfirmPayout(false)}}>
            <div onClick={function(e){e.stopPropagation()}} style={{ background:"#0d0d0d", borderRadius:16, padding:32, maxWidth:440, width:"90%", border:"1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:"#ffffff", margin:"0 0 12px" }}>Confirm Payout Processing</h3>
              <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:16, marginBottom:16, border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:13, color:"#94a3b8" }}>{"Payouts to process"}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>{sel.length > 0 ? sel.length : payouts.filter(isProcessablePayout).length}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:13, color:"#94a3b8" }}>Total amount</div>
                  <div style={{ fontSize:20, fontWeight:500, color:"#ffffff" }}>{"AED "+(sel.length > 0 ? payouts.filter(function(p){return sel.includes(p.id)}).reduce(function(s,p){return s+payoutAmount(p)},0).toFixed(2) : payouts.filter(isProcessablePayout).reduce(function(s,p){return s+payoutAmount(p)},0).toFixed(2))}</div>
                </div>
                <div style={{ fontSize:11, color:"#64748b", padding:"4px 10px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.04)", display:"inline-block" }}>Via MamoPay bank transfer to registered IBANs</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={function(){setConfirmPayout(false)}} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#ffffff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
                <button onClick={function(){setConfirmPayout(false);processPayouts()}} style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:13, fontWeight:600, cursor:"pointer" }}>Confirm & Process</button>
              </div>
            </div>
          </div>
        )}

        {verifyResult && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={function(){setVerifyResult(null)}}>
            <div onClick={function(e){e.stopPropagation()}} style={{ background:"#0d0d0d", borderRadius:16, padding:32, maxWidth:460, width:"90%", border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <h3 style={{ fontSize:17, fontWeight:700, color:"#ffffff", margin:0 }}>Disbursement Verification</h3>
                <button onClick={function(){setVerifyResult(null)}} style={{ background:"transparent", border:"none", color:"#64748b", fontSize:18, cursor:"pointer" }}>✕</button>
              </div>
              {[
                ["MamoPay ID", verifyResult.mamopay_id],
                ["MamoPay Status", verifyResult.mamopay_status],
                ["Amount", verifyResult.amount ? "AED "+verifyResult.amount : "—"],
                ["Recipient IBAN", verifyResult.recipient || "—"],
                ["Method", verifyResult.method || "—"],
                ["Reason", verifyResult.reason || "—"],
                ["Created", verifyResult.created_at || "—"],
                ["Local Status", verifyResult.local_status],
              ].map(function(row){
                var statusText = String(row[1] || "").toLowerCase();
                var statusColor = statusText==="completed"||statusText==="processed"||statusText==="paid" ? "#10b981" : statusText==="processing"||statusText==="pending" ? "#f59e0b" : "#f87171";
                return (
                <div key={row[0]} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                  <span style={{ color:"#71717a" }}>{row[0]}</span>
                  <span style={{ color: row[0]==="MamoPay Status" ? statusColor : "#d4d4d8", fontWeight:500, maxWidth:260, textAlign:"right", wordBreak:"break-all" }}>{row[1]}</span>
                </div>
              )})}
              <button onClick={function(){setVerifyResult(null)}} style={{ marginTop:20, width:"100%", padding:"11px", borderRadius:10, border:"none", background:"rgba(255,255,255,0.06)", color:"#ffffff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Close</button>
            </div>
          </div>
        )}

        {toast && <div style={{ position:"fixed", bottom:mob?72:24, right:mob?16:24, padding:mob?"10px 18px":"12px 24px", borderRadius:10, background:"rgb(0,228,193)", color:"#000000", fontSize:13, fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,0.3)", zIndex:100 }}>{toast}</div>}

        {confirmDelete && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={function(){setConfirmDelete(null)}}>
            <div onClick={function(e){e.stopPropagation()}} style={{ background:"#0d0d0d", borderRadius:16, padding:32, maxWidth:400, width:"90%", border:"1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:"#fff", margin:"0 0 8px" }}>{"Delete "+confirmDelete.type+"?"}</h3>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>{"Are you sure you want to delete \""+confirmDelete.name+"\"? This cannot be undone."}</p>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={function(){setConfirmDelete(null)}} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:13, cursor:"pointer" }}>Cancel</button>
                <button onClick={function(){if(confirmDelete.type==="module") deleteModule(confirmDelete.cid); else deleteLessonFrom(confirmDelete.cid,confirmDelete.lid)}} style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#dc2626", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════
// LEGAL PAGE SHELL
// ═════════════════════════════════════════

export default AdminPanel;
