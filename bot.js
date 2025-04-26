const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Настройки бота
const BOT_TOKEN = '8145387934:AAFiFPUfKH0EwYST6ShOFdBSm6IvwhPkEqY'; // Вставьте ваш токен бота
const CHANNEL_ID = 'xuiuug'; // ID вашего Telegram-канала
const MINI_APP_URL = 'https://your-mini-app-url'; // URL Mini App (замените после развертывания)
const APP_URL = 'https://gloris-production.up.railway.app'; // URL сервера (для локального тестирования: http://localhost:3000)
const POSTBACK_SECRET = 'your_1win_secret'; // Секретный ключ для постбэков
const REFERRAL_BASE_LINK = 'https://1wgxql.com/v3/aggressive-casino?p=qmgo&promocode=VIP662';

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const db = new sqlite3.Database('users.db');

// Настройка базы данных
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    language TEXT,
    subscribed INTEGER DEFAULT 0,
    registered INTEGER DEFAULT 0,
    deposited INTEGER DEFAULT 0
  )`);
});

// Middleware для обработки JSON и URL-encoded данных
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/miniapp', express.static('miniapp')); // Обслуживание Mini App

// Webhook для Telegram
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.sendStatus(500);
  }
});

// Обработка постбэков от 1win
app.get('/postback', (req, res) => {
  console.log('Received postback:', req.query);
  const { event_id, sub1: user_id, amount, signature } = req.query;

  if (!user_id) {
    console.error('Missing user_id in postback');
    return res.status(400).send('Missing user_id');
  }

  if (POSTBACK_SECRET && signature) {
    if (!verifySignature(req.query, POSTBACK_SECRET)) {
      console.error('Invalid signature in postback');
      return res.status(403).send('Invalid signature');
    }
  }

  if (event_id === 'registration') {
    db.run(`UPDATE users SET registered = 1 WHERE user_id = ?`, [user_id], (err) => {
      if (err) console.error('DB error on registration:', err);
    });
    const lang = getUserLanguage(user_id);
    bot.telegram.sendMessage(user_id, getMessage('registration_success', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${user_id}` }]
        ]
      }
    }).catch(err => console.error('Error sending registration message:', err));
  } else if (event_id === 'deposit') {
    const depositAmount = parseFloat(amount);
    if (depositAmount >= 10) {
      db.run(`UPDATE users SET deposited = 1 WHERE user_id = ?`, [user_id], (err) => {
        if (err) console.error('DB error on deposit:', err);
      });
      const lang = getUserLanguage(user_id);
      bot.telegram.sendMessage(user_id, getMessage('select_game', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: getMessage('aviator_button', lang), callback_data: 'game_aviator' }],
            [{ text: getMessage('luckyjet_button', lang), callback_data: 'game_luckyjet' }],
            [{ text: getMessage('mines_button', lang), callback_data: 'game_mines' }]
          ]
        }
      }).catch(err => console.error('Error sending deposit message:', err));
    }
  }
  res.sendStatus(200);
});

// Функция для проверки подписи постбэка
function verifySignature(query, secret) {
  const receivedSignature = query.signature;
  const data = Object.keys(query)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${query[k]}`)
    .join('&');
  const computedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return receivedSignature === computedSignature;
}

// Получение языка пользователя
function getUserLanguage(user_id) {
  let language = 'ru';
  db.get(`SELECT language FROM users WHERE user_id = ?`, [user_id], (err, row) => {
    if (err) console.error('DB error on language fetch:', err);
    if (row) language = row.language;
  });
  return language;
}

// Сообщения на разных языках
const messages = {
  ru: {
    welcome: 'Добро пожаловать, Voxy_Soft! Для использования бота - подпишись на наш канал 🤝',
    subscribe_button: 'Подписка на канал',
    check_subscription: 'Проверить',
    main_menu: 'Главное меню:',
    registration_button: 'Регистрация',
    instruction_button: 'Инструкция',
    select_language_button: 'Выбрать язык',
    help_button: 'Help',
    get_signal_button: 'Получить сигнал',
    registration_error: '⚠️ Ошибка: Регистрация не пройдена! ✦ При регистрации обязательно вводите промокод - VIP662 ● После завершения регистрации, Вам автоматически придет уведомление в бота.',
    register_button: 'Зарегистрироваться',
    back_to_menu: 'Вернуться в главное меню',
    instruction: `🤖 Бот основан и обучен на кластерной нейронной сети OpenAI!
⚜️ Для обучения бота было сыграно 🎰 30,000 игр.
В настоящее время пользователи бота успешно генерируют 15-25% от своего 💸 капитала ежедневно!
Бот все еще проходит проверки и исправления! Точность бота составляет 92%!
Чтобы достичь максимальной прибыли, следуйте этой инструкции:
🟢 1. Зарегистрируйтесь в букмекерской конторе [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id})
[Если не открывается, воспользуйтесь VPN (Швеция). В Play Market/App Store есть много бесплатных сервисов, например: Vpnify, Planet VPN, Hotspot VPN и т.д.!]
❗️ Без регистрации и промокода доступ к сигналам не будет открыт ❗️
🟢 2. Пополните баланс своего счета.
🟢 3. Перейдите в раздел игр 1win и выберите игру.
🟢 4. Установите количество ловушек на три. Это важно!
🟢 5. Запросите сигнал у бота и ставьте ставки в соответствии с сигналами от бота.
🟢 6. В случае неудачного сигнала рекомендуем удвоить (x²) вашу ставку, чтобы полностью покрыть убыток с помощью следующего сигнала.`,
    registration_success: 'Поздравляем с успешной регистрацией! 🥳\n🌐 Шаг 2 - Внеси первый депозит.\n✦ Чем больше депозит, тем больше УРОВЕНЬ в боте, а чем больше уровень в боте, тем большее количество сигналов с высокой вероятностью проходимости ты будешь получать.\n● После пополнения первого депозита, Вам автоматически придет уведомление в бота.',
    deposit_button: 'Внести депозит',
    select_game: 'Выберите игру:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `Добро пожаловать в VOXI SIGNAL LUCKY JET
