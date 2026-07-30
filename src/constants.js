
const PRICE = 95;
const L1_RATE = 0.40;
const L2_RATE = 0.05;

const INIT_COURSES = [
  { id: "c1", module: "Life in the UAE", icon: "mosque", lessons: [
    { id: "l1", title: "Understanding UAE Culture & Customs", dur: "12 min", done: true },
    { id: "l2", title: "Navigating Government Systems", dur: "18 min", done: true },
    { id: "l3", title: "Healthcare & Insurance Guide", dur: "14 min", done: false },
    { id: "l4", title: "Housing & Accommodation Tips", dur: "10 min", done: false },
  ]},
  { id: "c2", module: "Workers Rights & Legal", icon: "scale", lessons: [
    { id: "l5", title: "Know Your Employment Rights", dur: "20 min", done: true },
    { id: "l6", title: "Handling Workplace Disputes", dur: "16 min", done: false },
    { id: "l7", title: "Visa Rules & Regulations", dur: "22 min", done: false },
    { id: "l8", title: "Legal Resources & Help", dur: "8 min", done: false },
  ]},
  { id: "c3", module: "Job Search & Career", icon: "briefcase", lessons: [
    { id: "l9", title: "Building a Winning CV", dur: "15 min", done: false },
    { id: "l10", title: "Interview Masterclass", dur: "25 min", done: false },
    { id: "l11", title: "Top Job Portals", dur: "12 min", done: false },
    { id: "l12", title: "Networking in the Gulf", dur: "10 min", done: false },
  ]},
  { id: "c4", module: "Financial Literacy", icon: "dollar", lessons: [
    { id: "l13", title: "Budgeting on Any Salary", dur: "14 min", done: false },
    { id: "l14", title: "Remittance Options", dur: "11 min", done: false },
    { id: "l15", title: "Avoiding Debt Traps", dur: "16 min", done: false },
    { id: "l16", title: "Saving & Investment Basics", dur: "18 min", done: false },
  ]},
  { id: "c5", module: "Entrepreneurship", icon: "rocket", lessons: [
    { id: "l17", title: "The Entrepreneurial Mindset", dur: "13 min", done: false },
    { id: "l18", title: "Side Hustles in the UAE", dur: "20 min", done: false },
    { id: "l19", title: "Freelancing & Online Income", dur: "17 min", done: false },
    { id: "l20", title: "Scaling Your Referral Business", dur: "15 min", done: false },
  ]},
];

const USER = {
  name: "", email: "", code: "", avatar: "?",
  phone: "", joined: "", status: "inactive",
  plan: "Tutorii Monthly", nextBilling: "N/A",
  paymentMethod: "MamoPay", referredBy: "Direct",
  iban: "", ibanName: "", lastLogin: "",
  l1: [], l2: [],
  earn: { total: "0.00", month: "0.00", pending: "0.00", paid: "0.00" },
  payouts: [], billing: [], earningsHistory: [],
};

const adminUsers = [];

const INIT_PAYOUTS = [
  { id: "P1", user: "David Chen", amount: 749, iban: "AE07...3456", status: "completed", date: "Feb 25" },
  { id: "P2", user: "Aisha Khan", amount: 456, iban: "AE07...3457", status: "processing", date: "Feb 28" },
  { id: "P3", user: "Carlos Reyes", amount: 304, iban: "AE07...3458", status: "queued", date: "Mar 1" },
  { id: "P4", user: "Maria Lopez", amount: 267, iban: "AE07...3462", status: "queued", date: "Mar 1" },
];

var GROWTH_DATA = [
  {date:"Feb 1",users:38,active:32,cancelled:6,signups:3,revenue:3040,commissions:1216,payouts:950,profit:1824},
  {date:"Feb 3",users:41,active:35,cancelled:6,signups:3,revenue:3325,commissions:1330,payouts:1054,profit:1995},
  {date:"Feb 5",users:44,active:38,cancelled:6,signups:3,revenue:3610,commissions:1444,payouts:1177,profit:2166},
  {date:"Feb 7",users:46,active:39,cancelled:7,signups:2,revenue:3705,commissions:1482,payouts:1237,profit:2223},
  {date:"Feb 9",users:49,active:42,cancelled:7,signups:3,revenue:3990,commissions:1596,payouts:1343,profit:2394},
  {date:"Feb 11",users:53,active:45,cancelled:8,signups:4,revenue:4275,commissions:1710,payouts:1484,profit:2565},
  {date:"Feb 13",users:56,active:47,cancelled:9,signups:3,revenue:4465,commissions:1786,payouts:1591,profit:2679},
  {date:"Feb 15",users:60,active:51,cancelled:9,signups:4,revenue:4845,commissions:1938,payouts:1723,profit:2907},
  {date:"Feb 17",users:63,active:53,cancelled:10,signups:3,revenue:5035,commissions:2014,payouts:1844,profit:3021},
  {date:"Feb 19",users:67,active:57,cancelled:10,signups:4,revenue:5415,commissions:2166,payouts:1976,profit:3249},
  {date:"Feb 21",users:71,active:60,cancelled:11,signups:4,revenue:5700,commissions:2280,payouts:2099,profit:3420},
  {date:"Feb 23",users:74,active:62,cancelled:12,signups:3,revenue:5890,commissions:2356,payouts:2202,profit:3534},
  {date:"Feb 25",users:78,active:66,cancelled:12,signups:4,revenue:6270,commissions:2508,payouts:2342,profit:3762},
  {date:"Feb 27",users:82,active:69,cancelled:13,signups:4,revenue:6555,commissions:2622,payouts:2469,profit:3933},
  {date:"Mar 1",users:86,active:72,cancelled:14,signups:4,revenue:6840,commissions:2736,payouts:2586,profit:4104},
];

var CHURN_DATA = [
  {month:"Oct",rate:8.2},{month:"Nov",rate:9.1},{month:"Dec",rate:7.5},{month:"Jan",rate:6.8},{month:"Feb",rate:5.4},{month:"Mar",rate:4.9},
];

export { PRICE, L1_RATE, L2_RATE, INIT_COURSES, USER, adminUsers, INIT_PAYOUTS, GROWTH_DATA, CHURN_DATA };
