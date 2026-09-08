// ---------- ticker ----------
const stats = [
  ["60–70%","of India's warehousing sector is unorganized — BusinessWorld, 2025"],
  ["75%","of India's trucking fleet runs fewer than 5 trucks — RedSeer, 2025"],
  ["130M+","e-way bills generated every month — GSTN, 2026"],
  ["$397.5B","India MSME credit gap — IFC"],
  ["$25B → $41B","warehousing market by 2031 — Mordor Intelligence"],
];
const tickerHtml = stats.map(([n,d]) => `<span><b>${n}</b> ${d}</span>`).join("");
document.getElementById("tickerInner").innerHTML = tickerHtml + tickerHtml;

// ---------- scenario data ----------
const SCENARIOS = {
  aligned: {
    eway: `E-way Bill #: EWB-4471829301
Date: 2026-08-14
Origin: Nashik, MH
Destination: Bhiwandi Logistics Park, MH
Consignee (warehouse): Vishal Warehousing Pvt Ltd
Goods value: INR 6,40,000
Vehicle: MH15 AT 4521`,
    warehouse: `Warehouse: Vishal Warehousing Pvt Ltd
Gate entry log — Bhiwandi facility
2026-08-14, 19:40 — Inbound: Shree Balaji Roadways, Veh MH15 AT 4521
Goods received against E-way Bill EWB-4471829301
Recorded value: INR 6,38,500 (within tolerance)
Dock: B-4 | Handled by: R. Kadam`,
    verdicts: [
      {label:"ROUTE CONSISTENCY", status:"match", text:"The origin Nashik and destination Bhiwandi Logistics Park match between both records."},
      {label:"TEMPORAL PATTERN", status:"match", text:"The warehouse log entry at 19:40 falls within a realistic transit time of the e-way bill."},
      {label:"VOLUME CONSISTENCY", status:"partial", text:"Declared value ₹6,40,000 is slightly higher than the recorded ₹6,38,500."},
      {label:"RELATIONSHIP SYNTHESIS", status:"partial", text:"Route and timing match, but the value discrepancy is worth a closer look."},
    ],
    score: 75,
    synth: "The route and timing align perfectly, confirming the transporter's delivery to the warehouse. However, the value discrepancy of INR 1,500 raises questions about the accuracy of the reported goods value, suggesting a need for further verification.",
    offers: [["Northbridge NBFC","10.8% p.a."],["Ashoka Capital","11.6% p.a."],["Meridian Asset Finance","12.3% p.a."]]
  },
  partial: {
    eway: `E-way Bill #: EWB-5582930112
Date: 2026-07-02
Origin: Ludhiana, PB
Destination: Karnal Cold Chain Hub, HR
Consignee (warehouse): Karnal Cold Chain Pvt Ltd
Goods value: INR 3,10,000
Vehicle: PB10 CD 8842`,
    warehouse: `Warehouse: Karnal Cold Chain Pvt Ltd
Gate entry log — Karnal facility
2026-07-04, 09:15 — Inbound: unnamed carrier, Veh not logged
No matching E-way Bill reference on file
Recorded value: INR 3,05,000
Dock: A-2 | Handled by: unrecorded`,
    verdicts: [
      {label:"ROUTE CONSISTENCY", status:"partial", text:"Destination matches broadly, but the specific dock and vehicle weren't logged on arrival."},
      {label:"TEMPORAL PATTERN", status:"fail", text:"A 2-day gap between the e-way bill date and gate entry is outside a realistic transit window."},
      {label:"VOLUME CONSISTENCY", status:"partial", text:"Declared ₹3,10,000 vs recorded ₹3,05,000 — within tolerance, but incomplete logging elsewhere."},
      {label:"RELATIONSHIP SYNTHESIS", status:"partial", text:"Partial corroboration — enough to flag for manual review, not enough to auto-approve."},
    ],
    score: 46,
    synth: "The timing gap and missing vehicle/dock reference mean this pair only partially corroborates. The relationship may be real, but the warehouse's own logging is too incomplete to confirm it independently — this would be routed for manual review, not an automatic score.",
    offers: [["Northbridge NBFC","14.9% p.a. — manual review"],["Ashoka Capital","Declined — insufficient corroboration"],["Meridian Asset Finance","15.4% p.a. — manual review"]]
  },
  mismatch: {
    eway: `E-way Bill #: EWB-9001122347
Date: 2026-08-30
Origin: Surat, GJ
Destination: Nagpur Logistics Park, MH
Consignee (warehouse): Continental Warehousing Corp
Goods value: INR 12,80,000
Vehicle: GJ05 XY 3390`,
    warehouse: `Warehouse: Continental Warehousing Corp
Gate entry log — Nagpur facility
No gate entry found for 2026-08-30 or adjacent dates
No record of vehicle GJ05 XY 3390 in the last 6 months
No relationship on file with any Surat-based vendor`,
    verdicts: [
      {label:"ROUTE CONSISTENCY", status:"fail", text:"Destination claimed on the e-way bill has zero corresponding gate activity."},
      {label:"TEMPORAL PATTERN", status:"fail", text:"No entry exists on or near the claimed date."},
      {label:"VOLUME CONSISTENCY", status:"fail", text:"No warehouse-side record exists to compare declared value against."},
      {label:"RELATIONSHIP SYNTHESIS", status:"fail", text:"No independent corroboration exists — this pairing cannot be verified as a real relationship."},
    ],
    score: 12,
    synth: "The warehouse has no record of this shipment, this vehicle, or this vendor at all. Either the e-way bill was filed against a warehouse it never actually reached, or the relationship doesn't exist. This is exactly the pattern Valora is built to catch — and to say no to, plainly, rather than approve on partial evidence.",
    offers: [["Northbridge NBFC","Declined"],["Ashoka Capital","Declined"],["Meridian Asset Finance","Declined"]]
  }
};

