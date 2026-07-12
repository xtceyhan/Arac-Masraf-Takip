# Arac-Masraf-Takip

Araç bakım masraf takip uygulaması.

## Program Temel Prensibi

Kendi araçlarımın bakım/masraf takibini yapmak amacıyla hazırlanmış kişisel bir uygulama. Hangi parça ne zaman değişti, bir sonraki bakım hangi km'de, yakıt/sigorta/muayene masrafları ne durumda — hepsi tek ekrandan izlenebiliyor.

Masaüstü (Electron) ve Android sürümleri birbirinden **bağımsız** çalışır; veri paylaşımı yoktur, her biri kendi cihazında yerel olarak veri tutar.

## Masaüstü (Electron)

Tek parça bir Electron uygulaması — ayrı bir sunucu kurulumuna gerek yok. Veriler bilgisayarındaki uygulama veri klasöründe (`data.json`) tutulur.

```bash
cd bakim_takip
npm install
npm start        # geliştirme modunda çalıştır
npm run build     # paketlenmiş uygulama üret (mac: .dmg, win: .exe)
```

## Android

`bakim-takip-mobile/` altında Capacitor ile paketlenmiş, kendi yerel (IndexedDB) verisini tutan bağımsız bir uygulama.

## Geliştirici

**Tuğrul Ceyhan** ([@xtceyhan](https://github.com/xtceyhan))

Bu projenin tüm hakları saklıdır. Kod izin alınmadan kopyalanamaz, dağıtılamaz veya kullanılamaz — bkz. [LICENSE](LICENSE).
