const EXP=["Food","Rent","Transport","Shopping","Bills","Entertainment","Health","Education","Other"];
const INC=["Salary","Freelance","Gift","Other income"];
const KEY="smart-expense-v1";
let S={tx:[],budgets:{},rec:[],goals:[]};
try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=id=>document.getElementById(id);
const inr=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const today=new Date();
const ym=d=>d.slice(0,7);
const pad=n=>String(n).padStart(2,"0");
let M=today.getFullYear()+"-"+pad(today.getMonth()+1);
const mName=m=>new Date(m+"-01T00:00").toLocaleString("en-IN",{month:"long",year:"numeric"});
const addM=(m,n)=>{const [y,mo]=m.split("-").map(Number);const d=new Date(y,mo-1+n,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)};
const sum=a=>a.reduce((s,x)=>s+x,0);
const inM=(m,t)=>S.tx.filter(x=>ym(x.date)===m&&(!t||x.type===t));
const spentCat=(m)=>{const o={};inM(m,"expense").forEach(x=>o[x.cat]=(o[x.cat]||0)+x.amt);return o};
const monthsWithData=()=>[...new Set(S.tx.map(x=>ym(x.date)))].sort();
function toast(msg){const t=$("toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",3500)}

/* recurring: generate this month's entries once */
function applyRecurring(){
  const cm=today.getFullYear()+"-"+pad(today.getMonth()+1);let ch=false;
  S.rec.forEach(r=>{
    for(let m=r.start||cm;m<=cm;m=addM(m,1)){
      const d=m+"-"+pad(r.day);
      if(m===cm&&r.day>today.getDate())continue;
      if(!S.tx.some(x=>x.rid===r.id&&ym(x.date)===m)){S.tx.push({id:uid(),rid:r.id,date:d,type:r.type,cat:r.cat,amt:r.amt,note:r.note+" (recurring)"});ch=true}
    }
  });
  if(ch)save();
}

function countUp(){document.querySelectorAll("[data-n]").forEach(el=>{const to=+el.dataset.n,f={p:v=>Math.round(v)+"%",n:v=>Math.round(v)}[el.dataset.f]||inr,t0=performance.now();const step=t=>{const p=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-p,3);el.textContent=f(to*e);if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
function animBars(){requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll(".bar i[data-w]").forEach(i=>i.style.width=i.dataset.w+"%")))}
function confetti(){const c=document.createElement("canvas");c.id="cf";c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);const x=c.getContext("2d"),cols=["#6366f1","#a855f7","#ec4899","#f59e0b","#10b981","#06b6d4"];
  const P=Array.from({length:140},()=>({x:c.width/2,y:c.height*.35,vx:(Math.random()-.5)*16,vy:-Math.random()*14-4,s:Math.random()*8+4,r:Math.random()*6,c:cols[Math.random()*6|0]}));let f=0;
  (function a(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);x.restore()});if(++f<150)requestAnimationFrame(a);else c.remove()})()}
$("theme").onclick=()=>{const d=document.documentElement,dark=d.dataset.theme?d.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;d.dataset.theme=dark?"light":"dark";render()};
/* tabs */
const TABS=[["dash","Dashboard"],["tx","Transactions"],["bud","Budgets"],["rec","Recurring"],["goal","Goals"],["rep","Reports"],["ins","Insights"]];
$("nav").innerHTML=TABS.map(([k,l])=>`<button data-k="${k}">${l}</button>`).join("");
function showTab(k){document.querySelectorAll(".tab").forEach(e=>e.classList.toggle("on",e.id==="t-"+k));document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.k===k));render()}
$("nav").onclick=e=>{if(e.target.dataset.k)showTab(e.target.dataset.k)};
const curTab=()=>document.querySelector(".tab.on").id.slice(2);

