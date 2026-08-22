// Güvenlik Denetim Raporu Y-1: bu dosyanın TAMAMI `el.innerHTML = \`…${veri}…\`` kalıbıyla
// render ediyor. Firestore'dan gelen her değer (araç markası, parça markası, serbest parça
// adı, notlar, hata mesajları) HTML olarak yorumlanır. Bu yüzden istisnasız her interpolasyon
// esc() / fmtNum() ile sarılır. Yeni bir interpolasyon eklerken bu kuralı bozma.
//
// İSTİSNA (bilinçli): `onclick="fn('${id}')"` kalıbındaki doküman ID'leri sarılmaz —
// orası JavaScript bağlamı, esc() tırnağı `&#39;` yapar ama HTML attribute parse edilirken
// tekrar `'` olur, yani koruma sağlamaz. Oraya yalnızca Firestore'un ürettiği alfasayısal
// doküman ID'leri (`[A-Za-z0-9]{20}`) giriyor. Orta vadede `data-id` + addEventListener
// desenine geçirilmeli (bkz. rapor Y-1).
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

// Sayısal alanlar da güvenilmez: Firestore'da tip garantisi yok ve kurallar her alanın
// tipini doğrulamıyor. `x.toLocaleString()` bir string üzerinde çağrıldığında hem yanlış
// çıktı verir hem de `undefined`'da patlar. Bu yardımcı önce sayıya çevirir, sayı değilse
// tire basar, sonuç yine de esc()'ten geçer.
function fmtNum(n){
  const v=Number(n);
  return esc(Number.isFinite(v)?v.toLocaleString('tr-TR'):'—');
}

// ── Görsel yardımcılar ───────────────────────────────────────────────────────
// Buradaki üreticiler yalnızca SABİT işaretleme ya da BİZİM hesapladığımız sayılar
// üretir; hiçbiri kullanıcı verisi almaz. Kullanıcı verisi (marka, model, not…)
// her zaman çağıran taraftan esc() ile geçirilir — bkz. dosya başındaki not.

