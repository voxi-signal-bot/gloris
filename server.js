const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '8145387934:AAFiFPUfKH0EwYST6ShOFdBSm6IvwhPkEqY'; // Замените на ваш токен
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// URL вашего канала и Mini App
const CHANNEL_USERNAME = '@YourChannel'; // Замените на username вашего канала
const MINI_APP_URL = 'https://your-mini-app-url'; // Замените на URL вашего Mini App

// Реферальная ссылка 1win с промокодом
const REFERRAL_LINK = 'https://1win.com/register?ref=VIP662'; // Замените на вашу реферальную ссылку

// Простое хранилище данных (в реальном проекте используйте SQLite или другую БД)
const users = {};

// Переводы для всех языков
const translations = {
  ru: {
    start: "Выберите язык:",
    welcome: "Добро пожаловать, {name}! Для использования бота - подпишись на наш канал 🤝",
    subscribe: "Подписка на канал",
    check_subscription: "Проверить",
    not_subscribed: "Вы не подписаны на канал. Пожалуйста, подпишитесь, чтобы продолжить.",
    main_menu: "Главное меню:",
    register: "Регистрация",
    instructions: "Инструкция",
    select_language: "Выбрать язык",
    help: "Help",
    get_signal: "Получить сигнал",
    registration_error: "⚠️ Ошибка: Регистрация не пройдена!\n✦ При регистрации обязательно вводите промокод - VIP662\n● После завершения регистрации, Вам автоматически придет уведомление в бота.",
    register_button: "Зарегистрироваться",
    back_to_menu: "Вернуться в главное меню",
    instructions_text: "🤖 Бот основан и обучен на кластерной нейронной сети OpenAI!\n⚜️ Для обучения бота было сыграно 🎰 30,000 игр.\nВ настоящее время пользователи бота успешно генерируют 15-25% от своего 💸 капитала ежедневно!\nБот все еще проходит проверки и исправления! Точность бота составляет 92%!\nЧтобы достичь максимальной прибыли, следуйте этой инструкции:\n🟢 1. Зарегистрируйтесь в букмекерской конторе 1WIN\n[Если не открывается, воспользуйтесь VPN (Швеция). В Play Market/App Store есть много бесплатных сервисов, например: Vpnify, Planet VPN, Hotspot VPN и т.д.!]\n      ❗️ Без регистрации и промокода доступ к сигналам не будет открыт ❗️\n🟢 2. Пополните баланс своего счета.\n🟢 3. Перейдите в раздел игр 1win и выберите игру.\n🟢 4. Установите количество ловушек на три. Это важно!\n🟢 5. Запросите сигнал у бота и ставьте ставки в соответствии с сигналами от бота.\n🟢 6. В случае неудачного сигнала рекомендуем удвоить (x²) вашу ставку, чтобы полностью покрыть убыток с помощью следующего сигнала.",
    registration_success: "Поздравляем с успешной регистрацией! 🥳\n🌐 Шаг 2 - Внеси первый депозит.\n✦ Чем больше депозит, тем больше УРОВЕНЬ в боте, а чем больше уровень в боте, тем большее количество сигналов с высокой вероятностью проходимости сигнала ты будешь получать.\n● После пополнения первого депозита, Вам автоматически придет уведомление в бота.",
    deposit: "Внести депозит",
  },
  en: {
    start: "Select language:",
    welcome: "Welcome, {name}! To use the bot, subscribe to our channel 🤝",
    subscribe: "Subscribe to channel",
    check_subscription: "Check",
    not_subscribed: "You are not subscribed to the channel. Please subscribe to continue.",
    main_menu: "Main menu:",
    register: "Registration",
    instructions: "Instructions",
    select_language: "Select language",
    help: "Help",
    get_signal: "Get signal",
    registration_error: "⚠️ Error: Registration not completed!\n✦ During registration, be sure to enter the promo code - VIP662\n● After completing the registration, you will automatically receive a notification in the bot.",
    register_button: "Register",
    back_to_menu: "Back to main menu",
    instructions_text: "🤖 The bot is based and trained on OpenAI's cluster neural network!\n⚜️ 30,000 games were played to train the bot 🎰.\nCurrently, bot users successfully generate 15-25% of their 💸 capital daily!\nThe bot is still undergoing checks and fixes! The bot's accuracy is 92%!\nTo achieve maximum profit, follow these instructions:\n🟢 1. Register with the 1WIN bookmaker\n[If it doesn't open, use a VPN (Sweden). There are many free services in Play Market/App Store, for example: Vpnify, Planet VPN, Hotspot VPN, etc.!]\n      ❗️ Without registration and promo code, access to signals will not be granted ❗️\n🟢 2. Top up your account balance.\n🟢 3. Go to the 1win games section and select a game.\n🟢 4. Set the number of traps to three. This is important!\n🟢 5. Request a signal from the bot and place bets according to the bot's signals.\n🟢 6. In case of an unsuccessful signal, we recommend doubling (x²) your bet to fully cover the loss with the next signal.",
    registration_success: "Congratulations on successful registration! 🥳\n🌐 Step 2 - Make your first deposit.\n✦ The larger the deposit, the higher the LEVEL in the bot, and the higher the level in the bot, the more signals with a high probability of success you will receive.\n● After making the first deposit, you will automatically receive a notification in the bot.",
    deposit: "Make a deposit",
  },
  hi: {
    start: "भाषा चुनें:",
    welcome: "स्वागत है, {name}! बॉट का उपयोग करने के लिए हमारे चैनल की सदस्यता लें 🤝",
    subscribe: "चैनल की सदस्यता लें",
    check_subscription: "जाँच करें",
    not_subscribed: "आपने चैनल की सदस्यता नहीं ली है। कृपया जारी रखने के लिए सदस्यता लें।",
    main_menu: "मुख्य मेनू:",
    register: "पंजीकरण",
    instructions: "निर्देश",
    select_language: "भाषा चुनें",
    help: "सहायता",
    get_signal: "सिग्नल प्राप्त करें",
    registration_error: "⚠️ त्रुटि: पंजीकरण पूरा नहीं हुआ!\n✦ पंजीकरण के दौरान प्रोमो कोड - VIP662 दर्ज करना अनिवार्य है\n● पंजीकरण पूरा होने के बाद, आपको बॉट में स्वचालित रूप से एक अधिसूचना प्राप्त होगी।",
    register_button: "पंजीकरण करें",
    back_to_menu: "मुख्य मेनю में वापस जाएं",
    instructions_text: "🤖 बॉट OpenAI की क्लस्टर न्यूरल नेटवर्क पर आधारित और प्रशिक्षित है!\n⚜️ बॉट को प्रशिक्षित करने के लिए 30,000 गेम खेले गए 🎰।\nवर्तमान में, बॉट उपयोगकर्ता अपनी 💸 पूंजी का 15-25% प्रतिदिन सफलतापूर्वक उत्पन्न करते हैं!\nबॉट अभी भी जांच और सुधार से गुजर रहा है! बॉट की सटीकता 92% है!\nअधिकतम लाभ प्राप्त करने के लिए, इन निर्देशों का पालन करें:\n🟢 1. 1WIN बुकमेकर के साथ पंजीकरण करें\n[यदि यह खुलता नहीं है, तो VPN (स्वीडन) का उपयोग करें। Play Market/App Store में कई मुफ्त सेवाएं हैं, उदाहरण के लिए: Vpnify, Planet VPN, Hotspot VPN, आदि!]\n      ❗️ पंजीकरण और प्रोमो कोड के बिना, सिग्नल तक पहुंच प्रदान नहीं की जाएगी ❗️\n🟢 2. अपने खाते का बैलेंस टॉप अप करें।\n🟢 3. 1win गेम्स सेक्शन में जाएं और एक गेम चुनें।\n🟢 4. ट्रैप की संख्या तीन पर सेट करें। यह महत्वपूर्ण है!\n🟢 5. बॉट से सिग्नल का अनुरोध करें और बॉट के सिग्नल के अनुसार दांव लगाएं।\n🟢 6. असफल सिग्नल के मामले में, हम आपकी दांव को दोगुना (x²) करने की सलाह देते हैं ताकि अगले सिग्नल के साथ नुकसान को पूरी तरह से कवर किया जा सके।",
    registration_success: "सफल पंजीकरण पर बधाई! 🥳\n🌐 चरण 2 - अपनी पहली जमा करें।\n✦ जमा जितनी बड़ी होगी, बॉट में उतना ही उच्च स्तर होगा, और बॉट में स्तर जितना अधिक होगा, उतने ही अधिक सिग्नल आपको उच्च सफलता की संभावना के साथ मिलेंगे।\n● पहली जमा करने के बाद, आपको बॉट में स्वचालित रूप से एक अधिसूचना प्राप्त होगी।",
    deposit: "जमा करें",
  },
  pt_BR: {
    start: "Selecione o idioma:",
    welcome: "Bem-vindo, {name}! Para usar o bot, inscreva-se no nosso canal 🤝",
    subscribe: "Inscrever-se no canal",
    check_subscription: "Verificar",
    not_subscribed: "Você não está inscrito no canal. Por favor, inscreva-se para continuar.",
    main_menu: "Menu principal:",
    register: "Registro",
    instructions: "Instruções",
    select_language: "Selecionar idioma",
    help: "Ajuda",
    get_signal: "Obter sinal",
    registration_error: "⚠️ Erro: Registro não concluído!\n✦ Ao se registrar, certifique-se de inserir o código promocional - VIP662\n● Após concluir o registro, você receberá automaticamente uma notificação no bot.",
    register_button: "Registrar",
    back_to_menu: "Voltar ao menu principal",
    instructions_text: "🤖 O bot é baseado e treinado na rede neural de cluster da OpenAI!\n⚜️ Para treinar o bot, foram jogados 30.000 jogos 🎰.\nAtualmente, os usuários do bot geram com sucesso 15-25% do seu 💸 capital diariamente!\nO bot ainda está passando por verificações e correções! A precisão do bot é de 92%!\nPara alcançar o lucro máximo, siga estas instruções:\n🟢 1. Registre-se na casa de apostas 1WIN\n[Se não abrir, use uma VPN (Suécia). Há muitos serviços gratuitos no Play Market/App Store, por exemplo: Vpnify, Planet VPN, Hotspot VPN, etc.!]\n      ❗️ Sem registro e código promocional, o acesso aos sinais não será liberado ❗️\n🟢 2. Recarregue o saldo da sua conta.\n🟢 3. Vá para a seção de jogos da 1win e selecione um jogo.\n🟢 4. Defina o número de armadilhas como três. Isso é importante!\n🟢 5. Solicite um sinal ao bot e faça apostas de acordo com os sinais do bot.\n🟢 6. Em caso de sinal malsucedido, recomendamos dobrar (x²) sua aposta para cobrir totalmente a perda com o próximo sinal.",
    registration_success: "Parabéns pelo registro bem-sucedido! 🥳\n🌐 Passo 2 - Faça seu primeiro depósito.\n✦ Quanto maior o depósito, maior o NÍVEL no bot, e quanto maior o nível no bot, mais sinais com alta probabilidade de sucesso você receberá.\n● Após fazer o primeiro depósito, você receberá automaticamente uma notificação no bot.",
    deposit: "Fazer depósito",
  },
  es: {
    start: "Selecciona el idioma:",
    welcome: "¡Bienvenido, {name}! Para usar el bot, suscríbete a nuestro canal 🤝",
    subscribe: "Suscribirse al canal",
    check_subscription: "Verificar",
    not_subscribed: "No estás suscrito al canal. Por favor, suscríbete para continuar.",
    main_menu: "Menú principal:",
    register: "Registro",
    instructions: "Instrucciones",
    select_language: "Seleccionar idioma",
    help: "Ayuda",
    get_signal: "Obtener señal",
    registration_error: "⚠️ Error: ¡Registro no completado!\n✦ Durante el registro, asegúrate de ingresar el código promocional - VIP662\n● Una vez completado el registro, recibirás automáticamente una notificación en el bot.",
    register_button: "Registrar",
    back_to_menu: "Volver al menú principal",
    instructions_text: "🤖 ¡El bot está basado y entrenado en la red neuronal de clúster de OpenAI!\n⚜️ Para entrenar al bot, se jugaron 30,000 juegos 🎰.\n¡Actualmente, los usuarios del bot generan con éxito entre el 15-25% de su 💸 capital diario!\n¡El bot todavía está en proceso de verificación y corrección! ¡La precisión del bot es del 92%!\nPara alcanzar la máxima ganancia, sigue estas instrucciones:\n🟢 1. Regístrate en la casa de apuestas 1WIN\n[Si no se abre, usa una VPN (Suecia). Hay muchos servicios gratuitos en Play Market/App Store, por ejemplo: Vpnify, Planet VPN, Hotspot VPN, etc.!]\n      ❗️ Sin registro ni código promocional, no se otorgará acceso a las señales ❗️\n🟢 2. Recarga el saldo de tu cuenta.\n🟢 3. Ve a la sección de juegos de 1win y selecciona un juego.\n🟢 4. Configura el número de trampas a tres. ¡Esto es importante!\n🟢 5. Solicita una señal al bot y realiza apuestas según las señales del bot.\n🟢 6. En caso de una señal fallida, recomendamos duplicar (x²) tu apuesta para cubrir completamente la pérdida con la próxima señal.",
    registration_success: "¡Felicidades por registrarte con éxito! 🥳\n🌐 Paso 2 - Haz tu primer depósito.\n✦ Cuanto mayor sea el depósito, mayor será el NIVEL en el bot, y cuanto mayor sea el nivel en el bot, más señales con alta probabilidad de éxito recibirás.\n● Después de hacer el primer depósito, recibirás automáticamente una notificación en el bot.",
    deposit: "Hacer depósito",
  },
  uz: {
    start: "Tilni tanlang:",
    welcome: "Xush kelibsiz, {name}! Botdan foydalanish uchun kanalimizga obuna bo‘ling 🤝",
    subscribe: "Kanalga obuna bo‘lish",
    check_subscription: "Tekshirish",
    not_subscribed: "Siz kanalga obuna bo‘lmagansiz. Iltimos, davom etish uchun obuna bo‘ling.",
    main_menu: "Asosiy menyu:",
    register: "Ro‘yxatdan o‘tish",
    instructions: "Yo‘riqnoma",
    select_language: "Tilni tanlash",
    help: "Yordam",
    get_signal: "Signal olish",
    registration_error: "⚠️ Xato: Ro‘yxatdan o‘tish bajarilmadi!\n✦ Ro‘yxatdan o‘tishda promo-kodni kiritish majburiy - VIP662\n● Ro‘yxatdan o‘tish tugallangandan so‘ng, sizga botda avtomatik xabarnoma keladi.",
    register_button: "Ro‘yxatdan o‘tish",
    back_to_menu: "Asosiy menyuga qaytish",
    instructions_text: "🤖 Bot OpenAI klaster neyron tarmog‘ida asoslangan va o‘qitilgan!\n⚜️ Botni o‘qitish uchun 30,000 o‘yin o‘ynaldi 🎰.\nHozirda bot foydalanuvchilari o‘z 💸 kapitalining 15-25% ni har kuni muvaffaqiyatli ishlab topmoqda!\nBot hali tekshiruv va tuzatishlardan o‘tmoqda! Botning aniqligi 92%!\nMaksimal foyda olish uchun ushbu yo‘riqnomaga amal qiling:\n🟢 1. 1WIN bukmekerlik kompaniyasida ro‘yxatdan o‘ting\n[Agar ochilmasa, VPN (Shvetsiya) dan foydalaning. Play Market/App Store’da ko‘plab bepul xizmatlar mavjud, masalan: Vpnify, Planet VPN, Hotspot VPN va boshqalar!]\n      ❗️ Ro‘yxatdan o‘tmasdan va promo-kodsiz signallarga kirish ochilmaydi ❗️\n🟢 2. Hisobingiz balansini to‘ldiring.\n🟢 3. 1win o‘yinlar bo‘limiga o‘ting va o‘yinni tanlang.\n🟢 4. Tuzoqlar sonini uchta qilib belgilang. Bu muhim!\n🟢 5. Botdan signal so‘rang va bot signallari bo‘yicha stavka qiling.\n🟢 6. Muvaffaqiyatsiz signal bo‘lsa, keyingi signal bilan yo‘qotishni to‘liq qoplash uchun stavkangizni ikki baravar (x²) qilishni tavsiya qilamiz.",
    registration_success: "Muvaffaqiyatli ro‘yxatdan o‘tganingiz bilan tabriklaymiz! 🥳\n🌐 2-qadam - Birinchi depozitni kiriting.\n✦ Depozit qancha katta bo‘lsa, botda shuncha yuqori daraja bo‘ladi, botda daraja qancha yuqori bo‘lsa, shuncha ko‘p yuqori muvaffaqiyat ehtimoli bilan signallar olasiz.\n● Birinchi depozitni kiritgandan so‘ng, sizga botda avtomatik xabarnoma keladi.",
    deposit: "Depozit kiritish",
  },
  az: {
    start: "Dili seçin:",
    welcome: "Xoş gəldiniz, {name}! Botdan istifadə etmək üçün kanalımıza abunə olun 🤝",
    subscribe: "Kanala abunə olun",
    check_subscription: "Yoxlamaq",
    not_subscribed: "Siz kanala abunə olmamısınız. Davam etmək üçün zəhmət olmasa abunə olun.",
    main_menu: "Əsas menyu:",
    register: "Qeydiyyat",
    instructions: "Təlimat",
    select_language: "Dil seçimi",
    help: "Kömək",
    get_signal: "Siqnal almaq",
    registration_error: "⚠️ Xəta: Qeydiyyat tamamlanmadı!\n✦ Qeydiyyat zamanı promo kodu daxil etmək mütləqdir - VIP662\n● Qeydiyyat tamamlandıqdan sonra botda avtomatik bildiriş alacaqsınız.",
    register_button: "Qeydiyyatdan keçin",
    back_to_menu: "Əsas menyuya qayıt",
    instructions_text: "🤖 Bot OpenAI klaster neyron şəbəkəsi əsasında qurulub və öyrədilib!\n⚜️ Botu öyrətmək üçün 30,000 oyun oynanılıb 🎰.\nHazırda bot istifadəçiləri öz 💸 kapitallarının 15-25%-ni uğurla hər gün qazanırlar!\nBot hələ də yoxlamalardan və düzəlişlərdən keçir! Botun dəqiqliyi 92%-dir!\nMaksimum qazanc əldə etmək üçün bu təlimata əməl edin:\n🟢 1. 1WIN bukmeker şirkətində qeydiyyatdan keçin\n[Əgər açılmırsa, VPN (İsveç) istifadə edin. Play Market/App Store-da bir çox pulsuz xidmətlər var, məsələn: Vpnify, Planet VPN, Hotspot VPN və s.!]\n      ❗️ Qeydiyyat və promo kod olmadan siqnallara giriş açılmayacaq ❗️\n🟢 2. Hesabınızın balansını artırın.\n🟢 3. 1win oyunlar bölməsinə keçin və oyun seçin.\n🟢 4. Tələlərin sayını üçə təyin edin. Bu vacibdir!\n🟢 5. Botdan siqnal tələb edin və botun siqnallarına uyğun mərc edin.\n🟢 6. Uğursuz siqnal halında, zərəri tam örtmək üçün mərcinizi iki dəfə (x²) artırmağı tövsiyə edirik.",
    registration_success: "Uğurlu qeydiyyat münasibətilə təbrik edirik! 🥳\n🌐 Addım 2 - İlk depozitinizi edin.\n✦ Depozit nə qədər böyükdürsə, botda səviyyəniz bir o qədər yüksək olacaq, botda səviyyəniz nə qədər yüksəkdirsə, bir o qədər çox yüksək uğur ehtimalı olan siqnallar alacaqsınız.\n● İlk depoziti etdikdən sonra botda avtomatik bildiriş alacaqsınız.",
    deposit: "Depozit etmək",
  },
  tr: {
    start: "Dil seçin:",
    welcome: "Hoş geldiniz, {name}! Botu kullanmak için kanalımıza abone olun 🤝",
    subscribe: "Kanala abone ol",
    check_subscription: "Kontrol et",
    not_subscribed: "Kanala abone değilsiniz. Devam etmek için lütfen abone olun.",
    main_menu: "Ana menü:",
    register: "Kayıt",
    instructions: "Talimatlar",
    select_language: "Dil seç",
    help: "Yardım",
    get_signal: "Sinyal al",
    registration_error: "⚠️ Hata: Kayıt tamamlanmadı!\n✦ Kayıt sırasında promosyon kodunu girmek zorunludur - VIP662\n● Kayıt tamamlandıktan sonra botta otomatik bir bildirim alacaksınız.",
    register_button: "Kayıt ol",
    back_to_menu: "Ana menüye dön",
    instructions_text: "🤖 Bot, OpenAI'ın küme sinir ağına dayalı olarak oluşturulmuş ve eğitilmiştir!\n⚜️ Botu eğitmek için 30.000 oyun oynandı 🎰.\nŞu anda bot kullanıcıları, 💸 sermayelerinin %15-25'ini günlük olarak başarıyla kazanıyor!\nBot hala kontrol ve düzeltmelerden geçiyor! Botun doğruluğu %92!\nMaksimum kazanç elde etmek için şu talimatları izleyin:\n🟢 1. 1WIN bahis şirketine kaydolun\n[Açılmazsa, VPN (İsveç) kullanın. Play Market/App Store'da birçok ücretsiz servis var, örneğin: Vpnify, Planet VPN, Hotspot VPN vb.!]\n      ❗️ Kayıt ve promosyon kodu olmadan sinyallere erişim sağlanmayacak ❗️\n🟢 2. Hesabınızın bakiyesini doldurun.\n🟢 3. 1win oyunlar bölümüne gidin ve bir oyun seçin.\n🟢 4. Tuzak sayısını üçe ayarlayın. Bu önemli!\n🟢 5. Bottan sinyal talep edin ve botun sinyallerine göre bahis yapın.\n🟢 6. Başarısız bir sinyal durumunda, kaybınızı tamamen telafi etmek için bahsinizi iki katına (x²) çıkarmanızı öneririz.",
    registration_success: "Başarılı kayıt için tebrikler! 🥳\n🌐 Adım 2 - İlk depozitonuzu yapın.\n✦ Depozito ne kadar büyükse, botta seviyeniz o kadar yüksek olur ve botta seviyeniz ne kadar yüksekse, o kadar fazla yüksek başarı olasılığına sahip sinyal alırsınız.\n● İlk depozitoyu yaptıktan sonra botta otomatik bir bildirim alacaksınız.",
    deposit: "Depozito yap",
  },
  pt: {
    start: "Selecione o idioma:",
    welcome: "Bem-vindo, {name}! Para usar o bot, inscreva-se no nosso canal 🤝",
    subscribe: "Inscrever-se no canal",
    check_subscription: "Verificar",
    not_subscribed: "Você não está inscrito no canal. Por favor, inscreva-se para continuar.",
    main_menu: "Menu principal:",
    register: "Registo",
    instructions: "Instruções",
    select_language: "Selecionar idioma",
    help: "Ajuda",
    get_signal: "Obter sinal",
    registration_error: "⚠️ Erro: Registo não concluído!\n✦ Ao registar-se, certifique-se de inserir o código promocional - VIP662\n● Após concluir o registo, você receberá automaticamente uma notificação no bot.",
    register_button: "Registar",
    back_to_menu: "Voltar ao menu principal",
    instructions_text: "🤖 O bot é baseado e treinado na rede neural de cluster da OpenAI!\n⚜️ Para treinar o bot, foram jogados 30.000 jogos 🎰.\nAtualmente, os utilizadores do bot geram com sucesso 15-25% do seu 💸 capital diariamente!\nO bot ainda está a passar por verificações e correções! A precisão do bot é de 92%!\nPara alcançar o lucro máximo, siga estas instruções:\n🟢 1. Registe-se na casa de apostas 1WIN\n[Se não abrir, use uma VPN (Suécia). Há muitos serviços gratuitos no Play Market/App Store, por exemplo: Vpnify, Planet VPN, Hotspot VPN, etc.!]\n      ❗️ Sem registo e código promocional, o acesso aos sinais não será liberado ❗️\n🟢 2. Recarregue o saldo da sua conta.\n🟢 3. Vá para a seção de jogos da 1win e selecione um jogo.\n🟢 4. Defina o número de armadilhas como três. Isso é importante!\n🟢 5. Solicite um sinal ao bot e faça apostas de acordo com os sinais do bot.\n🟢 6. Em caso de sinal malsucedido, recomendamos dobrar (x²) sua aposta para cobrir totalmente a perda com o próximo sinal.",
    registration_success: "Parabéns pelo registo bem-sucedido! 🥳\n🌐 Passo 2 - Faça o seu primeiro depósito.\n✦ Quanto maior o depósito, maior o NÍVEL no bot, e quanto maior o nível no bot, mais sinais com alta probabilidade de sucesso você receberá.\n● Após fazer o primeiro depósito, você receberá automaticamente uma notificação no bot.",
    deposit: "Fazer depósito",
  },
};

