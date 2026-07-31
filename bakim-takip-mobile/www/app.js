const PARTS=[{key:'motor_yagi',name:'Motor Yağı',km:7000},{key:'yag_filtresi',name:'Yağ Filtresi',km:7000},{key:'hava_filtresi',name:'Hava Filtresi',km:15000},{key:'polen_filtresi',name:'Polen Filtresi',km:15000},{key:'yakit_filtresi',name:'Yakıt Filtresi',km:30000},{key:'triger',name:'Triger Kayışı',km:60000},{key:'devirdaim',name:'Devirdaim Pompası',km:60000},{key:'bujiler',name:'Bujiler',km:40000},{key:'on_balata',name:'Ön Fren Balata',km:40000},{key:'arka_balata',name:'Arka Fren Balata',km:40000},{key:'fren_diski',name:'Fren Diski',km:60000},{key:'antifriz',name:'Antifriz',km:40000},{key:'sanziman_yagi',name:'Şanzıman Yağı',km:60000},{key:'direksiyon_yagi',name:'Direksiyon Yağı',km:40000},{key:'klima_gazi',name:'Klima Gazı',km:40000}];

const EXPENSE_TYPES=[{id:'bakim',label:'Bakım'},{id:'yakit',label:'Yakıt'},{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];
const DUE_TYPES=[{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];
const TYPE_COLORS={'Bakım':'#3D63DD','Yakıt':'#EF9F27','Sigorta':'#8B5CF6','Muayene':'#0EA5A5'};
const CHART_BLUE='#3D63DD';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function carIcon(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" fill="currentColor"><path d="M228 620 C228 590 250 566 284 560 L300 494 C312 452 350 424 396 424 L628 424 C674 424 712 452 724 494 L740 560 C774 566 796 590 796 620 L796 668 C796 690 778 708 756 708 L268 708 C246 708 228 690 228 668 Z"/><circle cx="352" cy="716" r="60"/><circle cx="672" cy="716" r="60"/></svg>`;
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
function themeBtnLabel(){
  return getEffectiveTheme()==='dark'?'🌙 Koyu Mod':'☀️ Açık Mod';
}
function toggleTheme(){
  const next=getEffectiveTheme()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('theme',next);
  const btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=themeBtnLabel();
  if(state.view==='expenses')navigate('expenses');
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
  const nav=[{id:'dashboard',icon:'▦',label:'Dashboard'},{id:'add',icon:'+',label:'Bakım Ekle'},{id:'history',icon:'◷',label:'Geçmiş'},{id:'expenses',icon:'₺',label:'Masraflar'},{id:'vehicles',icon:'◈',label:'Araçlar'},{id:'settings',icon:'⚙',label:'Ayarlar'}];
  const opts=state.vehicles.map(v=>`<option value="${v.id}" ${v.id===state.selId?'selected':''}>${esc(v.brand)} ${esc(v.model)}</option>`).join('');
  document.getElementById('app').innerHTML=`<div class="layout">
    <div class="sb">
      <div class="sb-top">
        <div class="sb-logo"><div style="width:30px;height:30px;background:var(--blue);color:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${carIcon(18)}</div><span>Bakım Takip</span></div>
        ${state.vehicles.length?`<div class="v-sel-wrap"><select class="v-sel" onchange="changeVehicle(this.value)">${opts}</select></div>`:''}
      </div>
      <nav>${nav.map(n=>`<div class="nav-item ${view===n.id?'active':''}" onclick="navigate('${n.id}')"><span class="ni">${n.icon}</span><span>${n.label}</span></div>`).join('')}</nav>
      <div class="sb-bottom"><button class="theme-toggle" id="theme-btn" onclick="toggleTheme()">${themeBtnLabel()}</button></div>
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

async function renderDashboard(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty"><p>Araç yok.</p><br><button class="btn" onclick="navigate('vehicles')">Araç Ekle</button></div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
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
    el.innerHTML=`<div class="vc">
      <div class="vh-card"><div class="vh-icon" style="background:#fff;color:var(--blue)">${carIcon(30)}</div><div class="vh-info"><h2>${esc(v.brand)} ${esc(v.model)}</h2><p>${esc(v.year||'')} ${esc(v.engine||'')}</p></div><div class="vh-km"><span class="km-v">${v.current_km.toLocaleString('tr-TR')}</span><span class="km-l">km</span></div></div>
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
    <div class="fg"><label>Değiştirilen Parçalar</label><div class="pcl">${PARTS.map(p=>{
      const checked=checkedKeys.has(p.key);
      const existing=(log?.parts||[]).find(x=>x.key===p.key);
      return `<label class="pchk"><input type="checkbox" data-key="${p.key}" data-name="${p.name}" ${checked?'checked':''}><span>${p.name}</span><input type="text" class="binput ${checked?'':'hidden'}" placeholder="Marka / Not" value="${esc(existing?.brand||'')}"><input type="number" class="cinput ${checked?'':'hidden'}" placeholder="₺" min="0" value="${esc(existing?.cost||'')}"></label>`;
    }).join('')}</div></div>
    <div class="fg"><label>Serbest Parça</label><div id="custom-parts"></div><button class="btn-s" onclick="addCustomPart()">+ Parça Ekle</button></div>
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
    if(wasEditing)await API.put('/maintenance/log/'+editingLogId,{km,date,parts,notes,total_cost});
    else await API.post('/maintenance/'+state.selId,{km,date,parts,notes,total_cost});
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
    const rows=logs.map(l=>`<div class="lcard"><div class="lhead"><div><span class="lkm">${l.km.toLocaleString('tr-TR')} km</span><span class="ldate">${esc(l.date)}</span></div><div>${l.total_cost?`<span class="lcost">${l.total_cost.toLocaleString('tr-TR')} ₺</span>`:''}<button class="btn-s" onclick="editLog(${l.id})">Düzenle</button><button class="btn-d" onclick="delLog(${l.id})">Sil</button></div></div><div class="lparts">${l.parts.map(p=>`<span class="ptag">${esc(p.name)}${p.brand?' · '+esc(p.brand):''}</span>`).join('')}</div>${l.notes?`<div class="lnotes">${esc(l.notes)}</div>`:''}</div>`).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Bakım Geçmişi</h2><button class="btn" onclick="navigate('add')">+ Bakım Ekle</button></div><div class="llist">${rows}</div></div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

function editLog(id){navigate('add',{type:'bakim',id});}

async function delLog(id){
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  await API.del('/maintenance/log/'+id);navigate('history');
}

function computeExpenseStats(logs,expenses){
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
  const ps=Object.entries(byPart).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const ts=Object.entries(byType).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);
  return{logsTotal,expTotal,total,ys,ps,ts};
}

async function renderExpenses(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
    const{logsTotal,total,ys,ps,ts}=computeExpenseStats(logs,expenses);
    const maxP=ps[0]?.[1]||1;const maxT=ts[0]?.[1]||1;
    const recentExp=expenses.map(e=>{
      const label=EXPENSE_TYPES.find(t=>t.id===e.type)?.label||'Diğer';
      return `<div class="lcard"><div class="lhead"><div><span class="lkm">${label}</span><span class="ldate">${esc(e.date)}</span></div><div><span class="lcost">${e.amount.toLocaleString('tr-TR')} ₺</span><button class="btn-s" onclick="editExpense(${e.id})">Düzenle</button><button class="btn-d" onclick="delExpense(${e.id})">Sil</button></div></div>${e.due_date?`<div class="lparts"><span class="ptag">Yenileme: ${esc(e.due_date)}</span></div>`:''}${e.notes?`<div class="lnotes">${esc(e.notes)}</div>`:''}</div>`;
    }).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Masraf Analizi</h2><div style="display:flex;gap:8px"><button class="btn-s" id="pdf-btn" onclick="generateReport()">📄 PDF Rapor</button><button class="btn" onclick='navigate("add",{type:"yakit"})'>+ Masraf Ekle</button></div></div>
      <div class="scards"><div class="scard"><div class="scard-l">Toplam</div><div class="scard-v">${total.toLocaleString('tr-TR')} ₺</div></div><div class="scard"><div class="scard-l">Bakım Sayısı</div><div class="scard-v">${logs.length}</div></div><div class="scard"><div class="scard-l">Ort / Bakım</div><div class="scard-v">${logs.length?Math.round(logsTotal/logs.length).toLocaleString('tr-TR'):0} ₺</div></div></div>
      <div class="two">
        <div class="card"><div class="ctitle">Yıla Göre</div><div class="chart-wrap"><canvas id="chart-year"></canvas></div><div class="ebars">${ys.map(([y,c])=>`<div class="erow"><span class="ename">${esc(y)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/(total||1))*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
        <div class="card"><div class="ctitle">Parçaya Göre</div><div class="chart-wrap"><canvas id="chart-part"></canvas></div><div class="ebars">${ps.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxP)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="ctitle">Türe Göre</div><div class="chart-wrap donut"><canvas id="chart-type"></canvas></div><div class="ebars">${ts.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxT)*100)}%;background:${TYPE_COLORS[n]||CHART_BLUE}"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      <div class="slabel" style="margin-top:20px">Yakıt / Sigorta / Muayene Kayıtları</div>
      <div class="llist">${recentExp}</div>
    </div>`;
    renderExpenseCharts(ys,ps,ts);
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

function renderExpenseCharts(ys,ps,ts){
  const dark=getEffectiveTheme()==='dark';
  const textColor=dark?'#94A3B8':'#64748B';
  const gridColor=dark?'rgba(255,255,255,0.07)':'rgba(15,23,42,0.06)';
  Chart.defaults.color=textColor;
  const yearsAsc=[...ys].sort((a,b)=>a[0].localeCompare(b[0]));
  Chart.getChart('chart-year')?.destroy();
  new Chart(document.getElementById('chart-year'),{type:'bar',
    data:{labels:yearsAsc.map(([y])=>y),datasets:[{data:yearsAsc.map(([,c])=>c),backgroundColor:CHART_BLUE,borderRadius:4,maxBarThickness:36}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y.toLocaleString('tr-TR')+' ₺'}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v.toLocaleString('tr-TR'),color:textColor},grid:{color:gridColor}},x:{grid:{display:false},ticks:{color:textColor}}}}});
  Chart.getChart('chart-part')?.destroy();
  new Chart(document.getElementById('chart-part'),{type:'bar',
    data:{labels:ps.map(([n])=>n),datasets:[{data:ps.map(([,c])=>c),backgroundColor:CHART_BLUE,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.x.toLocaleString('tr-TR')+' ₺'}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>v.toLocaleString('tr-TR'),color:textColor},grid:{color:gridColor}},y:{grid:{display:false},ticks:{color:textColor}}}}});
  Chart.getChart('chart-type')?.destroy();
  new Chart(document.getElementById('chart-type'),{type:'doughnut',
    data:{labels:ts.map(([n])=>n),datasets:[{data:ts.map(([,c])=>c),backgroundColor:ts.map(([n])=>TYPE_COLORS[n]||'#9CA3AF'),borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:12,font:{size:11},color:textColor}},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed.toLocaleString('tr-TR')+' ₺'}}}}});
}