// Uygulama ikonu: "gösterge ibresi". Sidebar ve auth ekranı aynı işareti kullanır;
// kaynak SVG'si icon-src/foreground.svg içinde mipmap üretimi için ayrıca duruyor.
function logoSvg(size){
  const s=Number(size)||26;
  return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="48" height="48" rx="10" fill="#185FA5"/>
    <circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="2.6"/>
    <g stroke="#fff" stroke-width="2.2" stroke-linecap="round">
      <line x1="24" y1="8" x2="24" y2="11.5"/>
      <line x1="24" y1="36.5" x2="24" y2="40"/>
      <line x1="8" y1="24" x2="11.5" y2="24"/>
      <line x1="36.5" y1="24" x2="40" y2="24"/>
      <line x1="13.7" y1="13.7" x2="16.2" y2="16.2"/>
      <line x1="31.8" y1="31.8" x2="34.3" y2="34.3"/>
      <line x1="13.7" y1="34.3" x2="16.2" y2="31.8"/>
      <line x1="31.8" y1="16.2" x2="34.3" y2="13.7"/>
    </g>
    <path d="M24 24 L32 15" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="3" fill="#fff"/>
  </svg>`;
}

// Araç siluetti — referans tasarımdaki ürün fotoğrafının yerini tutar.
// Fotoğraf üretmiyoruz; tek renkli, ince çizgili bir yan profil yeterli.
function carArt(cls){
  return `<svg class="${cls}" viewBox="0 0 240 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 62V45c0-5 3.5-9.5 8.5-10.8L54 25.5 78 9.5C81 7.5 84.5 6.5 88 6.5h56c4.5 0 8.8 1.7 12 4.8l19.5 18.5 28.5 5.4c7.5 1.4 13 8 13 15.6V62"
      stroke="#c9ced7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M60 27h108M112 26.5V7" stroke="#dde1e8" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M12 62h30M84 62h72M198 62h29" stroke="#c9ced7" stroke-width="3" stroke-linecap="round"/>
    <circle cx="63" cy="62" r="13.5" stroke="#c9ced7" stroke-width="3"/>
    <circle cx="177" cy="62" r="13.5" stroke="#c9ced7" stroke-width="3"/>
  </svg>`;
}

// Segmentli sağlık çubuğu (referanstaki "Battery health" göstergesi).
// pct: kalan ömür yüzdesi (0-100), status: green|amber|red|unknown.
// Düz progress bar'ın aksine ayrık segmentler basar; dolu segment sayısı
// yüzdeden, rengi durumdan gelir. İkisi de bizim hesapladığımız değerler.
function healthBar(pct,status,segs,small){
  const n=Number(segs)||16;
  const p=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  const st=['green','amber','red'].includes(status)?status:'';
  // %0'ın üstündeki her değer en az bir segment doldurur — "biraz kaldı" ile
  // "hiç kalmadı" ekranda ayırt edilebilsin.
  const filled=p<=0?0:Math.max(1,Math.round((p/100)*n));
  let out='';
  for(let i=0;i<n;i++)out+=`<i class="${i<filled?'on '+st:''}"></i>`;
  return `<div class="health-bar${small?' sm':''}">${out}</div>`;
}

// Marka rozeti için baş harf. Kullanıcı verisinden türediği için esc()'ten geçer.
function initial(s){
  const c=String(s??'').trim().charAt(0).toUpperCase();
  return esc(c||'?');
}

function monthKey(d){return String(d??'').substring(0,7);}

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

// Login ekranında gösterilecek bilgi mesajı (ör. "hesabın silindi"). Oturum kapandığında
// onAuthStateChanged renderLogin'i çağırır; mesajı orada basmak, silme akışının kendi
// DOM'unun bu arada yok edilmiş olmasından etkilenmez.
//
// sessionStorage'da tutulur çünkü hesap silme akışı Firestore önbelleğini temizleyip
// location.reload() yapıyor — modül seviyesi bir değişken reload'ı atlatamaz. Mesaj
// render sırasında SİLİNMEZ (reload öncesi ve sonrası iki kez basılabilmeli); kullanıcı
// başka bir ekrana geçtiğinde temizlenir.
const LOGIN_NOTICE_KEY='bt-login-notice';
let loginNotice='';
function setLoginNotice(text){loginNotice=text;try{sessionStorage.setItem(LOGIN_NOTICE_KEY,text);}catch(e){/* sessionStorage kapalıysa modül değişkeni yeterli */}}
function getLoginNotice(){if(loginNotice)return loginNotice;try{return sessionStorage.getItem(LOGIN_NOTICE_KEY)||'';}catch(e){return '';}}
function clearLoginNotice(){loginNotice='';try{sessionStorage.removeItem(LOGIN_NOTICE_KEY);}catch(e){}}

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
//
// Y-2b: e-postası doğrulanmamış kullanıcı dashboard'a HİÇ girmez. Bunun tek sebebi UX
// değil: firestore.rules artık tüm yazma işlemlerinde `email_verified == true` istiyor,
// yani doğrulanmamış bir kullanıcı dashboard'a girse her kaydetme denemesinde
// "permission-denied" alırdı. D-3: çıkışta uygulama state'i (warningCount ve editing*
// global'leri dahil) tamamen sıfırlanır — doLogout() zaten location.reload() yapıyor,
// bu dal onun çalışmadığı yollar (token iptali, hesap silme) için ikinci güvence.
function init(){
  window.authApi.onAuthStateChanged(async(user)=>{
    if(!user){
      state={vehicles:[],selId:null,view:'dashboard'};
      warningCount=0;editingLogId=null;editingExpenseId=null;editingVehicleId=null;
      renderLogin();return;
    }
    if(user.emailVerified===false){renderVerifyEmail();return;}
    try{await loadVehicles();navigate('dashboard');}
    catch(e){document.getElementById('app').innerHTML=`<div class="vc"><div class="err-msg">Veri yüklenemedi: ${esc(e.message)}</div></div>`;}
  });
}

function isValidEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}

function authErrorMessage(e){
  const map={
    'auth/invalid-credential':'E-posta veya şifre hatalı.',
    'auth/invalid-email':'Geçerli bir e-posta girin.',
    'auth/user-not-found':'E-posta veya şifre hatalı.',
    'auth/wrong-password':'E-posta veya şifre hatalı.',
    // D-2: kayıt akışı da enumeration oracle'ı olmasın — "bu e-posta zaten kayıtlı"
    // demek, saldırgana e-posta listesi doğrulama imkânı verir. Giriş/şifre sıfırlama
    // akışlarındaki jenerik dille aynı hizaya getirildi.
    'auth/email-already-in-use':'Kayıt tamamlanamadı. Bilgilerini kontrol et; hesabın zaten varsa giriş ekranından devam edebilirsin.',
    // D-1: Firebase'in sunucu tarafı minimum'u 6 karakter, 8 değil. Eski mesaj
    // ("en az 8 karakter olmalı") yanıltıcıydı — istemci tarafındaki 8 karakter kuralı
    // bizim UX tercihimiz ve doRegister içinde ayrıca kontrol ediliyor.
    'auth/weak-password':'Şifre çok zayıf, daha güçlü bir şifre seçin.',
    'auth/too-many-requests':'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
    'auth/network-request-failed':'Bağlantı hatası, internetinizi kontrol edin.',
    'auth/requires-recent-login':'Bu işlem için yakın zamanda giriş yapmış olman gerekiyor. Çıkış yapıp tekrar giriş yaptıktan sonra dene.',
  };
  return map[e.code]||e.message;
}

function renderAuthShell(title,bodyHtml){
  document.getElementById('app').innerHTML=`<div class="auth-wrap">
    <div class="auth-box">
      <div class="auth-lockup">${logoSvg(32)}<span>Benim Taşıtım</span></div>
      <div class="fcard" style="margin-top:0"><h3>${esc(title)}</h3>${bodyHtml}</div>
    </div>
  </div>`;
}

function renderLogin(){
  const notice=getLoginNotice();
  renderAuthShell('Giriş Yap',`
    ${notice?`<div class="ok-msg">${esc(notice)}</div>`:''}
    <div class="fg"><label>E-posta</label><input type="email" id="lg-email" placeholder="ornek@eposta.com"></div>
    <div class="fg"><label>Şifre</label><input type="password" id="lg-pass" placeholder="••••••••"></div>
    <div id="lg-err" class="err-msg hidden"></div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doLogin()">Giriş Yap</button></div>
    <div class="auth-links">
      <span class="btn-t" style="cursor:pointer" onclick="renderForgotPassword()">Şifremi Unuttum</span>
      <span class="btn-t" style="cursor:pointer" onclick="renderRegister()">Hesabın yok mu? Kayıt Ol</span>
    </div>`);
}

async function doLogin(){
  const email=document.getElementById('lg-email').value.trim();
  const pass=document.getElementById('lg-pass').value;
  const errEl=document.getElementById('lg-err');
  clearLoginNotice();
  if(!isValidEmail(email)){errEl.textContent='Geçerli bir e-posta girin.';errEl.classList.remove('hidden');return;}
  if(!pass){errEl.textContent='Şifre gerekli.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  try{await window.authApi.login(email,pass);}
  catch(e){errEl.textContent=authErrorMessage(e);errEl.classList.remove('hidden');}
}

function renderRegister(){
  clearLoginNotice();
  renderAuthShell('Kayıt Ol',`
    <div class="fg"><label>Ad Soyad</label><input type="text" id="rg-name" placeholder="Adınız Soyadınız"></div>
    <div class="fg"><label>E-posta</label><input type="email" id="rg-email" placeholder="ornek@eposta.com"></div>
    <div class="fg"><label>Şifre</label><input type="password" id="rg-pass" placeholder="En az 8 karakter"></div>
    <div class="fg"><label>Şifre (Tekrar)</label><input type="password" id="rg-pass2" placeholder="••••••••"></div>
    <div id="rg-err" class="err-msg hidden"></div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doRegister()">Kayıt Ol</button></div>
    <div style="text-align:center;margin-top:14px;font-size:12px"><span class="btn-t" style="cursor:pointer" onclick="renderLogin()">Zaten hesabın var mı? Giriş Yap</span></div>`);
}

// D-2: eski hâlde burada "Kayıt başarılı! Doğrulama e-postası gönderildi." mesajı
// gösteriliyordu ama createUserWithEmailAndPassword kullanıcıyı otomatik oturum açtırdığı
// için onAuthStateChanged hemen tetikleniyor ve #app içeriği değişiyordu — mesaj hiç
// görünmeden kayboluyordu. Artık başarı durumunda mesaj yok: akış doğrudan
// renderVerifyEmail() ekranına düşüyor ve doğrulama e-postasından orada bahsediliyor.
async function doRegister(){
  const name=document.getElementById('rg-name').value.trim();
  const email=document.getElementById('rg-email').value.trim();
  const pass=document.getElementById('rg-pass').value;
  const pass2=document.getElementById('rg-pass2').value;
  const errEl=document.getElementById('rg-err');
  if(!name){errEl.textContent='Ad soyad zorunlu.';errEl.classList.remove('hidden');return;}
  if(!isValidEmail(email)){errEl.textContent='Geçerli bir e-posta girin.';errEl.classList.remove('hidden');return;}
  // İstemci tarafı uzunluk kuralı bizim UX tercihimiz; Firebase'in sunucu minimum'u 6.
  if(pass.length<8){errEl.textContent='Şifre en az 8 karakter olmalı.';errEl.classList.remove('hidden');return;}
  if(pass!==pass2){errEl.textContent='Şifreler eşleşmiyor.';errEl.classList.remove('hidden');return;}
  errEl.classList.add('hidden');
  try{await window.authApi.register(email,pass,name);}
  catch(e){errEl.textContent=authErrorMessage(e);errEl.classList.remove('hidden');}
}

// Y-2b — e-posta doğrulama kapısı. Bu ekran, doğrulanmamış kullanıcı için dashboard'un
// yerine geçer. Çıkış Yap bilerek burada: kullanıcı yanlış adresle kayıt olduysa
// (ör. yazım hatası) bu ekranda kilitlenmemeli.
function renderVerifyEmail(){
  const user=window.authApi.currentUser();
  renderAuthShell('E-postanı Doğrula',`
    <p class="hint" style="margin-bottom:6px">Hesabını kullanabilmen için e-posta adresini doğrulaman gerekiyor.</p>
    <p class="hint">Doğrulama bağlantısını <strong>${esc(user?user.email:'')}</strong> adresine gönderdik. Bağlantıya tıkladıktan sonra aşağıdaki düğmeye bas.</p>
    <div id="vf-err" class="err-msg hidden"></div>
    <div id="vf-ok" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:stretch"><button class="btn" style="width:100%" onclick="doCheckVerified()">Doğruladım, Devam Et</button></div>
    <div class="facts" style="justify-content:stretch;margin-top:10px"><button class="btn-s" style="width:100%" onclick="doResendVerification()">Doğrulama e-postasını tekrar gönder</button></div>
    <div style="text-align:center;margin-top:14px;font-size:12px"><span class="btn-t" style="cursor:pointer" onclick="doLogout()">Çıkış Yap</span></div>`);
}

// TUZAK (raporun özellikle uyardığı): `email_verified` claim'i ID token'ın İÇİNDE gömülü.
// Kullanıcı e-postayı doğruladıktan sonra elindeki token hâlâ `email_verified:false`
// taşır — token yenilenmeden dashboard'a geçilirse her yazma işlemi Firestore kuralları
// tarafından reddedilir ve kullanıcı "doğruladım ama kaydetmiyor" hatası alır. Bu yüzden
// authApi.refreshVerification() önce reload() sonra getIdToken(true) çağırır.
async function doCheckVerified(){
  const errEl=document.getElementById('vf-err');const okEl=document.getElementById('vf-ok');
  errEl.classList.add('hidden');okEl.classList.add('hidden');
  try{
    const verified=await window.authApi.refreshVerification();
    if(!verified){
      errEl.textContent='E-posta henüz doğrulanmamış görünüyor. Gelen kutunu ve spam klasörünü kontrol edip tekrar dene.';
      errEl.classList.remove('hidden');return;
    }
    await loadVehicles();navigate('dashboard');
  }catch(e){errEl.textContent=authErrorMessage(e);errEl.classList.remove('hidden');}
}

async function doResendVerification(){
  const errEl=document.getElementById('vf-err');const okEl=document.getElementById('vf-ok');
  errEl.classList.add('hidden');okEl.classList.add('hidden');
  try{
    await window.authApi.resendVerification();
    okEl.textContent='Doğrulama e-postası tekrar gönderildi.';okEl.classList.remove('hidden');
  }catch(e){
    // Firebase, art arda istekleri auth/too-many-requests ile reddeder. Bu bir hata
    // değil, koruma — kullanıcıya nazik anlatılır, önceki e-posta hâlâ geçerlidir.
    errEl.textContent=e.code==='auth/too-many-requests'
      ?'Çok sık denedin. Birkaç dakika bekleyip tekrar dene — daha önce gönderilen bağlantı hâlâ geçerli.'
      :authErrorMessage(e);
    errEl.classList.remove('hidden');
  }
}

function renderForgotPassword(){
  clearLoginNotice();
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

// O-3: logout artık Firestore disk önbelleğini de siler ve sayfayı yeniler
// (bkz. firebase-adapter.js). location.reload() nedeniyle bu çağrı normalde geri dönmez.
async function doLogout(){await window.authApi.logout();}

async function loadVehicles(){
  state.vehicles=await API.get('/vehicles');
  if(!state.selId&&state.vehicles.length)state.selId=state.vehicles[0].id;
}

function selVehicle(){return state.vehicles.find(v=>v.id===state.selId)||null;}

// O-4: silme/düzenleme gibi tek seferlik işlemlerin kendi err-msg alanı yok (hata anında
// ekran yeniden çizilmiyor). Bu yardımcı, hatayı #main'in en üstüne kalıcı bir bant olarak
// basar — sessiz promise rejection yerine kullanıcının gördüğü bir mesaj.
function showActionError(msg){
  const main=document.getElementById('main');
  if(!main){alert(msg);return;}
  let box=document.getElementById('action-err');
  if(!box){box=document.createElement('div');box.id='action-err';box.className='vc';main.prepend(box);}
  box.innerHTML=`<div class="err-msg">${esc(msg)}</div>`;
}

// `fab:true` olan nav öğesi mobilde (bkz. style.css @media max-width:700px) alt
// bardaki dolu daireye dönüşür — referans tasarımdaki "öne çıkan aksiyon".
// Masaüstünde sıradan bir nav satırı olarak kalır.
function renderLayout(view){
  // label = geniş ekran (sidebar), short = dar ekran (alt bar). İkisi de basılır,
  // hangisinin görüneceğine style.css karar verir.
  const nav=[{id:'dashboard',icon:'▦',label:'Genel Bakış',short:'Özet'},{id:'history',icon:'◷',label:'Bakım Geçmişi',short:'Geçmiş'},{id:'add',icon:'+',label:'Kayıt Ekle',short:'Ekle',fab:true},{id:'expenses',icon:'₺',label:'Masraflar',short:'Masraf'},{id:'vehicles',icon:'◈',label:'Araçlar',short:'Araçlar'},{id:'settings',icon:'⚙',label:'Ayarlar',short:'Ayarlar'}];
  const opts=state.vehicles.map(v=>`<option value="${esc(v.id)}" ${v.id===state.selId?'selected':''}>${esc(v.brand)} ${esc(v.model)}</option>`).join('');
  document.getElementById('app').innerHTML=`<div class="layout">
    <div class="sb">
      <div class="sb-top">
        <div class="sb-logo">${logoSvg(26)}<span>Benim Taşıtım</span></div>
        ${state.vehicles.length?`<div class="v-sel-wrap"><select class="v-sel" onchange="changeVehicle(this.value)">${opts}</select></div>`:''}
      </div>
      <nav>${nav.map(n=>`<div class="nav-item ${n.fab?'fab ':''}${view===n.id?'active':''}" data-id="${esc(n.id)}" onclick="navigate('${n.id}')"><span class="ni">${esc(n.icon)}</span><span class="nl">${esc(n.label)}</span><span class="nl-s">${esc(n.short)}</span>${n.id==='dashboard'?`<span class="nav-badge ${warningCount?'':'hidden'}" id="nav-warn-badge">${esc(warningCount)}</span>`:''}</div>`).join('')}</nav>
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
  if(!v){el.innerHTML=`<div class="vc"><div class="empty"><p style="font-size:15px;font-weight:600;color:var(--t);margin-bottom:6px">Henüz araç eklemedin</p><p class="hint" style="margin-bottom:18px">Takibe başlamak için önce bir araç ekle.</p><button class="btn" onclick="navigate('vehicles')">Araç Ekle</button></div></div>`;return;}
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
    // Parça satırları önce veri olarak hesaplanır; hem kartlar hem de üstteki
    // metrik ızgarası (sıradaki servis / uyarı sayısı) aynı hesaptan beslensin.
    let vehWarn=0,vehCrit=0,nextSvc=null;
    const cards=PARTS.map(p=>{
      const ap=activeByType[p.key];
      if(!ap)return `<div class="pcard unknown"><div class="ph"><span class="pname">${esc(p.name)}</span><span class="badge bx">Kayıt Yok</span></div><div class="pempty">Henüz kayıt yok</div>${healthBar(0,'unknown',16)}</div>`;
      const life=ap.expectedLifeKm??p.km;
      const remainingKm=life-(v.current_km-ap.installedAtKm);
      const nkm=ap.installedAtKm+life;
      // Segment çubuğu KALAN ömrü gösterir (referanstaki pil göstergesi gibi),
      // eski progress bar ise tüketileni gösteriyordu.
      const remainPct=Math.min(100,Math.max(0,Math.round((remainingKm/life)*100)));
      const st=remainingKm<=0?'red':remainingKm<=life*0.25?'amber':'green';
      if(st==='red'){vehWarn++;vehCrit++;}else if(st==='amber')vehWarn++;
      if(nextSvc===null||remainingKm<nextSvc.rem)nextSvc={rem:remainingKm,name:p.name};
      // Ömrü GEÇMİŞ parça çubuğu boş değil, TAMAMEN kırmızı çizilir: kalan ömür %0
      // olduğu için boş bırakılsa "Kayıt Yok" kartıyla aynı gri çubuğa dönüşür ve
      // en kritik durum ekranda en sessiz görünen şey olurdu.
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${esc(p.name)}</span><span class="badge ${bl[st]}">${esc(bl2[st])}</span></div>
        <div class="pval"><span class="pv">${esc(remainPct)}<span class="pu">%</span></span><span class="pmeta">kalan ömür</span></div>
        ${healthBar(st==='red'?100:remainPct,st,16)}
        <div class="pkm"><span>${fmtNum(ap.installedAtKm)} km</span><span>→</span><span class="nx">${fmtNum(nkm)} km</span></div>${ap.brand?`<div class="pbrand">${esc(ap.brand)}</div>`:''}</div>`;
    }).join('');
    const dueCards=DUE_TYPES.map(dt=>{
      const latest=expenses.filter(e=>e.type===dt.id&&e.due_date).sort((a,b)=>b.date.localeCompare(a.date))[0];
      if(!latest)return `<div class="pcard unknown"><div class="ph"><span class="pname">${esc(dt.label)}</span><span class="badge bx">Kayıt Yok</span></div><div class="pempty">Henüz kayıt yok</div>${healthBar(0,'unknown',16)}</div>`;
      const days=Math.ceil((new Date(latest.due_date)-new Date())/86400000);
      const st=days<0?'red':days<=30?'amber':'green';
      if(st==='red'){vehWarn++;vehCrit++;}else if(st==='amber')vehWarn++;
      const stLabel=days<0?'Süresi Geçti':days<=30?'Yaklaşıyor':'İyi';
      // Poliçe/muayene için "ömür" bir yıl kabul edilir; segment çubuğu kalan günü gösterir.
      const remainPct=Math.min(100,Math.max(0,Math.round((days/365)*100)));
      return `<div class="pcard ${st}"><div class="ph"><span class="pname">${esc(dt.label)}</span><span class="badge ${bl[st]}">${esc(stLabel)}</span></div>
        <div class="pval"><span class="pv">${esc(Math.abs(days))}<span class="pu">gün</span></span><span class="pmeta">${days<0?'gecikti':'kaldı'}</span></div>
        ${healthBar(st==='red'?100:remainPct,st,16)}
        <div class="pkm"><span>Yenileme:</span><span class="nx">${esc(latest.due_date)}</span></div></div>`;
    }).join('');
    const recent=logs.slice(0,4).map(l=>`<div class="arow" onclick="navigate('history')">
      <div class="a-ic blue">◷</div>
      <div class="a-bd"><div class="a-t"><span>${fmtNum(l.km)} km</span><span class="a-time">${esc(l.date)}</span></div>
      <div class="a-d">${esc(l.parts.map(p=>p.name).join(', '))||'—'}</div></div>
    </div>`).join('')||'<div class="enone">Henüz bakım kaydı yok.</div>';
    const logsTotal=logs.reduce((s,l)=>s+(l.total_cost||0),0);
    const expTotal=expenses.reduce((s,e)=>s+(e.amount||0),0);
    const total=logsTotal+expTotal;
    const thisMonth=monthKey(new Date().toISOString());
    const monthTotal=logs.filter(l=>monthKey(l.date)===thisMonth).reduce((s,l)=>s+(l.total_cost||0),0)
      +expenses.filter(e=>monthKey(e.date)===thisMonth).reduce((s,e)=>s+(e.amount||0),0);
    const byCost={};logs.forEach(l=>l.parts.forEach(p=>{byCost[p.name]=(byCost[p.name]||0)+(p.cost||0);}));
    const top=Object.entries(byCost).sort((a,b)=>b[1]-a[1]).slice(0,5);const maxC=top[0]?.[1]||1;
    const stDot=vehCrit?'red':vehWarn?'amber':'green';
    const stText=vehCrit?vehCrit+' kritik':vehWarn?vehWarn+' uyarı':'Her şey yolunda';
    el.innerHTML=`<div class="vc">
      <div id="warn-slot"></div>
      <div class="vh-card">
        <div class="vh-top">
          <div class="vh-badge">${initial(v.brand)}</div>
          <div class="vh-info"><h2>${esc(v.brand)} ${esc(v.model)}</h2><p>${esc(v.year||'')} ${esc(v.engine||'')}</p></div>
          <span class="vh-state"><i class="dot ${stDot}"></i>${esc(stText)}</span>
        </div>
        ${carArt('vh-art')}
        <div class="vh-foot">
          <div><span class="km-v">${fmtNum(v.current_km)}</span><span class="km-l">km</span><div class="km-c">Güncel kilometre</div></div>
          <div style="text-align:right"><span class="km-v" style="font-size:20px">${esc(logs.length)}</span><div class="km-c">bakım kaydı</div></div>
        </div>
      </div>
      <div class="mgrid">
        <div class="mcard"><div class="mc-h"><span class="mc-ic blue">₺</span><span class="mc-l">Toplam Masraf</span></div><div class="mc-v">${fmtNum(total)}<span class="mc-u">₺</span></div><div class="mc-s"><i class="dot blue"></i>bakım + masraf</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic green">◷</span><span class="mc-l">Bu Ay</span></div><div class="mc-v">${fmtNum(monthTotal)}<span class="mc-u">₺</span></div><div class="mc-s">${esc(thisMonth)}</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic amber">◈</span><span class="mc-l">Sıradaki Servis</span></div>
          <div class="mc-v">${nextSvc?(nextSvc.rem>0?fmtNum(nextSvc.rem):fmtNum(Math.abs(nextSvc.rem))):'—'}${nextSvc?'<span class="mc-u">km</span>':''}</div>
          <div class="mc-s">${nextSvc?`<i class="dot ${nextSvc.rem<=0?'red':nextSvc.rem<=1000?'amber':'green'}"></i>${esc(nextSvc.name)}${nextSvc.rem<=0?' (geçti)':''}`:'Parça kaydı yok'}</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic ${vehCrit?'red':vehWarn?'amber':'green'}">⚠</span><span class="mc-l">Uyarı</span></div><div class="mc-v">${esc(vehWarn)}</div><div class="mc-s"><i class="dot ${stDot}"></i>${esc(vehCrit)} kritik</div></div>
      </div>
      <div class="slabel">Parça Durumları</div>
      <div class="pgrid">${cards}${dueCards}</div>
      <div class="slabel">Özet</div>
      <div class="bgrid">
        <div class="card"><div class="chead"><div class="ctitle">Son Bakımlar</div>${logs.length>4?`<button class="clink" onclick="navigate('history')">Tümünü gör</button>`:''}</div><div class="alist">${recent}</div></div>
        <div class="card"><div class="chead"><div class="ctitle">Toplam Masraf</div><button class="clink" onclick="navigate('expenses')">Analiz</button></div><div class="etotal">${fmtNum(total)} ₺</div><div class="ebars">${top.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxC)*100)}%"></div></div><span class="eamt">${fmtNum(c)} ₺</span></div>`).join('')||'<div class="enone">Parça bazlı masraf kaydı yok.</div>'}</div></div>
      </div>
    </div>`;
    renderWarningsSummary();
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
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
  lastWarnings=warnings;
  paintWarnings();
}

// Uyarı listesi referanstaki "Recent alerts" kart diline taşındı: ikon kutusu +
// başlık + sağda rozet + altta açıklama. Uzun listeyi kart boğmasın diye ilk
// WARN_PREVIEW satır gösterilir, gerisi "Tümünü gör" ile açılır. Bu tamamen
// görsel bir durum (veri/route state'ine dokunmaz), o yüzden modül değişkeni.
const WARN_PREVIEW=4;
let lastWarnings=[];
let warnExpanded=false;

function toggleAllWarnings(){warnExpanded=!warnExpanded;paintWarnings();}

function paintWarnings(){
  const slot=document.getElementById('warn-slot');
  if(!slot)return;
  const warnings=lastWarnings;
  if(!warnings.length){slot.innerHTML='';return;}
  const vehicleCount=new Set(warnings.map(w=>w.vehicleId)).size;
  const shown=warnExpanded?warnings:warnings.slice(0,WARN_PREVIEW);
  const rows=shown.map(w=>{
    const st=w.status==='red'?'red':'amber';
    const badgeCls=st==='red'?'br':'ba';
    const badgeLabel=st==='red'?'Geçti':'Yaklaşıyor';
    return `<div class="arow" onclick="selectWarningVehicle('${w.vehicleId}')">
      <div class="a-ic ${st}">⚠</div>
      <div class="a-bd">
        <div class="a-t"><span>${esc(w.itemLabel)}</span><span class="badge ${badgeCls}">${esc(badgeLabel)}</span></div>
        <div class="a-d"><strong>${esc(w.vehicleLabel)}</strong> · ${esc(w.message)}</div>
      </div>
    </div>`;
  }).join('');
  const more=warnings.length>WARN_PREVIEW
    ?`<button class="clink" onclick="toggleAllWarnings()">${warnExpanded?'Daha az':'Tümünü gör ('+esc(warnings.length)+')'}</button>`
    :'';
  slot.innerHTML=`<div class="card warn-banner">
    <div class="chead"><div class="ctitle">${esc(vehicleCount)} araçta ${esc(warnings.length)} uyarı</div>${more}</div>
    <div class="alist">${rows}</div>
  </div>`;
}

function selectWarningVehicle(vehicleId){state.selId=vehicleId;navigate('dashboard');}

let editingLogId=null;
let editingExpenseId=null;

async function renderAdd(el,arg){
  const v=selVehicle();
  if(!v){el.innerHTML=`<div class="vc"><div class="empty">Araç seçin.</div></div>`;return;}
  // `type` aşağıda `onclick="saveExpense('${type}')"` ile bir JavaScript bağlamına giriyor;
  // orayı esc() korumaz (bkz. dosya başındaki not). Kaynağı Firestore'daki `category`
  // alanı olduğu için değeri burada bilinen kümeye kısıtlıyoruz — allowlist, kaçış değil.
  const type=EXPENSE_TYPES.some(t=>t.id===arg?.type)?arg.type:'bakim';
  const isEdit=!!arg?.id;
  editingLogId=null;editingExpenseId=null;
  let log=null,exp=null;
  try{
    if(isEdit&&type==='bakim'){
      const logs=await API.get('/maintenance/'+v.id);
      log=logs.find(l=>l.id===arg.id)||null;
      editingLogId=log?log.id:null;
    }else if(isEdit){
      const exps=await window.api.expenses.list(v.id);
      exp=exps.find(x=>x.id===arg.id)||null;
      editingExpenseId=exp?exp.id:null;
    }
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">Kayıt yüklenemedi: ${esc(e.message)}</div></div>`;return;}
  const typeLabel=EXPENSE_TYPES.find(t=>t.id===type)?.label||'Bakım';
  el.innerHTML=`<div class="vc">
    <div class="vtitle-wrap"><h2 class="vtitle">${esc(isEdit?typeLabel+' Kaydını Düzenle':'Kayıt Ekle')}</h2>
    <div class="vsub">${esc(v.brand)} ${esc(v.model)} · ${fmtNum(v.current_km)} km</div></div>
    ${isEdit?'':`<div class="etabs">${EXPENSE_TYPES.map(t=>`<div class="etab ${type===t.id?'active':''}" onclick='navigate("add",{type:"${t.id}"})'>${esc(t.label)}</div>`).join('')}</div>`}
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
    <h3>Bakım Bilgileri</h3>
    <div class="frow"><div class="fg"><label>Kilometre *</label><input type="number" id="m-km" value="${esc(log?log.km:v.current_km)}"></div><div class="fg"><label>Tarih *</label><input type="date" id="m-date" value="${esc(log?log.date:new Date().toISOString().split('T')[0])}"></div><div class="fg"><label>Toplam Tutar (₺)</label><input type="number" id="m-cost" placeholder="0" min="0" value="${esc(log?.total_cost||'')}"></div></div>
    <div class="fg"><label>Değiştirilen Parçalar</label><div class="pcl">${PARTS.map(p=>{
      const checked=checkedKeys.has(p.key);
      const existing=(log?.parts||[]).find(x=>x.key===p.key);
      return `<label class="pchk"><input type="checkbox" data-key="${esc(p.key)}" data-name="${esc(p.name)}" ${checked?'checked':''}><span>${esc(p.name)}</span><input type="text" class="binput ${checked?'':'hidden'}" placeholder="Marka / Not" value="${esc(existing?.brand||'')}"><input type="number" class="cinput ${checked?'':'hidden'}" placeholder="₺" min="0" value="${esc(existing?.cost||'')}"></label>`;
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
  const heads={yakit:'Yakıt Kaydı',sigorta:'Sigorta Kaydı',muayene:'Muayene Kaydı'};
  body.innerHTML=`<div class="fcard">
    <h3>${esc(heads[type]||'Masraf Kaydı')}</h3>
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
    if(wasEditing)await window.api.expenses.update(editingExpenseId,body,state.selId);
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
    const rows=logs.map(l=>`<div class="lcard"><div class="lhead"><div><span class="lkm">${fmtNum(l.km)} km</span><span class="ldate">${esc(l.date)}</span></div><div class="lacts">${l.total_cost?`<span class="lcost">${fmtNum(l.total_cost)} ₺</span>`:''}<button class="btn-s" onclick="editLog('${l.id}')">Düzenle</button><button class="btn-d" onclick="delLog('${l.id}')">Sil</button></div></div><div class="lparts">${l.parts.map(p=>`<span class="ptag">${esc(p.name)}${p.brand?' · '+esc(p.brand):''}</span>`).join('')}</div>${l.notes?`<div class="lnotes">${esc(l.notes)}</div>`:''}</div>`).join('')||'<div class="empty">Henüz bakım kaydı yok.</div>';
    el.innerHTML=`<div class="vc"><div class="vheader"><div class="vtitle-wrap"><h2 class="vtitle">Bakım Geçmişi</h2><div class="vsub">${esc(v.brand)} ${esc(v.model)} · ${esc(logs.length)} kayıt</div></div><button class="btn" onclick="navigate('add')">+ Bakım Ekle</button></div><div class="llist">${rows}</div></div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

function editLog(id){navigate('add',{type:'bakim',id});}

// O-4: eskiden try/catch yoktu — silme başarısız olduğunda hata yakalanmamış bir promise
// rejection'a dönüşüyor, ekran yine de "history"e gidiyor ve kullanıcı kaydın silindiğini
// sanıyordu. Artık hata görünür.
async function delLog(id){
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  try{
    await API.del('/maintenance/log/'+id,state.selId);
    await navigate('history');
  }catch(e){showActionError('Kayıt silinemedi: '+e.message);}
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
      return `<div class="lcard"><div class="lhead"><div><span class="lkm">${esc(label)}</span><span class="ldate">${esc(e.date)}</span></div><div class="lacts"><span class="lcost">${fmtNum(e.amount)} ₺</span><button class="btn-s" onclick="editExpense('${e.id}')">Düzenle</button><button class="btn-d" onclick="delExpense('${e.id}')">Sil</button></div></div>${e.due_date?`<div class="lparts"><span class="ptag">Yenileme: ${esc(e.due_date)}</span></div>`:''}${e.notes?`<div class="lnotes">${esc(e.notes)}</div>`:''}</div>`;
    }).join('')||'<div class="empty">Henüz yakıt / sigorta / muayene kaydı yok.</div>';
    // Metrik ızgarası dashboard ile aynı dili konuşur: ikon + etiket + büyük sayı + alt bilgi.
    const thisYear=String(new Date().getFullYear());
    const yearTotal=byYear[thisYear]||0;
    const avg=logs.length?Math.round(logsTotal/logs.length):0;
    el.innerHTML=`<div class="vc"><div class="vheader"><div class="vtitle-wrap"><h2 class="vtitle">Masraf Analizi</h2><div class="vsub">${esc(v.brand)} ${esc(v.model)}</div></div><button class="btn" onclick='navigate("add",{type:"yakit"})'>+ Masraf Ekle</button></div>
      <div class="mgrid">
        <div class="mcard"><div class="mc-h"><span class="mc-ic blue">₺</span><span class="mc-l">Toplam</span></div><div class="mc-v">${fmtNum(total)}<span class="mc-u">₺</span></div><div class="mc-s"><i class="dot blue"></i>tüm zamanlar</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic green">◷</span><span class="mc-l">${esc(thisYear)}</span></div><div class="mc-v">${fmtNum(yearTotal)}<span class="mc-u">₺</span></div><div class="mc-s">${total?esc(Math.round((yearTotal/total)*100))+'% toplam içinde':'—'}</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic amber">◈</span><span class="mc-l">Bakım Sayısı</span></div><div class="mc-v">${esc(logs.length)}</div><div class="mc-s">${esc(expenses.length)} ek masraf kaydı</div></div>
        <div class="mcard"><div class="mc-h"><span class="mc-ic">≈</span><span class="mc-l">Ort / Bakım</span></div><div class="mc-v">${fmtNum(avg)}<span class="mc-u">₺</span></div><div class="mc-s">bakım başına ortalama</div></div>
      </div>
      <div class="slabel">Dağılım</div>
      <div class="two">
        <div class="card"><div class="ctitle">Yıla Göre</div><div class="ebars">${ys.map(([y,c])=>`<div class="erow"><span class="ename">${esc(y)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/(total||1))*100)}%"></div></div><span class="eamt">${fmtNum(c)} ₺</span></div>`).join('')||'<div class="enone">Veri yok</div>'}</div></div>
        <div class="card"><div class="ctitle">Parçaya Göre</div><div class="ebars">${ps.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxP)*100)}%"></div></div><span class="eamt">${fmtNum(c)} ₺</span></div>`).join('')||'<div class="enone">Veri yok</div>'}</div></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="ctitle">Türe Göre</div><div class="ebars">${ts.map(([n,c])=>`<div class="erow"><span class="ename">${esc(n)}</span><div class="ebar"><div class="efill" style="width:${Math.round((c/maxT)*100)}%"></div></div><span class="eamt">${fmtNum(c)} ₺</span></div>`).join('')||'<div class="enone">Veri yok</div>'}</div></div>
      <div class="slabel">Yakıt / Sigorta / Muayene Kayıtları</div>
      <div class="llist">${recentExp}</div>
    </div>`;
  }catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">${esc(e.message)}</div></div>`;}
}