let currentScenario = 'aligned';

function setScenario(key, btn){
  currentScenario = key;
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const s = SCENARIOS[key];
  document.getElementById('ewayText').value = s.eway;
  document.getElementById('warehouseText').value = s.warehouse;
  document.getElementById('verdictGrid').innerHTML = '';
  document.getElementById('scoreRow').style.display = 'none';
  document.getElementById('routeBtn').style.display = 'none';
  document.getElementById('aiExplainBox').style.display = 'none';
  document.getElementById('certBtn').classList.remove('show');
}
document.addEventListener('DOMContentLoaded', () => {
  setScenario('aligned', document.querySelector('.scenario-btn'));
});

async function runCheck(){
  const btn = document.getElementById('runBtn');
  btn.disabled = true; btn.textContent = 'Reading both records...';
  const s = SCENARIOS[currentScenario];
  const grid = document.getElementById('verdictGrid');
  grid.innerHTML = s.verdicts.map(v => `
    <div class="verdict-card">
      <div class="verdict-label">${v.label}</div>
      <div class="verdict-status ${v.status === 'match' ? 'match' : v.status === 'fail' ? 'fail' : 'partial'}">${v.status.toUpperCase()}</div>
      <div class="verdict-text">${v.text}</div>
    </div>`).join('');

  await sleep(300);
  document.querySelectorAll('.verdict-card').forEach((c,i) => setTimeout(()=>c.classList.add('show'), i*180));
  await sleep(900);

  document.getElementById('scoreRow').style.display = 'grid';
  document.getElementById('scoreSynth').innerHTML = `<strong>${s.score}/100 —</strong> ${s.synth}`;
  animateScore(s.score);

  await sleep(600);
  await showAIExplanation(s);

  document.getElementById('routeBtn').style.display = 'block';
  document.getElementById('certBtn').classList.add('show');
  btn.disabled = false; btn.textContent = 'Run Ground Truth check';
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function animateScore(score){
  const circumference = 415;
  const offset = circumference - (score/100)*circumference;
  const arc = document.getElementById('scoreArc');
  arc.style.transition = 'stroke-dashoffset 1.2s ease';
  arc.style.stroke = score >= 60 ? '#3ED9A8' : score >= 30 ? '#F0A82E' : '#F0625E';
  requestAnimationFrame(()=>{ arc.style.strokeDashoffset = offset; });
  let n = 0;
  const numEl = document.getElementById('scoreNum');
  const iv = setInterval(()=>{
    n += Math.ceil(score/20);
    if(n >= score){ n = score; clearInterval(iv); }
    numEl.textContent = n;
  }, 40);
}

// ---------- AI explanation: tries the Netlify function first, falls back to local reasoning ----------
async function showAIExplanation(s){
  const box = document.getElementById('aiExplainBox');
  const textEl = document.getElementById('aiExplainText');
  const tagEl = document.getElementById('aiSourceTag');
  box.style.display = 'block';
  textEl.textContent = 'Generating...';
  tagEl.textContent = '';

  const prompt = `You are a credit underwriting assistant. In 2-3 sentences, explain to a lender credit officer why this borrower pair has a Ground Truth Score of ${s.score}/100. Verdicts: ${s.verdicts.map(v=>`${v.label}: ${v.status}`).join(", ")}. Be concrete and confident, no fluff.`;

  try{
    const res = await fetch('/.netlify/functions/explain', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ prompt })
    });
    if(!res.ok) throw new Error('function unavailable');
    const data = await res.json();
    if(data.text){
      textEl.textContent = data.text;
      tagEl.textContent = '— live, via OpenRouter';
      return;
    }
    throw new Error('no text');
  } catch(err){
    // fallback: local, deterministic reasoning — works even with no backend configured
    textEl.textContent = localExplanation(s);
    tagEl.textContent = '— local fallback (no backend configured)';
  }
}