LUCKY JET - это игра, в которой вы должны сделать ставку на увеличивающийся коэффициент перед тем, как ракетка улетит.
Чем дольше вы ждете, тем больше можете выиграть, но если ракетка улетит до того, как вы заберете ставку, вы потеряете.
Наш бот может помочь определить оптимальный момент для ставки!`,
    get_signal: 'ПОЛУЧИТЬ СИГНАЛ'
  },
  en: {
    welcome: 'Welcome, Voxy_Soft! To use the bot, subscribe to our channel 🤝',
    subscribe_button: 'Subscribe to channel',
    check_subscription: 'Check',
    main_menu: 'Main menu:',
    registration_button: 'Registration',
    instruction_button: 'Instruction',
    select_language_button: 'Select language',
    help_button: 'Help',
    get_signal_button: 'Get signal',
    registration_error: '⚠️ Error: Registration not completed! ✦ Be sure to enter the promo code - VIP662 ● You will receive a notification in the bot after registration.',
    register_button: 'Register',
    back_to_menu: 'Back to main menu',
    instruction: `🤖 The bot is built and trained on OpenAI's cluster neural network!
⚜️ 30,000 games 🎰 were played to train the bot.
Currently, bot users successfully generate 15-25% of their 💸 capital daily!
The bot is still undergoing checks and fixes! The bot's accuracy is 92%!
To achieve maximum profit, follow this instruction:
🟢 1. Register at the [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id}) bookmaker
[If it doesn't open, use a VPN (Sweden). There are many free services in Play Market/App Store, e.g., Vpnify, Planet VPN, Hotspot VPN, etc.!]
❗️ Without registration and promo code, access to signals will not be granted ❗️
🟢 2. Fund your account balance.
🟢 3. Go to the 1win games section and select a game.
🟢 4. Set the number of traps to three. This is important!
🟢 5. Request a signal from the bot and place bets according to the bot's signals.
🟢 6. In case of an unsuccessful signal, we recommend doubling (x²) your bet to fully cover the loss with the next signal.`,
    registration_success: 'Congratulations on successful registration! 🥳\n🌐 Step 2 - Make your first deposit.\n✦ The larger the deposit, the higher the LEVEL in the bot, and the higher the level, the more high-probability signals you will receive.\n● You will receive a notification in the bot after the first deposit.',
    deposit_button: 'Make deposit',
    select_game: 'Select game:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `Welcome to VOXI SIGNAL LUCKY JET
LUCKY JET is a game where you must bet on an increasing multiplier before the rocket flies away.
The longer you wait, the more you can win, but if the rocket flies away before you cash out, you lose.
Our bot can help determine the optimal moment to bet!`,
    get_signal: 'GET SIGNAL'
  },
  hi: {
    welcome: 'वॉक्सी_सॉफ्ट में आपका स्वागत है! बॉट का उपयोग करने के लिए, हमारे चैनल की सदस्यता लें 🤝',
    subscribe_button: 'चैनल की सदस्यता लें',
    check_subscription: 'जाँच करें',
    main_menu: 'मुख्य मेनू:',
    registration_button: 'पंजीकरण',
    instruction_button: 'निर्देश',
    select_language_button: 'भाषा चुनें',
    help_button: 'Help',
    get_signal_button: 'सिग्नल प्राप्त करें',
    registration_error: '⚠️ त्रुटि: पंजीकरण पूरा नहीं हुआ! ✦ पंजीकरण के दौरान प्रोमो कोड - VIP662 अवश्य दर्ज करें ● पंजीकरण के बाद आपको बॉट में एक अधिसूचना प्राप्त होगी।',
    register_button: 'पंजीकरण करें',
    back_to_menu: 'मुख्य मेनू पर वापस',
    instruction: `🤖 बॉट OpenAI के क्लस्टर न्यूरल नेटवर्क पर आधारित और प्रशिक्षित है!
⚜️ बॉट को प्रशिक्षित करने के लिए 30,000 गेम 🎰 खेले गए।
वर्तमान में, बॉट उपयोगकर्ता अपने 💸 पूंजी का 15-25% प्रतिदिन सफलतापूर्वक उत्पन्न करते हैं!
बॉट अभी भी जाँच और सुधार से गुजर रहा है! बॉट की सटीकता 92% है!
अधिकतम लाभ प्राप्त करने के लिए, इस निर्देश का पालन करें:
🟢 1. [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id}) बुकमेकर पर पंजीकरण करें
[यदि यह नहीं खुलता, तो VPN (स्वीडन) का उपयोग करें। Play Market/App Store में कई मुफ्त सेवाएँ हैं, जैसे: Vpnify, Planet VPN, Hotspot VPN आदि!]
❗️ पंजीकरण और प्रोमो कोड के बिना सिग्नल तक पहुँच नहीं दी जाएगी ❗️
🟢 2. अपने खाते का बैलेंस टॉप अप करें।
🟢 3. 1win गेम्स अनुभाग में जाएँ और एक गेम चुनें।
🟢 4. जाल की संख्या को तीन पर सेट करें। यह महत्वपूर्ण है!
🟢 5. बॉट से सिग्नल का अनुरोध करें और बॉट के सिग्नल के अनुसार दांव लगाएँ।
🟢 6. असफल सिग्नल के मामले में, हम आपकी दांव को दोगुना (x²) करने की सलाह देते हैं ताकि अगले सिग्नल के साथ नुकसान को पूरी तरह से कवर किया जा सके।`,
    registration_success: 'सफल पंजीकरण के लिए बधाई! 🥳\n🌐 चरण 2 - अपनी पहली जमा राशि करें।\n✦ जमा राशि जितनी बड़ी होगी, बॉट में उतना ही उच्च स्तर होगा, और स्तर जितना ऊँचा होगा, उतने ही अधिक उच्च-संभावना वाले सिग्नल आपको प्राप्त होंगे।\n● पहली जमा राशि के बाद आपको बॉट में एक अधिसूचना प्राप्त होगी।',
    deposit_button: 'जमा करें',
    select_game: 'गेम चुनें:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `VOXI SIGNAL LUCKY JET में आपका स्वागत है
