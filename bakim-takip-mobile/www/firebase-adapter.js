// www/firebase-adapter.js
// Firestore tabanlı window.api implementasyonu — idb-adapter.js'in yerini alır.
// idb-adapter.js SİLİNMEDİ (bkz. index.html'deki not), sadece artık yüklenmiyor.
//
// Alan adları, referans doküman C:\Users\tugru\repos\arac-masraf-takip\docs\firestore-data-model.md
// içindeki genel camelCase şemadan DEĞİL, bu projenin mevcut app.js / idb-adapter.js alan
// adlarından (brand/model/current_km/purchase_km/type/due_date vb.) birebir kopyalanmıştır —
// böylece app.js'in render mantığı değiştirilmeden window.api çağrılarının arkasındaki
// implementasyon değişebiliyor. Koleksiyon yapısı (vehicles top-level + expenses/parts
// subcollection, ownerId denormalizasyonu) referans dokümanla ve deploy edilmiş
// firestore.rules ile birebir uyumludur.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification, updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, collection, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, setDoc, query, where, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// `firebaseConfig`, www/firebase-config.js (klasik <script>, index.html'de bu modülden önce
// ve senkron yüklenir) içinde global olarak tanımlanır. Modül üst kapsamının dış kapsamı
// sayfanın gerçek global (Realm) kapsamıdır, bu yüzden buradan doğrudan erişilebilir —
// firebase-config.js'e dokunulmadı (elle değiştirilmemesi istendi).
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache() });

// app.js'teki PARTS listesiyle birebir aynı tutulmalı (parça anahtarı + varsayılan değişim
// km'si). Script yükleme sırası (bu modül app.js'ten ÖNCE çalışır) nedeniyle app.js'teki
// sabite güvenmek yerine burada ayrıca tanımlanmıştır — app.js'te PARTS değişirse burası da
// elle güncellenmeli.
const PARTS=[{key:'motor_yagi',name:'Motor Yağı',km:7000},{key:'yag_filtresi',name:'Yağ Filtresi',km:7000},{key:'hava_filtresi',name:'Hava Filtresi',km:15000},{key:'polen_filtresi',name:'Polen Filtresi',km:15000},{key:'yakit_filtresi',name:'Yakıt Filtresi',km:30000},{key:'triger',name:'Triger Kayışı',km:60000},{key:'devirdaim',name:'Devirdaim Pompası',km:60000},{key:'bujiler',name:'Bujiler',km:40000},{key:'on_balata',name:'Ön Fren Balata',km:40000},{key:'arka_balata',name:'Arka Fren Balata',km:40000},{key:'fren_diski',name:'Fren Diski',km:60000},{key:'antifriz',name:'Antifriz',km:40000},{key:'sanziman_yagi',name:'Şanzıman Yağı',km:60000},{key:'direksiyon_yagi',name:'Direksiyon Yağı',km:40000},{key:'klima_gazi',name:'Klima Gazı',km:40000}];

function uid(){
  const u=auth.currentUser;
  if(!u)throw new Error('Oturum açık değil');
  return u.uid;
}

// Bir subcollection'daki tüm dokümanları Firestore'un 500 yazımlık batch limitini
// aşmayacak şekilde (450 güvenlik payı ile) parçalı batch'lerle siler.
async function deleteAllDocs(colRef){
  const snap=await getDocs(colRef);
  const docs=snap.docs;
  for(let i=0;i<docs.length;i+=450){
    const batch=writeBatch(db);
    docs.slice(i,i+450).forEach(d=>batch.delete(d.ref));
    await batch.commit();
  }
}

// Seçili parçalar için parts dokümanlarını batch içine yazar: her parça için yeni bir
// doküman açar, aynı partTypeId için önceden aktif olan dokümanı isActive:false yapıp
// replacedByPartId ile yeni dokümana bağlar. create ve updateLog tarafından ortak kullanılır.
// NOT: updateLog'da da her zaman yeni parça dokümanları açılır (mevcut aktif olanı "replace"
// eder) — bir bakım kaydı hiç değiştirilmeden yeniden kaydedilse bile. Aynı bakım kaydından
// çıkarılan (uncheck edilen) bir parça, mevcut aktif dokümanı otomatik pasifleştirilmez;
// bu ince ayrım kapsam dışı bırakıldı.
async function writePartChanges(batch,vehicleId,ownerId,km,date,parts,expenseId,activeByType){
  const partChangeIds=[];
  for(const p of parts){
    const newPartRef=doc(collection(db,'vehicles',vehicleId,'parts'));
    const catalog=PARTS.find(x=>x.key===p.key);
    const prevActive=activeByType[p.key];
    if(prevActive){
      batch.update(prevActive.ref,{isActive:false,replacedByPartId:newPartRef.id,updated_at:new Date().toISOString()});
    }
    batch.set(newPartRef,{
      vehicleId,ownerId,
      partTypeId:p.key,partTypeLabel:p.name,
      brand:p.brand||'',
      installedAtKm:km,installedAtDate:date,
      expectedLifeKm:catalog?catalog.km:null,
      partCost:p.cost||0,
      relatedExpenseId:expenseId,
      isActive:true,replacedByPartId:null,
      created_at:new Date().toISOString(),
    });
    partChangeIds.push(newPartRef.id);
  }
  return partChangeIds;
}