function localExplanation(s){
  const matches = s.verdicts.filter(v=>v.status==='match').length;
  const fails = s.verdicts.filter(v=>v.status==='fail').length;
  if(s.score >= 60) return `This pair scores ${s.score}/100 because ${matches} of 4 checks came back a clean match, with independent corroboration between the e-way bill and warehouse log. ${s.synth}`;
  if(s.score >= 30) return `This pair scores ${s.score}/100 — partial corroboration only. ${fails} check(s) failed outright, meaning this needs manual review before a lender should act on it automatically.`;
  return `This pair scores ${s.score}/100 because ${fails} of 4 checks failed entirely — there's no independent corroboration this relationship is real. The system flags this rather than approving on partial evidence.`;
}

function downloadCert(){
  const s = SCENARIOS[currentScenario];
  const content = `VALORA — GROUND TRUTH CERTIFICATE
Generated: ${new Date().toLocaleString()}

RELATIONAL TRUST SCORE: ${s.score}/100

VERDICTS:
${s.verdicts.map(v => `${v.label}: ${v.status.toUpperCase()} — ${v.text}`).join('\n')}

SYNTHESIS:
${s.synth}

INDICATIVE LENDER OFFERS:
${s.offers.map(([l,r]) => `${l}: ${r}`).join('\n')}

---
This certificate reflects a demonstration scenario for the Valora Ground Truth Engine.
Built for BFSI / MSME lending — Track 1, Trust Scoring for the Credit-Invisible.`;
  const blob = new Blob([content], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Valora_GroundTruth_Certificate_${currentScenario}.txt`;
  a.click();
}

// ---------- single doc check ----------
function checkSingle(){
  const text = document.getElementById('singleDoc').value;
  const issues = [];
  const gstinMatch = text.match(/GSTIN:\s*([A-Z0-9]+)/i);
  if(gstinMatch && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/.test(gstinMatch[1])){
    issues.push("The GSTIN format is incorrect; it should have a valid state code prefix.");
  }
  const dateMatch = text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/);
  if(dateMatch){
    const d = new Date(dateMatch[1]);
    if(d > new Date()) issues.push("The date is in the future; it cannot be later than today's date.");
  }
  const box = document.getElementById('singleFindings');
  if(issues.length){
    box.innerHTML = issues.map(i => `<div style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--line);">• ${i}</div>`).join('') +
      `<div style="color:var(--text-soft); margin-top:12px;">The document has structural issues that would need resolving before it could stand as independent evidence.</div>`;
  } else {
    box.innerHTML = `<div style="color:var(--mint);">No structural issues found. The document is internally well-formed — this alone doesn't confirm it's true, only that it's plausible.</div>`;
  }
}

// ---------- marketplace routing ----------
function goToMarketplace(){
  const s = SCENARIOS[currentScenario];
  const names = {aligned:"Vishal Warehousing Pvt Ltd", partial:"Karnal Cold Chain Pvt Ltd", mismatch:"Continental Warehousing Corp"};
  document.getElementById('marketEmpty').style.display = 'none';
  document.getElementById('marketContent').style.display = 'block';
  document.getElementById('marketBizName').textContent = names[currentScenario];
  document.getElementById('marketScore').textContent = s.score;
  const offersEl = document.getElementById('marketOffers');
  offersEl.innerHTML = s.offers.map(([lender,rate]) => `<div class="offer show"><div class="lender">${lender}</div><div class="rate">${rate}</div></div>`).join('');
  document.getElementById('marketplace').scrollIntoView({behavior:'smooth', block:'start'});
}

// ---------- trust graph + growth simulation ----------
const gsvg = d3.select("#graphSvg");
const glinkLayer = gsvg.append("g");
const gnodeLayer = gsvg.append("g");
let gnodes = [
  {id:"wh1", label:"Vishal Warehousing", type:"warehouse"},
  {id:"tr1", label:"Shree Balaji Roadways", type:"transporter"},
  {id:"wh2", label:"Karnal Cold Chain", type:"warehouse"},
];
let glinks = [
  {source:"wh1", target:"tr1"},
];
let gsim = d3.forceSimulation(gnodes)
  .force("link", d3.forceLink(glinks).id(d=>d.id).distance(100).strength(0.5))
  .force("charge", d3.forceManyBody().strength(-180))
  .force("center", d3.forceCenter(400, 200))
  .force("collide", d3.forceCollide(40));

