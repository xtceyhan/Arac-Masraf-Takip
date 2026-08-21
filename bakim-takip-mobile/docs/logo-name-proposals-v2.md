# Uygulama Adı ve Logo Önerileri — v2

Önceki tur (`logo-name-proposals.md`) reddedildi. İki gerekçe: (1) "OtoNabız" —
kullanıcı bu isimle zaten dolu/karıştırılan bir uygulama olduğunu düşünüyor,
"Oto..." bileşik kalıbı istenmiyor; (2) üç ikon konsepti de "araç silueti + [bakım
objesi]" kalıbında, 6+ şekilli, küçük boyutta okunmayan kompozisyonlardı ("şasi
muhabbeti"). Bu tur ikisini de kökten değiştiriyor: isimlerde "Oto" öneki yok,
ikonlarda tek güçlü fikir + en fazla 3 birincil şekil var.

Play Store'da dolu/yakın isimler (bunlardan uzak durulan liste): Araç Bakım
Programı, Araç Bakımı, Araç Gider Takip, Araç Defterim, Drivvo, Oto Servis
Takip, Otosabır, OTOMATE, Otonomi.

## 1. Yeni İsim Adayları

| # | İsim | Paket varyantı | Gerekçe |
|---|------|-----------------|---------|
| 1 | **Karne** | `karne` | "Araç karnesi" Türkçede zaten var olan bir kavram — aracın servis geçmişini tutan fiziksel karton/defter. "Bakım", "takip", "oto" kelimelerinin hiçbiri geçmiyor ama fikir (aracının notlarını/geçmişini tut) tek kelimede net. Kısa (2 hece), sıcak, Play'de tamamen özgün — hiçbir dolu isimle çakışmıyor. |
| 2 | Anahtarlık | `anahtarlik` | Her sürücünün elinde somut olarak taşıdığı nesne — "aracına sahip çık" duygusunu kişisel ve sıcak biçimde taşıyor. Bakım bağlamını dolaylı anlatıyor ama akılda kalıcılığı yüksek, isim çakışması riski sıfıra yakın. |
| 3 | Vites | `vites` | Tek kelime, tamamen araç dünyasından ama jenerik "araç/oto/bakım" kelimeleri değil. "Kontrolü elinde tut" çağrışımı yapıyor. Kısa, akılda kalıcı, Play'de rakipsiz. |
| 4 | Kilometrem | `kilometrem` | "Km" aracın en somut, herkesin bildiği takip birimi — bakım/masraf kayıtlarının doğal ekseni. Kişisel ekle ("-m") sıcaklık katıyor. Biraz uzunca (4 hece) ama telaffuzu doğal. |
| 5 | Garajım | `garajim` | (v1'den taşındı) Sıcak, kişisel, Türkçe pazarda doğal. Bakım/masraf odağını doğrudan hissettirmiyor ama isim çakışma riski düşük. |
| 6 | Vidan | `vidan` | (v1'den taşındı) Uydurma/marka kelime, Play'de tamamen özgün. Anlam bağlantısı öğrenilmesi gereken bir isim olması dezavantajı. |

**Önerilen: Karne.** Gerekçe: (a) "Oto" önekinden veya "araç/bakım/takip" gibi
Play'de doymuş kelimelerden hiç geçmiyor — tamamen farklı bir kelime ailesi,
karışma riski pratikte yok; (b) Türkçede zaten bilinen, sıcak, güven telkin eden
bir kavramdan ("araç karnesi") geliyor — öğrenilmesi gereken uydurma bir kelime
değil (Vidan'ın dezavantajı), ama yine de özgün bir isim; (c) iki hece, söylemesi
ve hatırlaması kolay; (d) paket adı `karne` tertemiz, Türkçe karaktersiz. Önerilen
`appId`: `com.karne.mobile`.

## 2. Yeni İkon Konseptleri

Üçü de `viewBox="0 0 48 48"`, tek accent `#185FA5` + beyaz, gradyansız, en fazla
3 birincil şekil. Adaptive icon güvenli alanı (~%66 merkez daire) içinde kalacak
şekilde ortalandı. Önceki turun hatası olan "araba çiz, üstüne obje ekle" yöntemi
tamamen terk edildi — üçü de TEK bir fikri taşıyan yalın bir form.

### Konsept A — "Gösterge İbresi" (gauge needle)

Yay + ibre + eksen noktası. Sadece 3 birincil şekil. Aracın bir "durum/skor"
göstergesine bakıldığı anı yakalıyor — literal bir araç parçası çizmeden
"izleniyor, bir okuma var" fikrini anlatıyor.

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <!-- gösterge yayı -->
  <path d="M11 30a13 13 0 0 1 26 0" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
  <!-- ibre -->
  <path d="M24 30 L33 18" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
  <!-- eksen -->
  <circle cx="24" cy="30" r="3.4" fill="#fff"/>
</svg>
```

**İlk bakış testi:** "Bir gösterge/hız göstergesi ibresi" — dashboard, ölçüm,
durum okuma çağrışımı anında oluşuyor. Araç detayına ihtiyaç yok, kendi başına
"bir şey ölçülüyor/izleniyor" diyor; uygulamanın "aracının durumunu takip et"
özüyle doğrudan örtüşüyor. Risk: tek başına "hangi ölçüm?" belirsiz kalabilir,
ama bu bilinçli bir soyutlama — isim ve context bunu tamamlıyor.

### Konsept B — "Onaylı Damla" (negatif alanlı damla + onay çentiği)

Tek dolu damla formu, içinden onay çentiği negatif alan olarak kesiliyor.
Sadece 2 birincil şekil — üç konsept arasında en yalın olanı.

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <!-- damla -->
  <path d="M24 9c6 7.4 9 12.6 9 17a9 9 0 0 1-18 0c0-4.4 3-9.6 9-17z" fill="#fff"/>
  <!-- onay çentiği (negatif alan) -->
  <path d="M19.5 26.5l3.5 3.5 7-7.5" fill="none" stroke="#185FA5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**İlk bakış testi:** "Bir damla, içinde onay işareti — kontrol edilmiş/tamam"
izlenimi anında oluşuyor. Damla, bakım dünyasında (yağ/sıvı) evrensel bir
sembol; onay çentiği bunu "yapıldı, kontrol edildi" anlamına taşıyor. Risk:
damla formu tek başına sağlık/medikal uygulamalarla da karışabilir — ama
context (uygulama adı + Play Store açıklaması) bu belirsizliği hemen gideriyor,
ve şekil sayısının azlığı (2) bunu telafi ediyor.

### Konsept C — "Anahtar Deliği" (keyhole)

Daire + konik gövde, tek kaynaşık silüet. Sadece 2 birincil şekil, en yüksek
küçük-boyut netliği.

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#185FA5"/>
  <circle cx="24" cy="20" r="7" fill="#fff"/>
  <path d="M19.6 24h8.8l3 11a2 2 0 0 1-2 2.4h-10.8a2 2 0 0 1-2-2.4l3-11z" fill="#fff"/>
</svg>
```

**İlk bakış testi:** "Bir anahtar deliği" — anında ve evrensel olarak okunuyor,
16px'te bile bozulmuyor. "Aracının anahtarı/kontrolü sende" çağrışımı yapıyor;
"Anahtarlık" isim adayıyla birebir örtüşüyor. Risk: bakım/masraf fikrini
doğrudan değil, dolaylı (sahiplik/erişim üzerinden) anlatıyor.

**Önerilen: Konsept A (Gösterge İbresi).** Gerekçe: uygulamanın asıl değeri
"aracının durumunu izle, bir okuma/skor al" — gösterge ibresi bunu tek, evrensel
bir görsel dille (dashboard/ölçüm) anlatan tek konsept. Sadece 3 basit şekilden
(yay, çizgi, nokta) oluştuğu için 16-24px'te de netliğini koruyor, ve "Karne"
ismiyle güçlü bir anlatı kuruyor: karne bir değerlendirme/karne notu taşır,
ibre de o notun "şu an nerede olduğunu" gösterir — isim kaydı tutar, ikon o
kaydın okumasını gösterir. Konsept C (anahtar deliği) en güvenli/en sade yedek;
Konsept B en çok "yapıldı/onaylandı" hissi veren ama medikal çağrışım riski
taşıyan seçenek.

## 3. Bu Turun Öncekinden Daha Net Olma Nedeni

Önceki turda üç konsept de "araç gövdesi çiz, üstüne bakım objesi ekle" kalıbını
tekrarlıyordu (6+ şekil, iç içe geçen tekerlek/gövde/kabin detayları) — bu da
20px'te tanımlanamayan bir "şasi karmaşası" yaratıyordu. Bu turda hiçbir konsept
araç silueti içermiyor; her biri TEK bir soyut/evrensel form (ibre, damla,
anahtar deliği) üzerine kurulu ve en fazla 3 birincil şekilden oluşuyor. İsim
tarafında da aynı disiplin uygulandı: "Oto" önekli bileşik kelime kalıbı
tamamen terk edildi, bunun yerine ya tamamen özgün tek kelimeler (Karne, Vites)
ya da somut/kişisel nesne isimleri (Anahtarlık) tercih edildi.
