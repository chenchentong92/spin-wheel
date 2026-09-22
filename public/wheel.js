/* ═══════════════════════════════════════════════════════════════
   PRIZE WHEEL — wheel.js
═══════════════════════════════════════════════════════════════ */

// ─── DEFAULT CONFIG ──────────────────────────────────────────────────────────
const PRIZE_CONFIG_DEFAULT = [
    { id: 1, name: "Grand Prize", emoji: "🏆", quota: 2, color: "#f5c542", isZonk: false },
    { id: 2, name: "Zonk", emoji: "💨", quota: 99, color: "#555577", isZonk: true },
    { id: 3, name: "Hadiah 1", emoji: "🎁", quota: 5, color: "#7c6af7", isZonk: false },
    { id: 4, name: "Zonk", emoji: "💨", quota: 99, color: "#555577", isZonk: true },
    { id: 5, name: "Hadiah 2", emoji: "🎀", quota: 6, color: "#d4537e", isZonk: false },
    { id: 6, name: "Zonk", emoji: "💨", quota: 99, color: "#555577", isZonk: true },
    { id: 7, name: "Hadiah 3", emoji: "🎮", quota: 8, color: "#1d9e75", isZonk: false },
    { id: 8, name: "Zonk", emoji: "💨", quota: 99, color: "#555577", isZonk: true },
    { id: 9, name: "Hadiah 4", emoji: "🎵", quota: 10, color: "#ba7517", isZonk: false },
    { id: 10, name: "Zonk", emoji: "💨", quota: 99, color: "#555577", isZonk: true },
];

// ─── DEFAULT RULES ───────────────────────────────────────────────────────────
// spinNo: spin ke berapa (null = tidak pakai), time: "HH:MM" (null = tidak pakai)
// date: "YYYY-MM-DD" (null = semua tanggal), prizeId: id prize yang didapat
const RULES_DEFAULT = [
    { id: 1, prizeId: 1, spinNo: 10, time: null,    date: null, used: false },
    { id: 2, prizeId: 1, spinNo: null, time: "14:00", date: null, used: false },
];

// ─── STATE ───────────────────────────────────────────────────────────────────
let prizeConfig = loadConfig();
const savedPrizesState = loadPrizesState();
let prizes = prizeConfig.map(p => {
    const saved = savedPrizesState?.find(s => s.id === p.id);
    return { ...p, remaining: saved ? Math.min(saved.remaining, p.quota) : p.quota };
});
let history     = loadHistory();
let rules       = loadRules();
let spinning    = false;
let currentAngle = 0;
let spinCount   = 0;
let nextId      = Math.max(...prizeConfig.map(p => p.id), 0) + 1;
let nextRuleId  = Math.max(...rules.map(r => r.id), 0) + 1;

// ─── CANVAS ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById("wheelCanvas");
const ctx    = canvas.getContext("2d");
let SIZE = 500;