LUCKY JET एक ऐसा गेम है जिसमें आपको रॉकेट के उड़ने से पहले बढ़ते गुणक पर दांव लगाना होता है।
जितना अधिक आप इंतजार करते हैं, उतना अधिक आप जीत सकते हैं, लेकिन यदि आप दांव को भुनाने से पहले रॉकेट उड़ जाता है, तो आप हार जाते हैं।
हमारा बॉट दांव लगाने के लिए最適 समय निर्धारित करने में मदद कर सकता है!`,
    get_signal: 'सिग्नल प्राप्त करें'
  },
  pt: {
    welcome: 'Bem-vindo, Voxy_Soft! Para usar o bot, inscreva-se no nosso canal 🤝',
    subscribe_button: 'Inscrever-se no canal',
    check_subscription: 'Verificar',
    main_menu: 'Menu principal:',
    registration_button: 'Registro',
    instruction_button: 'Instruções',
    select_language_button: 'Selecionar idioma',
    help_button: 'Help',
    get_signal_button: 'Obter sinal',
    registration_error: '⚠️ Erro: Registro não concluído! ✦ Certifique-se de inserir o código promocional - VIP662 ● Você receberá uma notificação no bot após o registro.',
    register_button: 'Registrar',
    back_to_menu: 'Voltar ao menu principal',
    instruction: `🤖 O bot é construído e treinado na rede neural de cluster da OpenAI!