// O-4: `.then()` zinciri hata dalını hiç ele almıyordu; liste çekilemezse düğme sessizce
// hiçbir şey yapmıyordu.
async function editExpense(id){
  const v=selVehicle();
  if(!v)return;
  try{
    const exps=await window.api.expenses.list(v.id);
    const exp=exps.find(e=>e.id===id);
    if(!exp){showActionError('Kayıt bulunamadı, liste yenilenmiş olabilir.');return;}
    await navigate('add',{type:exp.type,id});
  }catch(e){showActionError('Kayıt açılamadı: '+e.message);}
}

async function delExpense(id){
  if(!confirm('Bu masraf kaydını silmek istiyor musunuz?'))return;
  try{
    await window.api.expenses.delete(id,state.selId);
    await navigate('expenses');
  }catch(e){showActionError('Masraf kaydı silinemedi: '+e.message);}
}

let editingVehicleId=null;

async function renderVehicles(el){
  el.innerHTML='<div class="vc"><div class="loading">Yükleniyor...</div></div>';
  // O-4 / §6: kardeş render fonksiyonlarının aksine burada try/catch yoktu — loadVehicles()
  // hata verdiğinde (ör. oturum düşmüş, ağ yok) kullanıcı boş ekran görüyordu.
  try{await loadVehicles();}
  catch(e){el.innerHTML=`<div class="vc"><div class="err-msg">Araçlar yüklenemedi: ${esc(e.message)}</div></div>`;return;}
  // Referanstaki "hero görselli" araç kartının fotoğrafsız karşılığı: marka baş
  // harfi rozeti + arka planda soluk araç silueti.
  const cards=state.vehicles.map(v=>`<div class="vci ${v.id===state.selId?'sel':''}" onclick="changeVehicle('${v.id}');navigate('dashboard')">
    ${carArt('vci-art')}
    <div class="vci-top">
      <div class="vci-badge">${initial(v.brand)}</div>
      <div class="vci-info"><h3>${esc(v.brand)} ${esc(v.model)}</h3><p>${esc(v.year||'')} ${esc(v.engine||'')}</p></div>
      ${v.id===state.selId?'<span class="badge bg">Seçili</span>':''}
    </div>
    <div class="vci-km">${fmtNum(v.current_km)}<small>km</small></div>
    <div class="vci-acts">
      <button class="btn-s" onclick="event.stopPropagation();showEditVehicle('${v.id}')">Düzenle</button>
      <button class="btn-d" onclick="event.stopPropagation();delVehicle('${v.id}')">Sil</button>
    </div>
  </div>`).join('')||'<div class="empty">Henüz araç eklemedin.</div>';
  el.innerHTML=`<div class="vc"><div class="vheader"><div class="vtitle-wrap"><h2 class="vtitle">Araçlar</h2><div class="vsub">${esc(state.vehicles.length)} araç kayıtlı</div></div><button class="btn" onclick="showAddVehicle()">+ Araç Ekle</button></div><div class="vlist">${cards}</div>
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

// O-4: silme üç ayrı yazma adımından oluşuyor (expenses → parts → vehicle) ve atomik değil.
// Yarıda kalırsa kullanıcıya bunu DÜRÜST söylemek gerekir; eskiden hata sessizce yutuluyor,
// kullanıcı aracın tamamen silindiğini sanıyordu.
async function delVehicle(id){
  if(!confirm('Bu aracı ve tüm bakım kayıtlarını silmek istiyor musunuz?'))return;
  try{
    await API.del('/vehicles/'+id);
    if(state.selId===id)state.selId=null;
    await loadVehicles();
    await navigate('vehicles');
  }catch(e){
    showActionError('Araç silinemedi: '+e.message+' — verilerin bir kısmı silinmiş olabilir, sayfayı yenileyip tekrar deneyin.');
  }
}

function renderSettings(el){
  const user=window.authApi.currentUser();
  el.innerHTML=`<div class="vc"><h2 class="vtitle">Ayarlar</h2>
  <div class="fcard" style="margin-top:0"><h3>Veri Yedekleme</h3>
    <p class="hint" style="margin-bottom:6px">Tüm araç ve bakım verilerini bir JSON dosyasına kaydedebilir ya da önceden alınmış bir yedeği geri yükleyebilirsin.</p>
    <p class="hint">⚠ Yedek dosyası tüm harcama kayıtlarını <strong>şifresiz düz metin</strong> olarak içerir. Paylaşırken ve buluta yüklerken dikkatli ol.</p>
    <div id="bk-msg" class="ok-msg hidden"></div>
    <div class="facts" style="justify-content:flex-start">
      <button class="btn-s" onclick="importBackup()">Yedekten Geri Yükle</button>
      <button class="btn" onclick="exportBackup()">Yedek Al</button>
    </div>
  </div>
  <div class="fcard"><h3>Hesap</h3>
    <div class="arow" style="cursor:default;border-bottom:none;padding-top:0">
      <div class="a-ic blue">${initial(user&&user.email)}</div>
      <div class="a-bd"><div class="a-t"><span>${esc(user?user.email:'')}</span></div><div class="a-d">Oturum açık</div></div>
    </div>
    <div class="facts" style="justify-content:flex-start"><button class="btn-s" onclick="doLogout()">Çıkış Yap</button></div>
    <div class="hr"></div>
    <h3 style="color:var(--red)">Hesabımı Sil</h3>
    <p class="hint">Tüm araçların, masrafların, bakım kayıtların ve hesabın <strong>kalıcı olarak</strong> silinecek. Bu işlem geri alınamaz ve verilerin kurtarılamaz. Silmeden önce "Yedek Al" ile bir kopya çıkarabilirsin.</p>
    <div class="facts" style="justify-content:flex-start"><button class="btn-d" onclick="showDeleteAccount()">Hesabımı Sil</button></div>
    <div id="da-form" class="hidden" style="margin-top:14px">
      <div class="fg"><label>Devam etmek için şifreni gir</label><input type="password" id="da-pass" placeholder="••••••••"></div>
      <div id="da-err" class="err-msg hidden"></div>
      <div id="da-ok" class="ok-msg hidden"></div>
      <div class="facts" style="justify-content:flex-start"><button class="btn-s" onclick="hideDeleteAccount()">Vazgeç</button><button class="btn-d" onclick="doDeleteAccount()">Hesabımı Kalıcı Olarak Sil</button></div>
    </div>
  </div></div>`;
}

function showDeleteAccount(){
  document.getElementById('da-form').classList.remove('hidden');
  document.getElementById('da-pass').focus();
}

function hideDeleteAccount(){
  const f=document.getElementById('da-form');
  document.getElementById('da-pass').value='';
  document.getElementById('da-err').classList.add('hidden');
  document.getElementById('da-ok').classList.add('hidden');
  f.classList.add('hidden');
}

// Y-4 — hesap silme, CLIENT tarafında. Raporun önerdiği Cloud Function tabanlı sunucu
// cascade'i Blaze plan gerektirdiği için bilinçli olarak istemciye alındı; firestore.rules
// bunun için `users/{userId}` üzerinde sahibine `delete` izni veriyor.
//
// Sıra ÖNEMLİ: araçlar (ve altlarındaki expenses/parts) önce, users dokümanı sonra,
// Auth kaydı en son. Auth kaydı silinirse geriye kalan Firestore dokümanlarına bir daha
// hiç kimse erişemez (rules ownerId == request.auth.uid istiyor) — o yüzden Auth silme
// mutlaka en sonda. Adımlar atomik değil; yarıda kalırsa kullanıcıya bunu açıkça söylüyoruz,
// sahte başarı göstermiyoruz.
async function doDeleteAccount(){
  const passEl=document.getElementById('da-pass');
  const errEl=document.getElementById('da-err');const okEl=document.getElementById('da-ok');
  const pass=passEl?passEl.value:'';
  errEl.classList.add('hidden');okEl.classList.add('hidden');
  if(!pass){errEl.textContent='Devam etmek için şifreni gir.';errEl.classList.remove('hidden');return;}
  if(!confirm('Hesabın ve tüm verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?'))return;
  const btns=Array.from(document.querySelectorAll('#da-form button'));
  btns.forEach(b=>{b.disabled=true;});
  try{
    await window.authApi.reauthenticate(pass);
  }catch(e){
    btns.forEach(b=>{b.disabled=false;});
    errEl.textContent=e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'
      ?'Şifre hatalı. Hesap silinmedi.'
      :authErrorMessage(e);
    errEl.classList.remove('hidden');return;
  }
  okEl.textContent='Verilerin siliniyor, lütfen bekle...';okEl.classList.remove('hidden');
  try{
    await loadVehicles();
    for(const v of state.vehicles){await window.api.vehicles.delete(v.id);}
    // Bu noktadan sonra onAuthStateChanged(null) tetiklenip login ekranına düşülecek;
    // mesaj orada gösterilsin diye önceden bırakılıyor.
    setLoginNotice('Hesabın ve tüm verilerin kalıcı olarak silindi.');
    await window.authApi.deleteAccount();
    // Hesap gitti ama Firestore'un disk önbelleğinde kullanıcının araç/masraf verisi
    // hâlâ şifresiz duruyor olurdu (O-3 ile aynı sorun) — temizleyip sayfayı yeniliyoruz.
    // Bu çağrı location.reload() yaptığı için normalde geri dönmez.
    await window.authApi.clearLocalCache();
  }catch(e){
    clearLoginNotice();
    btns.forEach(b=>{b.disabled=false;});
    okEl.classList.add('hidden');
    errEl.textContent='Silme tamamlanamadı: '+e.message+' — verilerinin bir kısmı silinmiş olabilir. Tekrar giriş yapıp işlemi yeniden dene.';
    errEl.classList.remove('hidden');
  }
}

function showBackupMsg(text,ok){
  const el=document.getElementById('bk-msg');
  if(!el){alert(text);return;}
  el.textContent=text;
  el.className=ok?'ok-msg':'err-msg';
}

// O-6: `success` artık gerçek yazma sonucundan geliyor (bkz. firebase-adapter.js backup.export).
// Sabit true dönen eski hâlde, Android WebView'de dosya hiç oluşmasa bile kullanıcıya
// "Yedek kaydedildi" yazıyordu — uygulamanın verebileceği en zararlı güvence.
async function exportBackup(){
  try{
    const r=await window.api.backup.export();
    if(r&&r.success)showBackupMsg('Yedek kaydedildi: '+(r.filePath||''),true);
    else showBackupMsg('Yedek alınamadı'+(r&&r.error?': '+r.error:'.'),false);
  }catch(e){showBackupMsg('Yedek alınamadı: '+e.message,false);}
}

async function importBackup(){
  if(!confirm('Mevcut tüm veriler, seçtiğin yedek dosyasındaki verilerle değiştirilecek. Emin misin?'))return;
  try{
    const r=await window.api.backup.import();
    if(r&&r.success){await loadVehicles();await navigate('settings');showBackupMsg('Geri yükleme tamamlandı.',true);}
    else showBackupMsg('Geri yükleme tamamlanamadı.',false);
  }catch(e){showBackupMsg('Geri yükleme tamamlanamadı: '+e.message,false);}
}

init();