// Языки и флаги
const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt_BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'uz', name: 'O‘zbek', flag: '🇺🇿' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

// Webhook для обработки обновлений от Telegram
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'User';

  // Сохраняем пользователя, если его нет
  if (!users[chatId]) {
    users[chatId] = { language: 'ru', subscribed: false, registered: false, deposited: false };
  }

  const lang = users[chatId].language;
  const keyboard = {
    reply_markup: {
      inline_keyboard: languages.map(lang => [{
        text: `${lang.flag} ${lang.name}`,
        callback_data: `lang_${lang.code}`,
      }]),
    },
  };

  bot.sendMessage(chatId, translations[lang].start, keyboard);
});

// Обработка выбора языка
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userName = query.from.first_name || 'User';
  const data = query.data;

  if (data.startsWith('lang_')) {
    const langCode = data.split('_')[1];
    users[chatId].language = langCode;
    const lang = translations[langCode];

    // Удаляем сообщение с выбором языка
    await bot.deleteMessage(chatId, query.message.message_id);

    // Отправляем приветственное сообщение
    const welcomeMessage = lang.welcome.replace('{name}', userName);
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: lang.subscribe, url: `https://t.me/${CHANNEL_USERNAME}` }],
          [{ text: lang.check_subscription, callback_data: 'check_subscription' }],
        ],
      },
    };
    bot.sendMessage(chatId, welcomeMessage, keyboard);
  } else if (data === 'check_subscription') {
    const langCode = users[chatId].language;
    const lang = translations[langCode];

    // Проверяем подписку
    try {
      const member = await bot.getChatMember(`@${CHANNEL_USERNAME}`, chatId);
      if (['member', 'administrator', 'creator'].includes(member.status)) {
        users[chatId].subscribed = true;
        await bot.deleteMessage(chatId, query.message.message_id);
        showMainMenu(chatId);
      } else {
        bot.answerCallbackQuery(query.id, { text: lang.not_subscribed });
      }
    } catch (error) {
      bot.answerCallbackQuery(query.id, { text: lang.not_subscribed });
    }
  } else if (data === 'register') {
    const langCode = users[chatId].language;
    const lang = translations[langCode];

    // Удаляем сообщение с главным меню
    await bot.deleteMessage(chatId, query.message.message_id);

    // Отправляем сообщение об ошибке регистрации
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: lang.register_button, url: REFERRAL_LINK }],
          [{ text: lang.back_to_menu, callback_data: 'main_menu' }],
        ],
      },
    };
    bot.sendMessage(chatId, lang.registration_error, keyboard);
  } else if (data === 'instructions') {
    const langCode = users[chatId].language;
    const lang = translations[langCode];

    // Удаляем сообщение с главным меню
    await bot.deleteMessage(chatId, query.message.message_id);

    // Отправляем инструкции
    const instructionsText = lang.instructions_text.replace('1WIN', `[1WIN](${REFERRAL_LINK})`);
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: lang.back_to_menu, callback_data: 'main_menu' }],
        ],
      },
    };
    bot.sendMessage(chatId, instructionsText, { parse_mode: 'Markdown', ...keyboard });
  } else if (data === 'select_language') {
    const langCode = users[chatId].language;
    const lang = translations[langCode];

    // Удаляем сообщение с главным меню
    await bot.deleteMessage(chatId, query.message.message_id);

    // Показываем выбор языка
    const keyboard = {
      reply_markup: {
        inline_keyboard: languages.map(lang => [{
          text: `${lang.flag} ${lang.name}`,
          callback_data: `lang_${lang.code}`,
        }]),
      },
    };
    bot.sendMessage(chatId, lang.select_language, keyboard);
  } else if (data === 'help') {
    // Перенаправляем в чат поддержки
    const supportChat = 'https://t.me/Soft1win1';
    bot.answerCallbackQuery(query.id, { url: supportChat });
  } else if (data === 'get_signal') {
    const langCode = users[chatId].language;
    const lang = translations[langCode];

    if (!users[chatId].registered) {
      // Удаляем сообщение с главным меню
      await bot.deleteMessage(chatId, query.message.message_id);

      // Отправляем сообщение об ошибке регистрации
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang.register_button, url: REFERRAL_LINK }],
            [{ text: lang.back_to_menu, callback_data: 'main_menu' }],
          ],
        },
      };
      bot.sendMessage(chatId, lang.registration_error, keyboard);
    } else if (!users[chatId].deposited) {
      // Удаляем сообщение с главным меню
      await bot.deleteMessage(chatId, query.message.message_id);

      // Отправляем сообщение о необходимости депозита
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang.deposit, url: REFERRAL_LINK }],
          ],
        },
      };
      bot.sendMessage(chatId, lang.registration_success, keyboard);
    } else {
      // Открываем Mini App для получения сигнала
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang.get_signal, web_app: { url: MINI_APP_URL } }],
          ],
        },
      };
      bot.sendMessage(chatId, lang.get_signal, keyboard);
    }
  } else if (data === 'main_menu') {
    // Удаляем текущее сообщение
    await bot.deleteMessage(chatId, query.message.message_id);
    showMainMenu(chatId);
  }
});

