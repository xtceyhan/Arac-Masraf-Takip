# Uygulama Adı ve Logo Önerileri

Bağlam: mevcut geçici isim "Bakım Takip", mevcut logo `www/app.js` içindeki jenerik
placeholder SVG (mavi kare + tik işareti + daire). Mevcut `icon-src/foreground.svg`
zaten basit bir araç silueti (gövde + ön cam + iki teker) içeriyor ama bakım/koruma
imgesi taşımıyor — aşağıdaki öneriler bu eksiği kapatıyor. Marka rengi `#185FA5`
sabit kalıyor, sadece kullanımı modernize ediliyor.

## 1. Uygulama Adı Önerileri

| # | İsim | Paket/domain varyantı | Gerekçe |
|---|------|------------------------|---------|
| 1 | **OtoNabız** | `otonabiz` | "Nabız" = sağlık/izleme metaforu; uygulamanın özü olan "aracının durumunu takip et, uyarı al" fikrini tek kelimede anlatıyor. Play Store'da rakipsiz, akılda kalıcı. |
| 2 | Garajım | `garajim` | Sıcak, kişisel ("benim garajım" hissi), Türkçe pazarda doğal bir ifade. Ama bakım/masraf odağını doğrudan hissettirmiyor. |
| 3 | Bakım Defteri | `bakimdefteri` | "Takip"e göre daha sıcak — fiziksel bir bakım defteri/servis kartonu hissi verir, güven telkin eder. |
| 4 | Aracım | `aracim` | Kısa, kişisel, geniş kapsamlı (sadece bakım değil sigorta/muayene/masraf hepsini kapsar). Ancak jenerik bir kelime olduğu için Play'de ayırt ediciliği düşük. |
| 5 | Vidan | `vidan` | Uydurma/marka kelime ("vida" çağrışımı + akılda kalıcı son ek) — Play'de tamamen özgün, domain/paket çakışması riski en düşük. Ama anlam bağlantısı öğrenilmesi gereken bir isim. |
| 6 | Rotam | `rotam` | "Aracının yolculuğunu takip et" duygusu; zarif ama bakım/masraf bağlamını dolaylı anlatıyor. |

**Önerilen: OtoNabız.** Gerekçe: (a) kategori bağlamını ("oto") ve uygulamanın asıl
değerini ("nabız" → durum izleme, uyarı) tek kelimede taşıyor, (b) "bakım", "takip",
"araç" gibi Play Store'da doygun kelimelerden kaçınıyor, (c) paket adı `otonabiz`
temiz ve Türkçe karaktersiz, (d) sesli okunuşu kolay ve iki heceli akıcı yapısıyla
akılda kalıcı. Önerilen `appId`: `com.otonabiz.mobile` (mevcut `com.bakim.takip.mobile`
ile aynı desende).

## 2. İkon Konseptleri

Tüm konseptler `viewBox="0 0 48 48"`, tek accent `#185FA5` + beyaz, gradyan/foto yok.
Adaptive icon güvenli alanı (~%66 merkez daire, kabaca x/y 8–40 aralığı) göz önünde
tutuldu. Arka plan burada mevcut sidebar lockup'ı (`rect rx=10 fill=#185FA5`) ile
gösteriliyor; adaptive icon üretiminde bu arka plan ayrı bir "background" katmanı
olur, aşağıdaki beyaz glif ise tek başına "foreground" katmanı olarak kullanılır
(mevcut `icon-src/foreground.svg` 1024 gridinde aynı mantığı zaten uyguluyor).

### Konsept A — "Anahtar-Gövde" (araç + İngiliz anahtarı gövdesi)

Araç gövdesi + tekerlekler, kabin/çatı yerine açık ağızlı İngiliz anahtarı silueti.
Bakım fikrini en literal ve evrensel biçimde anlatan sembol (anahtar = tamir/bakım),
sade şekil sayısı (6 birincil şekil) sayesinde küçük boyutta okunaklı kalıyor.

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <!-- anahtar-çatı -->
  <rect x="19" y="12" width="10" height="16" rx="2.5" fill="#fff"/>
  <circle cx="20.5" cy="14.5" r="2.6" fill="#185FA5"/>
  <circle cx="27.5" cy="14.5" r="2.6" fill="#185FA5"/>
  <!-- araç gövdesi -->
  <path d="M9 33c0-3.3 2.2-5 4.8-5h20.4c2.6 0 4.8 1.7 4.8 5v1.5H9V33z" fill="#fff"/>
  <rect x="9" y="27.5" width="30" height="6" rx="3" fill="#fff"/>
  <!-- tekerlekler -->
  <circle cx="16" cy="35" r="3.6" fill="#fff"/>
  <circle cx="16" cy="35" r="1.5" fill="#185FA5"/>
  <circle cx="32" cy="35" r="3.6" fill="#fff"/>
  <circle cx="32" cy="35" r="1.5" fill="#185FA5"/>