⚜️ 30.000 jogos 🎰 foram jogados para treinar o bot.
Atualmente, os usuários do bot geram com sucesso 15-25% de seu 💸 capital diariamente!
O bot ainda está em fase de testes e correções! A precisão do bot é de 92%!
Para alcançar o lucro máximo, siga estas instruções:
🟢 1. Registre-se na casa de apostas [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id})
[Se não abrir, use uma VPN (Suécia). Há muitos serviços gratuitos no Play Market/App Store, por exemplo: Vpnify, Planet VPN, Hotspot VPN, etc.!]
❗️ Sem registro e código promocional, o acesso aos sinais não será concedido ❗️
🟢 2. Adicione fundos ao saldo da sua conta.
🟢 3. Vá para a seção de jogos da 1win e selecione um jogo.
🟢 4. Defina o número de armadilhas para três. Isso é importante!
🟢 5. Solicite um sinal do bot e faça apostas de acordo com os sinais do bot.
🟢 6. Em caso de um sinal malsucedido, recomendamos dobrar (x²) sua aposta para cobrir totalmente a perda com o próximo sinal.`,
    registration_success: 'Parabéns pelo registro bem-sucedido! 🥳\n🌐 Etapa 2 - Faça seu primeiro depósito.\n✦ Quanto maior o depósito, maior o NÍVEL no bot, e quanto maior o nível, mais sinais de alta probabilidade você receberá.\n● Você receberá uma notificação no bot após o primeiro depósito.',
    deposit_button: 'Fazer depósito',
    select_game: 'Selecionar jogo:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `Bem-vindo ao VOXI SIGNAL LUCKY JET
LUCKY JET é um jogo onde você deve apostar em um multiplicador crescente antes que o foguete voe.
Quanto mais você esperar, mais pode ganhar, mas se o foguete voar antes de você sacar, você perde.
Nosso bot pode ajudar a determinar o momento ideal para apostar!`,
    get_signal: 'OBTER SINAL'
  },
  es: {
    welcome: '¡Bienvenido, Voxy_Soft! Para usar el bot, suscríbete a nuestro canal 🤝',
    subscribe_button: 'Suscribirse al canal',
    check_subscription: 'Verificar',
    main_menu: 'Menú principal:',
    registration_button: 'Registro',
    instruction_button: 'Instrucciones',
    select_language_button: 'Seleccionar idioma',
    help_button: 'Help',
    get_signal_button: 'Obtener señal',
    registration_error: '⚠️ Error: ¡Registro no completado! ✦ Asegúrate de ingresar el código promocional - VIP662 ● Recibirás una notificación en el bot después del registro.',
    register_button: 'Registrar',
    back_to_menu: 'Volver al menú principal',
    instruction: `🤖 ¡El bot está construido y entrenado en la red neuronal de clúster de OpenAI!
⚜️ Se jugaron 30,000 juegos 🎰 para entrenar al bot.
Actualmente, los usuarios del bot generan con éxito entre el 15-25% de su 💸 capital diariamente.
¡El bot aún está en pruebas y correcciones! La precisión del bot es del 92%.
Para lograr la máxima ganancia, sigue estas instrucciones:
🟢 1. Regístrate en la casa de apuestas [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id})
[Si no se abre, usa una VPN (Suecia). Hay muchos servicios gratuitos en Play Market/App Store, por ejemplo: Vpnify, Planet VPN, Hotspot VPN, etc.!]
❗️ Sin registro y código promocional, no se otorgará acceso a las señales ❗️
🟢 2. Recarga el saldo de tu cuenta.
🟢 3. Ve a la sección de juegos de 1win y selecciona un juego.
🟢 4. Configura el número de trampas en tres. ¡Esto es importante!
🟢 5. Solicita una señal al bot y realiza apuestas según las señales del bot.
🟢 6. En caso de una señal fallida, recomendamos duplicar (x²) tu apuesta para cubrir completamente la pérdida con la siguiente señal.`,
    registration_success: '¡Felicidades por el registro exitoso! 🥳\n🌐 Paso 2 - Realiza tu primer depósito.\n✦ Cuanto mayor sea el depósito, mayor será el NIVEL en el bot, y cuanto mayor sea el nivel, más señales de alta probabilidad recibirás.\n● Recibirás una notificación en el bot después del primer depósito.',
    deposit_button: 'Realizar depósito',
    select_game: 'Seleccionar juego:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `Bienvenido a VOXI SIGNAL LUCKY JET