async function activePartsByType(vehicleId){
  // NOT: Firestore, rules'a göre bir sorgunun güvenli olduğunu STATİK olarak
  // kanıtlayamıyorsa (ör. `ownerId` eşitliği rule'da var ama query'de yoksa)
  // koleksiyon boş olsa bile TÜM isteği "Missing or insufficient permissions"
  // ile reddeder — bu yüzden her subcollection sorgusuna ownerId filtresi
  // eklemek ZORUNLU, sadece "mantıken zaten kendi aracım" yeterli değil.
  const snap=await getDocs(query(collection(db,'vehicles',vehicleId,'parts'),where('ownerId','==',uid()),where('isActive','==',true)));
  const map={};
  snap.docs.forEach(d=>{map[d.data().partTypeId]=d;});
  return map;
}

window.api={
  vehicles:{
    async list(){
      const owner=uid();
      const snap=await getDocs(query(collection(db,'vehicles'),where('ownerId','==',owner)));
      const vehicles=snap.docs.map(d=>({id:d.id,...d.data()}));
      vehicles.sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
      return vehicles;
    },
    async create(body){
      const owner=uid();
      const data={
        ownerId:owner,
        brand:body.brand,model:body.model,
        year:body.year||null,engine:body.engine||null,
        purchase_km:body.purchase_km||0,current_km:body.current_km||0,
        created_at:new Date().toISOString(),
      };
      const ref=await addDoc(collection(db,'vehicles'),data);
      return {id:ref.id,...data};
    },
    async update(id,body){
      const {brand,model,year=null,engine=null,purchase_km=0,current_km=0}=body;
      await updateDoc(doc(db,'vehicles',id),{brand,model,year,engine,purchase_km,current_km});
      return {id};
    },
    async delete(id){
      await deleteAllDocs(query(collection(db,'vehicles',id,'expenses'),where('ownerId','==',uid())));
      await deleteAllDocs(query(collection(db,'vehicles',id,'parts'),where('ownerId','==',uid())));
      await deleteDoc(doc(db,'vehicles',id));
      return {success:true};
    },
  },
  maintenance:{
    async list(vehicleId){
      const snap=await getDocs(query(collection(db,'vehicles',vehicleId,'expenses'),where('ownerId','==',uid()),where('category','==','bakim')));
      const logs=await Promise.all(snap.docs.map(async d=>{
        const data=d.data();
        const partIds=(data.meta&&data.meta.bakim&&data.meta.bakim.partChangeIds)||[];
        const resolved=await Promise.all(partIds.map(async pid=>{
          const pSnap=await getDoc(doc(db,'vehicles',vehicleId,'parts',pid));
          if(!pSnap.exists())return null;
          const p=pSnap.data();
          return {key:p.partTypeId,name:p.partTypeLabel,brand:p.brand||'',cost:p.partCost||0};
        }));
        return {id:d.id,km:data.km,date:data.date,notes:data.notes||'',total_cost:data.amount||0,parts:resolved.filter(Boolean)};
      }));
      return logs.sort((a,b)=>b.km-a.km);
    },
    async create(vehicleId,body){
      const owner=uid();
      const {km,date,parts=[],notes='',total_cost=0}=body;
      const vehicleRef=doc(db,'vehicles',vehicleId);
      const vehicleSnap=await getDoc(vehicleRef);
      if(!vehicleSnap.exists())throw new Error('Araç bulunamadı');
      const activeByType=await activePartsByType(vehicleId);
      const batch=writeBatch(db);
      const expenseRef=doc(collection(db,'vehicles',vehicleId,'expenses'));
      const partChangeIds=await writePartChanges(batch,vehicleId,owner,km,date,parts,expenseRef.id,activeByType);
      batch.set(expenseRef,{
        category:'bakim',amount:total_cost,date,km,notes,
        ownerId:owner,vehicleId,
        meta:{bakim:{partChangeIds}},
        created_at:new Date().toISOString(),
      });
      if(km>(vehicleSnap.data().current_km||0))batch.update(vehicleRef,{current_km:km});
      await batch.commit();
      return {id:expenseRef.id};
    },
    async updateLog(id,body,vehicleId){
      if(!vehicleId)throw new Error('Araç bilgisi eksik');
      const owner=uid();
      const {km,date,parts=[],notes='',total_cost=0}=body;
      const expenseRef=doc(db,'vehicles',vehicleId,'expenses',id);
      const expenseSnap=await getDoc(expenseRef);
      if(!expenseSnap.exists())throw new Error('Kayıt bulunamadı');
      const vehicleRef=doc(db,'vehicles',vehicleId);
      const vehicleSnap=await getDoc(vehicleRef);
      const activeByType=await activePartsByType(vehicleId);
      const batch=writeBatch(db);
      const partChangeIds=await writePartChanges(batch,vehicleId,owner,km,date,parts,id,activeByType);
      batch.update(expenseRef,{amount:total_cost,date,km,notes,meta:{bakim:{partChangeIds}}});
      if(vehicleSnap.exists()&&km>(vehicleSnap.data().current_km||0))batch.update(vehicleRef,{current_km:km});
      await batch.commit();
      return {id};
    },
    async deleteLog(id,vehicleId){
      if(!vehicleId)throw new Error('Araç bilgisi eksik');
      await deleteDoc(doc(db,'vehicles',vehicleId,'expenses',id));
      return {success:true};
    },
  },
  expenses:{
    async list(vehicleId){
      const snap=await getDocs(query(collection(db,'vehicles',vehicleId,'expenses'),where('ownerId','==',uid()),where('category','in',['yakit','sigorta','muayene'])));
      return snap.docs.map(d=>{
        const data=d.data();
        return {id:d.id,type:data.category,date:data.date,amount:data.amount,km:data.km??null,due_date:(data.meta&&data.meta.due_date)||null,notes:data.notes||''};
      }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    },
    async create(vehicleId,body){
      const owner=uid();
      const {type,date,amount,km=null,due_date=null,notes=''}=body;
      const vehicleRef=doc(db,'vehicles',vehicleId);
      const batch=writeBatch(db);
      const expenseRef=doc(collection(db,'vehicles',vehicleId,'expenses'));
      batch.set(expenseRef,{
        category:type,amount,date,km,notes,
        ownerId:owner,vehicleId,
        meta:due_date?{due_date}:null,
        created_at:new Date().toISOString(),
      });
      if(km){
        const vSnap=await getDoc(vehicleRef);
        if(vSnap.exists()&&km>(vSnap.data().current_km||0))batch.update(vehicleRef,{current_km:km});
      }
      await batch.commit();
      return {id:expenseRef.id};
    },
    async update(id,body,vehicleId){
      if(!vehicleId)throw new Error('Araç bilgisi eksik');
      const {type,date,amount,km=null,due_date=null,notes=''}=body;
      const expenseRef=doc(db,'vehicles',vehicleId,'expenses',id);
      const vehicleRef=doc(db,'vehicles',vehicleId);
      const batch=writeBatch(db);
      batch.update(expenseRef,{category:type,amount,date,km,notes,meta:due_date?{due_date}:null});
      if(km){
        const vSnap=await getDoc(vehicleRef);
        if(vSnap.exists()&&km>(vSnap.data().current_km||0))batch.update(vehicleRef,{current_km:km});
      }
      await batch.commit();
      return {id};
    },
    async delete(id,vehicleId){
      if(!vehicleId)throw new Error('Araç bilgisi eksik');
      await deleteDoc(doc(db,'vehicles',vehicleId,'expenses',id));
      return {success:true};
    },
  },
  // idb-adapter.js'te olmayan yeni bir namespace: dashboard'daki parça durumu kartları
  // için aracın şu an takılı (isActive==true) parçalarını döner. app.js bu namespace'in
  // yokluğuna (ör. idb-adapter.js yeniden etkinleştirilirse) karşı savunmalı kod yazar.
  parts:{
    async listActive(vehicleId){
      const snap=await getDocs(query(collection(db,'vehicles',vehicleId,'parts'),where('ownerId','==',uid()),where('isActive','==',true)));
      return snap.docs.map(d=>({id:d.id,...d.data()}));
    },
    // Dashboard'un en üstündeki uyarı özeti için: kullanıcının TÜM araçlarını gezip
    // app.js'teki renderDashboard ile AYNI eşik mantığıyla (remainingKm<=0 -> red,
    // <=life*0.25 -> amber; due_date için days<0 -> red, <=30 -> amber) parça ve
    // sigorta/muayene uyarılarını tek bir listede döner. "green"/"unknown" (Kayıt Yok)
    // durumları listeye hiç girmez. Sıralama: önce red sonra amber, her grup içinde en
    // acil (remainingKm/days en düşük) önce.
    async listAllWarnings(){
      const vehicles=await window.api.vehicles.list();
      const warnings=[];
      for(const v of vehicles){
        const vehicleLabel=`${v.brand} ${v.model}`;
        const activeParts=await window.api.parts.listActive(v.id);
        activeParts.forEach(ap=>{
          const catalog=PARTS.find(x=>x.key===ap.partTypeId);
          const life=ap.expectedLifeKm??(catalog?catalog.km:null);
          if(!life)return;
          const remainingKm=life-(v.current_km-ap.installedAtKm);
          const status=remainingKm<=0?'red':remainingKm<=life*0.25?'amber':null;
          if(!status)return;
          warnings.push({
            vehicleId:v.id,vehicleLabel,
            itemLabel:ap.partTypeLabel||(catalog?catalog.name:ap.partTypeId),
            status,urgency:remainingKm,
            message:remainingKm<=0?`${Math.abs(remainingKm).toLocaleString('tr-TR')} km geçti`:`kaldı: ${remainingKm.toLocaleString('tr-TR')} km`,
          });
        });
        const expenses=await window.api.expenses.list(v.id);
        const dueLabels={sigorta:'Sigorta',muayene:'Muayene'};
        Object.keys(dueLabels).forEach(type=>{
          const latest=expenses.filter(e=>e.type===type&&e.due_date).sort((a,b)=>b.date.localeCompare(a.date))[0];
          if(!latest)return;
          const days=Math.ceil((new Date(latest.due_date)-new Date())/86400000);
          const status=days<0?'red':days<=30?'amber':null;
          if(!status)return;
          warnings.push({
            vehicleId:v.id,vehicleLabel,
            itemLabel:dueLabels[type],
            status,urgency:days,
            message:days<0?`${Math.abs(days)} gün geçti`:`kaldı: ${days} gün`,
          });
        });
      }
      const order={red:0,amber:1};
      warnings.sort((a,b)=>order[a.status]-order[b.status]||a.urgency-b.urgency);
      return warnings;
    },
  },
  backup:{
    async export(){
      const vehicles=await window.api.vehicles.list();
      const allLogs=[],allExpenses=[],allParts=[];
      for(const v of vehicles){
        (await window.api.maintenance.list(v.id)).forEach(l=>allLogs.push({...l,vehicle_id:v.id}));
        (await window.api.expenses.list(v.id)).forEach(e=>allExpenses.push({...e,vehicle_id:v.id}));
        (await window.api.parts.listActive(v.id)).forEach(p=>allParts.push(p));
      }
      const data={vehicles,logs:allLogs,expenses:allExpenses,parts:allParts,exportedAt:new Date().toISOString()};
      const filename=`bakim-takip-yedek-${new Date().toISOString().slice(0,10)}.json`;
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=filename;
      document.body.appendChild(a);a.click();a.remove();
      URL.revokeObjectURL(url);
      return {success:true,filePath:filename};
    },
    async import(){
      // Bulut hesabında toplu geri yükleme bu fazın kapsamı dışında bırakıldı: mevcut
      // verinin güvenle silinmesi, yeni doküman ID eşlemesi ve partChangeIds/
      // relatedExpenseId gibi çapraz referansların tutarlılığı ayrı bir tasarım
      // gerektiriyor. app.js zaten bu hatayı yakalayıp kullanıcıya gösteriyor.
      throw new Error('Bulut hesaplarında yedekten geri yükleme yakında eklenecek.');
    },
  },
};

window.authApi={
  onAuthStateChanged(cb){return onAuthStateChanged(auth,cb);},
  currentUser(){return auth.currentUser;},
  async login(email,password){return signInWithEmailAndPassword(auth,email,password);},
  async register(email,password,displayName){
    const cred=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(cred.user,{displayName});
    await sendEmailVerification(cred.user);
    await setDoc(doc(db,'users',cred.user.uid),{
      uid:cred.user.uid,email,displayName,createdAt:new Date().toISOString(),
    });
    return cred.user;
  },
  async logout(){return signOut(auth);},
  async resetPassword(email){return sendPasswordResetEmail(auth,email);},
};
