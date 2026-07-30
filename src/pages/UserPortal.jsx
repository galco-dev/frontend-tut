import { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { users as usersApi, subscriptions as subscriptionsApi, courses as coursesApi, chat as chatApi, payouts as payoutsApi } from "../api";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell, Legend, Pie, PieChart } from "recharts";
import { useIsMobile, Ico, Badge, StatCard, FadeIn, Skeleton, DashSkeleton, ProgressRing, GlowRow, DashboardDesktop, DashboardMobile } from "../components/UI";
import { Btn, Logo } from "../components/Layout";
import { PRICE, L1_RATE, L2_RATE, INIT_COURSES, USER } from "../constants";
import SettingsTab from "../components/SettingsTab";
import { buildUserAnalyticsViewModel, selectLatestEarningsPeriods } from "../analytics/userDashboard";

function subscriptionHasAccess(sub) {
  if (!sub) return false;
  if (sub.has_access === true) return true;
  if (sub.status === "active") {
    return !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
  }
  if (sub.status === "cancelled" && sub.current_period_end) {
    return new Date(sub.current_period_end).getTime() > Date.now();
  }
  return false;
}

function subscriptionIsCancelled(sub) {
  return !!(sub && sub.status === "cancelled");
}

function UserPortal(props) {
  var go = props.go;
  var courses = props.courses;
  var setCourses = props.setCourses;
  var _tab = useState(function(){
    var parts = window.location.pathname.split("/");
    var sub = parts[2];
    var valid = ["overview","referrals","earnings","payouts","courses","settings","support"];
    return (sub && valid.includes(sub)) ? sub : "overview";
  });
  var tab = _tab[0]; var setTab = _tab[1];

  function gotoTab(t) {
    setTab(t);
    window.history.pushState({}, "", "/portal/" + t);
    if (contentRef && contentRef.current) contentRef.current.scrollTop = 0;
  }
  var _oc = useState(null);
  var openCourse = _oc[0]; var setOpenCourse = _oc[1];
  var _al = useState(null);
  var activeLesson = _al[0]; var setActiveLesson = _al[1];
  var _cp = useState(false);
  var copied = _cp[0]; var setCopied = _cp[1];
  var chatOpen = props.chatOpen; var setChatOpen = props.setChatOpen;
  var chatMinimized = props.chatMinimized; var setChatMinimized = props.setChatMinimized;
  var chatMsgs = props.chatMsgs; var setChatMsgs = props.setChatMsgs;
  var chatInput = props.chatInput; var setChatInput = props.setChatInput;
  var chatLoading = props.chatLoading; var setChatLoading = props.setChatLoading;
  var _onboard = useState(0);
  var onboard = _onboard[0]; var setOnboard = _onboard[1];
  var _showOnboard = useState(function(){ return !localStorage.getItem("tutorii_tour_done"); });
  var showOnboard = _showOnboard[0]; var setShowOnboard = _showOnboard[1];
  var _showCancel = useState(false); var showCancel = _showCancel[0]; var setShowCancel = _showCancel[1];
  var _cancelled = useState(false); var cancelled = _cancelled[0]; var setCancelled = _cancelled[1];
  var _cancelling = useState(false); var cancelling = _cancelling[0]; var setCancelling = _cancelling[1];
  var _cancelErr = useState(""); var cancelErr = _cancelErr[0]; var setCancelErr = _cancelErr[1];

  async function doCancel() {
    setCancelling(true); setCancelErr("");
    try {
      var cancelledSub = await subscriptionsApi.cancel();
      setMySub(cancelledSub);
      setCancelled(true); setShowCancel(false);
    } catch(e) {
      setCancelErr(e.message || "Failed to cancel. Please try again.");
      setCancelling(false);
    }
  }
  var _chartRange = useState("all"); var chartRange = _chartRange[0]; var setChartRange = _chartRange[1];
  var _dashLoading = useState(true); var dashLoading = _dashLoading[0]; var setDashLoading = _dashLoading[1];
  var _withdrawOpen = useState(false); var withdrawOpen = _withdrawOpen[0]; var setWithdrawOpen = _withdrawOpen[1];
  var _withdrawLoading = useState(false); var withdrawLoading = _withdrawLoading[0]; var setWithdrawLoading = _withdrawLoading[1];
  var _withdrawError = useState(""); var withdrawError = _withdrawError[0]; var setWithdrawError = _withdrawError[1];
  // Support ticket state
  var _tickets = useState([]);
  var tickets = _tickets[0]; var setTickets = _tickets[1];
  var _viewTicket = useState(null); var viewTicket = _viewTicket[0]; var setViewTicket = _viewTicket[1];
  var _newTicket = useState(false); var newTicket = _newTicket[0]; var setNewTicket = _newTicket[1];
  var _ticketForm = useState({ subject:"", category:"general", message:"" }); var ticketForm = _ticketForm[0]; var setTicketForm = _ticketForm[1];
  var _ticketReply = useState(""); var ticketReply = _ticketReply[0]; var setTicketReply = _ticketReply[1];
  var _ticketMsgs = useState([]);  var ticketMsgs = _ticketMsgs[0]; var setTicketMsgs = _ticketMsgs[1];
  var contentRef = useRef(null);
  var { user: authUser, logout, updateUser } = useAuth();
  var _realUser = useState(null); var realUser = _realUser[0]; var setRealUser = _realUser[1];
  var _referralStats = useState(null); var referralStats = _referralStats[0]; var setReferralStats = _referralStats[1];
  var _referralList = useState(null); var referralList = _referralList[0]; var setReferralList = _referralList[1];
  var _myCommissions = useState([]); var myCommissions = _myCommissions[0]; var setMyCommissions = _myCommissions[1];
  var _myPayouts = useState([]); var myPayouts = _myPayouts[0]; var setMyPayouts = _myPayouts[1];
  var _mySub = useState(null); var mySub = _mySub[0]; var setMySub = _mySub[1];
  var _userAnalytics = useState(null); var userAnalytics = _userAnalytics[0]; var setUserAnalytics = _userAnalytics[1];

  useEffect(function(){
    Promise.allSettled([
      usersApi.me(),
      usersApi.referrals(),
      payoutsApi.commissions(),
      payoutsApi.mine(),
      subscriptionsApi.me(),
      coursesApi.list(),
      usersApi.referralList(),
      usersApi.analytics({ range:"all", timezone:"Asia/Dubai" }),
    ]).then(function(results){
      // If /users/me 403s, session is dead — redirect to login
      if(results[0].status==="rejected" && results[0].reason && results[0].reason.message === "Session expired") {
        go("login"); return;
      }
      if(results[0].status==="fulfilled") { setRealUser(results[0].value); updateUser(results[0].value); }
      if(results[1].status==="fulfilled") setReferralStats(results[1].value);
      if(results[2].status==="fulfilled") setMyCommissions(results[2].value || []);
      if(results[3].status==="fulfilled") setMyPayouts(results[3].value || []);
      if(results[4].status==="fulfilled") setMySub(results[4].value);
      if(results[5].status==="fulfilled" && results[5].value && results[5].value.length > 0) {
        setCourses(results[5].value.map(function(c){ return { id:c.id, module:c.title, icon:c.icon||"book", lessons: (c.lessons||[]).map(function(l){ return { id:l.id, title:l.title, dur:l.duration_minutes?(l.duration_minutes+" min"):"10 min", done:l.completed||false }; }) }; }));
      } else if(results[5].status==="rejected") {
        console.error("Failed to load courses:", results[5].reason && results[5].reason.message ? results[5].reason.message : results[5].reason);
      }
      if(results[6].status==="fulfilled") setReferralList(results[6].value);
      if(results[7].status==="fulfilled") {
        setUserAnalytics(results[7].value);
      }
      // If /users/me failed, user is not logged in — redirect to login
      if(results[0].status==="rejected") {
        go("login");
        return;
      }
      // Check subscription — only redirect if we got a valid response
      var sub = results[4].status==="fulfilled" ? results[4].value : null;
      if (results[4].status==="fulfilled" && !subscriptionHasAccess(sub)) {
        go("subscribe");
        return;
      }
      setDashLoading(false);
    });
  }, []);

  var hasPaidAccess = subscriptionHasAccess(mySub);
  var subscriptionCancelled = cancelled || subscriptionIsCancelled(mySub);

  // Build u object from real data, falling back to USER mock for missing fields
  var u = realUser ? {
    name: realUser.full_name || "User",
    email: realUser.email || "",
    phone: realUser.phone || "",
    code: realUser.referral_code || "",
    avatar: (realUser.full_name||"U").split(" ").map(function(n){return n[0]}).join("").slice(0,2).toUpperCase(),
    status: hasPaidAccess ? "active" : "inactive",
    billingStatus: mySub && mySub.status ? mySub.status : "inactive",
    plan: "Tutorii Monthly",
    paymentMethod: "MamoPay",
    joined: realUser.created_at ? new Date(realUser.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "",
    lastLogin: "Today",
    nextBilling: mySub && mySub.current_period_end ? new Date(mySub.current_period_end).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "N/A",
    billingDateLabel: subscriptionIsCancelled(mySub) ? "Access Until" : "Next Billing Date",
    referredBy: referralStats && referralStats.referred_by ? referralStats.referred_by : "Direct",
    iban: realUser.payout_iban || "",
    ibanName: realUser.payout_name || "",
    billing: [],
    earn: {
      total: parseFloat(myCommissions.reduce(function(s,c){return s+(c.amount_aed||0)},0).toFixed(2)),
      month: parseFloat(myCommissions.filter(function(c){ var d=new Date(c.created_at); var n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).reduce(function(s,c){return s+(c.amount_aed||0)},0).toFixed(2)),
      pending: parseFloat(myCommissions.filter(function(c){return c.status==="pending"}).reduce(function(s,c){return s+(c.amount_aed||0)},0).toFixed(2)),
      paid: parseFloat(myPayouts.filter(function(p){return p.status==="completed"}).reduce(function(s,p){return s+(p.amount_aed||0)},0).toFixed(2)),
    },
    l1: referralList && Array.isArray(referralList.level1) ? referralList.level1.map(function(r){ return { name:r.name||r.email, status:r.subscription_status||"inactive", date: r.joined_at ? new Date(r.joined_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "", joinedAt:r.joined_at||null, earned:r.commission_earned||0 }; }) : [],
    l2: referralList && Array.isArray(referralList.level2) ? referralList.level2.map(function(r){ return { name:r.name||r.email, from:r.referred_by_name||"", date: r.joined_at ? new Date(r.joined_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "", joinedAt:r.joined_at||null, earned:r.commission_earned||0 }; }) : [],
    payouts: myPayouts.map(function(p){ return { date: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "", createdAt:p.created_at||null, paidAt:p.paid_at||null, amount:p.amount_aed||0, status:p.status||"pending", ref:p.id||"" }; }),
  } : {
    name: authUser ? (authUser.full_name || authUser.email) : "Loading...",
    email: authUser ? authUser.email : "",
    phone: "", code: "", avatar: authUser ? (authUser.full_name||"U").split(" ").map(function(n){return n[0]}).join("").slice(0,2).toUpperCase() : "?",
    status: "inactive", billingStatus: "inactive", plan: "Tutorii Monthly", paymentMethod: "MamoPay",
    joined: "", lastLogin: "", nextBilling: "N/A", billingDateLabel: "Next Billing Date", referredBy: "Direct",
    iban: "", ibanName: "", billing: [], earn: { total:0, month:0, pending:0, paid:0 },
    l1: [], l2: [], payouts: [],
  };

  var analyticsView = buildUserAnalyticsViewModel({
    analytics: userAnalytics,
    referralList: referralList,
    payouts: myPayouts,
  });
  var financialSummary = analyticsView.financialSummary;
  var projection = analyticsView.projection;
  var displayedEarnings = userAnalytics ? {
    total: financialSummary.lifetime_commissions_aed,
    month: financialSummary.current_month_commissions_aed,
    pending: financialSummary.available_for_payout_aed,
    paid: financialSummary.completed_payouts_aed,
  } : u.earn;
  var minimumPayoutAed = userAnalytics ? analyticsView.minimumPayoutAed : 0;
  var requestMinimumPayoutAed = minimumPayoutAed || 50;
  var availableForPayoutAed = parseFloat(displayedEarnings.pending || 0);
  var networkActiveL1 = analyticsView.networkBreakdown[0].value;
  var networkCancelledL1 = analyticsView.networkBreakdown[1].value;
  var selectedEarningsSeries = selectLatestEarningsPeriods(analyticsView.earningsSeries, chartRange);

  var mob = useIsMobile();
  function PayoutStatusBadge(props) {
    var s = props.s || "pending";
    var labels = { requested:"Requested", processing:"Processing", completed:"Paid", paid:"Paid", failed:"Failed" };
    var colors = {
      requested:["rgba(59,130,246,0.1)","#60a5fa"],
      processing:["rgba(0,228,193,0.1)","#00e4c1"],
      completed:["rgba(0,228,193,0.1)","rgb(0,228,193)"],
      paid:["rgba(0,228,193,0.1)","rgb(0,228,193)"],
      failed:["rgba(248,113,113,0.1)","#f87171"],
    };
    var v = colors[s] || colors.processing;
    return <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:0.3, textTransform:"uppercase", background:v[0], color:v[1] }}>{labels[s] || s}</span>;
  }

  var totalL = courses.reduce(function(s,c){return s+c.lessons.length},0);
  var doneL = courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return l.done}).length},0);
  var pct = totalL > 0 ? Math.round((doneL/totalL)*100) : 0;
  var activeL1 = (u.l1||[]).filter(function(r){return r.status==="active"}).length;

  // Build system prompt at component level so all chat handlers can access it
  var _l1active = (u.l1||[]).filter(function(r){return r.status==="active"});
  var _l1cancelled = (u.l1||[]).filter(function(r){return r.status==="cancelled"});
  var _monthlyL1 = _l1active.length * PRICE * L1_RATE;
  var _monthlyL2 = (u.l2||[]).length * PRICE * L2_RATE;
  var _completedLessons = courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return l.done}).length},0);
  var _tLessons = courses.reduce(function(s,c){return s+c.lessons.length},0);
  var systemPrompt = "You are the Tutorii AI support assistant. Your job is to eliminate the need for human support by answering every possible question a user could have - about their account, billing, referrals, earnings, payouts, courses, and platform policies. Be friendly, accurate, and thorough. ONLY use the data provided below. Never guess or make up information.\n\n" +

      "=== USER PROFILE ===\n" +
      "Full Name: " + u.name + "\n" +
      "Email: " + u.email + "\n" +
      "Phone: ***" + (u.phone||"").slice(-4) + "\n" +
      "Account Status: " + u.status + "\n" +
      "Member Since: " + u.joined + "\n" +
      "Last Login: " + u.lastLogin + "\n" +
      "Referred By: " + u.referredBy + "\n" +
      "Referral Code: " + u.code + "\n" +
      "Referral Link: tutorii.com/ref/" + u.code + "\n\n" +

      "=== SUBSCRIPTION & BILLING ===\n" +
      "Plan: " + u.plan + "\n" +
      "Billing Status: " + u.billingStatus + "\n" +
      "Payment Method: " + u.paymentMethod + " (via MamoPay)\n" +
      u.billingDateLabel + ": " + u.nextBilling + "\n" +
      "Billing History:\n" +
      (u.billing||[]).map(function(b){return "- " + b.date + ": $" + b.amount.toFixed(2) + " (" + b.status + ") via " + b.method}).join("\n") + "\n" +
      "Total Spent on Subscription: AED " + ((u.billing||[]).length * PRICE).toFixed(2) + " (" + (u.billing||[]).length + " payments)\n\n" +

      "=== EARNINGS SUMMARY ===\n" +
      "Total Earned (all time): AED " + u.earn.total + "\n" +
      "Earned This Month: AED " + u.earn.month + "\n" +
      "Pending Payout: AED " + u.earn.pending + " (will be paid next Tuesday if above AED 50 minimum)\n" +
      "Already Paid Out: AED " + u.earn.paid + "\n" +
      "Monthly L1 Income: AED " + _monthlyL1.toFixed(2) + " (" + _l1active.length + " active L1 referrals x $" + (PRICE*L1_RATE).toFixed(2) + " each)\n" +
      "Monthly L2 Income: AED " + _monthlyL2.toFixed(2) + " (" + (u.l2||[]).length + " L2 referrals x $" + (PRICE*L2_RATE).toFixed(2) + " each)\n" +
      "Total Monthly Gross: $" + (_monthlyL1 + _monthlyL2).toFixed(2) + "\n" +
      "Monthly Subscription Cost: -AED " + PRICE + "\n" +
      "Net Monthly Profit: $" + (_monthlyL1 + _monthlyL2 - PRICE).toFixed(2) + "\n" +
      "ROI: " + (((_monthlyL1 + _monthlyL2 - PRICE) / PRICE) * 100).toFixed(0) + "% return on subscription cost\n" +
      "Break-even: Achieved (need 1 active L1 referral to cover subscription, user has " + _l1active.length + ")\n" +
      "Lifetime Net Profit: $" + (u.earn.total - ((u.billing||[]).length * PRICE)).toFixed(2) + " (total earned minus total subscription payments)\n\n" +

      "=== EARNING PROJECTIONS ===\n" +
      "If user maintains current " + _l1active.length + " active L1 and " + (u.l2||[]).length + " L2 referrals:\n" +
      "- Monthly: $" + (_monthlyL1 + _monthlyL2 - PRICE).toFixed(2) + " net profit\n" +
      "- Quarterly: $" + ((_monthlyL1 + _monthlyL2 - PRICE) * 3).toFixed(2) + " net profit\n" +
      "- Annually: $" + ((_monthlyL1 + _monthlyL2 - PRICE) * 12).toFixed(2) + " net profit\n" +
      "Each new L1 referral adds $" + (PRICE*L1_RATE).toFixed(2) + "/month ($" + (PRICE*L1_RATE*12).toFixed(2) + "/year)\n" +
      "Each new L2 referral adds $" + (PRICE*L2_RATE).toFixed(2) + "/month ($" + (PRICE*L2_RATE*12).toFixed(2) + "/year)\n" +
      "To reach AED 2,400/month net: need ~" + Math.ceil((500 + PRICE - _monthlyL2) / (PRICE*L1_RATE)) + " active L1 referrals (currently has " + _l1active.length + ")\n" +
      "To reach AED 5000/month net: need ~" + Math.ceil((1000 + PRICE - _monthlyL2) / (PRICE*L1_RATE)) + " active L1 referrals\n\n" +

      "=== PAYOUT DETAILS ===\n" +
      "Payout Method: MamoPay bank transfer\n" +
      "IBAN on File: ****" + u.iban.slice(-4) + " (masked for security)" + "\n" +
      "Payout Schedule: Every Tuesday\n" +
      "Minimum Payout: AED 50\n" +
      "Current Pending: $" + u.earn.pending + "\n" +
      "Payout History:\n" +
      (u.payouts||[]).map(function(p){return "- " + p.date + ": $" + p.amount.toFixed(2) + " (" + p.status + ") - " + p.method}).join("\n") + "\n" +
      "Total Payouts Received: " + (u.payouts||[]).length + " payouts totalling $" + (u.payouts||[]).reduce(function(s,p){return s+p.amount},0).toFixed(2) + "\n" +
      "Average Payout: $" + ((u.payouts||[]).length > 0 ? ((u.payouts||[]).reduce(function(s,p){return s+p.amount},0) / (u.payouts||[]).length).toFixed(2) : "0.00") + "\n\n" +

      "=== LEVEL 1 REFERRALS (Direct, 40% = AED " + (PRICE*L1_RATE).toFixed(2) + "/each/month) ===\n" +
      "Total L1: " + (u.l1||[]).length + " (" + _l1active.length + " active, " + _l1cancelled.length + " cancelled)\n" +
      (u.l1||[]).map(function(r,i){return (i+1) + ". " + r.name + " - Joined: " + r.date + " 2026, Status: " + r.status.toUpperCase() + ", Total earned you: AED " + r.earned.toFixed(2) + (r.status==="active" ? ", Currently earning AED "+(PRICE*L1_RATE).toFixed(2)+"/month" : ", No longer earning (cancelled)")}).join("\n") + "\n" +
      "Best performing L1: " + ((u.l1||[]).length > 0 ? (function(){var best=(u.l1||[]).reduce(function(a,b){return a.earned>b.earned?a:b});return best.name+" ($"+best.earned.toFixed(2)+" earned)"})() : "None") + "\n" +
      "Most recent L1: " + ((u.l1||[]).length > 0 ? u.l1[u.l1.length-1].name + " (joined " + u.l1[u.l1.length-1].date + ")" : "None") + "\n" +
      "L1 retention rate: " + ((u.l1||[]).length > 0 ? Math.round((_l1active.length/(u.l1||[]).length)*100) : 0) + "% (" + _l1active.length + " of " + (u.l1||[]).length + " still active)\n\n" +

      "=== LEVEL 2 REFERRALS (Indirect, 5% = AED " + (PRICE*L2_RATE).toFixed(2) + "/each/month) ===\n" +
      "Total L2: " + (u.l2||[]).length + "\n" +
      (u.l2||[]).map(function(r,i){return (i+1) + ". " + r.name + " - Referred by: " + r.from + ", Joined: " + r.date + " 2026, Earned you: $" + r.earned.toFixed(2)}).join("\n") + "\n" +
      "L2 breakdown by L1 referrer:\n" +
      (function(){var map={};(u.l2||[]).forEach(function(r){if(!map[r.from])map[r.from]=0;map[r.from]++});var keys=Object.keys(map);return keys.length>0?keys.map(function(k){return "- "+k+": "+map[k]+" L2 referral"+(map[k]>1?"s":"")}).join("\n"):"None"})() + "\n" +
      "Best L1 recruiter (most L2s): " + (function(){var map={};(u.l2||[]).forEach(function(r){if(!map[r.from])map[r.from]=0;map[r.from]++});var best="";var max=0;Object.keys(map).forEach(function(k){if(map[k]>max){max=map[k];best=k}});return best?best+" ("+max+" L2 referrals)":"None"})() + "\n\n" +

      "=== NETWORK SUMMARY ===\n" +
      "Total Network Size: " + ((u.l1||[]).length + (u.l2||[]).length) + " people (" + (u.l1||[]).length + " L1 + " + (u.l2||[]).length + " L2)\n" +
      "Active Network: " + (_l1active.length + (u.l2||[]).length) + " people generating income\n" +
      "Total Earned from L1: $" + (u.l1||[]).reduce(function(s,r){return s+r.earned},0).toFixed(2) + "\n" +
      "Total Earned from L2: $" + (u.l2||[]).reduce(function(s,r){return s+r.earned},0).toFixed(2) + "\n" +
      "Average L1 has earned user: $" + ((u.l1||[]).length > 0 ? ((u.l1||[]).reduce(function(s,r){return s+r.earned},0)/(u.l1||[]).length).toFixed(2) : "0.00") + "\n" +
      "Average L2 has earned user: $" + ((u.l2||[]).length > 0 ? ((u.l2||[]).reduce(function(s,r){return s+r.earned},0)/(u.l2||[]).length).toFixed(2) : "0.00") + "\n\n" +

      "=== COURSE PROGRESS (DETAILED) ===\n" +
      "Overall: " + _completedLessons + "/" + _tLessons + " lessons completed (" + (_tLessons>0?Math.round(_completedLessons/_tLessons*100):0) + "%)\n" +
      "Modules Available: " + courses.length + "\n\n" +
      courses.map(function(c){
        var doneCnt = c.lessons.filter(function(l){return l.done}).length;
        var modPct = c.lessons.length > 0 ? Math.round((doneCnt/c.lessons.length)*100) : 0;
        return c.icon + " " + c.module + " - " + doneCnt + "/" + c.lessons.length + " completed (" + modPct + "%)\n" +
          c.lessons.map(function(l){
            return "  " + (l.done ? "[DONE]" : "[NOT DONE]") + " " + l.title + " (" + l.dur + ")" +
              (l.video ? " | Video: " + l.video.name + " (" + l.video.size + ")" : " | Video: not uploaded") +
              (l.pdf ? " | PDF: " + l.pdf.name + " (" + l.pdf.size + ")" : " | PDF: not available");
          }).join("\n");
      }).join("\n\n") + "\n\n" +

      "Next uncompleted lessons:\n" +
      courses.reduce(function(arr,c){
        c.lessons.forEach(function(l){if(!l.done) arr.push({module:c.module,title:l.title,dur:l.dur,hasVideo:!!l.video,hasPdf:!!l.pdf})});
        return arr;
      },[]).slice(0,5).map(function(l,i){return (i+1)+". "+l.title+" ("+l.module+", "+l.dur+")"+(l.hasVideo?" - has video":"")+(l.hasPdf?" - has PDF":"")}).join("\n") + "\n\n" +

      "Lessons with video available: " + courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return l.video}).length},0) + "/" + _tLessons + "\n" +
      "Lessons with PDF available: " + courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return l.pdf}).length},0) + "/" + _tLessons + "\n" +
      "Lessons with no content yet: " + courses.reduce(function(s,c){return s+c.lessons.filter(function(l){return !l.video&&!l.pdf}).length},0) + "/" + _tLessons + "\n\n" +

      "=== PLATFORM INFO ===\n" +
      "Subscription: $" + PRICE + "/month, cancel anytime, ALL SALES FINAL (no refunds)\n" +
      "L1 Commission: 40% ($" + (PRICE*L1_RATE).toFixed(2) + ") on direct referrals\n" +
      "L2 Commission: 5% ($" + (PRICE*L2_RATE).toFixed(2) + ") on referrals of your referrals\n" +
      "Payment Processing: All payments exclusively through MamoPay (Visa, Mastercard, Apple Pay, Google Pay)\n" +
      "Payouts: Weekly Tuesdays via MamoPay bank transfer, AED 50 minimum\n" +
      "Courses: " + courses.length + " modules, " + courses.reduce(function(s,c){return s+c.lessons.length},0) + " lessons. Modules: " + courses.map(function(c){return c.module + " (" + c.lessons.length + " lessons)"}).join(", ") + "\n" +
      "Today's Date: " + new Date().toLocaleDateString("en-US", {weekday:"long",year:"numeric",month:"long",day:"numeric"}) + "\n\n" +

      "=== KEY POLICIES (non-negotiable, always apply) ===\n" +
      "No refunds - all sales final. No subscription pause option. One account per person.\n" +
      "Referrer assignment is permanent - set at signup, never changeable, even on re-subscribe.\n" +
      "Commissions stop when a referral cancels; resume if they re-subscribe (same referrer retained).\n" +
      "Pending earnings above AED 50 are still paid if user cancels. Below AED 50 are forfeited.\n" +
      "Payouts: Tuesdays, AED 50 minimum, MamoPay bank transfer only, 1-3 business days to arrive.\n" +
      "Failed payout = wrong IBAN. User must fix in Settings; retried next Tuesday automatically.\n" +
      "Fraud/fake referrals = immediate account termination + forfeiture of all earnings.\n" +
      "Taxes are the user's responsibility. Tutorii does not withhold taxes or give tax advice.\n" +
      "Course progress is never lost, even if subscription lapses.\n\n" +

      "=== CONTACT ===\n" +
      "Support: support@tutorii.com (Sun-Thu, 9am-6pm GST)\n" +
      "Complaints: complaints@tutorii.com | Compliance/suspension appeals: compliance@tutorii.com\n" +
      "Partnerships: partnerships@tutorii.com | Content suggestions: content@tutorii.com\n\n" +

      "Be concise and friendly. Use the user's real account data for personal questions. If something is outside what's documented here, say so and direct them to support@tutorii.com.";

  function sendChat() {
    if (!chatInput.trim()) return;
    var userMsg = chatInput.trim();
    setChatInput("");
    var newMsgs = chatMsgs.concat([{role:"user", content:userMsg}]);
    setChatMsgs(newMsgs);
    setChatLoading(true);

    var apiMsgs = newMsgs.map(function(m){return {role:m.role,content:m.content}});

    chatApi.send(userMsg, null, null, systemPrompt)
    .then(function(data){
      var reply = (data.assistant_message && data.assistant_message.content) || "Sorry, I couldn't process that. Please try again.";
      setChatMsgs(function(prev){return prev.concat([{role:"assistant",content:reply}])});
      setChatLoading(false);
    })
    .catch(function(){
      setChatMsgs(function(prev){return prev.concat([{role:"assistant",content:"I'm having trouble connecting right now. Please try again or email support@tutorii.com."}])});
      setChatLoading(false);
    });










  }

  function copyLink() {
    navigator.clipboard.writeText("tutorii.com/ref/" + u.code);
    setCopied(true);
    setTimeout(function(){ setCopied(false); }, 2000);
  }

  function markDone(course, lessonId) {
    coursesApi.updateProgress(course.id, lessonId, { completed: true });
    setCourses(function(prev){
      return prev.map(function(c){
        if (c.id !== course.id) return c;
        return Object.assign({}, c, { lessons: c.lessons.map(function(l){
          return l.id === lessonId ? Object.assign({}, l, { done: true }) : l;
        })});
      });
    });
  }

  var navItems = [
    { id:"overview", icon:"chart", label:"Overview" },
    { id:"referrals", icon:"users", label:"My Referrals" },
    { id:"earnings", icon:"dollar", label:"Earnings" },
    { id:"payouts", icon:"bank", label:"Payouts" },
    { id:"courses", icon:"book", label:"Courses" },
    { id:"support", icon:"chat", label:"Support" },
    { id:"settings", icon:"gear", label:"Settings" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:mob?"column":"row", minHeight:"100vh", background:"rgba(255,255,255,0.03)" }}>
      {!mob && <div style={{ width:230, background:"#0d0d0d", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}><Logo light /></div>
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {navItems.map(function(n){ return (
            <button key={n.id} onClick={function(){gotoTab(n.id);setActiveLesson(null)}} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", borderRadius:8, border:"none", textAlign:"left",
              background: tab===n.id ? "rgba(255,255,255,0.08)" : "transparent", color: tab===n.id ? "#ffffff" : "#94a3b8",
              fontSize:13, fontWeight: tab===n.id ? 600 : 500, cursor:"pointer", marginBottom:2
            }}><Ico name={n.icon} size={16} color={tab===n.id ? "rgb(0,228,193)" : "#64748b"} />{" "+n.label}</button>
          )})}
        </nav>
        <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"rgb(0,228,193)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#000000" }}>{u.avatar}</div>
            <div><div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{u.name}</div><div style={{ fontSize:10, color:"#64748b" }}>{u.email}</div></div>
          </div>
          <button onClick={function(){ logout(); go("landing"); }} style={{ width:"100%", padding:"8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:12, cursor:"pointer" }}>Log Out</button>
        </div>
      </div>}
      {mob && <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#0d0d0d", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, zIndex:50 }}>
        <Logo light />
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={function(){gotoTab("support")}} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:6, border:"1px solid "+(tab==="support"?"rgba(0,228,193,0.3)":"rgba(255,255,255,0.06)"), background:tab==="support"?"rgba(0,228,193,0.08)":"transparent", cursor:"pointer" }}>
            <Ico name="chat" size={13} color={tab==="support"?"rgb(0,228,193)":"#94a3b8"} />
            <span style={{ fontSize:11, fontWeight:600, color:tab==="support"?"rgb(0,228,193)":"#94a3b8" }}>Support</span>
          </button>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"rgb(0,228,193)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#000000" }}>{u.avatar}</div>
          <button onClick={function(){go("landing")}} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#64748b", fontSize:11, cursor:"pointer" }}>Log Out</button>
        </div>
      </div>}

      <div ref={contentRef} style={{ flex:1, padding:mob?16:28, overflow:"auto", maxHeight:"100vh", paddingBottom:mob?80:28, overflowX:"hidden", boxSizing:"border-box", minWidth:0, width:mob?"100%":"auto" }}>
        {dashLoading ? <DashSkeleton /> : <div>
        <div style={{ background:"linear-gradient(135deg, rgba(0,228,193,0.08), rgba(255,255,255,0.03))", border:"1px solid rgba(0,228,193,0.12)", borderRadius:14, padding:mob?"16px":"18px 24px", marginBottom:mob?16:24 }}>
          <div style={{ marginBottom:mob?8:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"rgb(0,228,193)", marginBottom:3 }}>YOUR REFERRAL LINK</div>
            <div style={{ fontSize:mob?12:14, fontWeight:600, color:"#ffffff", fontFamily:"monospace", wordBreak:"break-all" }}>{"tutorii.com/ref/"+u.code}</div>
          </div>
          <button onClick={copyLink} style={{ background:"#0d0d0d", color:"#ffffff", border:"1px solid rgba(0,228,193,0.2)", padding:mob?"9px 0":"9px 18px", borderRadius:mob?20:8, fontSize:12, fontWeight:600, cursor:"pointer", width:mob?"100%":"auto", marginBottom:mob?12:12, display:mob?"block":"inline-block" }}>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={function(){window.open("https://wa.me/?text="+encodeURIComponent("Learn practical skills for life in the UAE and earn while you grow! Join Tutorii for just AED 95/month. Use my link: https://tutorii.com/ref/"+u.code),"_blank")}} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 12px", borderRadius:8, border:"none", background:"#25D366", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              <Ico name="phone" size={12} color="#fff" /> WhatsApp
            </button>
            <button onClick={function(){window.open("sms:?body="+encodeURIComponent("Check out Tutorii - courses for expats + earn 40% on referrals! Join: https://tutorii.com/ref/"+u.code))}} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 12px", borderRadius:8, border:"none", background:"#64748b", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              <Ico name="chat" size={12} color="#fff" /> SMS
            </button>
            <button onClick={function(){window.open("mailto:?subject="+encodeURIComponent("Join me on Tutorii!")+"&body="+encodeURIComponent("Hey! Check out Tutorii: https://tutorii.com/ref/"+u.code))}} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 12px", borderRadius:8, border:"none", background:"rgb(0,228,193)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              <Ico name="globe" size={12} color="#fff" /> Email
            </button>
          </div>
          <button onClick={function(){ window.open("/ref/"+u.code, "_blank"); }} style={{ width:"100%", marginTop:8, padding:"8px 12px", borderRadius:8, border:"1px dashed rgba(0,228,193,0.25)", background:"transparent", color:"#94a3b8", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Ico name="link" size={11} color="#94a3b8" /> Preview what your referral sees
          </button>
        </div>

        {tab === "overview" && <div>
          <h2 style={{ fontSize:22, fontWeight:700, margin:"0 0 20px", color:"#ffffff" }}>{"Welcome back, " + (u.name||"there").split(" ")[0]}</h2>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:14, marginBottom:mob?16:24, alignItems:"stretch" }}>
            <StatCard icon="dollar" label="Total Earnings" value={"AED "+displayedEarnings.total} />
            <StatCard icon="chart" label="This Month's Earnings" value={"AED "+displayedEarnings.month} />
            <StatCard icon="users" label="My Referrals" value={(u.l1||[]).length} sub={networkActiveL1+" active"} />
            <StatCard icon="book" label="Course Progress" value={pct+"%"} sub={doneL+"/"+totalL+" lessons"} color="#00e4c1" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14, alignItems:"stretch" }}>
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>Recent Referral Activity</h3>
              {(u.l1||[]).length === 0
                ? <div style={{ textAlign:"center", padding:"24px 0" }}><Ico name="link" size={28} color="#64748b" /><p style={{ fontSize:13, color:"#64748b", marginTop:10 }}>No referrals yet. Share your link to start earning.</p><span onClick={function(){gotoTab("referrals")}} style={{ fontSize:12, color:"rgb(0,228,193)", cursor:"pointer", fontWeight:600 }}>Get your referral link →</span></div>
                : (u.l1||[]).slice(0,4).map(function(r){ return (
                  <div key={r.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <div><div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>{r.name}</div><div style={{ fontSize:11, color:"#64748b" }}>{r.date}</div></div>
                    <div style={{ textAlign:"right" }}><div style={{ fontSize:13, fontWeight:500, color:"#ffffff" }}>{"AED "+(r.earned||0).toFixed(2)}</div><Badge s={r.status} /></div>
                  </div>
                )})
              }
            </div>
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>Continue Where You Left Off</h3>
              {courses.filter(function(c){return c.lessons.some(function(l){return !l.done})}).length === 0
                ? <div style={{ textAlign:"center", padding:"24px 0" }}><Ico name="book" size={28} color="#64748b" /><p style={{ fontSize:13, color:"#64748b", marginTop:10 }}>{courses.length === 0 ? "Courses loading..." : "All lessons complete! Great work."}</p></div>
                : courses.filter(function(c){return c.lessons.some(function(l){return !l.done})}).slice(0,3).map(function(c){
                  var next = c.lessons.find(function(l){return !l.done});
                  return (
                    <div key={c.id} onClick={function(){gotoTab("courses");setOpenCourse(c.id);setActiveLesson(next)}} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer" }}>
                      <span style={{ lineHeight:0 }}><Ico name={c.icon} size={20} color="rgb(0,228,193)" /></span>
                      <div><div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>{next ? next.title : ""}</div><div style={{ fontSize:11, color:"#64748b" }}>{c.module}</div></div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* ═══ PERFORMANCE VISUALISATIONS ═══ */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:14, marginTop:14, alignItems:"stretch" }}>

            {/* Payout Countdown */}
            {(function(){
              var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
              var today = new Date().getDay();
              var daysUntil = today <= 2 ? (2 - today) : (9 - today);
              if (daysUntil === 0) daysUntil = 7;
              var pctDone = Math.round(((7 - daysUntil) / 7) * 100);
              return (
                <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, margin:0, color:"#ffffff" }}>Next Payout Date</h3>
                    <div style={{ width:28, height:28, borderRadius:7, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.12)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="bank" size={13} color="rgb(0,228,193)" /></div>
                  </div>
                  <div style={{ fontSize:28, fontWeight:500, color:"#ffffff", marginBottom:2 }}>{daysUntil === 1 ? "Tomorrow" : daysUntil + " days"}</div>
                  <div style={{ display:"inline-block", fontSize:10, color:"#64748b", marginBottom:14, padding:"3px 10px", borderRadius:6, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", letterSpacing:0.3 }}>Tuesday via MamoPay</div>
                  <div style={{ width:"100%", height:6, borderRadius:3, background:"rgba(255,255,255,0.06)", marginBottom:10 }}>
                    <div style={{ height:6, borderRadius:3, background:"linear-gradient(90deg, rgba(0,228,193,0.6), rgb(0,228,193))", width:pctDone+"%", boxShadow:"0 0 8px rgba(0,228,193,0.3)", transition:"width 0.5s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#64748b" }}>
                    <span style={{ padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>Pending Balance</span>
                    <span style={{ padding:"2px 8px", borderRadius:5, background:availableForPayoutAed >= requestMinimumPayoutAed ? "rgba(0,228,193,0.08)" : "rgba(248,113,113,0.08)", border:"1px solid "+(availableForPayoutAed >= requestMinimumPayoutAed ? "rgba(0,228,193,0.12)" : "rgba(248,113,113,0.12)"), color:availableForPayoutAed >= requestMinimumPayoutAed ? "rgb(0,228,193)" : "#f87171", fontWeight:600 }}>{"AED "+availableForPayoutAed.toFixed(2)+(availableForPayoutAed >= requestMinimumPayoutAed ? " ✓" : " (min AED "+requestMinimumPayoutAed.toFixed(0)+")")}</span>
                  </div>
                </div>
              );
            })()}

            {/* Income vs Subscription Donut */}
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:0, color:"#ffffff" }}>Monthly Profit</h3>
                <div style={{ width:28, height:28, borderRadius:7, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.12)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="target" size={13} color="rgb(0,228,193)" /></div>
              </div>
              {(function(){
                var monthlyGross = projection.projected_monthly_commissions_aed;
                var monthlyNet = projection.projected_monthly_after_subscription_aed;
                var r = 44; var circ = 2 * Math.PI * r;
                var earnPct = monthlyGross > 0 ? Math.min((monthlyGross / (monthlyGross + projection.subscription_price_aed)) * 100, 100) : 0;
                var offset = circ - (earnPct / 100) * circ;
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <svg width="96" height="96" viewBox="0 0 96 96" style={{ flexShrink:0 }}><defs><filter id="glowRing" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                      <circle cx="48" cy="48" r={r} stroke="rgba(248,113,113,0.15)" strokeWidth="7" fill="none" />
                      <circle cx="48" cy="48" r={r} stroke="rgb(0,228,193)" strokeWidth="7" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 48 48)" filter="url(#glowRing)" style={{ transition:"stroke-dashoffset 1s ease-out" }} />
                      <text x="48" y="44" textAnchor="middle" fill="#ffffff" fontSize="16" fontFamily="sans-serif" fontWeight="500">{"AED "+monthlyNet.toFixed(0)}</text>
                      <text x="48" y="58" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="sans-serif">PROFIT</text>
                    </svg>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:"rgb(0,228,193)" }} />
                        <span style={{ fontSize:10, color:"#94a3b8", padding:"2px 8px", borderRadius:5, background:"rgba(0,228,193,0.06)", border:"1px solid rgba(0,228,193,0.1)" }}>{"Earned AED "+monthlyGross.toFixed(2)}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:"rgba(248,113,113,0.4)" }} />
                        <span style={{ fontSize:10, color:"#94a3b8", padding:"2px 8px", borderRadius:5, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.1)" }}>{"Subscription -AED "+projection.subscription_price_aed.toFixed(2)}</span>
                      </div>
                      <div style={{ display:"inline-block", fontSize:13, fontWeight:600, color:monthlyNet>=0?"rgb(0,228,193)":"#f87171", padding:"4px 12px", borderRadius:8, background:monthlyNet>=0?"rgba(0,228,193,0.08)":"rgba(248,113,113,0.08)", border:"1px solid "+(monthlyNet>=0?"rgba(255,255,255,0.08)":"rgba(248,113,113,0.15)"), marginTop:4 }}>{"Net Profit AED "+monthlyNet.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Network Health */}
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:0, color:"#ffffff" }}>Referral Network Health</h3>
                <div style={{ width:28, height:28, borderRadius:7, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.12)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="users" size={13} color="rgb(0,228,193)" /></div>
              </div>
              {(function(){
                var retPct = (u.l1||[]).length > 0 ? Math.round((networkActiveL1 / (u.l1||[]).length) * 100) : 0;
                return (
                  <div>
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748b", marginBottom:4 }}>
                        <span>Level 1 Retention</span>
                        <span style={{ color:retPct>=70?"rgb(0,228,193)":"#00e4c1", fontWeight:600, fontSize:10, padding:"2px 8px", borderRadius:5, background:retPct>=70?"rgba(0,228,193,0.08)":"rgba(0,228,193,0.08)", border:"1px solid "+(retPct>=70?"rgba(0,228,193,0.12)":"rgba(0,228,193,0.12)") }}>{retPct+"%"}</span>
                      </div>
                      <div style={{ width:"100%", height:8, borderRadius:4, background:"rgba(255,255,255,0.06)", overflow:"hidden", display:"flex" }}>
                        <div style={{ height:8, background:"linear-gradient(90deg, rgba(0,228,193,0.7), rgb(0,228,193))", width:(networkActiveL1/Math.max((u.l1||[]).length,1)*100)+"%", borderRadius:"4px 0 0 4px", boxShadow:"0 0 6px rgba(0,228,193,0.2)", transition:"width 0.5s" }} />
                        <div style={{ height:8, background:"rgba(248,113,113,0.3)", width:(networkCancelledL1/Math.max((u.l1||[]).length,1)*100)+"%", borderRadius:"0 4px 4px 0" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:6, height:6, borderRadius:1, background:"rgb(0,228,193)" }} /><span style={{ fontSize:9, color:"#64748b", padding:"1px 6px", borderRadius:4, background:"rgba(0,228,193,0.06)", border:"1px solid rgba(0,228,193,0.08)" }}>{networkActiveL1+" active"}</span></div>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:6, height:6, borderRadius:1, background:"rgba(248,113,113,0.4)" }} /><span style={{ fontSize:9, color:"#64748b", padding:"1px 6px", borderRadius:4, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.08)" }}>{networkCancelledL1+" cancelled"}</span></div>
                      </div>
                    </div>
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748b", marginBottom:4 }}>
                        <span>Network</span>
                        <span style={{ fontWeight:600, color:"#94a3b8", fontSize:10, padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>{((u.l1||[]).length + (u.l2||[]).length)+" total"}</span>
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <div style={{ flex:(u.l1||[]).length, height:20, borderRadius:"4px 0 0 4px", background:"rgba(0,228,193,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:600, color:"rgb(0,228,193)", letterSpacing:0.5 }}>{(u.l1||[]).length+" L1"}</div>
                        <div style={{ flex:Math.max((u.l2||[]).length,1), height:20, borderRadius:"0 4px 4px 0", background:"rgba(167,139,250,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:600, color:"#a78bfa", letterSpacing:0.5 }}>{(u.l2||[]).length+" L2"}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>


        </div>}

        {tab === "referrals" && <div>
          <h2 style={{ fontSize:22, fontWeight:700, margin:"0 0 20px", color:"#ffffff" }}>My Referrals</h2>

          {/* Network summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:14, marginBottom:mob?16:20, alignItems:"stretch" }}>
            <StatCard icon="users" label="Level 1 Referrals" value={(u.l1||[]).length} sub={networkActiveL1+" active"} />
            <StatCard icon="link" label="Level 2 Referrals" value={(u.l2||[]).length} sub={"via "+new Set((u.l2||[]).map(function(r){return r.from})).size+" referrers"} />
            <StatCard icon="chart" label="Total Network Size" value={(u.l1||[]).length + (u.l2||[]).length} />
            <StatCard icon="dollar" label="Total Network Revenue" value={"AED "+((u.l1||[]).reduce(function(s,r){return s+r.earned},0)+(u.l2||[]).reduce(function(s,r){return s+r.earned},0)).toFixed(2)} />
          </div>

          {/* Network composition + Referral timeline side by side */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14, marginBottom:16, alignItems:"stretch" }}>
            {/* Pie chart */}
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>Referral Network Breakdown</h3>
              <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={analyticsView.networkBreakdown} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3} dataKey="value">
                      <Cell fill="rgb(0,228,193)" />
                      <Cell fill="rgba(248,113,113,0.35)" />
                      <Cell fill="rgba(167,139,250,0.6)" />
                    </Pie>
                    <Tooltip contentStyle={{background:"rgba(10,10,12,0.95)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,fontSize:11,color:"#ffffff",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",padding:"8px 12px"}} itemStyle={{color:"#ffffff"}} />
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  {analyticsView.networkBreakdown.map(function(d,i){var colors=["rgb(0,228,193)","rgba(248,113,113,0.6)","rgba(167,139,250,0.7)"];return (
                    <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:colors[i], flexShrink:0 }} />
                      <span style={{ fontSize:11, color:"#94a3b8" }}>{d.name}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#ffffff", marginLeft:"auto", padding:"1px 8px", borderRadius:5, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>{d.value}</span>
                    </div>
                  )})}
                </div>
              </div>
            </div>
            {/* Referral join timeline */}
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>Referral Growth Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsView.referralGrowth} margin={{top:5,right:5,left:mob?-25:-10,bottom:5}}>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} vertical={false} />
                  <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{background:"rgba(10,10,12,0.95)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,fontSize:11,color:"#ffffff",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",padding:"8px 12px"}} itemStyle={{color:"#ffffff"}} cursor={{fill:"rgba(255,255,255,0.03)"}} />
                  <Bar dataKey="l1" stackId="a" fill="rgb(0,228,193)" radius={[0,0,0,0]} name="Level 1" />
                  <Bar dataKey="l2" stackId="a" fill="rgba(167,139,250,0.6)" radius={[4,4,0,0]} name="Level 2" />
                  <Legend iconSize={10} wrapperStyle={{fontSize:11,color:"#94a3b8",paddingTop:8}} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", marginBottom:16, boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>{"Level 1 - Direct ("+(projection.l1_commission_rate*100).toFixed(0)+"% = AED "+(projection.subscription_price_aed*projection.l1_commission_rate).toFixed(2)+" each)"}</h3>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Name","Joined","Status","Earned"].map(function(h){return <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#64748b", textAlign:"left", borderBottom:"2px solid rgba(255,255,255,0.08)" }}>{h}</th>})}</tr></thead>
              <tbody>{(u.l1||[]).map(function(r){return <tr key={r.name} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}><td style={{ padding:"10px", fontSize:13, fontWeight:600, color:"#ffffff" }}>{r.name}</td><td style={{ padding:"10px", fontSize:12, color:"#64748b" }}>{r.date}</td><td style={{ padding:"10px" }}><Badge s={r.status}/></td><td style={{ padding:"10px", fontSize:13, fontWeight:500, color:"#ffffff" }}>{"AED "+r.earned.toFixed(2)}</td></tr>})}</tbody>
            </table>
          </div>
          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 14px", color:"#ffffff" }}>{"Level 2 - Indirect ("+(projection.l2_commission_rate*100).toFixed(0)+"% = AED "+(projection.subscription_price_aed*projection.l2_commission_rate).toFixed(2)+" each)"}</h3>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Name","Via","Joined","Earned"].map(function(h){return <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#64748b", textAlign:"left", borderBottom:"2px solid rgba(255,255,255,0.08)" }}>{h}</th>})}</tr></thead>
              <tbody>{(u.l2||[]).map(function(r){return <tr key={r.name} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}><td style={{ padding:"10px", fontSize:13, fontWeight:600, color:"#ffffff" }}>{r.name}</td><td style={{ padding:"10px", fontSize:12, color:"#ffffff" }}>{r.from}</td><td style={{ padding:"10px", fontSize:12, color:"#64748b" }}>{r.date}</td><td style={{ padding:"10px", fontSize:13, fontWeight:500, color:"#a78bfa" }}>{"AED "+r.earned.toFixed(2)}</td></tr>})}</tbody>
            </table>
          </div>
        </div>}

        {tab === "earnings" && <div>
          <h2 style={{ fontSize:22, fontWeight:700, margin:"0 0 20px", color:"#ffffff" }}>Earnings</h2>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:14, marginBottom:mob?16:20, alignItems:"stretch" }}>
            <StatCard icon="dollar" label="Total Earnings" value={"AED "+displayedEarnings.total} />
            <StatCard icon="chart" label="This Month's Earnings" value={"AED "+displayedEarnings.month} />
            <StatCard icon="refresh" label="Pending Payout" value={"AED "+displayedEarnings.pending} color="#00e4c1" />
            <StatCard icon="shield" label="Total Paid Out" value={"AED "+displayedEarnings.paid} />
          </div>
          <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:0, color:"#ffffff" }}>Weekly Earnings Breakdown</h3>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {[["4w",mob?"4W":"Last 4 Weeks"],["3m",mob?"3M":"Last 3 Months"],["all","All"]].map(function(r){ return (
                  <button key={r[0]} onClick={function(){setChartRange(r[0])}} style={{ padding:mob?"4px 8px":"4px 10px", borderRadius:6, border:"1px solid "+(chartRange===r[0]?"rgba(0,228,193,0.3)":"rgba(255,255,255,0.06)"), background:chartRange===r[0]?"rgba(0,228,193,0.1)":"transparent", fontSize:10, fontWeight:600, color:chartRange===r[0]?"rgb(0,228,193)":"#64748b", cursor:"pointer" }}>{r[1]}</button>
                )})}
              </div>
            </div>
            <p style={{ fontSize:11, color:"#64748b", margin:"0 0 16px" }}>Weekly commission breakdown — Level 1 direct, Level 2 indirect, and net profit</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={selectedEarningsSeries} margin={{top:5,right:5,left:mob?-25:-10,bottom:5}}>
                <defs>
                  <linearGradient id="uL1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(0,228,193)" stopOpacity={0.45}/><stop offset="50%" stopColor="rgb(0,228,193)" stopOpacity={0.15}/><stop offset="100%" stopColor="rgb(0,228,193)" stopOpacity={0}/></linearGradient>
                  <linearGradient id="uL2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4}/><stop offset="50%" stopColor="#7c3aed" stopOpacity={0.12}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                <XAxis dataKey="week" tick={{fill:"#64748b",fontSize:10}} />
                <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} />
                <Tooltip contentStyle={{background:"#0d0d0d",border:"1px solid rgba(0,228,193,0.2)",borderRadius:8,fontSize:12,color:"#ffffff"}} labelStyle={{color:"#ffffff",marginBottom:4}} itemStyle={{color:"#ffffff"}} formatter={function(v){return "AED "+v.toFixed(2)}} />
                <Area type="monotone" dataKey="l1" stroke="rgb(0,228,193)" fill="url(#uL1)" strokeWidth={2.5} name="Level 1 Income" />
                <Area type="monotone" dataKey="l2" stroke="#a78bfa" fill="url(#uL2)" strokeWidth={2} name="Level 2 Income" />
                <Line type="monotone" dataKey="net" stroke="rgb(220,200,160)" strokeWidth={2} dot={{fill:"rgb(0,228,193)",r:4,stroke:"rgba(0,228,193,0.3)",strokeWidth:6}} activeDot={{fill:"rgb(0,228,193)",r:6,stroke:"rgba(0,228,193,0.4)",strokeWidth:8}} name="Net Profit" />
                <Legend iconSize={10} wrapperStyle={{fontSize:11,color:"#94a3b8",paddingTop:8}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px", color:"#ffffff" }}>Monthly Earnings Breakdown</h3>
            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:mob?10:14, alignItems:"stretch" }}>
              <div style={{ background:"rgba(0,228,193,0.1)", borderRadius:12, padding:18, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgb(0,228,193)", marginBottom:6, letterSpacing:0.5, textTransform:"uppercase" }}>{"Level 1 ("+(projection.l1_commission_rate*100).toFixed(0)+"%)"}</div>
                <div style={{ fontSize:18, fontWeight:500, color:"rgb(0,228,193)" }}>{"AED "+projection.projected_l1_aed.toFixed(2)}</div>
              </div>
              <div style={{ background:"rgba(167,139,250,0.08)", borderRadius:12, padding:18, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", marginBottom:6, letterSpacing:0.5, textTransform:"uppercase" }}>{"Level 2 ("+(projection.l2_commission_rate*100).toFixed(0)+"%)"}</div>
                <div style={{ fontSize:18, fontWeight:500, color:"#a78bfa" }}>{"AED "+projection.projected_l2_aed.toFixed(2)}</div>
              </div>
              <div style={{ background:"rgba(0,228,193,0.06)", borderRadius:12, padding:18, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgb(0,228,193)", marginBottom:6, letterSpacing:0.5, textTransform:"uppercase" }}>Net Monthly</div>
                <div style={{ fontSize:18, fontWeight:500, color:"rgb(0,228,193)" }}>{"AED "+projection.projected_monthly_after_subscription_aed.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Cumulative earnings + Projected annual */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"2fr 1fr", gap:14, marginTop:16, alignItems:"stretch" }}>
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 4px", color:"#ffffff" }}>Total Earnings Over Time</h3>
              <p style={{ fontSize:11, color:"#64748b", margin:"0 0 16px" }}>Running total of all commissions earned since you joined</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart margin={{top:5,right:5,left:mob?-25:-10,bottom:5}} data={analyticsView.cumulativeEarnings}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(0,228,193)" stopOpacity={0.4}/><stop offset="40%" stopColor="rgb(0,228,193)" stopOpacity={0.15}/><stop offset="100%" stopColor="rgb(0,228,193)" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="week" tick={{fill:"#64748b",fontSize:9}} interval={3} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} />
                  <Tooltip contentStyle={{background:"#0d0d0d",border:"1px solid rgba(0,228,193,0.2)",borderRadius:8,fontSize:12,color:"#ffffff"}} labelStyle={{color:"#ffffff",marginBottom:4}} itemStyle={{color:"#ffffff"}} formatter={function(v){return "AED "+v.toFixed(2)}} />
                  <Area type="monotone" dataKey="total" stroke="rgb(0,228,193)" fill="url(#cumGrad)" strokeWidth={2.5} dot={false} activeDot={{fill:"rgb(0,228,193)",r:5,stroke:"rgba(0,228,193,0.3)",strokeWidth:8}} name="Total Earned" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Projected Annual */}
            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box", display:"flex", flexDirection:"column" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px", color:"#ffffff" }}>Projected Annual Earnings</h3>
              {(function(){
                var annualNet = projection.projected_annual_after_subscription_aed;
                return (
                  <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ display:"inline-block", fontSize:9, fontWeight:700, color:"#64748b", marginBottom:8, padding:"3px 10px", borderRadius:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", letterSpacing:0.8 }}>IF CURRENT RATE HOLDS</div>
                      <div style={{ fontSize:28, fontWeight:500, color:annualNet>=0?"rgb(0,228,193)":"#f87171", marginBottom:4 }}>{"AED "+annualNet.toFixed(2)}</div>
                      <div style={{ display:"inline-block", fontSize:9, color:"#64748b", marginTop:4, padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", letterSpacing:0.3 }}>{"net per year · " + projection.active_l1 + " active L1 · " + projection.active_l2 + " L2"}</div>
                    </div>
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:14, marginTop:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:10, color:"#64748b", padding:"1px 6px", borderRadius:4, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}>Gross annual</span>
                        <span style={{ fontSize:11, fontWeight:600, color:"#ffffff" }}>{"AED "+projection.projected_annual_commissions_aed.toFixed(2)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:10, color:"#64748b", padding:"1px 6px", borderRadius:4, background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.06)" }}>Subscription cost</span>
                        <span style={{ fontSize:11, fontWeight:600, color:"#f87171" }}>{"-AED "+projection.projected_annual_subscription_aed.toFixed(2)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:6, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:10, fontWeight:600, color:"#94a3b8", padding:"1px 6px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>Net annual</span>
                        <span style={{ fontSize:11, fontWeight:700, color:annualNet>=0?"rgb(0,228,193)":"#f87171", padding:"2px 8px", borderRadius:5, background:annualNet>=0?"rgba(0,228,193,0.08)":"rgba(248,113,113,0.08)", border:"1px solid "+(annualNet>=0?"rgba(0,228,193,0.12)":"rgba(248,113,113,0.12)") }}>{"AED "+annualNet.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>}

        {tab === "payouts" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
            <h2 style={{ fontSize:22, fontWeight:700, margin:0, color:"#ffffff" }}>Payouts</h2>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:mob?"flex-start":"flex-end" }}>
              <span style={{ fontSize:12, color:availableForPayoutAed >= requestMinimumPayoutAed ? "#94a3b8" : "#64748b" }}>
                {availableForPayoutAed >= requestMinimumPayoutAed ? "AED "+availableForPayoutAed.toFixed(2)+" available" : "AED "+availableForPayoutAed.toFixed(2)+" available · AED "+Math.max(0, requestMinimumPayoutAed-availableForPayoutAed).toFixed(2)+" more needed"}
              </span>
              <span title={availableForPayoutAed >= requestMinimumPayoutAed ? "Request your full available payout" : "Minimum payout is AED "+requestMinimumPayoutAed.toFixed(2)} style={{ display:"inline-flex" }}>
                <button disabled={availableForPayoutAed < requestMinimumPayoutAed} onClick={function(){ if (availableForPayoutAed < requestMinimumPayoutAed) return; setWithdrawError(""); setWithdrawOpen(true); }} style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:13, fontWeight:700, cursor:availableForPayoutAed >= requestMinimumPayoutAed?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:6, opacity:availableForPayoutAed >= requestMinimumPayoutAed ? 1 : 0.45 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  Request payout
                </button>
              </span>
            </div>
          </div>

          {/* Withdrawal modal */}
          {withdrawOpen && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={function(e){if(e.target===e.currentTarget)setWithdrawOpen(false)}}>
              <div style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:28, width:"100%", maxWidth:400 }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#ffffff", marginBottom:4 }}>Request payout</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginBottom:20 }}>{"AED "+availableForPayoutAed.toFixed(2)+" will be paid to your registered IBAN."}</div>
                <div style={{ marginBottom:16, padding:"14px 16px", borderRadius:10, border:"1px solid rgba(0,228,193,0.16)", background:"rgba(0,228,193,0.07)" }}>
                  <div style={{ fontSize:11, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>Full available payout</div>
                  <div style={{ fontSize:24, color:"#ffffff", fontWeight:700 }}>{"AED "+availableForPayoutAed.toFixed(2)}</div>
                </div>
                {withdrawError && <div style={{ fontSize:12, color:"#f87171", marginBottom:12, padding:"8px 12px", borderRadius:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.15)" }}>{withdrawError}</div>}
                <div style={{ fontSize:11, color:"#64748b", marginBottom:20, padding:"10px 12px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ marginBottom:5 }}>{"Your payout request will be reviewed and processed by the admin team."}</div>
                  {"Payout will be sent to your registered IBAN via MamoPay. Processing takes 1–3 business days."}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={async function(){
                    var amt = availableForPayoutAed;
                    if (amt < requestMinimumPayoutAed) { setWithdrawError("Minimum withdrawal is AED "+requestMinimumPayoutAed.toFixed(2)); return; }
                    if (!u.iban || !u.ibanName) { setWithdrawError("Please add your IBAN and account holder name in Settings before requesting a payout"); return; }
                    setWithdrawLoading(true); setWithdrawError("");
                    try {
                      var payout = await payoutsApi.request();
                      var payoutAmount = payout && payout.amount_aed ? payout.amount_aed : amt;
                      setWithdrawOpen(false);
                      setMyPayouts(function(prev){ return [{ id:payout && payout.id ? payout.id : "", created_at:payout && payout.created_at ? payout.created_at : new Date().toISOString(), paid_at:null, amount_aed:payoutAmount, status:"requested" }].concat(prev); });
                      // Optimistically mark commissions as approved so pending balance updates immediately
                      setMyCommissions(function(prev){
                        var updated = [];
                        for (var i = 0; i < prev.length; i++) {
                          var c = prev[i];
                          if (c.status === "pending") {
                            updated.push(Object.assign({}, c, { status: "approved" }));
                          } else { updated.push(c); }
                        }
                        return updated;
                      });
                      setUserAnalytics(function(prev){
                        if (!prev || !prev.financial_summary) return prev;
                        return Object.assign({}, prev, {
                          financial_summary: Object.assign({}, prev.financial_summary, {
                            available_for_payout_aed: 0,
                            in_requested_payout_aed: (prev.financial_summary.in_requested_payout_aed || 0) + payoutAmount,
                          }),
                        });
                      });
                    } catch(err){ setWithdrawError(err.message || "Request failed — please try again"); }
                    finally { setWithdrawLoading(false); }
                  }} disabled={withdrawLoading} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:14, fontWeight:700, cursor:"pointer", opacity:withdrawLoading?0.6:1 }}>
                    {withdrawLoading ? "Submitting…" : "Confirm request"}
                  </button>
                  <button onClick={function(){ setWithdrawOpen(false); }} style={{ padding:"12px 18px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#94a3b8", fontSize:14, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Payout summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:mob?10:14, marginBottom:mob?16:20, alignItems:"stretch" }}>
            <StatCard icon="bank" label="Total Paid Out" value={"AED "+displayedEarnings.paid} />
            <StatCard icon="refresh" label="Pending Payout" value={"AED "+displayedEarnings.pending} />
            <StatCard icon="check" label="Total Payouts" value={(u.payouts||[]).length} />
            <StatCard icon="dollar" label="Avg Payout" value={(function(){ var done=(u.payouts||[]).filter(function(p){return p.status==="completed"||p.status==="paid"}); return "AED "+(done.length>0?(done.reduce(function(s,p){return s+p.amount},0)/done.length).toFixed(2):"0.00"); })()} />
          </div>

          {/* Payout amounts bar chart + cumulative */}
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14, marginBottom:16, alignItems:"stretch" }}>
            <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 4px", color:"#ffffff" }}>Weekly Payout History</h3>
              <p style={{ fontSize:11, color:"#64748b", margin:"0 0 16px" }}>Requested and completed payout amounts</p>
              {(u.payouts||[]).length === 0 ? (
                <div style={{ height:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#64748b", textAlign:"center" }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:"rgba(0,228,193,0.06)", border:"1px solid rgba(0,228,193,0.1)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}>
                    <Ico name="bank" size={16} color="#64748b" />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:3 }}>No payout history yet</div>
                    <div style={{ fontSize:10 }}>Requested payouts will appear here.</div>
                  </div>
                </div>
              ) : <ResponsiveContainer width="100%" height={220}>
                <BarChart margin={{top:5,right:5,left:mob?-25:-10,bottom:5}} data={(u.payouts||[]).map(function(p){return {date:p.date,amount:p.amount,status:p.status}})}>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} vertical={false} />
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill:"rgba(255,255,255,0.025)"}} contentStyle={{background:"#0d0d0d",border:"1px solid rgba(0,228,193,0.2)",borderRadius:8,fontSize:12,color:"#ffffff"}} labelStyle={{color:"#ffffff",marginBottom:4}} itemStyle={{color:"#ffffff"}} formatter={function(v){return ["AED "+v.toFixed(2),"Amount"]}} />
                  <Bar dataKey="amount" radius={[4,4,0,0]} name="Amount" maxBarSize={56}>
                    {(u.payouts||[]).map(function(p,i){return <Cell key={i} fill={p.status==="completed"?"rgb(0,228,193)":p.status==="processing"?"rgba(0,228,193,0.5)":"rgba(248,113,113,0.4)"} />})}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
            </div>

            <div style={{ background:"linear-gradient(180deg, rgba(19,19,21,1) 0%, rgba(14,14,16,1) 100%)", borderRadius:16, padding:mob?14:24, border:"1px solid rgba(0,228,193,0.06)", boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", boxSizing:"border-box" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 4px", color:"#ffffff" }}>Total Paid Over Time</h3>
              <p style={{ fontSize:11, color:"#64748b", margin:"0 0 16px" }}>Running total of all money transferred to your bank</p>
              {analyticsView.cumulativePayouts.length === 0 ? (
                <div style={{ height:220, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#64748b", textAlign:"center" }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:"rgba(0,228,193,0.06)", border:"1px solid rgba(0,228,193,0.1)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}>
                    <Ico name="chart" size={16} color="#64748b" />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:3 }}>No completed payouts yet</div>
                    <div style={{ fontSize:10 }}>Your paid-out total will appear after the first transfer.</div>
                  </div>
                </div>
              ) : <ResponsiveContainer width="100%" height={220}>
                <AreaChart margin={{top:5,right:5,left:mob?-25:-10,bottom:5}} data={analyticsView.cumulativePayouts}>
                  <defs>
                    <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(0,228,193)" stopOpacity={0.4}/><stop offset="40%" stopColor="rgb(0,228,193)" stopOpacity={0.12}/><stop offset="100%" stopColor="rgb(0,228,193)" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                  <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#64748b",fontSize:10}} tickFormatter={function(v){return "AED "+v}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{stroke:"rgba(255,255,255,0.08)",strokeWidth:1}} contentStyle={{background:"#0d0d0d",border:"1px solid rgba(0,228,193,0.2)",borderRadius:8,fontSize:12,color:"#ffffff"}} labelStyle={{color:"#ffffff",marginBottom:4}} itemStyle={{color:"#ffffff"}} formatter={function(v){return "AED "+v.toFixed(2)}} />
                  <Area type="monotone" dataKey="total" stroke="rgb(0,228,193)" fill="url(#payGrad)" strokeWidth={2} dot={{fill:"rgb(0,228,193)",r:3}} activeDot={{fill:"rgb(0,228,193)",r:5,stroke:"rgba(0,228,193,0.3)",strokeWidth:6}} name="Cumulative" />
                </AreaChart>
              </ResponsiveContainer>}
            </div>
          </div>

          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", marginBottom:16, boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 12px", color:"#ffffff" }}>Payout Method & Settings</h3>
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:14, display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:16, alignItems:"stretch" }}>
              <div><div style={{ display:"inline-block", fontSize:9, fontWeight:700, color:"#64748b", marginBottom:5, padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", letterSpacing:0.8 }}>IBAN</div><div style={{ fontSize:13, fontWeight:600, fontFamily:"monospace", color:"#ffffff" }}>{"****  ****  ****  ****  **** " + u.iban.slice(-3)}</div><div style={{ fontSize:11, fontStyle:"italic", color:"#64748b", marginTop:4 }}>{"You can update your IBAN in "}<span onClick={function(){gotoTab("settings")}} style={{ color:"rgb(0,228,193)", cursor:"pointer" }}>Settings</span></div></div>
              <div><div style={{ display:"inline-block", fontSize:9, fontWeight:700, color:"#64748b", marginBottom:5, padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", letterSpacing:0.8 }}>METHOD</div><div style={{ fontSize:13, fontWeight:600, color:"#ffffff" }}>MamoPay - Bank Transfer (Weekly)</div></div>
            </div>
          </div>
          <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?14:22, border:"1px solid rgba(255,255,255,0.06)", boxSizing:"border-box" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 4px", color:"#ffffff" }}>Payout History</h3>
            <p style={{ fontSize:11, color:"#64748b", margin:"0 0 14px" }}>Requested payouts are reviewed and processed by the admin team.</p>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Date","Amount","Status"].map(function(h){return <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#64748b", textAlign:"left", borderBottom:"2px solid rgba(255,255,255,0.08)" }}>{h}</th>})}</tr></thead>
              <tbody>{(u.payouts||[]).map(function(p){return <tr key={p.date} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}><td style={{ padding:"10px", fontSize:13, color:"#ffffff" }}>{p.date}</td><td style={{ padding:"10px", fontSize:14, fontWeight:500, color:"#ffffff" }}>{"AED "+p.amount.toFixed(2)}</td><td style={{ padding:"10px" }}><PayoutStatusBadge s={p.status}/></td></tr>})}</tbody>
            </table>
          </div>
        </div>}

        {tab === "courses" && <div style={{ maxWidth:"100%", overflow:"hidden" }}>
          {activeLesson ? (
            <div>
              <button onClick={function(){setActiveLesson(null)}} style={{ background:"none", border:"none", fontSize:13, color:"rgb(0,228,193)", cursor:"pointer", fontWeight:600, marginBottom:16, padding:0 }}>← Back to courses</button>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:mob?16:20, fontWeight:700, margin:0, color:"#ffffff" }}>{activeLesson.title}</h2>
                {activeLesson.done
                  ? <Badge s="completed" />
                  : <Btn onClick={function(){markDone(openCourse,activeLesson.id);setActiveLesson(Object.assign({},activeLesson,{done:true}))}} green style={{ fontSize:12 }}>Mark Complete</Btn>
                }
              </div>
              {activeLesson.video_url ? (
                <div style={{ background:"#0d0d0d", borderRadius:16, overflow:"hidden", marginBottom:20, border:"1px solid rgba(255,255,255,0.06)" }}>
                  <iframe
                    src={activeLesson.video_url.includes("drive.google.com") ? activeLesson.video_url.replace("/view","/preview") : activeLesson.video_url}
                    style={{ width:"100%", height:mob?"60vw":"520px", border:"none", display:"block" }}
                    allow="autoplay"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div style={{ background:"#0d0d0d", borderRadius:16, padding:"48px 24px", marginBottom:20, border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                  <div style={{ opacity:0.3, lineHeight:0, marginBottom:12 }}><Ico name="book" size={48} color="#94a3b8" /></div>
                  <div style={{ fontSize:14, color:"#94a3b8" }}>PDF not yet available for this lesson</div>
                </div>
              )}
              {activeLesson.notes && (
                <div style={{ background:"#0d0d0d", borderRadius:12, padding:"16px 20px", border:"1px solid rgba(255,255,255,0.06)", marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#64748b", letterSpacing:0.8, marginBottom:8, textTransform:"uppercase" }}>Lesson Notes</div>
                  <p style={{ fontSize:14, color:"#ffffff", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{activeLesson.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ fontSize:22, fontWeight:700, margin:0, color:"#ffffff" }}>My Courses</h2>
                <div style={{ background:"#0d0d0d", borderRadius:10, padding:"10px 16px", border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:100, height:6, borderRadius:3, background:"rgba(255,255,255,0.06)" }}><div style={{ height:6, borderRadius:3, background:"rgb(0,228,193)", width:pct+"%" }}/></div>
                  <span style={{ fontSize:12, fontWeight:600, color:"rgb(0,228,193)" }}>{pct+"% complete"}</span>
                </div>
              </div>
              {u.status !== "active" ? (
                <div style={{ background:"#0d0d0d", borderRadius:16, padding:"48px 24px", border:"1px solid rgba(255,255,255,0.08)", textAlign:"center", marginTop:8 }}>
                  <div style={{ lineHeight:0, marginBottom:16 }}><Ico name="lock" size={40} color="rgb(0,228,193)" /></div>
                  <h3 style={{ fontSize:18, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Course Access Locked</h3>
                  <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, maxWidth:380, margin:"0 auto 24px" }}>An active subscription is required to access course materials. Subscribe now to unlock all modules and lessons.</p>
                  <Btn onClick={function(){go("subscribe")}} style={{ fontSize:14, padding:"12px 32px" }}>{"Subscribe · AED "+PRICE+"/month"}</Btn>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:12 }}>Already paid? Contact support and we'll activate your account.</div>
                </div>
              ) : courses.map(function(c){
                var done = c.lessons.filter(function(l){return l.done}).length;
                return (
                  <div key={c.id} style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:12 }}>
                    <div onClick={async function(){
                      if (u.status !== "active") {
                        gotoTab("overview");
                        return;
                      }
                      var next = openCourse===c.id ? null : c.id;
                      setOpenCourse(next);
                      if (next && c.lessons.length === 0) {
                        try {
                          var lessons = await coursesApi.lessons(c.id);
                          setCourses(function(p){return p.map(function(x){return x.id===c.id ? Object.assign({},x,{lessons:lessons.map(function(l){return {id:l.id,title:l.title,dur:l.duration_minutes+" min",video_url:l.video_url,notes:l.content_md,done:false}})}) : x})});
                        } catch(e) {}
                      }
                    }} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", cursor:"pointer" }}>
                      <span style={{ lineHeight:0, display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40, borderRadius:10, background:"rgba(0,228,193,0.08)", border:"1px solid rgba(0,228,193,0.1)", flexShrink:0 }}><Ico name={c.icon} size={20} color="rgb(0,228,193)" /></span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:"#ffffff" }}>{c.module}</div>
                        <div style={{ fontSize:12, color:"#64748b" }}>{c.lessons.length > 0 ? done+"/"+c.lessons.length+" completed" : "Click to load lessons"}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round"><path d={openCourse===c.id?"M18 15l-6-6-6 6":"M6 9l6 6 6-6"}/></svg>
                    </div>
                    {openCourse===c.id && (
                      <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                        {c.lessons.length === 0 && (
                          <div style={{ padding:"20px", textAlign:"center", color:"#64748b", fontSize:13 }}>Loading lessons...</div>
                        )}
                        {c.lessons.map(function(l){ return (
                          <div key={l.id} onClick={function(){setActiveLesson(l)}} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px 12px 60px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid "+(l.done?"rgb(0,228,193)":"#64748b"), background:l.done?"rgb(0,228,193)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", flexShrink:0 }}>{l.done ? "✓" : ""}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:l.done?"#94a3b8":"#ffffff" }}>{l.title}</div>
                              <div style={{ display:"flex", gap:6, marginTop:2 }}>
                                <span style={{ fontSize:10, color:"#64748b" }}>{l.dur}</span>
                                {l.video_url ? <span style={{ fontSize:10, color:"rgb(0,228,193)" }}>PDF ✓</span> : <span style={{ fontSize:10, color:"#64748b" }}>Coming soon</span>}
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {tab === "support" && <div>
          {viewTicket ? (
            <div>
              <button onClick={function(){setViewTicket(null);setTicketMsgs([]);setTicketReply("")}} style={{ background:"none", border:"none", fontSize:13, color:"rgb(0,228,193)", cursor:"pointer", fontWeight:600, marginBottom:16, padding:0 }}>{"\u2190 Back to tickets"}</button>

              <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:16 }}>
                <div style={{ padding:mob?"14px":"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:mob?"flex-start":"center", flexDirection:mob?"column":"row", gap:mob?8:0 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <code style={{ fontSize:10, color:"#64748b", background:"#000000", padding:"2px 8px", borderRadius:4 }}>{viewTicket.ref}</code>
                      <Badge s={viewTicket.status} />
                    </div>
                    <h3 style={{ fontSize:mob?16:18, fontWeight:700, color:"#ffffff", margin:0 }}>{viewTicket.subject}</h3>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{"Created "+viewTicket.created+" \u00B7 "+viewTicket.category}</div>
                  </div>
                </div>

                <div style={{ padding:mob?"14px":"20px 24px" }}>
                  {(function(){
                    var msgs = ticketMsgs.length > 0 ? ticketMsgs : [
                      { sender: u.name, role: "user", content: "Hi, I need help with: " + viewTicket.subject, time: viewTicket.created + ", 10:15 AM" },
                      { sender: "Support Team", role: "admin", content: "Hi " + (u.name||"there").split(" ")[0] + ", thanks for reaching out. We're looking into this for you and will update you shortly.", time: viewTicket.created + ", 2:30 PM" },
                      viewTicket.status !== "open" ? { sender: "Support Team", role: "admin", content: "We've investigated this and taken action. Please let us know if there's anything else we can help with.", time: viewTicket.updated + ", 11:00 AM" } : null,
                    ].filter(Boolean);
                    return msgs.map(function(msg, i) {
                      var isUser = msg.role === "user";
                      return (
                        <div key={i} style={{ display:"flex", gap:12, marginBottom:16, flexDirection:isUser?"row-reverse":"row" }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:isUser?"rgb(0,228,193)":"rgba(59,130,246,0.15)", border:"1px solid "+(isUser?"rgba(0,228,193,0.3)":"rgba(59,130,246,0.2)"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:isUser?"#000000":"#3b82f6", flexShrink:0 }}>{isUser ? u.avatar : "S"}</div>
                          <div style={{ maxWidth:"75%" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexDirection:isUser?"row-reverse":"row" }}>
                              <span style={{ fontSize:12, fontWeight:600, color:isUser?"#ffffff":"#3b82f6" }}>{msg.sender}</span>
                              <span style={{ fontSize:10, color:"#64748b" }}>{msg.time}</span>
                            </div>
                            <div style={{ padding:"12px 16px", borderRadius:12, background:isUser?"rgba(0,228,193,0.08)":"rgba(255,255,255,0.03)", border:"1px solid "+(isUser?"rgba(0,228,193,0.12)":"rgba(255,255,255,0.06)"), fontSize:13, color:"#ffffff", lineHeight:1.7, borderBottomRightRadius:isUser?4:12, borderBottomLeftRadius:isUser?12:4 }}>{msg.content}</div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {viewTicket.status !== "closed" && viewTicket.status !== "resolved" && (
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <input value={ticketReply} onChange={function(e){setTicketReply(e.target.value)}} onKeyDown={function(e){if(e.key==="Enter"&&ticketReply.trim()){setTicketMsgs(function(prev){var base=prev.length>0?prev:[{sender:u.name,role:"user",content:"Hi, I need help with: "+viewTicket.subject,time:viewTicket.created+", 10:15 AM"},{sender:"Support Team",role:"admin",content:"Hi "+(u.name||"there").split(" ")[0]+", thanks for reaching out. We're looking into this.",time:viewTicket.created+", 2:30 PM"}];return base.concat([{sender:u.name,role:"user",content:ticketReply,time:"Just now"}])});setTicketReply("")}}} placeholder="Type your reply..." style={{ flex:1, padding:"11px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"#000000", color:"#ffffff", fontSize:13, outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif" }} />
                      <button onClick={function(){if(!ticketReply.trim())return;setTicketMsgs(function(prev){var base=prev.length>0?prev:[{sender:u.name,role:"user",content:"Hi, I need help with: "+viewTicket.subject,time:viewTicket.created+", 10:15 AM"},{sender:"Support Team",role:"admin",content:"Hi "+(u.name||"there").split(" ")[0]+", thanks for reaching out.",time:viewTicket.created+", 2:30 PM"}];return base.concat([{sender:u.name,role:"user",content:ticketReply,time:"Just now"}])});setTicketReply("")}} style={{ padding:"11px 20px", borderRadius:10, border:"none", background:"rgb(0,228,193)", color:"#000000", fontSize:13, fontWeight:600, cursor:"pointer" }}>Send</button>
                    </div>
                  )}
                  {(viewTicket.status === "closed" || viewTicket.status === "resolved") && (
                    <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.12)", fontSize:12, color:"#10b981", textAlign:"center" }}>This ticket has been {viewTicket.status}. Need more help? Open a new ticket.</div>
                  )}
                </div>
              </div>
            </div>
          ) : newTicket ? (
            <div>
              <button onClick={function(){setNewTicket(false)}} style={{ background:"none", border:"none", fontSize:13, color:"rgb(0,228,193)", cursor:"pointer", fontWeight:600, marginBottom:16, padding:0 }}>{"\u2190 Back to tickets"}</button>
              <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:"0 0 20px", color:"#ffffff" }}>Submit a Support Ticket</h2>

              <div style={{ background:"#0d0d0d", borderRadius:14, padding:mob?16:24, border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>Category</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[["general","General"],["billing","Billing & Payment"],["referrals","Referrals & Earnings"],["courses","Courses & Content"],["technical","Technical Issue"],["account","Account"]].map(function(c){ return (
                      <button key={c[0]} onClick={function(){setTicketForm(function(p){return Object.assign({},p,{category:c[0]})})}} style={{ padding:"8px 14px", borderRadius:8, border:"2px solid "+(ticketForm.category===c[0]?"rgb(0,228,193)":"#27272a"), background:ticketForm.category===c[0]?"rgba(0,228,193,0.08)":"transparent", fontSize:12, fontWeight:600, color:ticketForm.category===c[0]?"rgb(0,228,193)":"#94a3b8", cursor:"pointer" }}>{c[1]}</button>
                    )})}
                  </div>
                </div>

                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>Subject</label>
                  <input value={ticketForm.subject} onChange={function(e){setTicketForm(function(p){return Object.assign({},p,{subject:e.target.value})})}} placeholder="Brief description of your issue" style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'Plus Jakarta Sans',sans-serif", background:"#000000", color:"#ffffff" }} />
                </div>

                <div style={{ marginBottom:24 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:6 }}>Message</label>
                  <textarea value={ticketForm.message} onChange={function(e){setTicketForm(function(p){return Object.assign({},p,{message:e.target.value})})}} rows={5} placeholder="Describe your issue in detail..." style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", fontSize:14, outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"'Plus Jakarta Sans',sans-serif", background:"#000000", color:"#ffffff" }} />
                </div>

                <Btn onClick={function(){
                  if(!ticketForm.subject.trim()||!ticketForm.message.trim()) return;
                  var newRef = "TK-" + (8400 + Math.floor(Math.random()*100));
                  var now = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
                  setTickets(function(prev){return [{id:"T"+Date.now(), ref:newRef, subject:ticketForm.subject, category:ticketForm.category, status:"open", created:now, updated:now, messages:1}].concat(prev)});
                  setTicketForm({subject:"",category:"general",message:""});
                  setNewTicket(false);
                }} full style={{ padding:"13px", fontSize:15, borderRadius:12 }}>Submit Ticket</Btn>

                <div style={{ marginTop:16, padding:14, background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid rgba(255,255,255,0.04)" }}>
                  <p style={{ fontSize:12, color:"#64748b", margin:0 }}>You can also email us directly at <strong style={{ color:"rgb(0,228,193)" }}>support@tutorii.com</strong>. Our team responds within 24 hours (Sun-Thu, 9AM-6PM GST).</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", flexDirection:mob?"column":"row", justifyContent:"space-between", alignItems:mob?"flex-start":"center", gap:mob?10:0, marginBottom:20 }}>
                <div>
                  <h2 style={{ fontSize:mob?18:22, fontWeight:700, margin:0, color:"#ffffff" }}>Support</h2>
                  <p style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>View your tickets or get help</p>
                </div>
                <Btn onClick={function(){setNewTicket(true)}} style={{ fontSize:13, padding:"10px 20px" }}>New Ticket</Btn>
              </div>

              {/* Quick actions */}
              <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4, 1fr)", gap:10, marginBottom:20 }}>
                {[
                  ["chat","Talk to AI Assistant",function(){setChatOpen(true);setChatMinimized(false)}],
                  ["link","Copy Referral Link",function(){copyLink()}],
                  ["gear","Account Settings",function(){gotoTab("settings")}],
                  ["globe","Email Support",function(){window.open("mailto:support@tutorii.com?subject=Support Request - "+u.code)}],
                ].map(function(a){return (
                  <div key={a[1]} onClick={a[2]} style={{ background:"#0d0d0d", borderRadius:12, padding:"16px 14px", border:"1px solid rgba(255,255,255,0.06)", cursor:"pointer", textAlign:"center", transition:"border-color 0.2s" }}>
                    <div style={{ marginBottom:8, lineHeight:0, display:"flex", justifyContent:"center" }}><Ico name={a[0]} size={20} color="rgb(0,228,193)" /></div>
                    <div style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>{a[1]}</div>
                  </div>
                )})}
              </div>

              {/* Ticket list */}
              {tickets.length === 0 ? (
                <div style={{ background:"#0d0d0d", borderRadius:14, padding:48, border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                  <div style={{ marginBottom:12, lineHeight:0 }}><Ico name="chat" size={36} color="#27272a" /></div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#64748b", marginBottom:4 }}>No tickets yet</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>When you submit a support request, it will appear here.</div>
                </div>
              ) : (
                <div style={{ background:"#0d0d0d", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  {tickets.map(function(t, ti) {
                    var statusColors = { open:"rgb(0,228,193)", in_progress:"#3b82f6", resolved:"#10b981", closed:"#94a3b8" };
                    return (
                      <div key={t.id} onClick={function(){setViewTicket(t)}} style={{ display:"flex", alignItems:mob?"flex-start":"center", gap:mob?10:16, padding:mob?"14px":"16px 20px", borderBottom:ti<tickets.length-1?"1px solid rgba(255,255,255,0.04)":"none", cursor:"pointer", transition:"background 0.2s" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:statusColors[t.status]||"#64748b", flexShrink:0, marginTop:mob?6:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                            <span style={{ fontSize:14, fontWeight:600, color:"#ffffff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.subject}</span>
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                            <code style={{ fontSize:9, color:"#64748b", background:"#000000", padding:"1px 6px", borderRadius:3 }}>{t.ref}</code>
                            <span style={{ fontSize:11, color:"#64748b" }}>{t.category}</span>
                            <span style={{ fontSize:10, color:"#64748b" }}>{"\u00B7"}</span>
                            <span style={{ fontSize:11, color:"#64748b" }}>{t.created}</span>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                          <Badge s={t.status.replace("_"," ")} />
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <Ico name="chat" size={12} color="#64748b" />
                            <span style={{ fontSize:11, color:"#64748b" }}>{t.messages}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop:16, padding:14, background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#64748b" }}>Our team responds within 24 hours (Sun-Thu, 9AM-6PM GST)</span>
                <span style={{ fontSize:12, color:"rgb(0,228,193)", fontWeight:600 }}>support@tutorii.com</span>
              </div>
            </div>
          )}
        </div>}

        {tab === "settings" && <SettingsTab u={u} mob={mob} setShowCancel={setShowCancel} cancelled={subscriptionCancelled} setRealUser={setRealUser} />}
        </div>}
      </div>
      {/* ═══ CANCEL SUBSCRIPTION MODAL ═══ */}
      {showCancel && !subscriptionCancelled && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={function(){setShowCancel(false)}}>
          <div onClick={function(e){e.stopPropagation()}} style={{ background:"#0d0d0d", borderRadius:16, padding:32, maxWidth:440, width:"90%", border:"1px solid rgba(248,113,113,0.2)" }}>
            <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="shield" size={36} color="#f87171" /></div>
            <h3 style={{ fontSize:18, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Cancel Your Subscription?</h3>
            <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7, marginBottom:8 }}>If you cancel:</p>
            <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.9, marginBottom:20, paddingLeft:16 }}>
              <div>{"• Access continues until "+u.nextBilling}</div>
              <div>{"• Your referral link will stop earning commissions"}</div>
              <div>{"• Pending earnings above AED 50 will still be paid"}</div>
              <div>{"• Pending earnings below AED 50 are forfeited"}</div>
              <div>{"• Course progress is saved — you can re-subscribe anytime"}</div>
            </div>
            {cancelErr && <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", color:"#f87171", fontSize:13, marginBottom:14 }}>{cancelErr}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={function(){setShowCancel(false)}} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#ffffff", fontSize:13, fontWeight:600, cursor:"pointer" }}>Keep Subscription</button>
              <button onClick={doCancel} disabled={cancelling} style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", opacity:cancelling?0.6:1 }}>{cancelling ? "Cancelling..." : "Yes, Cancel"}</button>
            </div>
          </div>
        </div>
      )}
      {/* ═══ ONBOARDING WALKTHROUGH ═══ */}
      {showOnboard && !dashLoading && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#0d0d0d", borderRadius:20, padding:"36px 40px", maxWidth:480, width:"90%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            {onboard === 0 && <div>
              <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="sparkle" size={48} color="rgb(0,228,193)" /></div>
              <h2 style={{ fontSize:20, fontWeight:500, color:"#ffffff", margin:"0 0 8px" }}>{"Welcome to Tutorii, "+(u.name||"there").split(" ")[0]+"!"}</h2>
              <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:24 }}>{"Let's take a quick tour of your dashboard so you can start learning and earning right away."}</p>
            </div>}
            {onboard === 1 && <div>
              <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="link" size={48} color="rgb(0,228,193)" /></div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Your Referral Link</h2>
              <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:14, marginBottom:12, border:"1px solid rgba(255,255,255,0.06)" }}>
                <code style={{ fontSize:14, fontWeight:700, color:"rgb(0,228,193)" }}>{"tutorii.com/ref/"+u.code}</code>
              </div>
              <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:16 }}>{"Share this link with friends and contacts. When they subscribe, you earn 40% (AED "+(PRICE*L1_RATE).toFixed(2)+") every month. Use the WhatsApp, SMS, and Email buttons at the top of your dashboard to share instantly."}</p>
            </div>}
            {onboard === 2 && <div>
              <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="book" size={48} color="rgb(0,228,193)" /></div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Start Learning</h2>
              <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:16 }}>{"You have access to "+courses.length+" modules with "+courses.reduce(function(s,c){return s+c.lessons.length},0)+" lessons. Head to the Courses tab to start watching videos and downloading guides. Mark lessons complete to track your progress."}</p>
            </div>}
            {onboard === 3 && <div>
              <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="dollar" size={48} color="rgb(0,228,193)" /></div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Track Your Earnings</h2>
              <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:16 }}>{"The Earnings and Payouts tabs show your income in real time. Payouts are processed every Tuesday via MamoPay to your bank account. Make sure your IBAN is set up in Settings."}</p>
            </div>}
            {onboard === 4 && <div>
              <div style={{ marginBottom:16, lineHeight:0 }}><Ico name="chat" size={48} color="rgb(0,228,193)" /></div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#ffffff", margin:"0 0 8px" }}>Need Help? Ask the Bot</h2>
              <p style={{ fontSize:14, color:"#94a3b8", lineHeight:1.7, marginBottom:16 }}>{"Click the chat icon in the bottom-right corner anytime. Our AI assistant knows your account details and can answer questions about your earnings, referrals, courses, and more."}</p>
            </div>}
            <div style={{ display:"flex", gap:4, justifyContent:"center", marginBottom:20 }}>
              {[0,1,2,3,4].map(function(i){return <div key={i} style={{ width: i===onboard?20:8, height:8, borderRadius:4, background: i===onboard?"rgb(0,228,193)": i<onboard?"rgb(0,228,193)":"#27272a", transition:"all 0.3s" }} />})}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {onboard > 0 && <button onClick={function(){setOnboard(onboard-1)}} style={{ padding:"11px 24px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"#0d0d0d", fontSize:13, fontWeight:600, color:"#94a3b8", cursor:"pointer" }}>Back</button>}
              {onboard < 4 ? (
                <Btn onClick={function(){setOnboard(onboard+1)}} style={{ padding:"11px 28px", fontSize:13 }}>Next</Btn>
              ) : (
                <Btn onClick={function(){localStorage.setItem("tutorii_tour_done","1");setShowOnboard(false)}} style={{ padding:"11px 28px", fontSize:13, background:"rgb(0,228,193)", color:"#000000" }}>{"Get Started"}</Btn>
              )}
            </div>
            {onboard < 4 && <div style={{ marginTop:12 }}><span onClick={function(){localStorage.setItem("tutorii_tour_done","1");setShowOnboard(false)}} style={{ fontSize:12, color:"#64748b", cursor:"pointer" }}>Skip tour</span></div>}
          </div>
        </div>
      )}

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      {mob && <div style={{ position:"fixed", bottom:0, left:0, right:0, display:"flex", justifyContent:"space-around", alignItems:"center", background:"rgba(17,17,19,0.95)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"6px 0 8px", zIndex:60 }}>
        {[["overview","chart","Overview"],["referrals","users","Referrals"],["earnings","dollar","Earnings"],["payouts","bank","Payouts"],["courses","book","Courses"],["settings","gear","Settings"]].map(function(item){ return (
          <button key={item[0]} onClick={function(){gotoTab(item[0])}} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", padding:"6px 4px", minWidth:48 }}>
            <Ico name={item[1]} size={18} color={tab===item[0]?"rgb(0,228,193)":"#64748b"} />
            <span style={{ fontSize:9, fontWeight:tab===item[0]?700:500, color:tab===item[0]?"rgb(0,228,193)":"#64748b" }}>{item[2]}</span>
          </button>
        )})}
      </div>}

      {/* ═══ SUPPORT CHAT WIDGET ═══ */}
      {(!chatOpen || chatMinimized) && (
        <button onClick={function(){setChatOpen(true);setChatMinimized(false)}} style={{
          position:"fixed", bottom:mob?80:24, right:mob?16:24, borderRadius:chatMinimized?28:"50%",
          background:"linear-gradient(135deg, rgba(0,228,193,0.9), rgba(0,228,193,0.7))", border:"1px solid rgba(0,228,193,0.3)", cursor:"pointer",
          boxShadow:"0 4px 24px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          zIndex:300, transition:"all 0.3s ease",
          width:chatMinimized?"auto":mob?48:56, height:chatMinimized?"auto":mob?48:56,
          padding:chatMinimized?"10px 18px":0
        }}>
          <Ico name="chat" size={chatMinimized?16:22} color="#000000" />
          {chatMinimized && <span style={{ fontSize:12, fontWeight:700, color:"#000000" }}>Support</span>}
        </button>
      )}

      {chatOpen && !chatMinimized && (
        <div style={{
          position:"fixed", bottom:mob?70:24, right:mob?8:24, width:mob?"calc(100% - 16px)":380, height:520,
          background:"#0d0d0d", borderRadius:16, boxShadow:"0 8px 40px rgba(0,0,0,0.2)",
          display:"flex", flexDirection:"column", overflow:"hidden", zIndex:300,
          border:"1px solid rgba(255,255,255,0.08)"
        }}>
          {/* Chat Header */}
          <div style={{ padding:"16px 20px", background:"linear-gradient(135deg, #0d0d0d, #18181b)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(0,228,193,0.2)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:0 }}><Ico name="bot" size={16} color="rgb(0,228,193)" /></div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Tutorii Support</div>
                <div style={{ fontSize:10, color:"rgb(0,228,193)" }}>Online - knows your account</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={function(){setChatMinimized(true)}} title="Minimize" style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.06)", width:28, height:28, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="2" viewBox="0 0 12 2"><rect width="12" height="2" rx="1" fill="#94a3b8"/></svg></button>
              <button onClick={function(){setChatOpen(false);setChatMinimized(false)}} title="Close" style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.06)", width:28, height:28, borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ flex:1, overflow:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
            {chatMsgs.map(function(msg, i) {
              var isUser = msg.role === "user";
              return (
                <div key={i} style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth:"85%", padding:"10px 14px", borderRadius:12,
                    background: isUser ? "rgba(0,228,193,0.12)" : "rgba(255,255,255,0.04)",
                    color: isUser ? "#ffffff" : "#ffffff",
                    fontSize:13, lineHeight:1.6,
                    borderBottomRightRadius: isUser ? 4 : 12,
                    borderBottomLeftRadius: isUser ? 12 : 4,
                    whiteSpace:"pre-wrap"
                  }}>{msg.content}</div>
                </div>
              );
            })}
            {chatLoading && (
              <div style={{ display:"flex", justifyContent:"flex-start" }}>
                <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)", borderBottomLeftRadius:4 }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#64748b", animation:"pulse 1s infinite" }} />
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#64748b", animation:"pulse 1s infinite 0.2s" }} />
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#64748b", animation:"pulse 1s infinite 0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Quick Ask Buttons (shown at start) */}
          {chatMsgs.length <= 1 && (
            <div style={{ padding:"0 16px 8px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:0.5, marginBottom:6, textTransform:"uppercase" }}>Ask me anything</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {["How much have I earned?","Who are my referrals?","My course progress","How do payouts work?"].map(function(q){
                  return (
                    <button key={q} onClick={function(){
                      setChatMsgs(function(prev){return prev.concat([{role:"user",content:q}])});
                      setChatLoading(true);
                      chatApi.send(q, null, null, systemPrompt)
                      .then(function(data){
                        var reply = (data.assistant_message && data.assistant_message.content) || "Sorry, something went wrong.";
                        setChatMsgs(function(p){return p.concat([{role:"assistant",content:reply}])});
                        setChatLoading(false);
                      }).catch(function(){
                        setChatMsgs(function(p){return p.concat([{role:"assistant",content:"Connection issue. Please try again."}])});
                        setChatLoading(false);
                      });
                    }} style={{
                      padding:"5px 10px", borderRadius:16, border:"1px solid rgba(255,255,255,0.08)", background:"#0d0d0d",
                      fontSize:10, color:"rgb(0,228,193)", cursor:"pointer", fontWeight:500
                    }}>{q}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Self-Service Quick Actions (appear after first message) */}
          {chatMsgs.length > 1 && (
            <div style={{ padding:"4px 16px 6px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {[
                  ["Copy Referral Link", "link", function(){ copyLink(); setChatMsgs(function(p){return p.concat([{role:"assistant",content:"Your referral link has been copied!\n\ntutorii.com/ref/"+u.code+"\n\nShare it on WhatsApp, SMS, or social media."}])}); }],
                  ["Cancel Subscription", "lock", function(){ setChatMsgs(function(p){return p.concat([{role:"user",content:"I want to cancel my subscription"},{role:"assistant",content:"Before you cancel, here\u2019s what happens:\n\n\u2022 Access continues until "+u.nextBilling+"\n\u2022 Your referral link stops earning\n\u2022 Pending earnings above AED 50 are still paid\n\u2022 Course progress is saved\n\nTo confirm, go to Settings \u2192 Danger Zone \u2192 Cancel Subscription."}])}); }],
                  ["Update My IBAN", "bank", function(){ setChatMsgs(function(p){return p.concat([{role:"user",content:"I need to update my IBAN"},{role:"assistant",content:"You can update your payout IBAN in Settings \u2192 Payout Details.\n\nYour current IBAN ends in ..."+u.iban.slice(-3)+". Changes take effect on the next Tuesday payout."}])}); }],
                  ["Change Password", "shield", function(){ setChatMsgs(function(p){return p.concat([{role:"user",content:"I want to change my password"},{role:"assistant",content:"Two options:\n\n1. Settings \u2192 Change Password (if you know your current one)\n2. I can send a reset link to "+u.email+"\n\nWhich would you prefer?"}])}); }],
                  ["Share on WhatsApp", "phone", function(){ window.open("https://wa.me/?text="+encodeURIComponent("Learn practical skills for life in the UAE and earn while you grow! Join Tutorii: https://tutorii.com/ref/"+u.code),"_blank"); setChatMsgs(function(p){return p.concat([{role:"assistant",content:"WhatsApp opened with your referral link ready to share!"}])}); }],
                ].map(function(a){return (
                  <button key={a[0]} onClick={a[2]} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)", fontSize:9, fontWeight:600, color:"#94a3b8", cursor:"pointer" }}>
                    <Ico name={a[1]} size={10} color="#64748b" />{a[0]}
                  </button>
                )})}
              </div>
            </div>
          )}

          {/* Escalate to Human */}
          <div style={{ padding:"6px 16px", borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span onClick={function(){
              var ref = "TK-"+Math.floor(8400+Math.random()*600);
              setChatMsgs(function(p){return p.concat([
                {role:"user",content:"I need to speak to a human"},
                {role:"assistant",content:"I\u2019ve escalated this conversation to our support team. A ticket has been created with the full chat context so you won\u2019t need to repeat anything.\n\nTicket: "+ref+"\nTrack it in your Support tab.\n\nOur team responds within 24 hours (Sun\u2013Thu, 9AM\u20136PM GST)."}
              ])});
              setTickets(function(prev){
                var now = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
                return [{id:"T"+Date.now(),ref:ref,subject:"Chat escalation",category:"general",status:"open",created:now,updated:now,messages:chatMsgs.length+2}].concat(prev);
              });
            }} style={{ fontSize:10, color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              <Ico name="users" size={10} color="#64748b" />
              <span>{"Need a human? "}<span style={{ color:"rgb(0,228,193)", fontWeight:600 }}>Escalate to support</span></span>
            </span>
            <span onClick={function(){gotoTab("support");setChatOpen(false)}} style={{ fontSize:10, color:"#64748b", cursor:"pointer" }}>View tickets</span>
          </div>

          {/* Chat Input */}
          <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:8, alignItems:"center" }}>
            <input
              value={chatInput}
              onChange={function(e){setChatInput(e.target.value)}}
              onKeyDown={function(e){if(e.key==="Enter") sendChat()}}
              placeholder="Type your message..."
              style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", fontSize:13, outline:"none", background:"#000000", color:"#ffffff", fontFamily:"'Plus Jakarta Sans',sans-serif" }}
            />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{
              width:40, height:40, borderRadius:10, border:"none",
              background: chatInput.trim() ? "rgb(0,228,193)" : "#27272a",
              color:"#fff", fontSize:16, cursor: chatInput.trim() ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
            }}><Ico name="rocket" size={16} color="#fff" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
// ═════════════════════════════════════════

export default UserPortal;
