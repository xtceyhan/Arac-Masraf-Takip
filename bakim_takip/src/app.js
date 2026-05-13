const PARTS=[{key:'motor_yagi',name:'Motor Yağı',km:7000},{key:'yag_filtresi',name:'Yağ Filtresi',km:7000},{key:'hava_filtresi',name:'Hava Filtresi',km:15000},{key:'polen_filtresi',name:'Polen Filtresi',km:15000},{key:'yakit_filtresi',name:'Yakıt Filtresi',km:30000},{key:'triger',name:'Triger Kayışı',km:60000},{key:'devirdaim',name:'Devirdaim Pompası',km:60000},{key:'bujiler',name:'Bujiler',km:40000},{key:'on_balata',name:'Ön Fren Balata',km:40000},{key:'arka_balata',name:'Arka Fren Balata',km:40000},{key:'fren_diski',name:'Fren Diski',km:60000},{key:'antifriz',name:'Antifriz',km:40000},{key:'sanziman_yagi',name:'Şanzıman Yağı',km:60000},{key:'direksiyon_yagi',name:'Direksiyon Yağı',km:40000},{key:'klima_gazi',name:'Klima Gazı',km:40000}];

let state={vehicles:[],selId:null,view:'dashboard'};

const API={
  base:()=>localStorage.getItem('serverUrl')||'http://localhost:3000',
  async call(method,path,body){
    const res=await fetch(API.base()+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const d=await res.json();
    if(!res.ok)throw new Error(d.error||'Hata oluştu');
    return d;
  },
  get:(p)=>API.call('GET',p),
  post:(p,b)=>API.call('POST',p,b),
  put:(p,b)=>API.call('PUT',p,b),
  del:(p)=>API.call('DELETE',p),
};

async function init(){
  const url=localStorage.getItem('serverUrl');
  if(!url){renderSetup();return;}
  try{await API.get('/health');await loadVehicles();navigate('dashboard');}
  catch{renderSetup('Sunucuya bağlanılamadı.');}
}

async function loadVehicles(){
  state.vehicles=await API.get('/vehicles');
  if(!state.selId&&state.vehicles.length)state.selId=state.vehicles[0].id;
}

function selVehicle(){return state.vehicles.find(v=>v.id===state.selId)||null;}

function renderSetup(err){
  document.getElementById('app').innerHTML=`<div class="setup-page"><div class="setup-card">
    <div class="setup-logo"><svg width="32" height="32" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#185FA5"/><path d="M8 28L20 14l12 14" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="22" r="3" fill="#fff"/></svg><h1>Bakım Takip</h1></div>
    <p class="setup-sub">Sunucu adresini girerek başlayın.</p>
    ${err?`<div class="err-msg">${err}</div>`:''}
    <div class="fg"><label>Sunucu Adresi</label><input id="setup-url" placeholder="http://192.168.1.x:3000" value="${localStorage.getItem('serverUrl')||''}"></div>
    <button class="btn" onclick="saveSetup()">Bağlan</button>
  </div></div>`;
  document.getElementById('setup-url').addEventListener('keydown',e=>{if(e.key==='Enter')saveSetup();});
}

async function saveSetup(){
  const url=document.getElementById('setup-url').value.trim().replace(/\/$/,'');
  if(!url)return;
  localStorage.setItem('serverUrl',url);
  try{await API.get('/health');await loadVehicles();navigate('dashboard');}
  catch{renderSetup('Bağlantı başarısız: '+url);}
}

function renderLayout(view){
  const nav=[{id:'dashboard',icon:'▦',label:'Dashboard'},{id:'add',icon:'+',label:'Bakım Ekle'},{id:'history',icon:'◷',label:'Geçmiş'},{id:'expenses',icon:'₺',label:'Masraflar'},{id:'vehicles',icon:'◈',label:'Araçlar'},{id:'settings',icon:'⚙',label:'Ayarlar'}];
  const opts=state.vehicles.map(v=>`<option value="${v.id}" ${v.id===state.selId?'selected':''}>${v.brand} ${v.model}</option>`).join('');
  document.getElementById('app').innerHTML=`<div class="layout">
    <div class="sb">
      <div class="sb-top">
        <div class="sb-logo"><svg width="26" height="26" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#185FA5"/><path d="M8 28L20 14l12 14" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="22" r="3" fill="#fff"/></svg><span>Bakım Takip</span></div>
        ${state.vehicles.length?`<div class="v-sel-wrap"><select class="v-sel" onchange="changeVehicle(this.value)">${opts}</select></div>`:''}
      </div>
      <nav>${nav.map(n=>`<div class="nav-item ${view===n.id?'active':''}" onclick="navigate('${n.id}')"><span class="ni">${n.icon}</span><span>${n.label}</span></div>`).join('')}</nav>
      <div class="sb-foot"><p>${API.base()}</p></div>
    </div>
    <div class="main" id="main"></div>
  </div>`;
}

async function navigate(view){
  state.view=view;renderLayout(view);
  const el=document.getElementById('main');
  if(view==='dashboard')await renderDashboard(el);
  else if(view==='add')renderAdd(el);
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
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${p.name}</span><span class="badge ${bl[st]}">${bl2[st]}</span></div>
        ${lkm!==null?`<div class="pkm"><span>${lkm.toLocaleString('tr-TR')} km</span><span>→</span><span class="nx">${nkm.toLocaleString('tr-TR')} km</span></div><div class="pb"><div class="pf ${st}" style="width:${prog}%"></div></div>${last.brand?`<div class="pbrand">${last.brand}</div>`:''}`:
        `<div class="pkm" style="color:var(--t3);font-style:italic">Henüz kayıt yok</div>`}</div>`;
    }).join('');
    const recent=logs.slice(0,4).map(l=>`<div class="hi"><div class="hdot"></div><div class="hinfo"><span class="hkm">${l.km.toLocaleString('tr-TR')} km</span><span class="hparts">${l.parts.map(p=>p.name).join(', ')}</span></div><span class="hdate">${l.date}</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3);padding:8px 0">Kayıt yok</p>';
    const total=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const byCost={};logs.forEach(l=>l.parts.forEach(p=>{byCost[p.name]=(byCost[p.name]||0)+(p.cost||0);}));
    const top=Object.entries(byCost).sort((a,b)=>b[1]-a[1]).slice(0,5);const maxC=top[0]?.[1]||1;
    el.innerHTML=`<div class="vc">
      <div class="vh-card"><div class="vh-icon">🚗</div><div class="vh-info"><h2>${v.brand} ${v.model}</h2><p>${v.year||''} ${v.engine||''}</p></div><div class="vh-km"><span class="km-v">${v.current_km.toLocaleString('tr-TR')}</span><span class="km-l">km</span></div></div>
      <div class="slabel">Parça Durumları</div>
      <div class="pgrid">${cards}</div>
      <div class="bgrid">
        <div class="card"><div class="ctitle">Son Bakımlar</div>${recent}${logs.length>4?`<button class="btn-t" onclick="navigate('history')">Tümünü gör →</button>`:''}</div>
        <div class="card"><div class="ctitle">Toplam Masraf</div><div class="etotal">${total.toLocaleString('tr-TR')} ₺</div><div class="ebars">${top.map(([n,c])=>`<div class="erow"><span class="ename">${n}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxC)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')}</div></div>
      </div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
}

