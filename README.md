# Arac-Masraf-Takip
Araç bakım masraf takip uygulaması

Program Temel Prensibi: 
Kendi araçlarımın bakım masrafı, ne zaman hangi parça değişti onun takibini yapmak amacıyla basit bir uygulama hazırlanmıştır. Uygulamaya ek olarak kullanıcı adı ve şifre kaydetme özelliği ile birden çok kullanıcının kullanması hedeflenmiştir.

Programın 2 aşaması bulunmaktadır. Öncelikle server tarafındaki dosyaların ayağa kaldırılması gerekmektedir. Bunun için npm kullanılır. 

npm install -g pm2
npm install -g pm2-windows-startup
npm install
pm2 start server.js --name "bakim-takip"
pm2-startup install
pm2 save


Sonrasında programı kullanacağın bilgisayarda dosyaları masaüstüne indirip cd ile dosya içerisine powershell ile gir 
npm install 
npm run build 