function resizeCanvas() {
    const main  = document.getElementById("mainArea");
    const avail = Math.min(main.clientWidth - 60, main.clientHeight - 60, 600);
    SIZE = Math.max(avail, 260);
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width  = SIZE + "px";
    canvas.style.height = SIZE + "px";
    ctx.scale(dpr, dpr);
    document.getElementById("centerHub").style.width    = Math.round(SIZE * 0.12) + "px";
    document.getElementById("centerHub").style.height   = Math.round(SIZE * 0.12) + "px";
    document.getElementById("centerHub").style.fontSize = Math.round(SIZE * 0.022) + "px";
    drawWheel();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getActive() {
    const activePrizeIds = new Set(prizes.filter(p => !p.isZonk && p.remaining > 0).map(p => p.id));
    const pairedZonkIds  = new Set();
    prizes.forEach((p, i) => {
        if (!p.isZonk && activePrizeIds.has(p.id)) {
            for (let j = i + 1; j < prizes.length; j++) {
                if (prizes[j].isZonk && !pairedZonkIds.has(prizes[j].id)) {
                    pairedZonkIds.add(prizes[j].id); break;
                }
            }
        }
    });
    return prizes.filter(p =>
        (!p.isZonk && activePrizeIds.has(p.id)) || (p.isZonk && pairedZonkIds.has(p.id))
    );
}

function easeIn(t, e = 3) { return Math.pow(t, e); }
function lerp(a, b, t)    { return a + (b - a) * t; }
function norm(a)           { return ((a % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI); }
function deltaTo(cur, tgt) { let d = norm(tgt)-norm(cur); if(d<=0) d+=2*Math.PI; return d; }
function nowTime()         { const n=new Date(); return n.getHours().toString().padStart(2,"0")+":"+n.getMinutes().toString().padStart(2,"0")+":"+n.getSeconds().toString().padStart(2,"0"); }
function nowHHMM()         { const n=new Date(); return n.getHours().toString().padStart(2,"0")+":"+n.getMinutes().toString().padStart(2,"0"); }
function todayDate()       { const n=new Date(); return n.toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"}); }
function todayISO()        { const n=new Date(); return n.toISOString().slice(0,10); }
function uid()             { return ++nextId; }
function uidRule()         { return ++nextRuleId; }

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────
function loadConfig() {
    try { const s=localStorage.getItem("prizeConfig"); if(s) return JSON.parse(s); } catch(e){}
    return PRIZE_CONFIG_DEFAULT.map(p=>({...p}));
}
function saveConfig() {
    try { localStorage.setItem("prizeConfig", JSON.stringify(prizeConfig)); } catch(e){}
}
function loadPrizesState() {
    try { const s=localStorage.getItem("prizesState"); if(s) return JSON.parse(s); } catch(e){}
    return null;
}
function savePrizesState() {
    try { localStorage.setItem("prizesState", JSON.stringify(prizes.map(p=>({id:p.id, remaining:p.remaining})))); } catch(e){}
}
function loadHistory() {
    try { const s=localStorage.getItem("spinHistory"); if(s) return JSON.parse(s); } catch(e){}
    return [];
}
function saveHistoryStorage() {
    try { localStorage.setItem("spinHistory", JSON.stringify(history)); } catch(e){}
}
function loadRules() {
    try { const s=localStorage.getItem("doorprizeRules"); if(s) return JSON.parse(s); } catch(e){}
    return RULES_DEFAULT.map(r=>({...r}));
}
function saveRules() {
    // called from UI save button — reads table first
    const rows   = document.getElementById("rulesTableBody").querySelectorAll("tr");
    const result = [];
    rows.forEach((tr, i) => {
        const r       = editRuleRows[i];
        const prizeId = parseInt(tr.querySelector(".rule-prize-sel").value);
        const spinNo  = tr.querySelector(".rule-spin").value.trim();
        const time    = tr.querySelector(".rule-time").value.trim();
        const date    = tr.querySelector(".rule-date").value.trim();
        result.push({
            id:      r.id,
            prizeId: prizeId,
            spinNo:  spinNo  ? parseInt(spinNo)  : null,
            time:    time    ? time              : null,
            date:    date    ? date              : null,
            used:    r.used,
        });
    });
    rules = result;
    try { localStorage.setItem("doorprizeRules", JSON.stringify(rules)); } catch(e){}
    renderRuleList();
    closeRules();
    showNotif("✅ Rules disimpan!", "success");
}
function saveRulesState() {
    try { localStorage.setItem("doorprizeRules", JSON.stringify(rules)); } catch(e){}
}

// ─── DOORPRIZE CHECK ─────────────────────────────────────────────────────────
function checkDoorprizeRule() {
    const currentTime = nowHHMM();
    const currentDate = todayISO();

    for (const rule of rules) {
        if (rule.used) continue;

        const prize = prizes.find(p => p.id === rule.prizeId && !p.isZonk && p.remaining > 0);
        if (!prize) continue;

        const spinMatch = rule.spinNo !== null ? spinCount === rule.spinNo : true;
        const timeMatch = rule.time   !== null ? currentTime >= rule.time  : true;
        const dateMatch = rule.date   !== null ? currentDate === rule.date : true;

        // Need at least one specific trigger (spinNo or time)
        const hasSpecificTrigger = rule.spinNo !== null || rule.time !== null;
        if (!hasSpecificTrigger) continue;

        if (spinMatch && timeMatch && dateMatch) {
            return { rule, prize };
        }
    }
    return null;
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function drawWheel() {
    const CX = SIZE/2, CY = SIZE/2, R = SIZE/2 - 6;
    const active = getActive();
    ctx.clearRect(0, 0, SIZE, SIZE);

    if (active.length === 0) {
        ctx.fillStyle="#8888aa"; ctx.font=`bold ${Math.round(SIZE*0.04)}px Segoe UI,sans-serif`;
        ctx.textAlign="center"; ctx.fillText("Semua hadiah habis!", CX, CY); return;
    }

    const arc = (2*Math.PI) / active.length;
    active.forEach((p, i) => {
        const s = currentAngle + i*arc, e = s+arc;
        ctx.beginPath(); ctx.moveTo(CX,CY); ctx.arc(CX,CY,R,s,e); ctx.closePath();
        ctx.fillStyle=p.color; ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.13)"; ctx.lineWidth=2; ctx.stroke();

        ctx.save(); ctx.translate(CX,CY); ctx.rotate(s+arc/2); ctx.textAlign="right";
        const emojiSize=Math.floor(SIZE/20), textSize=Math.floor(SIZE/26), textX=R-14;
        ctx.font=`${emojiSize}px Segoe UI Emoji,sans-serif`;
        ctx.fillStyle=getTextColor(p.color); ctx.fillText(p.emoji, textX-2, emojiSize*0.35);
        ctx.font=`bold ${textSize}px Segoe UI,sans-serif`; ctx.fillStyle=getTextColor(p.color);
        let label=p.name; const maxW=R*0.55;
        while(ctx.measureText(label).width>maxW && label.length>3) label=label.slice(0,-1);
        if(label!==p.name) label=label.slice(0,-1)+"…";
        ctx.fillText(label, textX-emojiSize-4, emojiSize*0.35);
        ctx.restore();
    });

    ctx.beginPath(); ctx.arc(CX,CY,R,0,2*Math.PI);
    ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=3; ctx.stroke();
}

function getTextColor(hex) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return (0.299*r+0.587*g+0.114*b)/255 > 0.55 ? "#1a1a2e" : "#ffffff";
}

// ─── QUOTA UI ────────────────────────────────────────────────────────────────
function renderQuota() {
    const list=document.getElementById("quotaList"); list.innerHTML="";
    const seen=new Set();
    prizes.filter(p=>{ if(p.isZonk){if(seen.has("zonk"))return false;seen.add("zonk");} return true; })
    .forEach(p=>{
        const empty=!p.isZonk&&p.remaining===0;
        const pct=p.isZonk?100:Math.round((p.remaining/p.quota)*100);
        const el=document.createElement("div"); el.className="quota-item"+(empty?" empty":"");
        el.innerHTML=`<span class="quota-dot" style="background:${p.color}"></span>
        <div class="quota-info"><div class="quota-name">${p.emoji} ${p.name}</div>
        <div class="quota-bar"><div class="quota-bar-fill" style="width:${pct}%;background:${p.color}"></div></div></div>
        <span class="quota-num">${p.isZonk?"∞":p.remaining+"/"+p.quota}</span>
        ${!p.isZonk?`<button class="topup-btn" onclick="topUpPrize(${p.id})" title="Set kuota untuk hari ini (sisa kemarin hangus)">+</button>`:""}`;
        list.appendChild(el);
    });
}

function topUpPrize(id) {
    const prize = prizes.find(p => p.id === id);
    if (!prize) return;

    const input = prompt(`Set kuota "${prize.name}" untuk HARI INI berapa pcs?\n(Sisa kemarin, kalau ada, akan hangus dan diganti angka ini)\nSisa saat ini: ${prize.remaining}/${prize.quota}`);
    if (input === null) return;

    const n = parseInt(input);
    if (!Number.isFinite(n) || n <= 0) { showNotif("Masukkan angka lebih dari 0"); return; }

    const configEntry = prizeConfig.find(p => p.id === id);
    prize.remaining = n;
    prize.quota = n;
    if (configEntry) configEntry.quota = prize.quota;
    saveConfig();
    savePrizesState();

    renderQuota();
    renderPrizeList();
    showNotif(`✅ Kuota "${prize.name}" hari ini di-set ${n} pcs`, "success");
}

function renderPrizeList() {
    const list=document.getElementById("prizeList"); list.innerHTML="";
    prizes.forEach(p=>{
        if(p.isZonk) return;
        const el=document.createElement("div"); el.className="prize-chip"+(p.remaining===0?" depleted":"");
        el.innerHTML=`<span class="chip-dot" style="background:${p.color}"></span>
        <span class="chip-name">${p.emoji} ${p.name}</span>
        <span class="chip-quota">${p.remaining}/${p.quota}</span>`;
        list.appendChild(el);
    });
}

// ─── RULE LIST (sidebar) ─────────────────────────────────────────────────────
function renderRuleList() {
    const list=document.getElementById("ruleList"); list.innerHTML="";
    if(rules.length===0){
        list.innerHTML='<p style="font-size:0.75rem;color:var(--text2);font-style:italic">Belum ada rule</p>';
        return;
    }
    rules.forEach(r=>{
        const prize=prizes.find(p=>p.id===r.prizeId);
        if(!prize) return;
        const triggers=[];
        if(r.spinNo) triggers.push(`Spin #${r.spinNo}`);
        if(r.time)   triggers.push(`Jam ${r.time}`);
        if(r.date)   triggers.push(r.date);
        const el=document.createElement("div");
        el.className="rule-chip"+(r.used?" used":"");
        el.innerHTML=`<span class="rule-icon">${prize.emoji}</span>
        <div class="rule-info">
          <div class="rule-name">${prize.name}${r.used?" ✓":""}</div>
          <div class="rule-trigger">${triggers.join(" + ")}</div>
        </div>`;
        list.appendChild(el);
    });
}

// ─── SPIN ────────────────────────────────────────────────────────────────────
function isLocked(prizeId) {
    return rules.some(r => r.prizeId === prizeId && !r.used);
}

function pickWinner(active) {
    let w=active.map(p=> (!p.isZonk && isLocked(p.id)) ? 0 : (p.isZonk?Math.min(p.remaining,3):p.remaining));
    let total=w.reduce((a,b)=>a+b,0);
    if(total===0){
        // Safety fallback: everything eligible is locked (shouldn't normally happen) — ignore locks
        w=active.map(p=>p.isZonk?Math.min(p.remaining,3):p.remaining);
        total=w.reduce((a,b)=>a+b,0);
    }
    let r=Math.random()*total, acc=0;
    for(let i=0;i<active.length;i++){acc+=w[i];if(r<acc)return i;}
    return active.length-1;
}

function segCenter(idx, active) { const arc=(2*Math.PI)/active.length; return idx*arc+arc/2; }
function segToAngle(c)          { return -Math.PI/2-c; }
function setStatus(msg)         { document.getElementById("spinStatus").textContent=msg; }

function spin() {
    if(spinning) return;
    const active=getActive();
    if(active.length===0){ showNotif("Semua kuota hadiah sudah habis!"); return; }

    spinning=true; spinCount++;
    document.getElementById("spinBtn").disabled=true;

    // Check doorprize rule BEFORE picking winner
    const doorprize = checkDoorprizeRule();
    let forcedPrize = null;
    let winIdx;

    if(doorprize) {
        // Find index of forced prize in active array
        const idx = active.findIndex(p => p.id === doorprize.prize.id);
        if(idx !== -1) {
            winIdx      = idx;
            forcedPrize = doorprize;
        } else {
            winIdx = pickWinner(active);
        }
    } else {
        winIdx = pickWinner(active);
    }

    const FULL      = 2*Math.PI;
    const TOP_SPEED = 28*Math.PI;
    const MIN_SPEED = 0.3*Math.PI;
    const winTarget = segToAngle(segCenter(winIdx, active));
    const extraSpins = (6+Math.floor(Math.random()*4))*FULL;
    const distToWin  = deltaTo(currentAngle, winTarget);
    const finalAngle = currentAngle + extraSpins + distToWin;

    let speed=TOP_SPEED, angle=currentAngle;
    setStatus("🎡 Roda berputar...");

    // If doorprize — add golden glow to wheel
    if(forcedPrize) canvas.classList.add("wheel-glow");

    function step() {
        const remaining=finalAngle-angle;
        if(remaining<=0.01){
            currentAngle=finalAngle;
            drawWheel();
            finishSpin(active[winIdx], forcedPrize);
            return;
        }
        if(remaining>FULL*2){ speed=TOP_SPEED; }
        else {
            const t=1-(remaining/(FULL*2));
            speed=lerp(TOP_SPEED, MIN_SPEED, Math.pow(t,0.5));
            setStatus("🎯 Mendekati...");
        }
        angle+=speed/60; currentAngle=angle;
        drawWheel(); requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ─── FINISH ──────────────────────────────────────────────────────────────────
function finishSpin(winner, doorprize=null) {
    canvas.classList.remove("wheel-glow");
    setStatus("");
    winner.remaining=Math.max(0, winner.remaining-1);
    savePrizesState();

    const entry={
        id: Date.now(), name: winner.name, emoji: winner.emoji,
        color: winner.color, isZonk: winner.isZonk,
        time: nowTime(), date: todayDate(), spinNo: spinCount,
        isDoorprize: !!doorprize,
    };
    history.push(entry); saveHistoryStorage();
    renderQuota(); renderPrizeList();

    if(!winner.isZonk && winner.remaining===0)
        setTimeout(()=>showNotif(`Kuota "${winner.name}" telah habis!`),600);
    if(getActive().length===0)
        setTimeout(()=>showNotif("🎊 Semua hadiah sudah terbagi!","success"),900);

    if(doorprize) {
        // Mark rule as used
        doorprize.rule.used=true;
        saveRulesState();
        renderRuleList();
        setTimeout(()=>showDoorprize(winner), 500);
    } else {
        showResult(winner);
    }
}

// ─── RESULT MODAL ────────────────────────────────────────────────────────────
function showResult(prize) {
    document.getElementById("modalEmoji").textContent=prize.emoji;
    const t=document.getElementById("modalTitle"), s=document.getElementById("modalSub");
    if(prize.isZonk){
        t.textContent="Zonk! 😅"; t.className="modal-title zonk";
        s.textContent="Sayang sekali, lebih beruntung lain kali!";
    } else {
        t.textContent="🎉 "+prize.name+"!"; t.className="modal-title win";
        s.textContent=`Selamat! Kamu memenangkan ${prize.name}.\nHubungi panitia untuk klaim hadiah.`;
        launchConfetti();
    }
    const m=document.getElementById("resultModal");
    m.classList.add("show"); m.setAttribute("aria-hidden","false");
}

function closeResult() {
    document.getElementById("resultModal").classList.remove("show");
    document.getElementById("resultModal").setAttribute("aria-hidden","true");
    spinning=false;
    document.getElementById("spinBtn").disabled=getActive().length===0;
    drawWheel();
}

// ─── DOORPRIZE MODAL ─────────────────────────────────────────────────────────
function showDoorprize(prize) {
    document.getElementById("dpEmoji").textContent=prize.emoji;
    document.getElementById("dpTitle").textContent="🎉 "+prize.name+"!";
    document.getElementById("dpSub").textContent=`Selamat! Kamu mendapatkan DOORPRIZE spesial: ${prize.name}!\nHubungi panitia untuk klaim hadiah.`;
    const m=document.getElementById("doorprizeModal");
    m.classList.add("show"); m.setAttribute("aria-hidden","false");
    launchConfetti(); launchConfetti(); // double confetti!
}

function closeDoorprize() {
    document.getElementById("doorprizeModal").classList.remove("show");
    document.getElementById("doorprizeModal").setAttribute("aria-hidden","true");
    spinning=false;
    document.getElementById("spinBtn").disabled=getActive().length===0;
    drawWheel();
}

// ─── EDIT PRIZE MODAL ────────────────────────────────────────────────────────
let editRows=[];

function openEdit() {
    editRows=prizeConfig.map(p=>({...p})); renderEditTable();
    const m=document.getElementById("editModal");
    m.classList.add("show"); m.setAttribute("aria-hidden","false");
}

function closeEdit() {
    document.getElementById("editModal").classList.remove("show");
    document.getElementById("editModal").setAttribute("aria-hidden","true");
}

function renderEditTable() {
    const tbody=document.getElementById("editTableBody"); tbody.innerHTML="";
    editRows.forEach((p,i)=>{
        const tr=document.createElement("tr"); tr.className=p.isZonk?"zonk-row":"";
        tr.innerHTML=`
        <td><input type="text" class="emoji-inp" value="${p.emoji}" maxlength="4" style="width:52px;text-align:center;font-size:1.2rem"/></td>
        <td><input type="text" class="name-inp" value="${p.name}" maxlength="30"/></td>
        <td><input type="number" class="quota-inp" value="${p.isZonk?"∞":p.quota}" ${p.isZonk?'disabled style="opacity:.4"':'min="1" max="999"'}/></td>
        <td><input type="color" class="color-inp" value="${p.color}"/></td>
        <td><span class="type-badge ${p.isZonk?"zonk":"prize"}">${p.isZonk?"Zonk":"Hadiah"}</span></td>
        <td><button class="del-btn" onclick="deleteRow(${i})">✕ Hapus</button></td>`;
        tbody.appendChild(tr);
    });
}

function syncEditRowsFromDOM() {
    const rows=document.getElementById("editTableBody").querySelectorAll("tr");
    rows.forEach((tr,i)=>{
        const p=editRows[i]; if(!p) return;
        p.emoji=tr.querySelector(".emoji-inp").value;
        p.name=tr.querySelector(".name-inp").value;
        p.color=tr.querySelector(".color-inp").value;
        if(!p.isZonk){
            const q=parseInt(tr.querySelector(".quota-inp").value);
            if(!isNaN(q)) p.quota=q;
        }
    });
}

function deleteRow(i) {
    if(editRows.length<=2){showNotif("Minimal harus ada 2 segmen!");return;}
    syncEditRowsFromDOM();
    editRows.splice(i,1); renderEditTable();
}

function addPrize() {
    syncEditRowsFromDOM();
    editRows.push({id:uid(),name:"Hadiah Baru",emoji:"🎁",quota:5,color:"#7c6af7",isZonk:false});
    renderEditTable();
    document.getElementById("editTableBody").lastElementChild?.scrollIntoView({behavior:"smooth"});
}

function addZonk() {
    syncEditRowsFromDOM();
    editRows.push({id:uid(),name:"Zonk",emoji:"💨",quota:99,color:"#555577",isZonk:true});
    renderEditTable();
    document.getElementById("editTableBody").lastElementChild?.scrollIntoView({behavior:"smooth"});
}

function saveEdit() {
    const rows=document.getElementById("editTableBody").querySelectorAll("tr");
    const result=[];
    rows.forEach((tr,i)=>{
        const p=editRows[i];
        const emoji=tr.querySelector(".emoji-inp").value.trim()||"🎁";
        const name=tr.querySelector(".name-inp").value.trim()||"Prize";
        const color=tr.querySelector(".color-inp").value;
        const quota=p.isZonk?99:Math.max(1,parseInt(tr.querySelector(".quota-inp").value)||1);
        result.push({...p,emoji,name,color,quota});
    });
    if(result.length<2){showNotif("Minimal 2 segmen diperlukan!");return;}
    prizeConfig=result; saveConfig();
    const prevMap={};
    prizes.forEach(p=>{prevMap[p.id]=p.remaining;});
    prizes=prizeConfig.map(p=>({...p,remaining:(prevMap[p.id]!==undefined)?Math.min(prevMap[p.id],p.quota):p.quota}));
    savePrizesState();
    renderQuota(); renderPrizeList(); drawWheel(); closeEdit();
    showNotif("✅ Prize berhasil disimpan!","success");
}

// ─── RULES MODAL ─────────────────────────────────────────────────────────────
let editRuleRows=[];

function openRules() {
    editRuleRows=rules.map(r=>({...r})); renderRulesTable();
    const m=document.getElementById("rulesModal");
    m.classList.add("show"); m.setAttribute("aria-hidden","false");
}

function closeRules() {
    document.getElementById("rulesModal").classList.remove("show");
    document.getElementById("rulesModal").setAttribute("aria-hidden","true");
}

function renderRulesTable() {
    const tbody=document.getElementById("rulesTableBody"); tbody.innerHTML="";
    const prizeOptions=prizeConfig.filter(p=>!p.isZonk)
        .map(p=>`<option value="${p.id}">${p.emoji} ${p.name}</option>`).join("");

    editRuleRows.forEach((r,i)=>{
        const statusLabel = r.used ? "used" : "active";
        const statusText  = r.used ? "Sudah dipakai" : "Aktif";
        const tr=document.createElement("tr");
        tr.innerHTML=`
        <td><select class="rules-select rule-prize-sel">
            ${prizeConfig.filter(p=>!p.isZonk).map(p=>`<option value="${p.id}" ${p.id===r.prizeId?"selected":""}>${p.emoji} ${p.name}</option>`).join("")}
        </select></td>
        <td><input type="number" class="rule-spin" placeholder="e.g. 10" value="${r.spinNo||""}" min="1" style="width:70px"/></td>
        <td><input type="time" class="rule-time" value="${r.time||""}" style="width:90px;background:var(--card);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:6px 8px;font-size:0.82rem"/></td>
        <td><input type="date" class="rule-date" value="${r.date||""}" style="width:130px;background:var(--card);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:6px 8px;font-size:0.82rem"/></td>
        <td><span class="status-badge ${statusLabel}">${statusText}</span></td>
        <td><button class="del-btn" onclick="deleteRule(${i})">✕</button></td>`;
        tbody.appendChild(tr);
    });
}

function syncRuleRowsFromDOM() {
    const rows=document.getElementById("rulesTableBody").querySelectorAll("tr");
    rows.forEach((tr,i)=>{
        const r=editRuleRows[i]; if(!r) return;
        r.prizeId = parseInt(tr.querySelector(".rule-prize-sel").value);
        const spinVal = tr.querySelector(".rule-spin").value.trim();
        const timeVal = tr.querySelector(".rule-time").value.trim();
        const dateVal = tr.querySelector(".rule-date").value.trim();
        r.spinNo = spinVal ? parseInt(spinVal) : null;
        r.time   = timeVal || null;
        r.date   = dateVal || null;
    });
}

function deleteRule(i) {
    syncRuleRowsFromDOM();
    editRuleRows.splice(i,1); renderRulesTable();
}

function addRule() {
    syncRuleRowsFromDOM();
    editRuleRows.push({id:uidRule(),prizeId:prizeConfig.find(p=>!p.isZonk)?.id||1,spinNo:null,time:null,date:null,used:false});
    renderRulesTable();
    document.getElementById("rulesTableBody").lastElementChild?.scrollIntoView({behavior:"smooth"});
}

// ─── HISTORY MODAL ───────────────────────────────────────────────────────────
function openHistory() {
    renderHistoryModal();
    const m=document.getElementById("historyModal");
    m.classList.add("show"); m.setAttribute("aria-hidden","false");
}

function closeHistory() {
    document.getElementById("historyModal").classList.remove("show");
    document.getElementById("historyModal").setAttribute("aria-hidden","true");
}

function renderHistoryModal() {
    const body=document.getElementById("historyBody"); body.innerHTML="";
    if(history.length===0){
        body.innerHTML='<p class="history-empty-msg">Belum ada riwayat spin.</p>'; return;
    }
    const groups={};
    history.slice().reverse().forEach(e=>{
        if(!groups[e.date]) groups[e.date]=[];
        groups[e.date].push(e);
    });
    Object.entries(groups).forEach(([date,entries])=>{
        const grp=document.createElement("div"); grp.className="history-group";
        grp.innerHTML=`<div class="history-date">${date} — ${entries.length} spin</div>`;
        entries.forEach(e=>{
            const row=document.createElement("div");
            row.className="history-row"+(e.isZonk?" zonk-row":" win-row")+(e.isDoorprize?" doorprize-row":"");
            row.innerHTML=`
            <span class="history-emoji">${e.emoji}${e.isDoorprize?"👑":""}</span>
            <span class="history-name${e.isZonk?" zonk":""}">${e.name}${e.isDoorprize?' <span style="color:var(--gold);font-size:0.7rem">DOORPRIZE</span>':""}</span>
            <span class="history-spin">Spin #${e.spinNo}</span>
            <span class="history-time">${e.time}</span>`;
            grp.appendChild(row);
        });
        body.appendChild(grp);
    });
}

function clearHistory() {
    if(!confirm("Hapus semua riwayat spin?")) return;
    history=[]; saveHistoryStorage(); renderHistoryModal(); showNotif("Riwayat dihapus.");
}

// ─── RESET ───────────────────────────────────────────────────────────────────
function resetAll() {
    if(spinning) return;
    if(!confirm("Reset semua sisa kuota dan rules?")) return;
    prizes=prizeConfig.map(p=>({...p,remaining:p.quota}));
    rules=rules.map(r=>({...r,used:false}));
    currentAngle=0; spinCount=0;
    document.getElementById("spinBtn").disabled=false;
    setStatus("");
    savePrizesState(); saveRulesState(); renderQuota(); renderPrizeList(); renderRuleList(); drawWheel();
    showNotif("✅ Kuota direset!","success");
}

// ─── SIDEBAR TOGGLE ──────────────────────────────────────────────────────────
function toggleSidebar() {
    const sb=document.getElementById("sidebar"), tab=document.getElementById("sidebarTab"), btn=document.getElementById("sidebarToggle");
    const hidden=sb.classList.toggle("hidden");
    tab.classList.toggle("visible",hidden);
    btn.innerHTML=hidden?"&#10095;":"&#10094;";
    setTimeout(resizeCanvas,320);
}

// ─── FULLSCREEN ──────────────────────────────────────────────────────────────
document.getElementById("fullscreenBtn").addEventListener("click",()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
});
document.addEventListener("fullscreenchange",()=>{
    document.getElementById("fullscreenBtn").textContent=document.fullscreenElement?"✕":"⛶";
    setTimeout(resizeCanvas,100);
});

// ─── NOTIFICATION ────────────────────────────────────────────────────────────
let notifTimer;
function showNotif(msg, type="error") {
    const el=document.getElementById("notif");
    el.textContent=msg; el.className="notif show"+(type==="success"?" success":"");
    clearTimeout(notifTimer);
    notifTimer=setTimeout(()=>el.classList.remove("show"),3200);
}

// ─── CONFETTI ────────────────────────────────────────────────────────────────
function launchConfetti() {
    const cc=document.getElementById("confettiCanvas");
    cc.width=window.innerWidth; cc.height=window.innerHeight;
    const cctx=cc.getContext("2d");
    const cols=["#f5c542","#7c6af7","#e24b4a","#1d9e75","#d4537e","#a78bfa"];
    const pieces=Array.from({length:130},()=>({
        x:Math.random()*cc.width, y:Math.random()*-cc.height,
        r:Math.random()*8+4, d:Math.random()*3+1.5,
        color:cols[Math.floor(Math.random()*cols.length)],
        angle:0, tiltSpeed:Math.random()*.1+.05,
    }));
    let frames=0;
    function loop(){
        cctx.clearRect(0,0,cc.width,cc.height);
        pieces.forEach(p=>{
            p.y+=p.d*3.5; p.x+=Math.sin(p.angle)*1.2; p.angle+=p.tiltSpeed;
            cctx.beginPath(); cctx.ellipse(p.x,p.y,p.r,p.r/2,p.angle,0,2*Math.PI);
            cctx.fillStyle=p.color; cctx.globalAlpha=Math.max(0,1-frames/180); cctx.fill();
        });
        frames++;
        if(frames<200) requestAnimationFrame(loop);
        else { cctx.clearRect(0,0,cc.width,cc.height); cctx.globalAlpha=1; }
    }
    loop();
}

// ─── BACKUP (EXPORT / IMPORT) ─────────────────────────────────────────────────
function exportState() {
    const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        prizeConfig,
        prizesRemaining: prizes.map(p => ({ id: p.id, remaining: p.remaining })),
        rules,
        history,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spin-wheel-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showNotif("✅ Backup di-download!", "success");
}

function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); }
        catch (e) { showNotif("File tidak valid / rusak"); return; }

        if (!Array.isArray(data.prizeConfig) || !Array.isArray(data.rules)) {
            showNotif("Format file backup tidak dikenali"); return;
        }

        prizeConfig = data.prizeConfig;
        saveConfig();

        const remainingMap = {};
        (data.prizesRemaining || []).forEach(r => { remainingMap[r.id] = r.remaining; });
        prizes = prizeConfig.map(p => ({
            ...p,
            remaining: remainingMap[p.id] !== undefined ? Math.min(remainingMap[p.id], p.quota) : p.quota,
        }));
        savePrizesState();

        rules = data.rules;
        saveRulesState();

        history = Array.isArray(data.history) ? data.history : [];
        saveHistoryStorage();

        nextId     = Math.max(...prizeConfig.map(p => p.id), 0) + 1;
        nextRuleId = Math.max(...rules.map(r => r.id), 0) + 1;
        currentAngle = 0; spinCount = 0;

        renderQuota(); renderPrizeList(); renderRuleList(); drawWheel();
        document.getElementById("spinBtn").disabled = getActive().length === 0;
        showNotif("✅ Backup berhasil di-import!", "success");
    };
    reader.readAsText(file);
}