</svg>
```

### Konsept B — "Kalkan + Araç" (koruma kalkanı içinde araç silueti)

Kalkan siluetinin içine araç gövdesi negatif (kesme) olarak işleniyor. Sadece 2
katmanlı şekil (kalkan + araç kesme) olduğu için üç konsept arasında en sade ve
en güvenli seçenek — 24x24'te bile kalkan formu tek başına tanınır.

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <!-- kalkan -->
  <path d="M24 8l11 4v9c0 8.5-5.4 14.6-11 17-5.6-2.4-11-8.5-11-17v-9l11-4z" fill="#fff"/>
  <!-- araç silueti (kesme) -->
  <rect x="16.5" y="24.2" width="15" height="4" rx="2" fill="#185FA5"/>
  <path d="M17 27.5c0-2.2 1.5-3.3 3.3-3.3h7.4c1.8 0 3.3 1.1 3.3 3.3v1h-14v-1z" fill="#185FA5"/>
  <circle cx="20.5" cy="29.3" r="1.9" fill="#185FA5"/>
  <circle cx="27.5" cy="29.3" r="1.9" fill="#185FA5"/>
</svg>
```

### Konsept C — "Dişli + Nabız" (dişli çemberi + EKG çizgisi + tekerlekler)

Dişli halkası (bakım/mekanik), ortadan geçen nabız/EKG çizgisi (izleme/uyarı,
"OtoNabız" ismiyle bire bir örtüşüyor) ve altta küçük şasi + tekerlek çifti.
En zengin anlatım ama en çok şekil içeriyor (halka + 4 diş + zikzak çizgi + şasi +
2 teker) — 48px'de net, 24px'de dikkatli test edilmeli (dişleri/çizgiyi biraz
kalınlaştırmak gerekebilir).

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <!-- dişli halkası -->
  <circle cx="24" cy="22" r="11" fill="none" stroke="#fff" stroke-width="3.4"/>
  <g fill="#fff">
    <rect x="22.3" y="8.5" width="3.4" height="4" rx="1"/>
    <rect x="22.3" y="31.5" width="3.4" height="4" rx="1"/>
    <rect x="8.5" y="20.3" width="4" height="3.4" rx="1"/>
    <rect x="35.5" y="20.3" width="4" height="3.4" rx="1"/>
  </g>
  <!-- nabız çizgisi -->
  <path d="M13 22h5l2.5-6 3 12 3-9 2 3h6.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- şasi + tekerlekler -->
  <rect x="12" y="34.5" width="24" height="4" rx="2" fill="#fff"/>
  <circle cx="16" cy="38" r="3" fill="#fff"/>
  <circle cx="32" cy="38" r="3" fill="#fff"/>
</svg>
```

**Önerilen: Konsept A ("Anahtar-Gövde").** Gerekçe: bakım fikrini en evrensel ve
tek anlamlı sembolle (anahtar) taşıyor, sadece 6 birincil şekilden oluştuğu için
24x24'te de netliğini koruyor (mevcut tik-işareti logosuyla kıyaslanabilir
karmaşıklıkta), ve adaptive icon güvenli alanına (araç gövdesi 27–35 y aralığında,
anahtar 12–28 y aralığında) rahat sığıyor. Konsept B da güçlü bir yedek — daha da
sade — ama "bakım" fikrini Konsept A kadar doğrudan anlatmıyor (kalkan daha çok
"sigorta/koruma" çağrışımı yapıyor). Konsept C, isimle en güçlü tematik örtüşmeyi
sağladığı için büyük dokunma noktalarında (splash ekranı, Play Store görseli)
ikincil bir varyant olarak değerlendirilebilir.

## 3. Birlikte İzlenim

**OtoNabız + Konsept A (anahtar-gövde araç)**, mavi zemin üzerinde beyaz, tek
parça bir glif olarak güvenilir ve "işini bilen bir usta" hissi veriyor — isim
("nabız") duygusal/işlevsel katmanı (izleme, uyarı, sağlık) taşırken, ikon somut
ve evrensel bir bakım sembolüyle (anahtar) bunu görsel olarak çapalıyor; ikisi
birbirini tekrar etmiyor, tamamlıyor. Sonuç, mevcut jenerik tik-işaretinden çok
daha spesifik ve Play Store'da "bir araç bakım uygulaması" olduğunu ilk bakışta
söyleyen, yine de sade/modern bir marka izlenimi.