function renderGraph(){
  const box = document.getElementById('graphBox');
  const w = box.clientWidth, h = box.clientHeight;
  gsim.force("center", d3.forceCenter(w/2, h/2));

  const linkSel = glinkLayer.selectAll("line").data(glinks, d=>d.source.id+d.target.id);
  linkSel.exit().remove();
  const linkEnter = linkSel.enter().append("line").attr("class","glink");
  linkEnter.merge(linkSel);
  setTimeout(()=> glinkLayer.selectAll("line").classed("show", true), 50);

  const nodeSel = gnodeLayer.selectAll("g.node").data(gnodes, d=>d.id);
  nodeSel.exit().remove();
  const nodeEnter = nodeSel.enter().append("g").attr("class", d=>"node "+d.type);
  nodeEnter.each(function(d){
    const g = d3.select(this);
    if(d.type === "warehouse") g.append("rect").attr("x",-36).attr("y",-16).attr("width",72).attr("height",32).attr("rx",5);
    else if(d.type === "lender") g.append("rect").attr("x",-30).attr("y",-14).attr("width",60).attr("height",28).attr("rx",14);
    else g.append("circle").attr("r",22);
    g.append("text").attr("text-anchor","middle").attr("dy",4).text(d.label.length>12 ? d.label.slice(0,11)+"…" : d.label);
  });

  gsim.nodes(gnodes).on("tick", ()=>{
    glinkLayer.selectAll("line").attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
    gnodeLayer.selectAll("g.node").attr("transform",d=>`translate(${d.x},${d.y})`);
  });
  gsim.force("link").links(glinks);
  gsim.alpha(0.8).restart();
}
document.addEventListener('DOMContentLoaded', renderGraph);

const WH_NAMES = ["Peenya Cold Storage","Bhiwandi Hub 7","Whitefield DC-04","Continental Warehousing","Sanand Logistics Park","Manesar FC-2"];
const TR_NAMES = ["Ashoka Freight Co.","Rane Logistics","Sunrise Carriers","Karan Transport","Deccan Roadlines","Punjab Express"];
let simRunning = false;

async function simulateGrowth(){
  if(simRunning) return;
  simRunning = true;
  resetGraphSim(true);
  for(let month=1; month<=12; month++){
    document.getElementById('monthLabel').textContent = `MONTH ${month}`;
    const newBiz = 1 + Math.floor(Math.random()*3);
    for(let i=0;i<newBiz;i++){
      const isWh = Math.random() > 0.5;
      const pool = isWh ? WH_NAMES : TR_NAMES;
      const name = pool[Math.floor(Math.random()*pool.length)] + " " + Math.floor(Math.random()*90+10);
      const node = {id:"n"+Math.random().toString(36).slice(2,8), label:name, type: isWh?"warehouse":"transporter"};
      gnodes.push(node);
      if(gnodes.length > 2){
        const others = gnodes.filter(n => n.id !== node.id && n.type !== node.type);
        if(others.length){
          const target = others[Math.floor(Math.random()*others.length)];
          glinks.push({source:node.id, target:target.id});
        }
      }
    }
    renderGraph();
    const bizCount = gnodes.length;
    const credit = (bizCount * 6.2).toFixed(1);
    const tat = Math.max(0.6, 4.2 - month*0.28).toFixed(1);
    document.getElementById('statBiz').textContent = bizCount;
    document.getElementById('statCredit').textContent = `₹${credit}L`;
    document.getElementById('statTAT').textContent = `${tat} wks`;
    await sleep(550);
  }
  simRunning = false;
}

function resetGraphSim(silent){
  gnodes = [
    {id:"wh1", label:"Vishal Warehousing", type:"warehouse"},
    {id:"tr1", label:"Shree Balaji Roadways", type:"transporter"},
    {id:"wh2", label:"Karnal Cold Chain", type:"warehouse"},
  ];
  glinks = [{source:"wh1", target:"tr1"}];
  document.getElementById('monthLabel').textContent = 'MONTH 0';
  document.getElementById('statBiz').textContent = '3';
  document.getElementById('statCredit').textContent = '₹18L';
  document.getElementById('statTAT').textContent = '4.2 wks';
  renderGraph();
}

window.addEventListener('resize', renderGraph);