/* selects */
const opts=a=>a.map(c=>`<option>${c}</option>`).join("");
function fillCats(){$("f-cat").innerHTML=opts($("f-type").value==="expense"?EXP:INC);$("r-cat").innerHTML=opts($("r-type").value==="expense"?EXP:INC);$("qc").innerHTML="<option value=''>All categories</option>"+opts([...EXP,...INC])}
$("f-type").onchange=$("r-type").onchange=fillCats;

/* add transaction + alert check */
$("f-add").onclick=()=>{
  const amt=parseFloat($("f-amt").value),date=$("f-date").value;
  if(!(amt>0)||!date){toast("Enter a valid amount and date");return}
  const t={id:uid(),date,type:$("f-type").value,cat:$("f-cat").value,amt,note:$("f-note").value.trim()};
  const before=spentCat(ym(date))[t.cat]||0;
  S.tx.push(t);save();
  $("f-amt").value="";$("f-note").value="";
  if(t.type==="expense"&&S.budgets[t.cat]){
    const b=S.budgets[t.cat],after=before+amt;
    if(before<b&&after>=b)toast(`🚨 ${t.cat} budget reached (${inr(after)} of ${inr(b)})`);
    else if(before<b*.8&&after>=b*.8)toast(`⚠️ ${t.cat} is at ${Math.round(after/b*100)}% of its budget`);
    else toast("Transaction added");
  }else toast("Transaction added");
  render();
};

/* transactions table */
function renderTx(){
  const q=$("q").value.toLowerCase(),c=$("qc").value;
  const rows=[...S.tx].filter(x=>(!c||x.cat===c)&&(!q||(x.note||"").toLowerCase().includes(q)||x.cat.toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,200);
  $("txt").innerHTML="<tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th><th></th></tr>"+(rows.map(x=>`<tr><td>${x.date}</td><td>${esc(x.cat)}</td><td>${esc(x.note)}</td><td class="${x.type==="income"?"ok":"bad"}">${x.type==="income"?"+":"−"}${inr(x.amt)}</td><td><button class="x" data-del="${x.id}" aria-label="Delete">✕</button></td></tr>`).join("")||"<tr><td colspan=5 class='mu'>No transactions yet.</td></tr>");
}
$("txt").onclick=e=>{const d=e.target.dataset.del;if(d){S.tx=S.tx.filter(x=>x.id!==d);save();render()}};
$("q").oninput=$("qc").onchange=renderTx;

/* CSV */
$("csv").onclick=async()=>{
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=["Date,Type,Category,Amount,Note",...[...S.tx].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,x.type,x.cat,x.amt,q(x.note)].join(","))].join("\n");
  if(!S.tx.length){toast("Nothing to export yet");return}
  try{const dl=window.claude?await claude.use("downloads"):null;
    if(!dl){const u=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),l=document.createElement("a");l.href=u;l.download="transactions.csv";l.click();URL.revokeObjectURL(u);toast("CSV downloaded");return}
    await dl.save({filename:"transactions.csv",data:csv});toast("CSV saved")}
  catch(e){if(e&&e.code!=="declined")toast("Couldn’t save the CSV")}
};

/* budgets */
function renderBud(){
  const sp=spentCat(M);
  $("buds").innerHTML=EXP.map(c=>{const b=S.budgets[c]||0,s=sp[c]||0,p=b?Math.min(100,s/b*100):0;
    const col=p>=100?"var(--bad)":p>=80?"var(--warn)":"var(--ok)";
    return `<div style="margin-bottom:14px"><div class="row" style="margin-bottom:0"><b style="flex:1 1 120px">${c}</b><span class="mu" style="flex:2 1 160px">${inr(s)} spent${b?" of "+inr(b):""}</span><input type="number" min="0" placeholder="Limit ₹" value="${b||""}" data-b="${c}" style="flex:1 1 110px"></div><div class="bar"><i data-w="${p}" style="width:0;background:${col}"></i></div></div>`}).join("");
}
$("buds").onchange=e=>{const c=e.target.dataset.b;if(!c)return;const v=parseFloat(e.target.value);if(v>0)S.budgets[c]=v;else delete S.budgets[c];save();render()};