// ─── EVENT BINDINGS ──────────────────────────────────────────────────────────
document.getElementById("spinBtn").addEventListener("click", spin);
document.getElementById("centerHub").addEventListener("click", spin);
document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar);
document.getElementById("sidebarTab").addEventListener("click", toggleSidebar);
document.getElementById("openEditBtn").addEventListener("click", openEdit);
document.getElementById("openHistoryBtn").addEventListener("click", openHistory);
document.getElementById("openRulesBtn").addEventListener("click", openRules);
document.getElementById("resetBtn").addEventListener("click", resetAll);
document.getElementById("addPrizeBtn").addEventListener("click", addPrize);
document.getElementById("addZonkBtn").addEventListener("click", addZonk);
document.getElementById("addRuleBtn").addEventListener("click", addRule);
document.getElementById("exportBtn").addEventListener("click", exportState);
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFileInput").click());
document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importState(file);
    e.target.value = "";
});

["resultModal","editModal","historyModal","rulesModal","doorprizeModal"].forEach(id=>{
    document.getElementById(id).addEventListener("click",function(e){
        if(e.target!==this) return;
        if(id==="resultModal") closeResult();
        else if(id==="editModal") closeEdit();
        else if(id==="historyModal") closeHistory();
        else if(id==="rulesModal") closeRules();
        else if(id==="doorprizeModal") closeDoorprize();
    });
});

document.addEventListener("keydown",e=>{
    // Edit Prize / Edit Rules hold unsaved draft data — don't let Escape silently discard it
    // (e.g. a native date/time picker closing on Escape would otherwise bubble up and wipe the form).
    if(e.key==="Escape"){ closeResult();closeHistory();closeDoorprize(); }
    if((e.key===" "||e.key==="Enter")&&!e.target.closest(".modal-box")){ e.preventDefault();spin(); }
});

window.addEventListener("resize", resizeCanvas);

// ─── INIT ────────────────────────────────────────────────────────────────────
document.getElementById("sidebar").classList.add("hidden");
document.getElementById("sidebarTab").classList.add("visible");
document.getElementById("sidebarToggle").innerHTML = "&#10095;";

resizeCanvas();
renderQuota();
renderPrizeList();
renderRuleList();