// Функция для показа главного меню
function showMainMenu(chatId) {
  const langCode = users[chatId].language;
  const lang = translations[langCode];
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: lang.register, callback_data: 'register' }],
        [{ text: lang.instructions, callback_data: 'instructions' }],
        [{ text: lang.select_language, callback_data: 'select_language' }],
        [{ text: lang.help, callback_data: 'help' }],
        [{ text: lang.get_signal, callback_data: 'get_signal' }],
      ],
    },
  };
  bot.sendMessage(chatId, lang.main_menu, keyboard);
}

// Обработка постбэка от 1win (регистрация и депозит)
app.post('/1win_postback', (req, res) => {
  const { userId, event } = req.body;
  if (users[userId]) {
    if (event === 'registration') {
      users[userId].registered = true;
      const langCode = users[userId].language;
      const lang = translations[langCode];
      bot.sendMessage(userId, lang.registration_success, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang.deposit, url: REFERRAL_LINK }],
          ],
        },
      });
    } else if (event === 'deposit') {
      users[userId].deposited = true;
      const langCode = users[userId].language;
      const lang = translations[langCode];
      bot.sendMessage(userId, "Депозит успешно пополнен! Теперь вы можете получать сигналы.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang.get_signal, web_app: { url: MINI_APP_URL } }],
          ],
        },
      });
    }
  }
  res.sendStatus(200);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  bot.setWebHook(`https://your-server-url/webhook`); // Замените на URL вашего сервера
});
