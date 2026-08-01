const PARTS=[{key:'motor_yagi',name:'Motor Yağı',km:7000},{key:'yag_filtresi',name:'Yağ Filtresi',km:7000},{key:'hava_filtresi',name:'Hava Filtresi',km:15000},{key:'polen_filtresi',name:'Polen Filtresi',km:15000},{key:'yakit_filtresi',name:'Yakıt Filtresi',km:30000},{key:'triger',name:'Triger Kayışı',km:60000},{key:'devirdaim',name:'Devirdaim Pompası',km:60000},{key:'bujiler',name:'Bujiler',km:40000},{key:'on_balata',name:'Ön Fren Balata',km:40000},{key:'arka_balata',name:'Arka Fren Balata',km:40000},{key:'fren_diski',name:'Fren Diski',km:60000},{key:'antifriz',name:'Antifriz',km:40000},{key:'sanziman_yagi',name:'Şanzıman Yağı',km:60000},{key:'direksiyon_yagi',name:'Direksiyon Yağı',km:40000},{key:'klima_gazi',name:'Klima Gazı',km:40000}];

const EXPENSE_TYPES=[{id:'bakim',label:'Bakım'},{id:'yakit',label:'Yakıt'},{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];
const DUE_TYPES=[{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function carIcon(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" fill="currentColor"><path d="M228 620 C228 590 250 566 284 560 L300 494 C312 452 350 424 396 424 L628 424 C674 424 712 452 724 494 L740 560 C774 566 796 590 796 620 L796 668 C796 690 778 708 756 708 L268 708 C246 708 228 690 228 668 Z"/><circle cx="352" cy="716" r="60"/><circle cx="672" cy="716" r="60"/></svg>`;
}

const ICONS={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plusCircle:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 1.8"/>',
  wallet:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M6 2h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M12 10.5v6M9.5 14l2.5 2.5L14.5 14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z"/>',
  gauge:'<circle cx="12" cy="13" r="8"/><path d="M12 13l3-4M8 7.5l.7.7M16 7.5l-.7.7M6 13h1M17 13h1M12 5v1"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  alert:'<path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>',
};
function icon(name,size,strokeWidth){
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth||1.8}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`;
}

function brandLogoUrl(brand){
  const tpl=localStorage.getItem('logoCdnTemplate');
  if(!tpl||!brand)return null;
  const slug=String(brand).trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  if(!slug)return null;
  return tpl.replace('{marka}',slug).replace('{brand}',slug);
}
function handleLogoError(imgEl,size){
  imgEl.outerHTML=carIcon(size);
}
function updateBrandLogoPreview(){
  const el=document.getElementById('v-brand-logo');
  if(!el)return;
  const brand=document.getElementById('v-brand')?.value||'';
  const url=brandLogoUrl(brand);
  el.innerHTML=url?`<img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML=''">`:'';
}

function getEffectiveTheme(){
  const explicit=document.documentElement.getAttribute('data-theme');
  if(explicit)return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
function initTheme(){
  const saved=localStorage.getItem('theme');
  if(saved==='dark'||saved==='light')document.documentElement.setAttribute('data-theme',saved);
}
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('theme',t);
  document.querySelectorAll('.seg-btn[data-theme-btn]').forEach(b=>b.classList.toggle('active',b.dataset.themeBtn===t));
}

initTheme();

let state={vehicles:[],selId:null,view:'dashboard'};

const API={
  async get(path){
    if(path==='/vehicles')return window.api.vehicles.list();
    const m=path.match(/^\/maintenance\/(\d+)$/);
    if(m)return window.api.maintenance.list(parseInt(m[1]));
    throw new Error('Bilinmeyen istek: '+path);
  },
  async post(path,body){
    if(path==='/vehicles')return window.api.vehicles.create(body);
    const m=path.match(/^\/maintenance\/(\d+)$/);
    if(m)return window.api.maintenance.create(parseInt(m[1]),body);
    throw new Error('Bilinmeyen istek: '+path);
  },
  async put(path,body){
    const m=path.match(/^\/vehicles\/(\d+)$/);
    if(m)return window.api.vehicles.update(parseInt(m[1]),body);
    const ml=path.match(/^\/maintenance\/log\/(\d+)$/);
    if(ml)return window.api.maintenance.updateLog(parseInt(ml[1]),body);
    throw new Error('Bilinmeyen istek: '+path);
  },
  async del(path){
    const mv=path.match(/^\/vehicles\/(\d+)$/);
    if(mv)return window.api.vehicles.delete(parseInt(mv[1]));
    const ml=path.match(/^\/maintenance\/log\/(\d+)$/);
    if(ml)return window.api.maintenance.deleteLog(parseInt(ml[1]));
    throw new Error('Bilinmeyen istek: '+path);
  },
};

async function init(){
  try{await loadVehicles();navigate('dashboard');}
  catch(e){document.getElementById('app').innerHTML=`<div class="vc"><div class="err-msg">Veri yüklenemedi: ${esc(e.message)}</div></div>`;}
}

async function loadVehicles(){
  state.vehicles=await API.get('/vehicles');
  if(!state.selId&&state.vehicles.length)state.selId=state.vehicles[0].id;
}

function selVehicle(){return state.vehicles.find(v=>v.id===state.selId)||null;}

function renderLayout(view){
  const nav=[{id:'dashboard',icon:icon('grid',18),label:'Dashboard'},{id:'add',icon:icon('plusCircle',18),label:'Bakım Ekle'},{id:'history',icon:icon('clock',18),label:'Geçmiş'},{id:'expenses',icon:icon('wallet',18),label:'Masraflar'},{id:'vehicles',icon:carIcon(18),label:'Araçlar'},{id:'settings',icon:icon('gear',18),label:'Ayarlar'}];
  const opts=state.vehicles.map(v=>`<option value="${v.id}" ${v.id===state.selId?'selected':''}>${esc(v.brand)} ${esc(v.model)}</option>`).join('');
  document.getElementById('app').innerHTML=`<div class="layout">
    <div class="sb">
      <div class="sb-top">
        <div class="sb-logo"><div style="width:30px;height:30px;background:var(--blue);color:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${carIcon(18)}</div><span>Bakım Takip</span></div>
        ${state.vehicles.length?`<div class="v-sel-wrap"><select class="v-sel" onchange="changeVehicle(this.value)">${opts}</select></div>`:''}
      </div>
      <nav>${nav.map(n=>`<div class="nav-item ${view===n.id?'active':''}" onclick="navigate('${n.id}')"><span class="ni">${n.icon}</span><span>${n.label}</span></div>`).join('')}</nav>
    </div>
    <div class="main" id="main"></div>
  </div>`;
}

async function navigate(view,arg){
  state.view=view;renderLayout(view);
  const el=document.getElementById('main');
  if(view==='dashboard')await renderDashboard(el);
  else if(view==='add')await renderAdd(el,arg);
  else if(view==='history')await renderHistory(el);
  else if(view==='expenses')await renderExpenses(el);
  else if(view==='vehicles')await renderVehicles(el);
  else if(view==='settings')renderSettings(el);
}

function changeVehicle(id){state.selId=parseInt(id);navigate(state.view);}

function computeKmReminder(logs,expenses){
  const dates=[...logs.map(l=>l.date),...expenses.filter(e=>e.km!=null).map(e=>e.date)].filter(Boolean).sort();
  const lastDate=dates[dates.length-1]||null;
  const daysSince=lastDate?Math.round((Date.now()-new Date(lastDate))/86400000):null;
  return{lastDate,daysSince};
}

async function renderDashboard(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty"><p>Araç yok.</p><br><button class="btn" onclick="navigate('vehicles')">Araç Ekle</button></div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
    const kmR=computeKmReminder(logs,expenses);
    const kmBanner=(kmR.daysSince===null||kmR.daysSince>30)?`<div class="banner">${icon('gauge',18)}<div><b>Kilometre girişi hatırlatması</b> — ${kmR.lastDate?`En son ${kmR.daysSince} gün önce (${esc(kmR.lastDate)}) güncelleme yaptınız.`:'Henüz kilometre girişi yapılmadı.'} Güncel kilometreni girmeyi unutma.</div></div>`:'';
    const lastOf={};
    for(const log of [...logs].sort((a,b)=>b.km-a.km))
      for(const p of log.parts)
        if(!lastOf[p.key])lastOf[p.key]={km:log.km,date:log.date,brand:p.brand||''};
    const bl={green:'bg',amber:'ba',red:'br',unknown:'bx'};
    const bl2={green:'İyi',amber:'Yaklaşıyor',red:'Geçti',unknown:'Kayıt Yok'};
    const cards=PARTS.map(p=>{
      const last=lastOf[p.key];const lkm=last?.km??null;const nkm=lkm!==null?lkm+p.km:null;
      const prog=lkm!==null?Math.min(100,Math.round(((v.current_km-lkm)/p.km)*100)):0;
      const st=lkm===null?'unknown':prog>=100?'red':prog>=75?'amber':'green';
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${esc(p.name)}</span><span class="badge ${bl[st]}">${bl2[st]}</span></div>
        ${lkm!==null?`<div class="pkm"><span>${lkm.toLocaleString('tr-TR')} km</span><span>→</span><span class="nx">${nkm.toLocaleString('tr-TR')} km</span></div><div class="pb"><div class="pf ${st}" style="width:${prog}%"></div></div>${last.brand?`<div class="pbrand">${esc(last.brand)}</div>`:''}`:
        `<div class="pkm" style="color:var(--t3);font-style:italic">Henüz kayıt yok</div>`}</div>`;
    }).join('');
    const dueCards=DUE_TYPES.map(dt=>{
      const latest=expenses.filter(e=>e.type===dt.id&&e.due_date).sort((a,b)=>b.date.localeCompare(a.date))[0];
      if(!latest)return `<div class="pcard unknown"><div class="ph"><span class="pname">${dt.label}</span><span class="badge bx">Kayıt Yok</span></div><div class="pkm" style="color:var(--t3);font-style:italic">Henüz kayıt yok</div></div>`;
      const days=Math.ceil((new Date(latest.due_date)-new Date())/86400000);
      const st=days<0?'red':days<=30?'amber':'green';
      const stLabel=days<0?'Süresi Geçti':days<=30?'Yaklaşıyor':'İyi';
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${dt.label}</span><span class="badge ${bl[st]}">${stLabel}</span></div><div class="pkm"><span>Yenileme: ${esc(latest.due_date)}</span></div></div>`;
    }).join('');
    const recent=logs.slice(0,4).map(l=>`<div class="hi"><div class="hdot"></div><div class="hinfo"><span class="hkm">${l.km.toLocaleString('tr-TR')} km</span><span class="hparts">${l.parts.map(p=>esc(p.name)).join(', ')}</span></div><span class="hdate">${esc(l.date)}</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3);padding:8px 0">Kayıt yok</p>';
    const total=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const byCost={};logs.forEach(l=>l.parts.forEach(p=>{byCost[p.name]=(byCost[p.name]||0)+(p.cost||0);}));
    const top=Object.entries(byCost).sort((a,b)=>b[1]-a[1]).slice(0,5);const maxC=top[0]?.[1]||1;
    const heroStyle=v.photo?`background-image:linear-gradient(135deg,rgba(30,50,120,.55),rgba(20,30,70,.75)),url('${esc(v.photo)}');background-size:cover;background-position:center`:'';
    const heroLogoUrl=brandLogoUrl(v.brand);
    const heroIconHtml=heroLogoUrl?`<img src="${esc(heroLogoUrl)}" alt="" style="width:34px;height:34px;object-fit:contain" onerror="handleLogoError(this,30)">`:carIcon(30);
    el.innerHTML=`<div class="vc">
      ${kmBanner}
      <div class="vh-card" style="${heroStyle}"><div class="vh-icon" style="background:#fff;color:var(--blue)">${heroIconHtml}</div><div class="vh-info"><h2>${esc(v.brand)} ${esc(v.model)}</h2><p>${esc(v.year||'')} ${esc(v.engine||'')}</p></div><div class="vh-km"><span class="km-v">${v.current_km.toLocaleString('tr-TR')}</span><span class="km-l">km</span></div></div>
      <div class="slabel">Parça Durumları</div>
      <div class="pgrid">${cards}${dueCards}</div>
      <div class="bgrid">
        <div class="card"><div class="ctitle">Son Bakımlar</div>${recent}${logs.length>4?`<button class="btn-t" onclick="navigate('history')">Tümünü gör →</button>`:''}</div>
        <div class="card"><div class="ctitle">Toplam Masraf</div><div class="etotal">${total.toLocaleString('tr-TR')} ₺</div><div class="ebars">${top.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxC)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      </div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

let editingLogId=null;
let editingExpenseId=null;

async function renderAdd(el,arg){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  const type=arg?.type||'bakim';
  const isEdit=!!arg?.id;
  editingLogId=null;editingExpenseId=null;
  let log=null,exp=null;
  if(isEdit&&type==='bakim'){
    const logs=await API.get('/maintenance/'+v.id);
    log=logs.find(l=>l.id===arg.id)||null;
    editingLogId=log?log.id:null;
  }else if(isEdit){
    const exps=await window.api.expenses.list(v.id);
    exp=exps.find(x=>x.id===arg.id)||null;
    editingExpenseId=exp?exp.id:null;
  }
  const typeLabel=EXPENSE_TYPES.find(t=>t.id===type)?.label||'Bakım';
  el.innerHTML=`<div class="vc"><h2 class="vtitle">${isEdit?typeLabel+' Kaydını Düzenle':'Masraf Ekle'} — ${esc(v.brand)} ${esc(v.model)}</h2>
    ${isEdit?'':`<div class="etabs">${EXPENSE_TYPES.map(t=>`<div class="etab ${type===t.id?'active':''}" onclick='navigate("add",{type:"${t.id}"})'>${t.label}</div>`).join('')}</div>`}
    <div id="add-form-body"></div>
  </div>`;
  const body=document.getElementById('add-form-body');
  if(type==='bakim')renderMaintForm(body,log);
  else renderExpenseForm(body,exp,type);
}

function renderMaintForm(body,log){
  const v=selVehicle();
  const checkedKeys=new Set((log?.parts||[]).filter(p=>!String(p.key).startsWith('custom_')).map(p=>p.key));
  const customParts=(log?.parts||[]).filter(p=>String(p.key).startsWith('custom_'));
  body.innerHTML=`<div class="fcard">
    <div class="frow"><div class="fg"><label>Kilometre *</label><input type="number" id="m-km" value="${esc(log?log.km:v.current_km)}"></div><div class="fg"><label>Tarih *</label><input type="date" id="m-date" value="${esc(log?log.date:new Date().toISOString().split('T')[0])}"></div><div class="fg"><label>Toplam Tutar (₺)</label><input type="number" id="m-cost" placeholder="0" min="0" value="${esc(log?.total_cost||'')}"></div></div>
    <div class="fg"><label>Servis / Bayi</label><input type="text" id="m-service" placeholder="Ör. Volvo Yetkili Servis - Kadıköy" value="${esc(log?.service_name||'')}"></div>
    <div class="fg"><label>Değiştirilen Parçalar</label><div class="pcl">${PARTS.map(p=>{
      const checked=checkedKeys.has(p.key);
      const existing=(log?.parts||[]).find(x=>x.key===p.key);
      return `<label class="pchk"><input type="checkbox" data-key="${p.key}" data-name="${p.name}" ${checked?'checked':''}><span>${p.name}</span><input type="text" class="binput ${checked?'':'hidden'}" placeholder="Marka / Not" value="${esc(existing?.brand||'')}"><input type="number" class="cinput ${checked?'':'hidden'}" placeholder="₺" min="0" value="${esc(existing?.cost||'')}"></label>`;
    }).join('')}</div></div>
    <div class="fg"><label>Serbest Parça</label><div id="custom-parts"></div><button class="btn-s" onclick="addCustomPart()">${icon('plus',14)} Parça Ekle</button></div>
    <div class="fg"><label>Notlar</label><textarea id="m-notes" rows="3" placeholder="Servis, gözlem...">${esc(log?.notes||'')}</textarea></div>
    <div id="m-err" class="err-msg hidden"></div><div id="m-ok" class="ok-msg hidden">Kaydedildi!</div>
    <div class="facts"><button class="btn-s" onclick="navigate(editingLogId?'history':'dashboard')">İptal</button><button class="btn" onclick="saveMaint()">Kaydet</button></div>
  </div>`;
  document.querySelectorAll('.pchk input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',function(){
      this.parentElement.querySelector('.binput').classList.toggle('hidden',!this.checked);
      this.parentElement.querySelector('.cinput').classList.toggle('hidden',!this.checked);
    });
  });
  customParts.forEach(p=>addCustomPart(p));
}

function renderExpenseForm(body,exp,type){
  const showKm=type==='yakit';
  const showDue=type==='sigorta'||type==='muayene';
  body.innerHTML=`<div class="fcard">
    <div class="frow">
      <div class="fg"><label>Tarih *</label><input type="date" id="e-date" value="${esc(exp?.date||new Date().toISOString().split('T')[0])}"></div>
      <div class="fg"><label>Tutar (₺) *</label><input type="number" id="e-amount" min="0" value="${esc(exp?.amount??'')}"></div>
      ${showKm?`<div class="fg"><label>Kilometre</label><input type="number" id="e-km" min="0" value="${esc(exp?.km??'')}"></div>`:''}
    </div>
    ${showDue?`<div class="fg"><label>Sonraki Yenileme Tarihi</label><input type="date" id="e-due" value="${esc(exp?.due_date||'')}"></div>`:''}
    <div class="fg"><label>Notlar</label><textarea id="e-notes" rows="3" placeholder="Detay...">${esc(exp?.notes||'')}</textarea></div>
    <div id="e-err" class="err-msg hidden"></div><div id="e-ok" class="ok-msg hidden">Kaydedildi!</div>
    <div class="facts"><button class="btn-s" onclick="navigate(editingExpenseId?'expenses':'dashboard')">İptal</button><button class="btn" onclick="saveExpense('${type}')">Kaydet</button></div>
  </div>`;
}

async function saveExpense(type){
  const date=document.getElementById('e-date').value;
  const amount=parseFloat(document.getElementById('e-amount').value)||0;
  const kmEl=document.getElementById('e-km');
  const km=kmEl?(parseInt(kmEl.value)||null):null;
  const dueEl=document.getElementById('e-due');
  const due_date=dueEl?(dueEl.value||null):null;
  const notes=document.getElementById('e-notes').value;
  const errEl=document.getElementById('e-err');const okEl=document.getElementById('e-ok');
  if(!date||!amount){errEl.textContent='Tarih ve tutar zorunlu.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  const body={type,date,amount,km,due_date,notes};
  try{
    const wasEditing=!!editingExpenseId;
    if(wasEditing)await window.api.expenses.update(editingExpenseId,body);
    else await window.api.expenses.create(state.selId,body);
    editingExpenseId=null;
    okEl.classList.remove('hidden');
    setTimeout(()=>navigate(wasEditing?'expenses':'dashboard'),1000);
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

function addCustomPart(prefill){
  const d=document.createElement('div');d.className='cprow';
  d.innerHTML=`<input class="cpname" placeholder="Parça adı" value="${esc(prefill?.name||'')}"><input class="cpbrand" placeholder="Marka / Not" value="${esc(prefill?.brand||'')}"><input type="number" class="cpcost" placeholder="₺" min="0" value="${esc(prefill?.cost||'')}"><button onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('custom-parts').appendChild(d);
}

async function saveMaint(){
  const km=parseInt(document.getElementById('m-km').value);
  const date=document.getElementById('m-date').value;
  const notes=document.getElementById('m-notes').value;
  const total_cost=parseFloat(document.getElementById('m-cost').value)||0;
  const service_name=document.getElementById('m-service').value.trim();
  const errEl=document.getElementById('m-err');const okEl=document.getElementById('m-ok');
  if(!km||!date){errEl.textContent='Kilometre ve tarih zorunlu.';errEl.classList.remove('hidden');return;}
  const parts=[];
  document.querySelectorAll('.pchk input[type=checkbox]:checked').forEach(cb=>{
    parts.push({key:cb.dataset.key,name:cb.dataset.name,brand:cb.parentElement.querySelector('.binput').value,cost:parseFloat(cb.parentElement.querySelector('.cinput').value)||0});
  });
  document.querySelectorAll('.cprow').forEach(r=>{
    const name=r.querySelector('.cpname').value.trim();
    if(name)parts.push({key:'custom_'+Date.now(),name,brand:r.querySelector('.cpbrand').value,cost:parseFloat(r.querySelector('.cpcost').value)||0});
  });
  if(!parts.length){errEl.textContent='En az bir parça seçin.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  try{
    const wasEditing=!!editingLogId;
    if(wasEditing)await API.put('/maintenance/log/'+editingLogId,{km,date,parts,notes,total_cost,service_name});
    else await API.post('/maintenance/'+state.selId,{km,date,parts,notes,total_cost,service_name});
    editingLogId=null;
    await loadVehicles();okEl.classList.remove('hidden');
    setTimeout(()=>navigate(wasEditing?'history':'dashboard'),1000);
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

async function renderHistory(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const rows=logs.map(l=>`<div class="lcard"><div class="lhead"><div><span class="lkm">${l.km.toLocaleString('tr-TR')} km</span><span class="ldate">${esc(l.date)}</span></div><div>${l.total_cost?`<span class="lcost">${l.total_cost.toLocaleString('tr-TR')} ₺</span>`:''}<button class="btn-s" onclick="editLog(${l.id})">Düzenle</button><button class="btn-d" onclick="delLog(${l.id})">Sil</button></div></div>${l.service_name?`<div class="lservice">${icon('wrench',13)} ${esc(l.service_name)}</div>`:''}<div class="lparts">${l.parts.map(p=>`<span class="ptag">${esc(p.name)}${p.brand?' · '+esc(p.brand):''}</span>`).join('')}</div>${l.notes?`<div class="lnotes">${esc(l.notes)}</div>`:''}</div>`).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Bakım Geçmişi</h2><button class="btn" onclick="navigate('add')">${icon('plus',14)} Bakım Ekle</button></div><div class="llist">${rows}</div></div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

function editLog(id){navigate('add',{type:'bakim',id});}

async function delLog(id){
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  await API.del('/maintenance/log/'+id);navigate('history');
}

function computeYearlyComparison(ys){
  const curY=String(new Date().getFullYear());
  const prevY=String(new Date().getFullYear()-1);
  const curTotal=ys.find(([y])=>y===curY)?.[1]||0;
  const prevTotal=ys.find(([y])=>y===prevY)?.[1]||0;
  const pct=prevTotal>0?Math.round(((curTotal-prevTotal)/prevTotal)*100):null;
  return{curY,prevY,curTotal,prevTotal,pct};
}

function computeNextExpenseEstimate(logs,expenses){
  const events=[...logs.map(l=>({date:l.date,amount:l.total_cost||0})),...expenses.map(e=>({date:e.date,amount:e.amount||0}))]
    .filter(e=>e.date).sort((a,b)=>a.date.localeCompare(b.date));
  if(events.length<2)return null;
  let totalGap=0,gapCount=0;
  for(let i=1;i<events.length;i++){
    const days=(new Date(events[i].date)-new Date(events[i-1].date))/86400000;
    if(days>=0){totalGap+=days;gapCount++;}
  }
  if(!gapCount)return null;
  const avgGapDays=Math.round(totalGap/gapCount);
  const avgAmount=events.reduce((s,e)=>s+e.amount,0)/events.length;
  const lastDate=events[events.length-1].date;
  const daysSinceLast=Math.max(0,Math.round((Date.now()-new Date(lastDate))/86400000));
  const est=new Date(lastDate);est.setDate(est.getDate()+avgGapDays);
  return{avgGapDays,avgAmount,daysSinceLast,estimatedNextDate:est.toISOString().split('T')[0]};
}

async function renderExpenses(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
    const logsTotal=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const expTotal=expenses.reduce((s,e)=>s+(e.amount||0),0);
    const total=logsTotal+expTotal;
    const byYear={},byPart={},byType={};
    logs.forEach(l=>{const y=l.date?.substring(0,4)||'?';byYear[y]=(byYear[y]||0)+(l.total_cost||0);l.parts.forEach(p=>{byPart[p.name]=(byPart[p.name]||0)+(p.cost||0);});});
    byType['Bakım']=logsTotal;
    expenses.forEach(e=>{
      const y=e.date?.substring(0,4)||'?';byYear[y]=(byYear[y]||0)+(e.amount||0);
      const label=EXPENSE_TYPES.find(t=>t.id===e.type)?.label||'Diğer';
      byType[label]=(byType[label]||0)+(e.amount||0);
    });
    const ys=Object.entries(byYear).sort((a,b)=>b[0]-a[0]);
    const ps=Object.entries(byPart).sort((a,b)=>b[1]-a[1]).slice(0,6);const maxP=ps[0]?.[1]||1;
    const ts=Object.entries(byType).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);const maxT=ts[0]?.[1]||1;
    const yc=computeYearlyComparison(ys);
    const est=computeNextExpenseEstimate(logs,expenses);
    const recentExp=expenses.map(e=>{
      const label=EXPENSE_TYPES.find(t=>t.id===e.type)?.label||'Diğer';
      return `<div class="lcard"><div class="lhead"><div><span class="lkm">${label}</span><span class="ldate">${esc(e.date)}</span></div><div><span class="lcost">${e.amount.toLocaleString('tr-TR')} ₺</span><button class="btn-s" onclick="editExpense(${e.id})">Düzenle</button><button class="btn-d" onclick="delExpense(${e.id})">Sil</button></div></div>${e.due_date?`<div class="lparts"><span class="ptag">Yenileme: ${esc(e.due_date)}</span></div>`:''}${e.notes?`<div class="lnotes">${esc(e.notes)}</div>`:''}</div>`;
    }).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Masraf Analizi</h2><button class="btn" onclick='navigate("add",{type:"yakit"})'>${icon('plus',14)} Masraf Ekle</button></div>
      <div class="scards"><div class="scard"><div class="scard-l">Toplam</div><div class="scard-v">${total.toLocaleString('tr-TR')} ₺</div></div><div class="scard"><div class="scard-l">Bakım Sayısı</div><div class="scard-v">${logs.length}</div></div><div class="scard"><div class="scard-l">Ort / Bakım</div><div class="scard-v">${logs.length?Math.round(logsTotal/logs.length).toLocaleString('tr-TR'):0} ₺</div></div></div>
      <div class="two">
        <div class="card"><div class="ctitle">Yıla Göre</div><div class="ebars">${ys.map(([y,c])=>`<div class="erow"><span class="ename">${esc(y)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/(total||1))*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
        <div class="card"><div class="ctitle">Parçaya Göre</div><div class="ebars">${ps.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxP)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="ctitle">Türe Göre</div><div class="ebars">${ts.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxT)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      <div class="two" style="margin-top:12px">
        <div class="card">
          <div class="ctitle">Yıllık Karşılaştırma</div>
          <div style="display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap">
            <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">${yc.curY}</div><div style="font-size:22px;font-weight:800">${yc.curTotal.toLocaleString('tr-TR')} ₺</div></div>
            <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">${yc.prevY}</div><div style="font-size:16px;font-weight:600;color:var(--t2)">${yc.prevTotal.toLocaleString('tr-TR')} ₺</div></div>
            ${yc.pct!==null?`<span class="badge ${yc.pct>0?'br':'bg'}">${yc.pct>0?'+':''}${yc.pct}%</span>`:''}
          </div>
          ${yc.prevTotal===0?'<p style="font-size:12px;color:var(--t3);margin-top:8px">Geçen yıl verisi yok, karşılaştırma yapılamıyor.</p>':''}
        </div>
        <div class="card">
          <div class="ctitle">Tahmini Sıradaki Masraf</div>
          ${est?`<p style="font-size:13px;color:var(--t2);margin-bottom:10px">Ortalama her <b>${est.avgGapDays}</b> günde bir masraf giriyorsun. Son masrafın <b>${est.daysSinceLast}</b> gün önceydi.</p>
          <div style="display:flex;gap:24px">
            <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">Tahmini Tutar</div><div style="font-size:20px;font-weight:800">~${Math.round(est.avgAmount).toLocaleString('tr-TR')} ₺</div></div>
            <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">Tahmini Tarih</div><div style="font-size:20px;font-weight:800">${est.estimatedNextDate}</div></div>
          </div>`:'<p style="font-size:12px;color:var(--t3)">Tahmin için en az 2 masraf kaydı gerekli.</p>'}
        </div>
      </div>
      <div class="slabel" style="margin-top:20px">Yakıt / Sigorta / Muayene Kayıtları</div>
      <div class="llist">${recentExp}</div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

function editExpense(id){
  const v=selVehicle();
  window.api.expenses.list(v.id).then(exps=>{
    const exp=exps.find(e=>e.id===id);
    if(exp)navigate('add',{type:exp.type,id});
  });
}

async function delExpense(id){
  if(!confirm('Bu masraf kaydını silmek istiyor musunuz?'))return;
  await window.api.expenses.delete(id);navigate('expenses');
}

let editingVehicleId=null;

async function renderVehicles(el){
  await loadVehicles();
  const cards=state.vehicles.map(v=>{
    const logoUrl=brandLogoUrl(v.brand);
    const iconHtml=v.photo?`<img src="${esc(v.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`:logoUrl?`<img src="${esc(logoUrl)}" alt="" style="width:26px;height:26px;object-fit:contain" onerror="handleLogoError(this,24)">`:carIcon(24);
    return `<div class="vci ${v.id===state.selId?'sel':''}" onclick="changeVehicle(${v.id});navigate('dashboard')"><div class="vci-icon">${iconHtml}</div><div class="vci-info"><h3>${esc(v.brand)} ${esc(v.model)}</h3><p>${esc(v.year||'')} ${esc(v.engine||'')}</p><p>${v.current_km.toLocaleString('tr-TR')} km</p></div><button class="btn-s" onclick="event.stopPropagation();showEditVehicle(${v.id})">Düzenle</button><button class="btn-d" onclick="event.stopPropagation();delVehicle(${v.id})">Sil</button></div>`;
  }).join('');
  el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Araçlar</h2><button class="btn" onclick="showAddVehicle()">${icon('plus',14)} Araç Ekle</button></div><div class="vlist">${cards}</div>
    <div id="add-v-form" class="fcard hidden"><h3 id="v-form-title">Yeni Araç</h3>
      <div class="frow"><div class="fg"><label>Marka *</label><div style="display:flex;gap:8px;align-items:center"><input id="v-brand" placeholder="Volvo" oninput="updateBrandLogoPreview()" style="flex:1"><div id="v-brand-logo" style="width:36px;height:36px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0"></div></div></div><div class="fg"><label>Model *</label><input id="v-model" placeholder="S60"></div></div>
      <div class="frow"><div class="fg"><label>Yıl</label><input id="v-year" type="number" placeholder="2011"></div><div class="fg"><label>Motor</label><input id="v-engine" placeholder="1.6 T4"></div></div>
      <div class="frow"><div class="fg"><label>Alındığı KM</label><input id="v-pkm" type="number" placeholder="0"></div><div class="fg"><label>Güncel KM</label><input id="v-ckm" type="number" placeholder="0"></div></div>
      <div class="fg"><label>Araç Fotoğrafı</label>
        <div id="v-photo-preview" class="photo-preview"><span>Fotoğraf yok</span></div>
        <div class="facts" style="justify-content:flex-start">
          <input type="file" id="v-photo-input" accept="image/*" onchange="handlePhotoSelect(event)">
          <button type="button" class="btn-s" onclick="removePhoto()">Kaldır</button>
        </div>
      </div>
      <div id="v-err" class="err-msg hidden"></div>
      <div class="facts"><button class="btn-s" onclick="hideVehicleForm()">İptal</button><button class="btn" onclick="saveVehicleForm()">Kaydet</button></div>
    </div>
  </div>`;
}

let pendingPhoto=null;

function renderPhotoPreview(){
  const el=document.getElementById('v-photo-preview');
  if(!el)return;
  el.innerHTML=pendingPhoto?`<img src="${pendingPhoto}" alt="">`:'<span>Fotoğraf yok</span>';
}

function resizeImageFile(file,maxDim,quality){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let{width,height}=img;
        if(width>height){if(width>maxDim){height=Math.round(height*maxDim/width);width=maxDim;}}
        else{if(height>maxDim){width=Math.round(width*maxDim/height);height=maxDim;}}
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        canvas.getContext('2d').drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.onerror=()=>reject(new Error('Görsel okunamadı'));
      img.src=reader.result;
    };
    reader.onerror=()=>reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

async function handlePhotoSelect(ev){
  const file=ev.target.files[0];
  if(!file)return;
  try{
    pendingPhoto=await resizeImageFile(file,960,0.82);
    renderPhotoPreview();
  }catch(e){alert('Fotoğraf yüklenemedi: '+e.message);}
}

function removePhoto(){
  pendingPhoto=null;
  const input=document.getElementById('v-photo-input');
  if(input)input.value='';
  renderPhotoPreview();
}

function showAddVehicle(){
  editingVehicleId=null;
  pendingPhoto=null;
  document.getElementById('v-form-title').textContent='Yeni Araç';
  ['v-brand','v-model','v-year','v-engine','v-pkm','v-ckm','v-photo-input'].forEach(id=>document.getElementById(id).value='');
  renderPhotoPreview();
  updateBrandLogoPreview();
  document.getElementById('add-v-form').classList.remove('hidden');
}

function showEditVehicle(id){
  const v=state.vehicles.find(x=>x.id===id);
  if(!v)return;
  editingVehicleId=id;
  pendingPhoto=v.photo||null;
  document.getElementById('v-form-title').textContent='Aracı Düzenle';
  document.getElementById('v-brand').value=v.brand;
  document.getElementById('v-model').value=v.model;
  document.getElementById('v-year').value=v.year||'';
  document.getElementById('v-engine').value=v.engine||'';
  document.getElementById('v-pkm').value=v.purchase_km||0;
  document.getElementById('v-ckm').value=v.current_km||0;
  document.getElementById('v-photo-input').value='';
  renderPhotoPreview();
  updateBrandLogoPreview();
  document.getElementById('add-v-form').classList.remove('hidden');
}

function hideVehicleForm(){
  editingVehicleId=null;
  document.getElementById('add-v-form').classList.add('hidden');
}

async function saveVehicleForm(){
  const brand=document.getElementById('v-brand').value.trim();
  const model=document.getElementById('v-model').value.trim();
  const errEl=document.getElementById('v-err');
  if(!brand||!model){errEl.textContent='Marka ve model zorunlu.';errEl.classList.remove('hidden');return;}
  const body={brand,model,year:document.getElementById('v-year').value||null,engine:document.getElementById('v-engine').value||null,purchase_km:parseInt(document.getElementById('v-pkm').value)||0,current_km:parseInt(document.getElementById('v-ckm').value)||0,photo:pendingPhoto};
  try{
    if(editingVehicleId){
      await API.put('/vehicles/'+editingVehicleId,body);
    }else{
      const v=await API.post('/vehicles',body);
      state.selId=v.id;
    }
    editingVehicleId=null;
    navigate('vehicles');
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

async function delVehicle(id){
  if(!confirm('Bu aracı ve tüm bakım kayıtlarını silmek istiyor musunuz?'))return;
  await API.del('/vehicles/'+id);
  if(state.selId===id)state.selId=null;
  await loadVehicles();navigate('vehicles');
}

function renderSettings(el){
  const theme=getEffectiveTheme();
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Ayarlar</h2>
  <div class="fcard"><h3>Görünüm</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Uygulamanın açık ya da koyu temada görünmesini seç.</p>
    <div class="seg">
      <button class="seg-btn ${theme==='light'?'active':''}" data-theme-btn="light" onclick="setTheme('light')">${icon('sun',16)} Açık</button>
      <button class="seg-btn ${theme==='dark'?'active':''}" data-theme-btn="dark" onclick="setTheme('dark')">${icon('moon',16)} Koyu</button>
    </div>
  </div>
  <div class="fcard"><h3>Veri Yedekleme</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Tüm araç ve bakım verilerini bir JSON dosyasına kaydedebilir ya da önceden alınmış bir yedeği geri yükleyebilirsin.</p>
    <div id="bk-msg" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:flex-start">
      <button class="btn-s" onclick="importBackup()">Yedekten Geri Yükle</button>
      <button class="btn" onclick="exportBackup()">Yedek Al</button>
    </div>
  </div>
  <div class="fcard"><h3>Marka Logosu (CDN)</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Kendi resim sunucun (CDN) varsa, araç markası yazıldığında logosunu otomatik göstermek için adres şablonunu buraya yapıştır. <code>{marka}</code> yerine marka adı otomatik geçer (küçük harfe çevrilip boşluklar tire yapılır). Örnek: <code>https://ornek-cdn.com/logos/{marka}.png</code>. Boş bırakırsan araba ikonu kullanılır.</p>
    <div class="fg"><input id="logo-cdn-input" placeholder="https://ornek-cdn.com/logos/{marka}.png" value="${esc(localStorage.getItem('logoCdnTemplate')||'')}"></div>
    <div id="logo-msg" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:flex-start"><button class="btn" onclick="saveLogoCdn()">Kaydet</button></div>
  </div></div>`;
}

function saveLogoCdn(){
  const val=document.getElementById('logo-cdn-input').value.trim();
  if(val)localStorage.setItem('logoCdnTemplate',val);else localStorage.removeItem('logoCdnTemplate');
  const el=document.getElementById('logo-msg');
  el.textContent='Kaydedildi.';el.classList.remove('hidden');
}

function showBackupMsg(text){
  const el=document.getElementById('bk-msg');
  el.textContent=text;el.classList.remove('hidden');
}

async function exportBackup(){
  const r=await window.api.backup.export();
  if(r.success)showBackupMsg('Yedek kaydedildi: '+r.filePath);
}

async function importBackup(){
  if(!confirm('Mevcut tüm veriler, seçtiğin yedek dosyasındaki verilerle değiştirilecek. Emin misin?'))return;
  try{
    const r=await window.api.backup.import();
    if(r.success){await loadVehicles();navigate('settings');showBackupMsg('Geri yükleme tamamlandı.');}
  }catch(e){alert('Hata: '+e.message);}
}

init();