function renderAdd(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Bakım Ekle — ${v.brand} ${v.model}</h2><div class="fcard">
    <div class="frow"><div class="fg"><label>Kilometre *</label><input type="number" id="m-km" value="${v.current_km}"></div><div class="fg"><label>Tarih *</label><input type="date" id="m-date" value="${new Date().toISOString().split('T')[0]}"></div><div class="fg"><label>Toplam Tutar (₺)</label><input type="number" id="m-cost" placeholder="0" min="0"></div></div>
    <div class="fg"><label>Değiştirilen Parçalar</label><div class="pcl">${PARTS.map(p=>`<label class="pchk"><input type="checkbox" data-key="${p.key}" data-name="${p.name}"><span>${p.name}</span><input type="text" class="binput hidden" placeholder="Marka / Not"><input type="number" class="cinput hidden" placeholder="₺" min="0"></label>`).join('')}</div></div>
    <div class="fg"><label>Serbest Parça</label><div id="custom-parts"></div><button class="btn-s" onclick="addCustomPart()">+ Parça Ekle</button></div>
    <div class="fg"><label>Notlar</label><textarea id="m-notes" rows="3" placeholder="Servis, gözlem..."></textarea></div>
    <div id="m-err" class="err-msg hidden"></div><div id="m-ok" class="ok-msg hidden">Kaydedildi!</div>
    <div class="facts"><button class="btn-s" onclick="navigate('dashboard')">İptal</button><button class="btn" onclick="saveMaint()">Kaydet</button></div>
  </div></div>`;
  document.querySelectorAll('.pchk input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',function(){
      this.parentElement.querySelector('.binput').classList.toggle('hidden',!this.checked);
      this.parentElement.querySelector('.cinput').classList.toggle('hidden',!this.checked);
    });
  });
}

function addCustomPart(){
  const d=document.createElement('div');d.className='cprow';
  d.innerHTML=`<input class="cpname" placeholder="Parça adı"><input class="cpbrand" placeholder="Marka / Not"><input type="number" class="cpcost" placeholder="₺" min="0"><button onclick="this.parentElement.remove()">✕</button>`;
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
    await API.post('/maintenance/'+state.selId,{km,date,parts,notes,total_cost});
    await loadVehicles();okEl.classList.remove('hidden');
    setTimeout(()=>navigate('dashboard'),1000);
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

async function renderHistory(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const rows=logs.map(l=>`<div class="lcard"><div class="lhead"><div><span class="lkm">${l.km.toLocaleString('tr-TR')} km</span><span class="ldate">${l.date}</span></div><div>${l.total_cost?`<span class="lcost">${l.total_cost.toLocaleString('tr-TR')} ₺</span>`:''}<button class="btn-d" onclick="delLog(${l.id})">Sil</button></div></div><div class="lparts">${l.parts.map(p=>`<span class="ptag">${p.name}${p.brand?' · '+p.brand:''}</span>`).join('')}</div>${l.notes?`<div class="lnotes">${l.notes}</div>`:''}</div>`).join('')||'<div class="empty">Kayıt yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Bakım Geçmişi</h2><button class="btn" onclick="navigate('add')">+ Bakım Ekle</button></div><div class="llist">${rows}</div></div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
}

async function delLog(id){
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  await API.del('/maintenance/log/'+id);navigate('history');
}

async function renderExpenses(el){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  try{
    const logs=await API.get('/maintenance/'+v.id);
    const total=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const byYear={},byPart={};
    logs.forEach(l=>{const y=l.date?.substring(0,4)||'?';byYear[y]=(byYear[y]||0)+(l.total_cost||0);l.parts.forEach(p=>{byPart[p.name]=(byPart[p.name]||0)+(p.cost||0);});});
    const ys=Object.entries(byYear).sort((a,b)=>b[0]-a[0]);
    const ps=Object.entries(byPart).sort((a,b)=>b[1]-a[1]).slice(0,6);const maxP=ps[0]?.[1]||1;
    el.innerHTML=`<div class="vc"><h2 class="vtitle">Masraf Analizi</h2>
      <div class="scards"><div class="scard"><div class="scard-l">Toplam</div><div class="scard-v">${total.toLocaleString('tr-TR')} ₺</div></div><div class="scard"><div class="scard-l">Bakım Sayısı</div><div class="scard-v">${logs.length}</div></div><div class="scard"><div class="scard-l">Ort / Bakım</div><div class="scard-v">${logs.length?Math.round(total/logs.length).toLocaleString('tr-TR'):0} ₺</div></div></div>
      <div class="two">
        <div class="card"><div class="ctitle">Yıla Göre</div><div class="ebars">${ys.map(([y,c])=>`<div class="erow"><span class="ename">${y}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/(total||1))*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
        <div class="card"><div class="ctitle">Parçaya Göre</div><div class="ebars">${ps.map(([n,c])=>`<div class="erow"><span class="ename">${n}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxP)*100)}%"></div></div><span class="eamt">${c.toLocaleString('tr-TR')} ₺</span></div>`).join('')||'<p style="font-size:13px;color:var(--t3)">Veri yok</p>'}</div></div>
      </div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${e.message}</div></div>`;}
}

async function renderVehicles(el){
  await loadVehicles();
  const cards=state.vehicles.map(v=>`<div class="vci ${v.id===state.selId?'sel':''}" onclick="changeVehicle(${v.id});navigate('dashboard')"><div class="vci-icon">🚗</div><div class="vci-info"><h3>${v.brand} ${v.model}</h3><p>${v.year||''} ${v.engine||''}</p><p>${v.current_km.toLocaleString('tr-TR')} km</p></div><button class="btn-d" onclick="event.stopPropagation();delVehicle(${v.id})">Sil</button></div>`).join('');
  el.innerHTML=`<div class="vc"><div class="vheader"><h2 class="vtitle">Araçlar</h2><button class="btn" onclick="showAddVehicle()">+ Araç Ekle</button></div><div class="vlist">${cards}</div>
    <div id="add-v-form" class="fcard hidden"><h3>Yeni Araç</h3>
      <div class="frow"><div class="fg"><label>Marka *</label><input id="v-brand" placeholder="Volvo"></div><div class="fg"><label>Model *</label><input id="v-model" placeholder="S60"></div></div>
      <div class="frow"><div class="fg"><label>Yıl</label><input id="v-year" type="number" placeholder="2011"></div><div class="fg"><label>Motor</label><input id="v-engine" placeholder="1.6 T4"></div></div>
      <div class="frow"><div class="fg"><label>Alındığı KM</label><input id="v-pkm" type="number" placeholder="0"></div><div class="fg"><label>Güncel KM</label><input id="v-ckm" type="number" placeholder="0"></div></div>
      <div id="v-err" class="err-msg hidden"></div>
      <div class="facts"><button class="btn-s" onclick="document.getElementById('add-v-form').classList.add('hidden')">İptal</button><button class="btn" onclick="addVehicle()">Ekle</button></div>
    </div>
  </div>`;
}

function showAddVehicle(){document.getElementById('add-v-form').classList.remove('hidden');}

async function addVehicle(){
  const brand=document.getElementById('v-brand').value.trim();
  const model=document.getElementById('v-model').value.trim();
  const errEl=document.getElementById('v-err');
  if(!brand||!model){errEl.textContent='Marka ve model zorunlu.';errEl.classList.remove('hidden');return;}
  try{
    const v=await API.post('/vehicles',{brand,model,year:document.getElementById('v-year').value||null,engine:document.getElementById('v-engine').value||null,purchase_km:parseInt(document.getElementById('v-pkm').value)||0,current_km:parseInt(document.getElementById('v-ckm').value)||0});
    state.selId=v.id;navigate('vehicles');
  }catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
}

async function delVehicle(id){
  if(!confirm('Bu aracı ve tüm bakım kayıtlarını silmek istiyor musunuz?'))return;
  await API.del('/vehicles/'+id);
  if(state.selId===id)state.selId=null;
  await loadVehicles();navigate('vehicles');
}

function renderSettings(el){
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Ayarlar</h2><div class="fcard"><h3>Sunucu Bağlantısı</h3>
    <div class="fg"><label>Sunucu Adresi</label><input id="s-url" value="${localStorage.getItem('serverUrl')||''}" placeholder="http://192.168.1.x:3000"></div>
    <div id="s-ok" class="ok-msg hidden">Kaydedildi!</div>
    <div class="facts"><button class="btn" onclick="saveSettings()">Kaydet</button></div>
  </div></div>`;
}

async function saveSettings(){
  const url=document.getElementById('s-url').value.trim().replace(/\/$/,'');
  localStorage.setItem('serverUrl',url);
  document.getElementById('s-ok').classList.remove('hidden');
  setTimeout(()=>document.getElementById('s-ok')?.classList.add('hidden'),2000);
}

init();