/* recurring */
$("r-add").onclick=()=>{
  const amt=parseFloat($("r-amt").value),day=parseInt($("r-day").value),note=$("r-note").value.trim();
  if(!(amt>0)||!(day>=1&&day<=28)||!note){toast("Fill amount, a day (1–28) and a name");return}
  S.rec.push({id:uid(),type:$("r-type").value,cat:$("r-cat").value,amt,day,note,start:M});
  applyRecurring();save();$("r-amt").value=$("r-note").value=$("r-day").value="";render();toast("Recurring item added");
};
function renderRec(){
  $("rect").innerHTML="<tr><th>Name</th><th>Category</th><th>Amount</th><th>Day</th><th></th></tr>"+(S.rec.map(r=>`<tr><td>${esc(r.note)}</td><td>${esc(r.cat)}</td><td class="${r.type==="income"?"ok":"bad"}">${inr(r.amt)}</td><td>${r.day}</td><td><button class="x" data-rd="${r.id}">✕</button></td></tr>`).join("")||"<tr><td colspan=5 class='mu'>None yet.</td></tr>");
}
$("rect").onclick=e=>{const d=e.target.dataset.rd;if(d){S.rec=S.rec.filter(r=>r.id!==d);save();render()}};

/* goals */
$("g-add").onclick=()=>{const n=$("g-name").value.trim(),t=parseFloat($("g-target").value);if(!n||!(t>0)){toast("Enter a name and target");return}
  S.goals.push({id:uid(),name:n,target:t,saved:0});$("g-name").value=$("g-target").value="";save();render()};
function renderGoals(){
  $("goals").innerHTML=S.goals.map(g=>{const p=Math.min(100,g.saved/g.target*100);return `<div class="card"><div class="row" style="margin-bottom:4px"><b>${esc(g.name)}</b><button class="x" data-gd="${g.id}" style="flex:0 0 auto">✕</button></div><div class="kpi">${Math.round(p)}%</div><div class="mu">${inr(g.saved)} of ${inr(g.target)}</div><div class="bar"><i data-w="${p}" style="width:0"></i></div><div class="row" style="margin:10px 0 0"><input type="number" min="1" placeholder="₹ amount" id="ga-${g.id}"><button class="b" data-ga="${g.id}" style="flex:0 0 auto">Add</button></div></div>`}).join("")||"<p class='mu'>No goals yet. Add one above.</p>";
}
$("goals").onclick=e=>{const a=e.target.dataset.ga,d=e.target.dataset.gd;
  if(a){const v=parseFloat($("ga-"+a).value);if(v>0){const g=S.goals.find(x=>x.id===a);g.saved+=v;save();render();if(g.saved>=g.target){toast("🎉 Goal reached: "+g.name);confetti()}}}
  if(d){S.goals=S.goals.filter(g=>g.id!==d);save();render()}};

