const PARTS=[{key:'motor_yagi',name:'Motor Yağı',km:7000},{key:'yag_filtresi',name:'Yağ Filtresi',km:7000},{key:'hava_filtresi',name:'Hava Filtresi',km:15000},{key:'polen_filtresi',name:'Polen Filtresi',km:15000},{key:'yakit_filtresi',name:'Yakıt Filtresi',km:30000},{key:'triger',name:'Triger Kayışı',km:60000},{key:'devirdaim',name:'Devirdaim Pompası',km:60000},{key:'bujiler',name:'Bujiler',km:40000},{key:'on_balata',name:'Ön Fren Balata',km:40000},{key:'arka_balata',name:'Arka Fren Balata',km:40000},{key:'fren_diski',name:'Fren Diski',km:60000},{key:'antifriz',name:'Antifriz',km:40000},{key:'sanziman_yagi',name:'Şanzıman Yağı',km:60000},{key:'direksiyon_yagi',name:'Direksiyon Yağı',km:40000},{key:'klima_gazi',name:'Klima Gazı',km:40000}];

const EXPENSE_TYPES=[{id:'bakim',label:'Bakım'},{id:'yakit',label:'Yakıt'},{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];
const DUE_TYPES=[{id:'sigorta',label:'Sigorta'},{id:'muayene',label:'Muayene'}];

let state={vehicles:[],selId:null,view:'dashboard'};
// Dashboard'un en üstündeki uyarı banner'ının (renderWarningsSummary) son hesapladığı
// toplam uyarı sayısı. Sidebar'daki Dashboard nav rozetini doldurmak için kullanılır —
// renderLayout her navigate()'te bu tekil değişkenden okur, bu yüzden bir adım geriden
// gelebilir (önceki dashboard render'ından), sonraki hesaplama bittiğinde rozet DOM'da
// doğrudan güncellenir (bkz. renderWarningsSummary).
let warningCount=0;

// NOT: ID'ler artık Firestore doküman ID'leri (alfasayısal string), eski IndexedDB
// autoIncrement sayılar değil — path regex'leri (\d+) yerine (.+) kullanır ve
// parseInt() çağrıları kaldırılmıştır. put/del ayrıca opsiyonel bir vehicleId
// parametresi alır: Firestore'da maintenance/expense kayıtları aracın altında
// subcollection olduğundan, güncelleme/silme için hangi aracın altında
// aranacağını bilmek gerekir (idb-adapter bunu kullanmaz, zararsızca yok sayar).
const API={
  async get(path){
    if(path==='/vehicles')return window.api.vehicles.list();
    const m=path.match(/^\/maintenance\/(.+)$/);
    if(m)return window.api.maintenance.list(m[1]);
    throw new Error('Bilinmeyen istek: '+path);
  },
  async post(path,body){
    if(path==='/vehicles')return window.api.vehicles.create(body);
    const m=path.match(/^\/maintenance\/(.+)$/);
    if(m)return window.api.maintenance.create(m[1],body);
    throw new Error('Bilinmeyen istek: '+path);
  },
  async put(path,body,vehicleId){
    const m=path.match(/^\/vehicles\/(.+)$/);
    if(m)return window.api.vehicles.update(m[1],body);
    const ml=path.match(/^\/maintenance\/log\/(.+)$/);
    if(ml)return window.api.maintenance.updateLog(ml[1],body,vehicleId);
    throw new Error('Bilinmeyen istek: '+path);
  },
  async del(path,vehicleId){
    const mv=path.match(/^\/vehicles\/(.+)$/);
    if(mv)return window.api.vehicles.delete(mv[1]);
    const ml=path.match(/^\/maintenance\/log\/(.+)$/);
    if(ml)return window.api.maintenance.deleteLog(ml[1],vehicleId);
    throw new Error('Bilinmeyen istek: '+path);
  },
};

// Kimlik doğrulama akışı window.authApi (firebase-adapter.js) üzerinden yürütülür.
// onAuthStateChanged, oturum her değiştiğinde (açılış, giriş, çıkış) tetiklenir;
// giriş yoksa login ekranı, girişliyse mevcut dashboard akışı gösterilir.
function init(){
  window.authApi.onAuthStateChanged(async(user)=>{
    if(!user){state.vehicles=[];state.selId=null;renderLogin();return;}
    try{await loadVehicles();navigate('dashboard');}
    catch(e){document.getElementById('app').innerHTML=`<div class="vc"><div class="err-msg">Veri yüklenemedi: ${e.message}</div></div>`;}
  });
}

function isValidEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}

