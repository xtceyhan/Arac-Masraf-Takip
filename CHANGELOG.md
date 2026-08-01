# Değişiklik Geçmişi

Bu dosya, hem Android (Capacitor) hem de masaüstü (Electron) Bakım Takip uygulamalarındaki sürüm geçmişini takip eder.

## 1.3.1 — 2026-08-01

- Uygulama açılışında marka rengiyle uyumlu, yolda giden bir araba animasyonu içeren splash ekranı eklendi
- Araçlar (ve diğer) ekranlarda üst bar içeriğinin ekranın en üstüne yapışık durması giderildi, üst boşluk artırıldı

## 1.3.0 — 2026-08-01

- Bakım kayıtlarına **Servis / Bayi** bilgisi alanı eklendi, geçmiş listesinde gösteriliyor
- Masraf Analizi ekranına **Yıllık Karşılaştırma** kartı eklendi (bu yıl vs geçen yıl, % değişim)
- Masraf Analizi ekranına **Tahmini Sıradaki Masraf** kartı eklendi (geçmiş kayıtlara göre tahmini tarih/tutar)
- Dashboard'a **KM girişi hatırlatması** eklendi: 30+ gündür kilometre güncellenmemişse uyarı banner'ı
- **Bakım hatırlatıcı bildirimleri**: parça aşınması %90+ olduğunda veya sigorta/muayene süresi yaklaştığında/geçtiğinde sistem bildirimi (masaüstünde native Electron bildirimleri, mobilde `@capacitor/local-notifications`)
- **Ayarlar sayfası yeniden düzenlendi**: açık/koyu tema seçici ve CDN marka logosu ayarı artık sidebar yerine tek bir yerde, Ayarlar içinde

## 1.2.0 — 2026-07-31

- Modern tasarım yenilemesi: yeni renk paleti, Inter fontu, açık/koyu tema desteği
- Dashboard yeniden tasarlandı, araba logosu (uygulama ikonu + sidebar) eklendi
- Araç fotoğrafı yükleme (dashboard'da araç kartı arka planı olarak gösteriliyor)
- Yapılandırılabilir marka logosu: kullanıcı kendi CDN adresini Ayarlar'dan girip marka yazıldığında otomatik logo çekilmesini sağlayabiliyor
- Sidebar ikonları ve masraf ekranındaki "Masraf Ekle" butonu yeniden tasarlandı

## 1.0.0 — 2026-07-12

- Sunucusuz mimariye geçiş: Android tarafı IndexedDB, masaüstü tarafı yerel JSON dosyası ile çalışıyor (backend/sunucu gerektirmiyor)
- Android (Capacitor) uygulaması eklendi, GitHub Actions ile otomatik APK derleme ve GitHub Release'e yayınlama kuruldu
- Masraf Analizi ekranına grafikler (Chart.js) ve PDF rapor çıktısı (jsPDF) eklendi
- Güvenlik sertleştirmesi: XSS düzeltmeleri, Content-Security-Policy, yedek dosyası doğrulama, debug build'de WebView uzaktan hata ayıklamanın kapatılması