/* dashboard */
let ch1,ch2,ch3;
const PAL=["#6366f1","#f59e0b","#10b981","#ef4444","#06b6d4","#a855f7","#ec4899","#84cc16","#94a3b8"];
function alertsFor(m){
  const sp=spentCat(m),out=[];
  Object.entries(S.budgets).forEach(([c,b])=>{const s=sp[c]||0;
    if(s>=b)out.push(`<div class="alert d">🚨 <b>${c}</b>: budget reached, ${inr(s)} spent of ${inr(b)}.</div>`);
    else if(s>=b*.8)out.push(`<div class="alert">⚠️ <b>${c}</b>: ${Math.round(s/b*100)}% of budget used (${inr(s)} of ${inr(b)}).</div>`)});
  return out.join("");
}
function renderDash(){
  const inc=sum(inM(M,"income").map(x=>x.amt)),ex=sum(inM(M,"expense").map(x=>x.amt)),net=inc-ex;
  const rate=inc?Math.round(net/inc*100):0;
  $("alerts").innerHTML=alertsFor(M);
  $("kpis").innerHTML=[["💵","Income",inc,"ok","i"],["🛒","Expenses",ex,"bad","i"],["🏦","Net savings",net,net>=0?"ok":"bad","i"],["📈","Savings rate",rate,rate>=20?"ok":"warn","p"]].map(([ic,l,v,c,f])=>`<div class="card kc"><div class="ic">${ic}</div><div class="mu">${l}</div><div class="kpi ${c}" data-n="${v}" data-f="${f}">0</div></div>`).join("");
  const sp0=spentCat(M),bs=Object.entries(S.budgets),okb=bs.length?bs.filter(([c,b])=>(sp0[c]||0)<b).length/bs.length:1;
  const gp=S.goals.length?sum(S.goals.map(g=>Math.min(1,g.saved/g.target)))/S.goals.length:.5;
  const score=(inc||ex)?Math.round(Math.max(0,Math.min(100,Math.min(1,Math.max(0,rate)/30)*50+okb*30+gp*20))):0;
  $("sn").dataset.n=score;
  const ring=$("ring");ring.style.stroke=score>=75?"#16a34a":score>=50?"#d97706":"#e11d48";
  requestAnimationFrame(()=>requestAnimationFrame(()=>ring.style.strokeDashoffset=326.7*(1-score/100)));
  $("stip").textContent=!(inc||ex)?"Add transactions to see your score.":score>=75?"Excellent: strong savings and budgets on track.":score>=50?"Decent. Tighten budgets and save closer to 20–30%.":"Needs attention: overspending or low savings this month.";
  countUp();
  const sp=spentCat(M),cats=Object.keys(sp);
  ch1&&ch1.destroy();ch2&&ch2.destroy();ch3&&ch3.destroy();
  if(!window.Chart)return;
  const tc=getComputedStyle(document.body).color;Chart.defaults.color=tc;Chart.defaults.animation={duration:1500,easing:"easeOutQuart"};Chart.defaults.borderColor="rgba(128,128,128,.15)";
  ch1=new Chart($("c1"),{type:"doughnut",data:{labels:cats.length?cats:["No expenses"],datasets:[{data:cats.length?cats.map(c=>sp[c]):[1],backgroundColor:cats.length?cats.map((c,i)=>PAL[EXP.indexOf(c)%PAL.length]):["#cbd5e1"]}]},options:{maintainAspectRatio:false,plugins:{legend:{position:"right"}}}});
  const ms=[];for(let i=5;i>=0;i--)ms.push(addM(M,-i));
  ch2=new Chart($("c2"),{type:"bar",data:{labels:ms.map(m=>mName(m).slice(0,3)),datasets:[{label:"Income",data:ms.map(m=>sum(inM(m,"income").map(x=>x.amt))),backgroundColor:"#10b981"},{label:"Expenses",data:ms.map(m=>sum(inM(m,"expense").map(x=>x.amt))),backgroundColor:"#ef4444"}]},options:{maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
  const dim=new Date(+M.slice(0,4),+M.slice(5),0).getDate(),dly=Array(dim).fill(0);inM(M,"expense").forEach(x=>dly[+x.date.slice(8,10)-1]+=x.amt);let run=0;const cum=dly.map(v=>run+=v),tb=sum(Object.values(S.budgets));
  ch3=new Chart($("c3"),{type:"line",data:{labels:dly.map((_,i)=>i+1),datasets:[{label:"Cumulative spend",data:cum,borderColor:"#6366f1",backgroundColor:"rgba(99,102,241,.22)",fill:true,tension:.35,pointRadius:0},...(tb?[{label:"Budget pace",data:dly.map((_,i)=>tb*(i+1)/dim),borderColor:"#f59e0b",borderDash:[6,6],pointRadius:0,fill:false}]:[])]},options:{maintainAspectRatio:false,interaction:{mode:"index",intersect:false}}});
}

/* reports */
function renderRep(){
  $("rep-h").textContent="Report for "+mName(M);
  const inc=sum(inM(M,"income").map(x=>x.amt)),ex=sum(inM(M,"expense").map(x=>x.amt)),sp=spentCat(M);
  const prev=sum(inM(addM(M,-1),"expense").map(x=>x.amt));
  const top=Object.entries(sp).sort((a,b)=>b[1]-a[1]);
  const diff=prev?Math.round((ex-prev)/prev*100):null;
  $("rep").innerHTML=`<p>Income <b class="ok">${inr(inc)}</b> · Expenses <b class="bad">${inr(ex)}</b> · Net <b>${inr(inc-ex)}</b>${diff===null?"":` · ${diff>=0?"up":"down"} ${Math.abs(diff)}% vs last month’s spending`}</p>
  <div class="wrap"><table><tr><th>Category</th><th>Spent</th><th>Share</th><th>Budget</th></tr>${top.map(([c,v])=>`<tr><td>${c}</td><td>${inr(v)}</td><td>${Math.round(v/ex*100)}%</td><td>${S.budgets[c]?inr(S.budgets[c]):"—"}</td></tr>`).join("")||"<tr><td colspan=4 class='mu'>No expenses this month.</td></tr>"}</table></div>`;
  $("allm").innerHTML="<tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr>"+monthsWithData().reverse().map(m=>{const i=sum(inM(m,"income").map(x=>x.amt)),e=sum(inM(m,"expense").map(x=>x.amt));return `<tr><td>${mName(m)}</td><td>${inr(i)}</td><td>${inr(e)}</td><td class="${i-e>=0?"ok":"bad"}">${inr(i-e)}</td></tr>`}).join("");
}

/* insights */
function pastExpenses(){return monthsWithData().filter(m=>m<M).slice(-3).map(m=>({m,tot:sum(inM(m,"expense").map(x=>x.amt)),cat:spentCat(m)}))}
function renderIns(){
  const past=pastExpenses();
  if(past.length<2){$("pred").innerHTML="<p class='mu'>Add at least two past months of expenses to get a forecast (or load demo data).</p>"}
  else{
    const w=past.length===3?[.2,.3,.5]:[.4,.6],tot=sum(past.map((p,i)=>p.tot*w[i]));
    const rows=EXP.map(c=>({c,v:sum(past.map((p,i)=>(p.cat[c]||0)*w[i]))})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
    $("pred").innerHTML=`<div class="kpi">${inr(tot)}</div><p class="mu">Expected spending in ${mName(addM(M,1))}, a weighted average of your last ${past.length} months (recent months count more).</p><div class="wrap"><table>${rows.map(r=>`<tr><td>${r.c}</td><td>${inr(r.v)}</td></tr>`).join("")}</table></div>`;
  }
  const un=[];
  inM(M,"expense").forEach(x=>{const same=S.tx.filter(y=>y.type==="expense"&&y.cat===x.cat&&y.id!==x.id).map(y=>y.amt);
    if(same.length<4)return;const mean=sum(same)/same.length,sd=Math.sqrt(sum(same.map(v=>(v-mean)**2))/same.length);
    if(x.amt>mean+2*sd&&x.amt>1.5*mean)un.push(`<div class="alert">${x.date} · <b>${esc(x.cat)}</b> ${inr(x.amt)}${x.note?" ("+esc(x.note)+")":""}: about ${(x.amt/mean).toFixed(1)}× your usual ${inr(mean)}.</div>`)});
  $("unus").innerHTML=un.join("")||"<p class='mu'>Nothing unusual this month. Flags appear when a purchase is far above your normal for that category.</p>";
  const ex=past.length?past:[{tot:sum(inM(M,"expense").map(x=>x.amt)),cat:spentCat(M)}];
  const rec=EXP.map(c=>{const avg=sum(ex.map(p=>p.cat[c]||0))/ex.length;const disc=["Food","Shopping","Entertainment"].includes(c);return{c,avg,sug:Math.round(avg*(disc?.9:1.05)/100)*100,cur:S.budgets[c]||0}}).filter(r=>r.avg>0);
  const inc=sum(inM(M,"income").map(x=>x.amt));
  const msgs=[];
  if(inc){const r=(inc-sum(inM(M,"expense").map(x=>x.amt)))/inc*100;msgs.push(r<20?`Your savings rate is ${Math.round(r)}%. Aim for 20%+ by trimming discretionary categories (Food, Shopping, Entertainment).`:`Great, your savings rate is ${Math.round(r)}%. Consider moving the surplus into a savings goal.`)}
  $("recs").innerHTML=(msgs.map(m=>`<p>${m}</p>`).join(""))+(rec.length?`<div class="wrap"><table><tr><th>Category</th><th>Avg/month</th><th>Current</th><th>Suggested</th></tr>${rec.map(r=>`<tr><td>${r.c}</td><td>${inr(r.avg)}</td><td>${r.cur?inr(r.cur):"—"}</td><td><b>${inr(r.sug)}</b></td></tr>`).join("")}</table></div><p><button class="b" id="applyrec">Apply suggested budgets</button></p>`:"<p class='mu'>Add some expenses to receive recommendations.</p>");
  const a=$("applyrec");if(a)a.onclick=()=>{rec.forEach(r=>S.budgets[r.c]=r.sug);save();render();toast("Budgets updated")};
}

/* demo */
$("demo").onclick=()=>{
  if(S.tx.length&&!confirm("Replace current data with demo data?"))return;
  S={tx:[],budgets:{Food:6000,Shopping:4000,Entertainment:2500,Transport:2500},rec:[],goals:[{id:uid(),name:"New laptop",target:60000,saved:18000},{id:uid(),name:"Trip fund",target:25000,saved:20000}]};
  const base={Food:[4800,5200,5500,5900],Transport:[1800,2000,2100,2200],Shopping:[2500,3200,2800,4300],Bills:[2200,2300,2200,2300],Entertainment:[1200,1500,1800,2300],Health:[500,0,1200,300]};
  for(let i=3;i>=0;i--){const m=addM(M,-i),k=3-i;
    S.tx.push({id:uid(),date:m+"-01",type:"income",cat:"Salary",amt:55000,note:"Monthly salary"},{id:uid(),date:m+"-05",type:"expense",cat:"Rent",amt:15000,note:"Rent"});
    if(k%2)S.tx.push({id:uid(),date:m+"-18",type:"income",cat:"Freelance",amt:8000,note:"Side project"});
    Object.entries(base).forEach(([c,v],j)=>{if(v[k])for(let n=0;n<3;n++)S.tx.push({id:uid(),date:m+"-"+pad(7+n*6+j%3),type:"expense",cat:c,amt:Math.round(v[k]/3),note:c+" spend"})});
  }
  S.tx.push({id:uid(),date:M+"-20",type:"expense",cat:"Shopping",amt:14000,note:"Phone accessories bundle"});
  S.tx=S.tx.filter(x=>x.date<=today.toISOString().slice(0,10)||true);
  save();render();toast("Demo data loaded");confetti();
};

function render(){
  const k=curTab();
  ({dash:renderDash,tx:renderTx,bud:renderBud,rec:renderRec,goal:renderGoals,rep:renderRep,ins:renderIns})[k]();animBars();
}
$("month").value=M;$("month").onchange=e=>{if(e.target.value){M=e.target.value;render()}};
$("f-date").value=today.toISOString().slice(0,10);
fillCats();applyRecurring();showTab("dash");