function authErrorMessage(e){
  const map={
    'auth/invalid-credential':'E-posta veya şifre hatalı.',
    'auth/invalid-email':'Geçerli bir e-posta girin.',
    'auth/user-not-found':'E-posta veya şifre hatalı.',
    'auth/wrong-password':'E-posta veya şifre hatalı.',
    'auth/email-already-in-use':'Bu e-posta ile zaten bir hesap var.',
    'auth/weak-password':'Şifre en az 8 karakter olmalı.',
    'auth/too-many-requests':'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
    'auth/network-request-failed':'Bağlantı hatası, internetinizi kontrol edin.',
  };
  return map[e.code]||e.message;
}

function renderAuthShell(title,bodyHtml){
  document.getElementById('app').innerHTML=`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="width:100%;max-width:380px">
      <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:24px">
        <svg width="30" height="30" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#185FA5"/><path d="M8 28L20 14l12 14" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="22" r="3" fill="#fff"/></svg>
        <span style="font-size:17px;font-weight:500">Bakım Takip</span>
      </div>
      <div class="fcard" style="margin-top:0"><h3>${title}</h3>${bodyHtml}</div>
    </div>
  </div>`;
}

function renderLogin(){
  renderAuthShell('Giriş Yap',`
    <div class="fg"><label>E-posta</label><input type="email" id="lg-email" placeholder="ornek@eposta.com"></div>
    <div class="fg"><label>Şifre</label><input type="password" id="lg-pass" placeholder="••••••••"></div>
    <div id="lg-err" class="err-msg hidden"></div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doLogin()">Giriş Yap</button></div>
    <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px">
      <span class="btn-t" style="cursor:pointer" onclick="renderForgotPassword()">Şifremi Unuttum</span>
      <span class="btn-t" style="cursor:pointer" onclick="renderRegister()">Hesabın yok mu? Kayıt Ol</span>
    </div>`);
}