LUCKY JET es un juego donde debes apostar por un multiplicador creciente antes de que el cohete despegue.
Cuanto más esperes, más puedes ganar, pero si el cohete despega antes de que retires, pierdes.
¡Nuestro bot puede ayudarte a determinar el momento óptimo para apostar!`,
    get_signal: 'OBTENER SEÑAL'
  },
  uz: {
    welcome: 'Voxy_Softga xush kelibsiz! Botdan foydalanish uchun kanalimizga obuna bo‘ling 🤝',
    subscribe_button: 'Kanalga obuna bo‘lish',
    check_subscription: 'Tekshirish',
    main_menu: 'Asosiy menyu:',
    registration_button: 'Ro‘yxatdan o‘tish',
    instruction_button: 'Yo‘riqnoma',
    select_language_button: 'Til tanlash',
    help_button: 'Help',
    get_signal_button: 'Signal olish',
    registration_error: '⚠️ Xato: Ro‘yxatdan o‘tish yakunlanmadi! ✦ Ro‘yxatdan o‘tishda promo-kod - VIP662 ni kiritish shart ● Ro‘yxatdan o‘tish yakunlangandan so‘ng, botda avtomatik xabar olasiz.',
    register_button: 'Ro‘yxatdan o‘tish',
    back_to_menu: 'Asosiy menyuga qaytish',
    instruction: `🤖 Bot OpenAI klaster neyron tarmog‘ida qurilgan va o‘qitilgan!
⚜️ Botni o‘qitish uchun 30,000 ta o‘yin 🎰 o‘ynaldi.
Hozirda bot foydalanuvchilari o‘zlarining 💸 kapitalining 15-25% ni har kuni muvaffaqiyatli ishlab topmoqdalar!
Bot hali sinov va tuzatishlardan o‘tmoqda! Botning aniqligi 92%!
Maksimal daromadga erishish uchun ushbu yo‘riqnomaga amal qiling:
🟢 1. [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id}) bukmekerlik idorasida ro‘yxatdan o‘ting
[Agar ochilmasa, VPN (Shvetsiya) dan foydalaning. Play Market/App Store da ko‘plab bepul xizmatlar mavjud, masalan: Vpnify, Planet VPN, Hotspot VPN va boshqalar!]
❗️ Ro‘yxatdan o‘tish va promo-kodsiz signallarga kirish berilmaydi ❗️
🟢 2. Hisobingiz balansini to‘ldiring.
🟢 3. 1win o‘yinlar bo‘limiga o‘ting va o‘yin tanlang.
🟢 4. Tuzoqlar sonini uchtaga o‘rnating. Bu muhim!
🟢 5. Botdan signal so‘rang va bot signallariga muvofiq stavka qiling.
🟢 6. Muvaffaqiyatsiz signal bo‘lsa, keyingi signal bilan yo‘qotishni to‘liq qoplash uchun stavkangizni ikki baravar (x²) qilishni tavsiya qilamiz.`,
    registration_success: 'Muvaffaqiyatli ro‘yxatdan o‘tganingiz bilan tabriklaymiz! 🥳\n🌐 2-qadam - Birinchi depozitni kiriting.\n✦ Depozit qanchalik katta bo‘lsa, botda shunchalik yuqori DARAJA bo‘ladi va daraja qanchalik yuqori bo‘lsa, yuqori ehtimolli signallar shunchalik ko‘p bo‘ladi.\n● Birinchi depozit kiritilgandan so‘ng, botda avtomatik xabar olasiz.',
    deposit_button: 'Depozit kiritish',
    select_game: 'O‘yin tanlang:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `VOXI SIGNAL LUCKY JETga xush kelibsiz
LUCKY JET - bu siz raketa uchib ketishidan oldin o‘sib borayotgan koeffitsientga stavka qo‘yishingiz kerak bo‘lgan o‘yin.
Qancha uzoq kutsangiz, shuncha ko‘p yutishingiz mumkin, lekin agar siz stavkangizni yechib olishdan oldin raketa uchib ketsa, yutqazasiz.
Bizning botimiz stavka qo‘yish uchun eng maqbul vaqtni aniqlashga yordam beradi!`,
    get_signal: 'SIGNAL OLISH'
  },
  az: {
    welcome: 'Voxy_Soft-a xoş gəlmisiniz! Botdan istifadə etmək üçün kanalımıza abunə olun 🤝',
    subscribe_button: 'Kanala abunə ol',
    check_subscription: 'Yoxla',
    main_menu: 'Əsas menyu:',
    registration_button: 'Qeydiyyat',
    instruction_button: 'Təlimat',
    select_language_button: 'Dil seç',
    help_button: 'Help',
    get_signal_button: 'Siqnal al',
    registration_error: '⚠️ Xəta: Qeydiyyat tamamlanmadı! ✦ Qeydiyyat zamanı promo-kod - VIP662 daxil etmək mütləqdir ● Qeydiyyat tamamlandıqdan sonra botda avtomatik bildiriş alacaqsınız.',
    register_button: 'Qeydiyyatdan keç',
    back_to_menu: 'Əsas menyuya qayıt',
    instruction: `🤖 Bot OpenAI klaster neyron şəbəkəsi əsasında qurulub və öyrədilib!