async function chartToImage(config,w,h){
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const chart=new Chart(canvas,{...config,options:{...config.options,responsive:false,maintainAspectRatio:false,animation:false}});
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const img=canvas.toDataURL('image/png');
  chart.destroy();
  return img;
}

async function generateReport(){
  const v=selVehicle();
  if(!v)return;
  const btn=document.getElementById('pdf-btn');
  const prevLabel=btn.textContent;
  btn.textContent='Oluşturuluyor...';btn.disabled=true;
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
    const{logsTotal,total,ys,ps,ts}=computeExpenseStats(logs,expenses);
    const yearsAsc=[...ys].sort((a,b)=>a[0].localeCompare(b[0]));
    const typeImg=await chartToImage({type:'doughnut',data:{labels:ts.map(([n])=>n),datasets:[{data:ts.map(([,c])=>c),backgroundColor:ts.map(([n])=>TYPE_COLORS[n]||'#9CA3AF'),borderWidth:0}]},options:{cutout:'60%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:12}}}}}},520,340);
    const yearImg=await chartToImage({type:'bar',data:{labels:yearsAsc.map(([y])=>y),datasets:[{data:yearsAsc.map(([,c])=>c),backgroundColor:CHART_BLUE,borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}},520,340);
    const partImg=ps.length?await chartToImage({type:'bar',data:{labels:ps.map(([n])=>n),datasets:[{data:ps.map(([,c])=>c),backgroundColor:CHART_BLUE,borderRadius:4}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}},1080,340):null;

    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    doc.addFileToVFS('Roboto-Regular.ttf',window.ROBOTO_FONTS.regular);
    doc.addFont('Roboto-Regular.ttf','Roboto','normal');
    doc.addFileToVFS('Roboto-Bold.ttf',window.ROBOTO_FONTS.bold);
    doc.addFont('Roboto-Bold.ttf','Roboto','bold');
    doc.setFont('Roboto','normal');

    const pageW=doc.internal.pageSize.getWidth();
    const pageH=doc.internal.pageSize.getHeight();
    const mx=15;let y=18;

    doc.setFont('Roboto','bold');doc.setFontSize(17);doc.setTextColor(24,95,165);
    doc.text('Araç Bakım & Masraf Raporu',mx,y);y+=8;
    doc.setFont('Roboto','normal');doc.setFontSize(10);doc.setTextColor(107,114,128);
    doc.text(`${v.brand} ${v.model}${v.year?' · '+v.year:''}${v.engine?' · '+v.engine:''}`,mx,y);y+=5;
    doc.text(`Güncel KM: ${v.current_km.toLocaleString('tr-TR')}   ·   Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,mx,y);y+=9;

    doc.setFont('Roboto','bold');doc.setFontSize(11);doc.setTextColor(26,29,35);
    doc.text(`Toplam Masraf: ${total.toLocaleString('tr-TR')} ₺`,mx,y);
    doc.text(`Bakım Sayısı: ${logs.length}`,mx+85,y);
    doc.text(`Ort / Bakım: ${(logs.length?Math.round(logsTotal/logs.length):0).toLocaleString('tr-TR')} ₺`,mx+135,y);
    y+=8;

    const chartW=(pageW-2*mx-8)/2,chartH=chartW*0.64;
    doc.addImage(typeImg,'PNG',mx,y,chartW,chartH);
    doc.addImage(yearImg,'PNG',mx+chartW+8,y,chartW,chartH);
    y+=chartH+8;
    if(partImg){const pw2=pageW-2*mx,ph2=pw2*0.32;doc.addImage(partImg,'PNG',mx,y,pw2,ph2);y+=ph2+8;}

    doc.setFont('Roboto','bold');doc.setFontSize(12);doc.setTextColor(26,29,35);
    doc.text('Bakım Geçmişi',mx,y);y+=4;
    doc.autoTable({startY:y,
      head:[['KM','Tarih','Parçalar','Tutar (₺)']],
      body:logs.map(l=>[l.km.toLocaleString('tr-TR'),l.date,l.parts.map(p=>p.name).join(', '),(l.total_cost||0).toLocaleString('tr-TR')]),
      styles:{font:'Roboto',fontSize:8,cellPadding:2.5},
      headStyles:{fillColor:[24,95,165],textColor:255,font:'Roboto',fontStyle:'bold'},
      alternateRowStyles:{fillColor:[246,247,249]},
      margin:{left:mx,right:mx},
      columnStyles:{0:{cellWidth:20},1:{cellWidth:22},3:{cellWidth:24,halign:'right'}}});
    y=doc.lastAutoTable.finalY+10;
    if(y>pageH-40){doc.addPage();y=18;}

    doc.setFont('Roboto','bold');doc.setFontSize(12);doc.setTextColor(26,29,35);
    doc.text('Yakıt / Sigorta / Muayene Kayıtları',mx,y);y+=4;
    doc.autoTable({startY:y,
      head:[['Tür','Tarih','Tutar (₺)','Not']],
      body:expenses.map(e=>[EXPENSE_TYPES.find(t=>t.id===e.type)?.label||'Diğer',e.date,e.amount.toLocaleString('tr-TR'),e.notes||'']),
      styles:{font:'Roboto',fontSize:8,cellPadding:2.5},
      headStyles:{fillColor:[24,95,165],textColor:255,font:'Roboto',fontStyle:'bold'},
      alternateRowStyles:{fillColor:[246,247,249]},
      margin:{left:mx,right:mx}});

    const pageCount=doc.internal.getNumberOfPages();
    for(let i=1;i<=pageCount;i++){
      doc.setPage(i);
      doc.setFont('Roboto','normal');doc.setFontSize(8);doc.setTextColor(156,163,175);
      doc.text(`Bakım Takip · Sayfa ${i}/${pageCount}`,pageW-mx,pageH-8,{align:'right'});
    }

    const blob=doc.output('blob');
    const filename=`bakim-takip-rapor-${v.brand}-${v.model}-${new Date().toISOString().slice(0,10)}.pdf`.replace(/\s+/g,'-');
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }catch(e){alert('Rapor oluşturulamadı: '+e.message);}
  finally{btn.textContent=prevLabel;btn.disabled=false;}
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
  const cards=state.vehicles.map(v=>`<div class="vci ${v.id===state.selId?'sel':''}" onclick="changeVehicle(${v.id});navigate('dashboard')"><div class="vci-icon">${carIcon(24)}</div><div class="vci-info"><h3>${esc(v.brand)} ${esc(v.model)}</h3><p>${esc(v.year||'')} ${esc(v.engine||'')}</p><p>${v.current_km.toLocaleString('tr-TR')} km</p></div><button class="btn-s" onclick="event.stopPropagation();showEditVehicle(${v.id})">Düzenle</button><button class="btn-d" onclick="event.stopPropagation();delVehicle(${v.id})">Sil</button></div>`).join('');
  el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Araçlar</h2><button class="btn" onclick="showAddVehicle()">+ Araç Ekle</button></div><div class="vlist">${cards}</div>
    <div id="add-v-form" class="fcard hidden"><h3 id="v-form-title">Yeni Araç</h3>
      <div class="frow"><div class="fg"><label>Marka *</label><input id="v-brand" placeholder="Volvo"></div><div class="fg"><label>Model *</label><input id="v-model" placeholder="S60"></div></div>
      <div class="frow"><div class="fg"><label>Yıl</label><input id="v-year" type="number" placeholder="2011"></div><div class="fg"><label>Motor</label><input id="v-engine" placeholder="1.6 T4"></div></div>
      <div class="frow"><div class="fg"><label>Alındığı KM</label><input id="v-pkm" type="number" placeholder="0"></div><div class="fg"><label>Güncel KM</label><input id="v-ckm" type="number" placeholder="0"></div></div>
      <div id="v-err" class="err-msg hidden"></div>
      <div class="facts"><button class="btn-s" onclick="hideVehicleForm()">İptal</button><button class="btn" onclick="saveVehicleForm()">Kaydet</button></div>
    </div>
  </div>`;
}

function showAddVehicle(){
  editingVehicleId=null;
  document.getElementById('v-form-title').textContent='Yeni Araç';
  ['v-brand','v-model','v-year','v-engine','v-pkm','v-ckm'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('add-v-form').classList.remove('hidden');
}

function showEditVehicle(id){
  const v=state.vehicles.find(x=>x.id===id);
  if(!v)return;
  editingVehicleId=id;
  document.getElementById('v-form-title').textContent='Aracı Düzenle';
  document.getElementById('v-brand').value=v.brand;
  document.getElementById('v-model').value=v.model;
  document.getElementById('v-year').value=v.year||'';
  document.getElementById('v-engine').value=v.engine||'';
  document.getElementById('v-pkm').value=v.purchase_km||0;
  document.getElementById('v-ckm').value=v.current_km||0;
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
  const body={brand,model,year:document.getElementById('v-year').value||null,engine:document.getElementById('v-engine').value||null,purchase_km:parseInt(document.getElementById('v-pkm').value)||0,current_km:parseInt(document.getElementById('v-ckm').value)||0};
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
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Ayarlar</h2><div class="fcard"><h3>Veri Yedekleme</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Tüm araç ve bakım verilerini bir JSON dosyasına kaydedebilir ya da önceden alınmış bir yedeği geri yükleyebilirsin.</p>
    <div id="bk-msg" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:flex-start">
      <button class="btn-s" onclick="importBackup()">Yedekten Geri Yükle</button>
      <button class="btn" onclick="exportBackup()">Yedek Al</button>
    </div>
  </div></div>`;
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