async function doLogin(){
  const email=document.getElementById('lg-email').value.trim();
  const pass=document.getElementById('lg-pass').value;
  const errEl=document.getElementById('lg-err');
  if(!isValidEmail(email)){errEl.textContent='Geçerli bir e-posta girin.';errEl.classList.remove('hidden');return;}
  if(!pass){errEl.textContent='Şifre gerekli.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  try{await window.authApi.login(email,pass);}
  catch(e){errEl.textContent=authErrorMessage(e);errEl.classList.remove('hidden');}
}

function renderRegister(){
  renderAuthShell('Kayıt Ol',`
    <div class="fg"><label>Ad Soyad</label><input type="text" id="rg-name" placeholder="Adınız Soyadınız"></div>
    <div class="fg"><label>E-posta</label><input type="email" id="rg-email" placeholder="ornek@eposta.com"></div>
    <div class="fg"><label>Şifre</label><input type="password" id="rg-pass" placeholder="En az 8 karakter"></div>
    <div class="fg"><label>Şifre (Tekrar)</label><input type="password" id="rg-pass2" placeholder="••••••••"></div>
    <div id="rg-err" class="err-msg hidden"></div>
    <div id="rg-ok" class="ok-msg hidden">Kayıt başarılı! Doğrulama e-postası gönderildi.</div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doRegister()">Kayıt Ol</button></div>
    <div style="text-align:center;margin-top:14px;font-size:12px"><span class="btn-t" style="cursor:pointer" onclick="renderLogin()">Zaten hesabın var mı? Giriş Yap</span></div>`);
}

async function doRegister(){
  const name=document.getElementById('rg-name').value.trim();
  const email=document.getElementById('rg-email').value.trim();
  const pass=document.getElementById('rg-pass').value;
  const pass2=document.getElementById('rg-pass2').value;
  const errEl=document.getElementById('rg-err');const okEl=document.getElementById('rg-ok');
  if(!name){errEl.textContent='Ad soyad zorunlu.';errEl.classList.remove('hidden');return;}
  if(!isValidEmail(email)){errEl.textContent='Geçerli bir e-posta girin.';errEl.classList.remove('hidden');return;}
  if(pass.length<8){errEl.textContent='Şifre en az 8 karakter olmalı.';errEl.classList.remove('hidden');return;}
  if(pass!==pass2){errEl.textContent='Şifreler eşleşmiyor.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  try{
    await window.authApi.register(email,pass,name);
    okEl.classList.remove('hidden');
  }catch(e){errEl.textContent=authErrorMessage(e);errEl.classList.remove('hidden');}
}

function renderForgotPassword(){
  renderAuthShell('Şifremi Unuttum',`
    <div class="fg"><label>E-posta</label><input type="email" id="fp-email" placeholder="ornek@eposta.com"></div>
    <div id="fp-err" class="err-msg hidden"></div>
    <div id="fp-ok" class="ok-msg hidden">Bu e-posta kayıtlıysa bir bağlantı gönderdik.</div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doForgotPassword()">Bağlantı Gönder</button></div>
    <div style="text-align:center;margin-top:14px;font-size:12px"><span class="btn-t" style="cursor:pointer" onclick="renderLogin()">Girişe dön</span></div>`);
}

async function doForgotPassword(){
  const email=document.getElementById('fp-email').value.trim();
  const errEl=document.getElementById('fp-err');const okEl=document.getElementById('fp-ok');
  if(!isValidEmail(email)){errEl.textContent='Geçerli bir e-posta girin.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  // Enumeration koruması: e-posta kayıtlı olsun ya da olmasın aynı jenerik
  // mesaj gösterilir, hata detayı kullanıcıya sızdırılmaz.
  try{await window.authApi.resetPassword(email);}catch(e){/* jenerik mesaj yine de gösterilir */}
  okEl.classList.remove('hidden');
}

async function doLogout(){await window.authApi.logout();}

async function loadVehicles(){
  state.vehicles=await API.get('/vehicles');
  if(!state.selId&&state.vehicles.length)state.selId=state.vehicles[0].id;
}

function selVehicle(){return state.vehicles.find(v=>v.id===state.selId)||null;}

function renderLayout(view){
  const nav=[{id:'dashboard',icon:'▦',label:'Dashboard'},{id:'add',icon:'+',label:'Bakım Ekle'},{id:'history',icon:'◷',label:'Geçmiş'},{id:'expenses',icon:'₺',label:'Masraflar'},{id:'vehicles',icon:'◈',label:'Araçlar'},{id:'settings',icon:'⚙',label:'Ayarlar'}];
  const opts=state.vehicles.map(v=>`<option value="${v.id}" ${v.id===state.selId?'selected':''}>${v.brand} ${v.model}</option>`).join('');
  document.getElementById('app').innerHTML=`<div class="layout">
    <div class="sb">
      <div class="sb-top">
        <div class="sb-logo"><svg width="26" height="26" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#185FA5"/><path d="M8 28L20 14l12 14" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="22" r="3" fill="#fff"/></svg><span>Bakım Takip</span></div>
        ${state.vehicles.length?`<div class="v-sel-wrap"><select class="v-sel" onchange="changeVehicle(this.value)">${opts}</select></div>`:''}
      </div>
      <nav>${nav.map(n=>`<div class="nav-item ${view===n.id?'active':''}" onclick="navigate('${n.id}')"><span class="ni">${n.icon}</span><span>${n.label}</span>${n.id==='dashboard'?`<span class="nav-badge ${warningCount?'':'hidden'}" id="nav-warn-badge">${warningCount}</span>`:''}</div>`).join('')}</nav>
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

function changeVehicle(id){state.selId=id;navigate(state.view);}

async function renderDashboard(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty"><p>Araç yok.</p><br><button class="btn" onclick="navigate('vehicles')">Araç Ekle</button></div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const expenses=await window.api.expenses.list(v.id);
    // Parça durumu artık `vehicles/{id}/parts` koleksiyonundan (isActive==true) okunur,
    // bakım geçmişini (logs) tarayıp çıkarmak yerine — bkz. firebase-adapter.js `parts.listActive`.
    // remainingKm burada, ekranda anlık hesaplanır; Firestore'a hiç yazılmaz (rules zaten
    // client'tan bu alanlara yazmayı reddeder). NOT: gerçek push bildirimi (durum warning/overdue'ya
    // geçtiğinde FCM ile anlık uyarı) Cloud Functions + Blaze (ücretli) plan gerektirir — proje şu an
    // ücretsiz Spark planında olduğundan bu fazda sadece aşağıdaki ekran-içi rozet üretiliyor.
    const activeParts=(window.api.parts&&window.api.parts.listActive)?await window.api.parts.listActive(v.id):[];
    const activeByType={};activeParts.forEach(p=>{activeByType[p.partTypeId]=p;});
    const bl={green:'bg',amber:'ba',red:'br',unknown:'bx'};
    const bl2={green:'İyi',amber:'Yaklaşıyor',red:'Geçti',unknown:'Kayıt Yok'};
    const cards=PARTS.map(p=>{
      const ap=activeByType[p.key];
      if(!ap)return `<div class="pcard unknown"><div class="ph"><span class="pname">${p.name}</span><span class="badge bx">Kayıt Yok</span></div><div class="pkm" style="color:var(--t3);font-style:italic">Henüz kayıt yok</div></div>`;
      const life=ap.expectedLifeKm??p.km;
      const remainingKm=life-(v.current_km-ap.installedAtKm);
      const nkm=ap.installedAtKm+life;
      const prog=Math.min(100,Math.max(0,Math.round(((v.current_km-ap.installedAtKm)/life)*100)));
      const st=remainingKm<=0?'red':remainingKm<=life*0.25?'amber':'green';
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${p.name}</span><span class="badge ${bl[st]}">${bl2[st]}</span></div>
        <div class="pkm"><span>${ap.installedAtKm.toLocaleString('tr-TR')} km</span><span>→</span><span class="nx">${nkm.toLocaleString('tr-TR')} km</span></div><div class="pb"><div class="pf ${st}" style="width:${prog}%"></div></div>${ap.brand?`<div class="pbrand">${ap.brand}</div>`:''}</div>`;
    }).join('');
    const dueCards=DUE_TYPES.map(dt=>{
      const latest=expenses.filter(e=>e.type===dt.id&&e.due_date).sort((a,b)=>b.date.localeCompare(a.date))[0];
      if(!latest)return `<div class="pcard unknown"><div class="ph"><span class="pname">${dt.label}</span><span class="badge bx">Kayıt Yok</span></div><div class="pkm" style="color:var(--t3);font-style:italic">Henüz kayıt yok</div></div>`;
      const days=Math.ceil((new Date(latest.due_date)-new Date())/86400000);
      const st=days<0?'red':days<=30?'amber':'green';
      const stLabel=days<0?'Süresi Geçti':days<=30?'Yaklaşıyor':'İyi';
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${dt.label}</span><span class="badge ${bl[st]}">${stLabel}</span></div><div class="pkm"><span>Yenileme: ${latest.due_date}</span></div></div>`;
    }).join('');
    const recent=logs.slice(0,4).map(l=>`<div class="hi"><div class="hdot"></div><div class="hinfo"><span class="hkm">${l.km.toLocaleString('tr-TR')} km</span><span class="hparts">${l.parts.map(p=>p.name).join(', ')}</span></div><span class="hdate">${l.date}</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3);padding:8px 0">Kayıt yok</p>';
    const total=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const byCost={};logs.forEach(l=>l.parts.forEach(p=>{byCost[p.name]=(byCost[p.name]||0)+(p.cost||0);}));
    const top=Object.entries(byCost).sort((a,b)=>b[1]-a[1]).slice(0,5);const maxC=top[0]?.[1]||1;
    el.innerHTML=`<div class="vc">
      <div id="warn-slot"></div>
      <div class="vh-card"><div class="vh-icon">🚗</div><div class="vh-info"><h2>${v.brand} ${v.model}</h2><p>${v.year||''} ${v.engine||''}</p></div><div class="vh-km"><span class="km-v">${v.current_km.toLocaleString('tr-TR')}</span><span class="km-l">km</span></div></div>
      <div class="slabel">Parça Durumları</div>
      <div class="pgrid">${cards}${dueCards}</div>
      <div class="bgrid">
        <div class="card"><div class="ctitle">Son Bakımlar</div>${recent}${logs.length>4?`<button class="btn-t" onclick="navigate('history')">Tümünü gör →</button>`:''}</div>
        <div class="card"><div class="ctitle">Toplam Masraf</div><div class="etotal">${total.toLocaleString('tr-TR')} ₺</div><div class="ebars">${top.map(([n,c])=>`<div class="erow"><span class="ename">${n}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxC)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      </div>
    </div>`;
    renderWarningsSummary();
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
}

// Dashboard'un üstüne, seçili araçtan bağımsız olarak TÜM araçlardaki parça/sigorta/muayene
// uyarılarını özetleyen banner. renderDashboard'un geri kalanını beklemesin diye ayrı
// çalışır: dashboard önce boş bir #warn-slot ile render edilir, bu fonksiyon veriyi
// getirip slot'u sonradan doldurur. Uyarı yoksa hiçbir şey render etmez (slot boş kalır).
async function renderWarningsSummary(){
  if(!window.api.parts||!window.api.parts.listAllWarnings)return;
  let warnings=[];
  try{warnings=await window.api.parts.listAllWarnings();}catch(e){return;}
  warningCount=warnings.length;
  const badge=document.getElementById('nav-warn-badge');
  if(badge){badge.textContent=warningCount;badge.classList.toggle('hidden',warningCount===0);}
  const slot=document.getElementById('warn-slot');
  if(!slot)return; // kullanıcı bu arada başka bir view'a geçmiş olabilir
  if(!warnings.length){slot.innerHTML='';return;}
  const vehicleCount=new Set(warnings.map(w=>w.vehicleId)).size;
  const rows=warnings.map(w=>{
    const badgeCls=w.status==='red'?'br':'ba';
    const badgeLabel=w.status==='red'?'Geçti':'Yaklaşıyor';
    return `<div class="warn-row ${w.status}" onclick="selectWarningVehicle('${w.vehicleId}')">
      <span class="badge ${badgeCls}">${badgeLabel}</span>
      <span class="warn-veh">${w.vehicleLabel}</span>
      <span class="warn-item">${w.itemLabel}</span>
      <span class="warn-msg">${w.message}</span>
    </div>`;
  }).join('');
  slot.innerHTML=`<div class="card warn-banner">
    <div class="ctitle">${vehicleCount} araçta ${warnings.length} uyarı var</div>
    <div class="warn-list">${rows}</div>
  </div>`;
}

function selectWarningVehicle(vehicleId){state.selId=vehicleId;navigate('dashboard');}

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
  el.innerHTML=`<div class="vc"><h2 class="vtitle">${isEdit?typeLabel+' Kaydını Düzenle':'Masraf Ekle'} — ${v.brand} ${v.model}</h2>
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
    <div class="frow"><div class="fg"><label>Kilometre *</label><input type="number" id="m-km" value="${log?log.km:v.current_km}"></div><div class="fg"><label>Tarih *</label><input type="date" id="m-date" value="${log?log.date:new Date().toISOString().split('T')[0]}"></div><div class="fg"><label>Toplam Tutar (₺)</label><input type="number" id="m-cost" placeholder="0" min="0" value="${log?.total_cost||''}"></div></div>
    <div class="fg"><label>Değiştirilen Parçalar</label><div class="pcl">${PARTS.map(p=>{
      const checked=checkedKeys.has(p.key);
      const existing=(log?.parts||[]).find(x=>x.key===p.key);
      return `<label class="pchk"><input type="checkbox" data-key="${p.key}" data-name="${p.name}" ${checked?'checked':''}><span>${p.name}</span><input type="text" class="binput ${checked?'':'hidden'}" placeholder="Marka / Not" value="${existing?.brand||''}"><input type="number" class="cinput ${checked?'':'hidden'}" placeholder="₺" min="0" value="${existing?.cost||''}"></label>`;
    }).join('')}</div></div>
    <div class="fg"><label>Serbest Parça</label><div id="custom-parts"></div><button class="btn-s" onclick="addCustomPart()">+ Parça Ekle</button></div>
    <div class="fg"><label>Notlar</label><textarea id="m-notes" rows="3" placeholder="Servis, gözlem...">${log?.notes||''}</textarea></div>
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
      <div class="fg"><label>Tarih *</label><input type="date" id="e-date" value="${exp?.date||new Date().toISOString().split('T')[0]}"></div>
      <div class="fg"><label>Tutar (₺) *</label><input type="number" id="e-amount" min="0" value="${exp?.amount??''}"></div>
      ${showKm?`<div class="fg"><label>Kilometre</label><input type="number" id="e-km" min="0" value="${exp?.km??''}"></div>`:''}
    </div>
    ${showDue?`<div class="fg"><label>Sonraki Yenileme Tarihi</label><input type="date" id="e-due" value="${exp?.due_date||''}"></div>`:''}
    <div class="fg"><label>Notlar</label><textarea id="e-notes" rows="3" placeholder="Detay...">${exp?.notes||''}</textarea></div>
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
    if(wasEditing)await window.api.expenses.update(editingExpenseId,body,state.selId);
    else await window.api.expenses.create(state.selId,body);
    editingExpenseId=null;
    okEl.classList.remove('hidden');
    setTimeout(()=>navigate(wasEditing?'expenses':'dashboard'),1000);
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

function addCustomPart(prefill){
  const d=document.createElement('div');d.className='cprow';
  d.innerHTML=`<input class="cpname" placeholder="Parça adı" value="${prefill?.name||''}"><input class="cpbrand" placeholder="Marka / Not" value="${prefill?.brand||''}"><input type="number" class="cpcost" placeholder="₺" min="0" value="${prefill?.cost||''}"><button onclick="this.parentElement.remove()">✕</button>`;
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
    if(wasEditing)await API.put('/maintenance/log/'+editingLogId,{km,date,parts,notes,total_cost},state.selId);
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
    const rows=logs.map(l=>`<div class="lcard"><div class="lhead"><div><span class="lkm">${l.km.toLocaleString('tr-TR')} km</span><span class="ldate">${l.date}</span></div><div>${l.total_cost?`<span class="lcost">${l.total_cost.toLocaleString('tr-TR')} ₺</span>`:''}<button class="btn-s" onclick="editLog('${l.id}')">Düzenle</button><button class="btn-d" onclick="delLog('${l.id}')">Sil</button></div></div><div class="lparts">${l.parts.map(p=>`<span class="ptag">${p.name}${p.brand?' · '+p.brand:''}</span>`).join('')}</div>${l.notes?`<div class="lnotes">${l.notes}</div>`:''}</div>`).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Bakım Geçmişi</h2><button class="btn" onclick="navigate('add')">+ Bakım Ekle</button></div><div class="llist">${rows}</div></div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
}

function editLog(id){navigate('add',{type:'bakim',id});}

async function delLog(id){
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  await API.del('/maintenance/log/'+id,state.selId);navigate('history');
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
    const recentExp=expenses.map(e=>{
      const label=EXPENSE_TYPES.find(t=>t.id===e.type)?.label||'Diğer';
      return `<div class="lcard"><div class="lhead"><div><span class="lkm">${label}</span><span class="ldate">${e.date}</span></div><div><span class="lcost">${e.amount.toLocaleString('tr-TR')} ₺</span><button class="btn-s" onclick="editExpense('${e.id}')">Düzenle</button><button class="btn-d" onclick="delExpense('${e.id}')">Sil</button></div></div>${e.due_date?`<div class="lparts"><span class="ptag">Yenileme: ${e.due_date}</span></div>`:''}${e.notes?`<div class="lnotes">${e.notes}</div>`:''}</div>`;
    }).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Masraf Analizi</h2><button class="btn" onclick='navigate("add",{type:"yakit"})'>+ Masraf Ekle</button></div>
      <div class="scards"><div class="scard"><div class="scard-l">Toplam</div><div class="scard-v">${total.toLocaleString('tr-TR')} ₺</div></div><div class="scard"><div class="scard-l">Bakım Sayısı</div><div class="scard-v">${logs.length}</div></div><div class="scard"><div class="scard-l">Ort / Bakım</div><div class="scard-v">${logs.length?Math.round(logsTotal/logs.length).toLocaleString('tr-TR'):0} ₺</div></div></div>
      <div class="two">
        <div class="card"><div class="ctitle">Yıla Göre</div><div class="ebars">${ys.map(([y,c])=>`<div class="erow"><span class="ename">${y}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/(total||1))*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
        <div class="card"><div class="ctitle">Parçaya Göre</div><div class="ebars">${ps.map(([n,c])=>`<div class="erow"><span class="ename">${n}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxP)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="ctitle">Türe Göre</div><div class="ebars">${ts.map(([n,c])=>`<div class="erow"><span class="ename">${n}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxT)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      <div class="slabel" style="margin-top:20px">Yakıt / Sigorta / Muayene Kayıtları</div>
      <div class="llist">${recentExp}</div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
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
  await window.api.expenses.delete(id,state.selId);navigate('expenses');
}

let editingVehicleId=null;

async function renderVehicles(el){
  await loadVehicles();
  const cards=state.vehicles.map(v=>`<div class="vci ${v.id===state.selId?'sel':''}" onclick="changeVehicle('${v.id}');navigate('dashboard')"><div class="vci-icon">🚗</div><div class="vci-info"><h3>${v.brand} ${v.model}</h3><p>${v.year||''} ${v.engine||''}</p><p>${v.current_km.toLocaleString('tr-TR')} km</p></div><button class="btn-s" onclick="event.stopPropagation();showEditVehicle('${v.id}')">Düzenle</button><button class="btn-d" onclick="event.stopPropagation();delVehicle('${v.id}')">Sil</button></div>`).join('');
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
  const user=window.authApi.currentUser();
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Ayarlar</h2><div class="fcard"><h3>Veri Yedekleme</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Tüm araç ve bakım verilerini bir JSON dosyasına kaydedebilir ya da önceden alınmış bir yedeği geri yükleyebilirsin.</p>
    <div id="bk-msg" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:flex-start">
      <button class="btn-s" onclick="importBackup()">Yedekten Geri Yükle</button>
      <button class="btn" onclick="exportBackup()">Yedek Al</button>
    </div>
  </div>
  <div class="fcard"><h3>Hesap</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:14px">${user?user.email:''}</p>
    <div class="facts" style="justify-content:flex-start"><button class="btn-s" onclick="doLogout()">Çıkış Yap</button></div>
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