⚜️ Botu öyrətmək üçün 30,000 oyun 🎰 oynanılıb.
Hal-hazırda bot istifadəçiləri öz 💸 kapitalının 15-25%-ni hər gün uğurla qazanırlar!
Bot hələ də yoxlamalar və düzəlişlərdən keçir! Botun dəqiqliyi 92%-dir!
Maksimum qazanc əldə etmək üçün bu təlimata əməl edin:
🟢 1. [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id}) bukmeker kontorunda qeydiyyatdan keçin
[Əgər açılmırsa, VPN (İsveç) istifadə edin. Play Market/App Store-da bir çox pulsuz xidmətlər var, məsələn: Vpnify, Planet VPN, Hotspot VPN və s.!]
❗️ Qeydiyyat və promo-kod olmadan siqnallara giriş verilməyəcək ❗️
🟢 2. Hesabınızın balansını artırın.
🟢 3. 1win oyunlar bölməsinə keçin və oyun seçin.
🟢 4. Tələlərin sayını üçə təyin edin. Bu vacibdir!
🟢 5. Botdan siqnal tələb edin və botun siqnallarına uyğun mərc qoyun.
🟢 6. Uğursuz siqnal olarsa, növbəti siqnal ilə zərəri tam örtmək üçün mərcinizi iki dəfə (x²) artırmağı tövsiyə edirik.`,
    registration_success: 'Uğurlu qeydiyyat münasibətilə təbrik edirik! 🥳\n🌐 2-ci addım - İlk depoziti yatırın.\n✦ Depozit nə qədər böyükdürsə, botda SƏVİYYƏ o qədər yüksəkdir və səviyyə nə qədər yüksəkdirsə, bir o qədər yüksək ehtimallı siqnallar alacaqsınız.\n● İlk depozit yatırıldıqdan sonra botda avtomatik bildiriş alacaqsınız.',
    deposit_button: 'Depozit yatır',
    select_game: 'Oyun seçin:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `VOXI SIGNAL LUCKY JET-ə xoş gəlmisiniz
LUCKY JET, raketin uçmasından əvvəl artan əmsala mərc qoymalısınız.
Nə qədər çox gözləsəniz, bir o qədər çox qazana bilərsiniz, amma əgər mərcinizi çıxarmadan raket uçarsa, uduzarsınız.
Bizim botumuz mərc qoymaq üçün optimal anı müəyyənləşdirməyə kömək edə bilər!`,
    get_signal: 'SIQNAL AL'
  },
  tr: {
    welcome: 'Voxy_Soft\'a hoş geldiniz! Botu kullanmak için kanalımıza abone olun 🤝',
    subscribe_button: 'Kanala abone ol',
    check_subscription: 'Kontrol et',
    main_menu: 'Ana menü:',
    registration_button: 'Kayıt',
    instruction_button: 'Talimatlar',
    select_language_button: 'Dil seç',
    help_button: 'Help',
    get_signal_button: 'Sinyal al',
    registration_error: '⚠️ Hata: Kayıt tamamlanmadı! ✦ Kayıt sırasında promosyon kodu - VIP662 girmek zorunludur ● Kayıt tamamlandıktan sonra bota otomatik bir bildirim alacaksınız.',
    register_button: 'Kayıt ol',
    back_to_menu: 'Ana menüye dön',
    instruction: `🤖 Bot, OpenAI'nin küme sinir ağı üzerine inşa edilmiş ve eğitilmiştir!
