# Endless Builder Discord Bot

## Hosting kurulumu

1. Hosting platformunda Node.js 20+ seç.
2. Projeyi GitHub'dan bağla; build/install aşamasında `npm install`, start komutunda `npm start` kullan.
3. Hosting panelindeki **Environment Variables / Secrets / Variables** alanına şunları ekle:
   - `DISCORD_TOKEN` — Discord Developer Portal'dan oluşturduğun bot token'ı (**zorunlu**)
   - `AI_API_KEY` — AI kullanacaksan sağlayıcı API anahtarı (**isteğe bağlı**)
4. Değişkenleri kaydedip servisi yeniden deploy/restart et. Token'ı Discord sohbetine, koda, README'ye veya GitHub'a yazma.

**`.env` dosyası gerekmez.** Hosting bu değişkenleri çalışan Node.js sürecine `process.env` üzerinden verir. Kod `DISCORD_TOKEN` olmadan güvenli biçimde başlamaz; anahtarı terminale veya Git'e koymak yerine hosting'in gizli değişken alanını kullan.

## Token iptal edildiyse

Token daha önce kaynak koda yazılıp GitHub'a gönderildiyse onu sızmış kabul et: Discord Developer Portal'da yeni token oluştur ve hosting'deki `DISCORD_TOKEN` değerini güncelle. Eski token'ı kullanmaya çalışma. Yeni token'ı buraya veya başka bir sohbete gönderme.

## Bot özellikleri

- `/ticket panel` `/setup` olmadan ticket kanalını hazırlar.
- `/starboard ayarla` ile seçilen kanalda belirli sayıdaki ⭐ alan mesajlar listelenir.
- `/ima` imalı eğlence sözü verir; `/itiraf` anonim kart gönderir.
- Panel tekrarlarında mevcut mesaj güncellenir, kopya paneller azaltılır.
- Sunucu ayarları otomatik olarak `../data/servers.json` içinde saklanır.
- Müzik özellikleri için opsiyonel `@discordjs/voice`, `play-dl`, `opusscript` ve sistemde FFmpeg gerekir.

## Güvenlik notu

`index.js` içinde sır olmayan ayarlar bulunur; Discord/API anahtarları bulunmamalı. AI sağlayıcısı ve model gibi sır olmayan ayarlar `APP_CONFIG` içinde ayarlanabilir. Anahtarları yalnızca hosting secrets alanında tut.