⚜️ Botu eğitmek için 30.000 oyun 🎰 oynandı.
Şu anda bot kullanıcıları, 💸 sermayelerinin %15-25'ini her gün başarıyla kazanıyor!
Bot hala test ve düzeltmelerden geçiyor! Botun doğruluğu %92'dir!
Maksimum kâr elde etmek için şu talimatları izleyin:
🟢 1. [1WIN](${REFERRAL_BASE_LINK}&sub1={user_id}) bahis şirketinde kayıt olun
[Açılmazsa, VPN (İsveç) kullanın. Play Market/App Store'da birçok ücretsiz hizmet var, örneğin: Vpnify, Planet VPN, Hotspot VPN vb.!]
❗️ Kayıt ve promosyon kodu olmadan sinyallere erişim verilmez ❗️
🟢 2. Hesabınızın bakiyesini doldurun.
🟢 3. 1win oyunlar bölümüne gidin ve bir oyun seçin.
🟢 4. Tuzak sayısını üçe ayarlayın. Bu önemli!
🟢 5. Bottan sinyal talep edin ve botun sinyallerine göre bahis yapın.
🟢 6. Başarısız bir sinyal durumunda, kaybı tamamen telafi etmek için bir sonraki sinyalle bahsinizi ikiye katlamanızı (x²) öneririz.`,
    registration_success: 'Başarılı kayıt için tebrikler! 🥳\n🌐 Adım 2 - İlk para yatırmayı yap.\n✦ Yatırım ne kadar büyükse, botta SEVİYE o kadar yüksek olur ve seviye ne kadar yüksekse, o kadar çok yüksek olasılıklı sinyal alırsınız.\n● İlk para yatırma işleminden sonra bota otomatik bir bildirim alacaksınız.',
    deposit_button: 'Para yatır',
    select_game: 'Oyun seç:',
    aviator_button: 'AVIATOR',
    luckyjet_button: 'LUCKY JET',
    mines_button: 'MINES',
    luckyjet_welcome: `VOXI SIGNAL LUCKY JET'e hoş geldiniz
LUCKY JET, roket uçmadan önce artan bir çarpana bahis yapmanız gereken bir oyundur.
Ne kadar uzun beklerseniz, o kadar çok kazanabilirsiniz, ancak roket siz bahsi çekmeden uçarsa, kaybedersiniz.
Botumuz, bahis yapmak için en uygun anı belirlemenize yardımcı olabilir!`,
    get_signal: 'SİNYAL AL'
  }
};

// Функция для получения сообщения на нужном языке
function getMessage(key, lang, user_id = '') {
  let message = messages[lang]?.[key] || messages.ru[key];
  if (user_id) message = message.replace('{user_id}', user_id);
  return message;
}

// Проверка подписки
async function checkSubscription(ctx) {
  try {
    const chatMember = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.chat.id);
    return ['member', 'administrator', 'creator'].includes(chatMember.status);
  } catch (err) {
    console.error('Error checking subscription:', err);
    return false;
  }
}

// Команда /start
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  db.get(`SELECT * FROM users WHERE user_id = ?`, [chatId], (err, row) => {
    if (err) {
      console.error('DB error on user check:', err);
      return;
    }
    if (!row) {
      db.run(`INSERT INTO users (user_id) VALUES (?)`, [chatId], (err) => {
        if (err) console.error('DB error on user insert:', err);
      });
      ctx.reply('Выберите язык / Select language:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Русский 🇷🇺', callback_data: 'lang_ru' }, { text: 'English 🇬🇧', callback_data: 'lang_en' }],
            [{ text: 'हिन्दी 🇮🇳', callback_data: 'lang_hi' }, { text: 'Português 🇧🇷', callback_data: 'lang_pt' }],
            [{ text: 'Español 🇪🇸', callback_data: 'lang_es' }, { text: 'Oʻzbek 🇺🇿', callback_data: 'lang_uz' }],
            [{ text: 'Azərbaycan 🇦🇿', callback_data: 'lang_az' }, { text: 'Türkçe 🇹🇷', callback_data: 'lang_tr' }]
          ]
        }
      }).catch(err => console.error('Error sending language selection:', err));
    } else {
      sendWelcomeMessage(ctx, row.language);
    }
  });
});

// Обработка callback-запросов
bot.on('callback_query', async (ctx) => {
  const chatId = ctx.chat.id;
  const data = ctx.callbackQuery.data;

  if (data.startsWith('lang_')) {
    const lang = data.split('_')[1];
    db.run(`UPDATE users SET language = ? WHERE user_id = ?`, [lang, chatId], (err) => {
      if (err) console.error('DB error on language update:', err);
    });
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    await sendWelcomeMessage(ctx, lang);
  } else if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(ctx);
    if (isSubscribed) {
      db.run(`UPDATE users SET subscribed = 1 WHERE user_id = ?`, [chatId], (err) => {
        if (err) console.error('DB error on subscription update:', err);
      });
      await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
      await sendMainMenu(ctx, getUserLanguage(chatId));
    } else {
      ctx.answerCbQuery('Пожалуйста, подпишитесь на канал! / Please subscribe to the channel!', true).catch(err => console.error('Error answering callback:', err));
    }
  } else if (data === 'main_menu') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    await sendMainMenu(ctx, getUserLanguage(chatId));
  } else if (data === 'registration') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    const lang = getUserLanguage(chatId);
    ctx.reply(getMessage('registration_error', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
          [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
        ]
      }
    }).catch(err => console.error('Error sending registration error:', err));
  } else if (data === 'instruction') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    const lang = getUserLanguage(chatId);
    ctx.reply(getMessage('instruction', lang, chatId), {
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
        ]
      }
    }).catch(err => console.error('Error sending instruction:', err));
  } else if (data === 'select_language') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    ctx.reply('Выберите язык / Select language:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Русский 🇷🇺', callback_data: 'lang_ru' }, { text: 'English 🇬🇧', callback_data: 'lang_en' }],
          [{ text: 'हिन्दी 🇮🇳', callback_data: 'lang_hi' }, { text: 'Português 🇧🇷', callback_data: 'lang_pt' }],
          [{ text: 'Español 🇪🇸', callback_data: 'lang_es' }, { text: 'Oʻzbek 🇺🇿', callback_data: 'lang_uz' }],
          [{ text: 'Azərbaycan 🇦🇿', callback_data: 'lang_az' }, { text: 'Türkçe 🇹🇷', callback_data: 'lang_tr' }]
        ]
      }
    }).catch(err => console.error('Error sending language selection:', err));
  } else if (data === 'help') {
    ctx.reply('Свяжитесь с поддержкой / Contact support:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Support', url: 'https://t.me/Soft1win1' }]
        ]
      }
    }).catch(err => console.error('Error sending help:', err));
  } else if (data === 'get_signal') {
    db.get(`SELECT * FROM users WHERE user_id = ?`, [chatId], async (err, row) => {
      if (err) {
        console.error('DB error on signal check:', err);
        return;
      }
      const lang = getUserLanguage(chatId);
      if (!row.registered) {
        await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
        ctx.reply(getMessage('registration_error', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
              [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
            ]
          }
        }).catch(err => console.error('Error sending registration error:', err));
      } else if (!row.deposited) {
        await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
        ctx.reply(getMessage('registration_success', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
              [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
            ]
          }
        }).catch(err => console.error('Error sending deposit prompt:', err));
      } else {
        await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
        ctx.reply(getMessage('select_game', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('aviator_button', lang), callback_data: 'game_aviator' }],
              [{ text: getMessage('luckyjet_button', lang), callback_data: 'game_luckyjet' }],
              [{ text: getMessage('mines_button', lang), callback_data: 'game_mines' }]
            ]
          }
        }).catch(err => console.error('Error sending game selection:', err));
      }
    });
  } else if (data === 'game_aviator' || data === 'game_mines') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    const lang = getUserLanguage(chatId);
    ctx.reply('Этот раздел находится в разработке. Пожалуйста, выберите LUCKY JET.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('luckyjet_button', lang), callback_data: 'game_luckyjet' }],
          [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
        ]
      }
    }).catch(err => console.error('Error sending placeholder message:', err));
  } else if (data === 'game_luckyjet') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    const lang = getUserLanguage(chatId);
    ctx.reply(getMessage('luckyjet_welcome', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('get_signal', lang), url: MINI_APP_URL }]
        ]
      }
    }).catch(err => console.error('Error sending Lucky Jet message:', err));
  }
  ctx.answerCbQuery().catch(err => console.error('Error answering callback:', err));
});

// Приветственное сообщение
async function sendWelcomeMessage(ctx, lang) {
  const chatId = ctx.chat.id;
  db.get(`SELECT subscribed FROM users WHERE user_id = ?`, [chatId], async (err, row) => {
    if (err) {
      console.error('DB error on subscription check:', err);
      return;
    }
    if (row.subscribed) {
      await sendMainMenu(ctx, lang);
    } else {
      ctx.reply(getMessage('welcome', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: getMessage('subscribe_button', lang), url: `https://t.me${CHANNEL_ID}` }],
            [{ text: getMessage('check_subscription', lang), callback_data: 'check_subscription' }]
          ]
        }
      }).catch(err => console.error('Error sending welcome message:', err));
    }
  });
}

// Главное меню
async function sendMainMenu(ctx, lang) {
  ctx.reply(getMessage('main_menu', lang), {
    reply_markup: {
      inline_keyboard: [
        [{ text: getMessage('registration_button', lang), callback_data: 'registration' }],
        [{ text: getMessage('instruction_button', lang), callback_data: 'instruction' }],
        [{ text: getMessage('select_language_button', lang), callback_data: 'select_language' }],
        [{ text: getMessage('help_button', lang), callback_data: 'help' }],
        [{ text: getMessage('get_signal_button', lang), callback_data: 'get_signal' }]
      ]
    }
  }).catch(err => console.error('Error sending main menu:', err));
}

// Запуск сервера (локально используйте polling для тестирования)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  bot.launch(); // Используем polling для локального тестирования
});
