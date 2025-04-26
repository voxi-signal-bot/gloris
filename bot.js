const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

// Настройки бота
const BOT_TOKEN = '8145387934:AAFiFPUfKH0EwYST6ShOFdBSm6IvwhPkEqY';
const CHANNEL_ID = '@xuiuugg';
const MINI_APP_URL = 'https://gloris-production.up.railway.app/miniapp';
const APP_URL = 'https://gloris-production.up.railway.app';
const REFERRAL_BASE_LINK = 'https://1wgxql.com/v3/aggressive-casino?p=qmgo&promocode=VIP662';

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const db = new Database('users.db', { verbose: console.log });

// Настройка базы данных
db.exec(`CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  language TEXT DEFAULT 'ru',
  registered INTEGER DEFAULT 0,
  deposited INTEGER DEFAULT 0
)`);

// Middleware для обработки JSON и URL-encoded данных
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/miniapp', express.static('miniapp'));

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

// Проверка и создание пользователя, если он отсутствует
function ensureUserExists(user_id) {
  user_id = String(user_id); // Приводим к строке
  const stmt = db.prepare(`SELECT * FROM users WHERE user_id = ?`);
  const row = stmt.get(user_id);
  if (!row) {
    const insertStmt = db.prepare(`INSERT INTO users (user_id, language) VALUES (?, 'ru')`);
    insertStmt.run(user_id);
    console.log(`User ${user_id} created in database`);
  }
  return user_id;
}

// Обновление базы данных (синхронно)
function updateUserRegistration(user_id) {
  user_id = ensureUserExists(user_id); // Проверяем и создаём пользователя, если он отсутствует
  const stmt = db.prepare(`UPDATE users SET registered = 1 WHERE user_id = ?`);
  const result = stmt.run(user_id);
  console.log(`User ${user_id} marked as registered, changes: ${result.changes}`);
  return result.changes > 0;
}

// Проверка статуса пользователя (синхронно)
function checkUserStatus(user_id) {
  user_id = String(user_id); // Приводим к строке
  const stmt = db.prepare(`SELECT * FROM users WHERE user_id = ?`);
  const row = stmt.get(user_id);
  return row;
}

// Получение языка пользователя (синхронно)
function getUserLanguage(user_id) {
  user_id = String(user_id); // Приводим к строке
  const stmt = db.prepare(`SELECT language FROM users WHERE user_id = ?`);
  const row = stmt.get(user_id);
  return row?.language || 'ru';
}

// Обработка постбэков от 1win
app.get('/postback', async (req, res) => {
  console.log('Received postback from 1win:', req.query);
  const { event_id, sub1: user_id, amount } = req.query;

  // Проверка наличия user_id
  if (!user_id) {
    console.error('Missing user_id in postback');
    return res.status(400).send('Missing user_id');
  }

  console.log(`Checking user existence for ${user_id}`);
  ensureUserExists(user_id); // Убедимся, что пользователь существует

  if (event_id === 'registration') {
    console.log(`Processing registration for user ${user_id}`);
    try {
      const updated = updateUserRegistration(user_id);
      if (!updated) {
        console.warn(`User ${user_id} registration update failed`);
      } else {
        console.log(`User ${user_id} successfully marked as registered`);
      }
      const lang = getUserLanguage(user_id);
      console.log(`Sending registration success message to user ${user_id} in language ${lang}`);
      await bot.telegram.sendPhoto(user_id, 'https://i.imgur.com/eABK5if.jpeg', {
        caption: getMessage('registration_success', lang),
        reply_markup: {
          inline_keyboard: [
            [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${user_id}` }],
            [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
          ]
        }
      }).catch(err => {
        console.error('Error sending registration message with photo:', err);
        bot.telegram.sendMessage(user_id, getMessage('registration_success', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${user_id}` }],
              [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
            ]
          }
        }).catch(fallbackErr => console.error('Error sending fallback registration message:', fallbackErr));
      });
    } catch (err) {
      console.error('Error processing registration:', err);
    }
  } else if (event_id === 'deposit') {
    const depositAmount = parseFloat(amount);
    console.log(`Processing deposit for user ${user_id}: amount = ${depositAmount}`);
    if (isNaN(depositAmount)) {
      console.error(`Invalid deposit amount for user ${user_id}: ${amount}`);
      return res.status(400).send('Invalid amount');
    }
    if (depositAmount >= 10) {
      const stmt = db.prepare(`UPDATE users SET deposited = 1 WHERE user_id = ?`);
      const result = stmt.run(String(user_id));
      console.log(`User ${user_id} marked as deposited, changes: ${result.changes}`);
      if (result.changes > 0) {
        const lang = getUserLanguage(user_id);
        console.log(`Sending game selection to user ${user_id} in language ${lang}`);
        bot.telegram.sendMessage(user_id, getMessage('select_game', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('aviator_button', lang), callback_data: 'game_aviator' }],
              [{ text: getMessage('luckyjet_button', lang), callback_data: 'game_luckyjet' }],
              [{ text: getMessage('mines_button', lang), callback_data: 'game_mines' }]
            ]
          }
        }).catch(err => console.error('Error sending deposit message:', err));
      } else {
        console.warn(`No changes made for user ${user_id} during deposit update`);
      }
    } else {
      console.log(`Deposit amount ${depositAmount} for user ${user_id} is less than 10; no action taken`);
    }
  } else {
    console.log(`Unknown event_id: ${event_id} for user ${user_id}`);
  }
  res.sendStatus(200);
});

// Сообщения на разных языках
const messages = {
  ru: {
    welcome: 'Добро пожаловать, Voxy_Soft! Для использования бота нажмите "Продолжить" 👇',
    continue_button: 'Продолжить',
    main_menu: 'Главное меню:',
    registration_button: '📱Регистрация',
    instruction_button: '📚Инструкция',
    select_language_button: '🌐Выбрать язык',
    help_button: '🆘Help',
    get_signal_button: '⚜️Получить сигнал⚜️',
    registration_error: '⚠️ Ошибка: Регистрация не пройдена!\n\n✦ При регистрации обязательно вводите промокод - VIP662\n\n● После завершения регистрации, Вам автоматически придет уведомление в бота.',
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
    welcome: 'Welcome, Voxy_Soft! To use the bot, click "Continue" 👇',
    continue_button: 'Continue',
    main_menu: 'Main menu:',
    registration_button: '📱Registration',
    instruction_button: '📚Instruction',
    select_language_button: '🌐Select language',
    help_button: '🆘Help',
    get_signal_button: '⚜️Get signal⚜️',
    registration_error: '⚠️ Error: Registration not completed!\n\n✦ Be sure to enter the promo code - VIP662\n\n● You will receive a notification in the bot after registration.',
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
    welcome: 'वॉक्सी_सॉफ्ट में आपका स्वागत है! बॉट का उपयोग करने के लिए "जारी रखें" पर क्लिक करें 👇',
    continue_button: 'जारी रखें',
    main_menu: 'मुख्य मेनू:',
    registration_button: '📱पंजीकरण',
    instruction_button: '📚निर्देश',
    select_language_button: '🌐भाषा चुनें',
    help_button: '🆘Help',
    get_signal_button: '⚜️सिग्नल प्राप्त करें⚜️',
    registration_error: '⚠️ त्रुटि: पंजीकरण पूरा नहीं हुआ!\n\n✦ पंजीकरण के दौरान प्रोमो कोड - VIP662 अवश्य दर्ज करें\n\n● पंजीकरण के बाद आपको बॉट में एक अधिसूचना प्राप्त होगी।',
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
हमारा बॉट दांव लगाने के लिए सबसे अच्छा समय निर्धारित करने में मदद कर सकता है!`,
    get_signal: 'सिग्नल प्राप्त करें'
  },
  pt: {
    welcome: 'Bem-vindo, Voxy_Soft! Para usar o bot, clique em "Continuar" 👇',
    continue_button: 'Continuar',
    main_menu: 'Menu principal:',
    registration_button: '📱Registro',
    instruction_button: '📚Instruções',
    select_language_button: '🌐Selecionar idioma',
    help_button: '🆘Help',
    get_signal_button: '⚜️Obter sinal⚜️',
    registration_error: '⚠️ Erro: Registro não concluído!\n\n✦ Certifique-se de inserir o código promocional - VIP662\n\n● Você receberá uma notificação no bot após o registro.',
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
    welcome: '¡Bienvenido, Voxy_Soft! Para usar el bot, haz clic en "Continuar" 👇',
    continue_button: 'Continuar',
    main_menu: 'Menú principal:',
    registration_button: '📱Registro',
    instruction_button: '📚Instrucciones',
    select_language_button: '🌐Seleccionar idioma',
    help_button: '🆘Help',
    get_signal_button: '⚜️Obtener señal⚜️',
    registration_error: '⚠️ Error: ¡Registro no completado!\n\n✦ Asegúrate de ingresar el código promocional - VIP662\n\n● Recibirás una notificación en el bot después del registro.',
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
    welcome: 'Voxy_Softga xush kelibsiz! Botdan foydalanish uchun "Davom etish" tugmasini bosing 👇',
    continue_button: 'Davom etish',
    main_menu: 'Asosiy menyu:',
    registration_button: '📱Ro‘yxatdan o‘tish',
    instruction_button: '📚Yo‘riqnoma',
    select_language_button: '🌐Til tanlash',
    help_button: '🆘Help',
    get_signal_button: '⚜️Signal olish⚜️',
    registration_error: '⚠️ Xato: Ro‘yxatdan o‘tish yakunlanmadi!\n\n✦ Ro‘yxatdan o‘tishda promo-kod - VIP662 ni kiritish shart\n\n● Ro‘yxatdan o‘tish yakunlangandan so‘ng, botda avtomatik xabar olasiz.',
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
    welcome: 'Voxy_Soft-a xoş gəlmisiniz! Botdan istifadə etmək üçün "Davam et" düyməsini basın 👇',
    continue_button: 'Davam et',
    main_menu: 'Əsas menyu:',
    registration_button: '📱Qeydiyyat',
    instruction_button: '📚Təlimat',
    select_language_button: '🌐Dil seç',
    help_button: '🆘Help',
    get_signal_button: '⚜️Siqnal al⚜️',
    registration_error: '⚠️ Xəta: Qeydiyyat tamamlanmadı!\n\n✦ Qeydiyyat zamanı promo-kod - VIP662 daxil etmək mütləqdir\n\n● Qeydiyyat tamamlandıqdan sonra botda avtomatik bildiriş alacaqsınız.',
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
    welcome: "Voxy_Soft'a hoş geldiniz! Botu kullanmak için 'Devam Et' butonuna tıklayın 👇",
    continue_button: 'Devam Et',
    main_menu: 'Ana menü:',
    registration_button: '📱Kayıt',
    instruction_button: '📚Talimatlar',
    select_language_button: '🌐Dil seç',
    help_button: '🆘Help',
    get_signal_button: '⚜️Sinyal al⚜️',
    registration_error: '⚠️ Hata: Kayıt tamamlanmadı!\n\n✦ Kayıt sırasında promosyon kodu - VIP662 girmek zorunludur\n\n● Kayıt tamamlandıktan sonra bota otomatik bir bildirim alacaksınız.',
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
    luckyjet_welcome: `VOXI SIGNAL LUCKY JET'e hoŞ geldiniz
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

// Команда /start
bot.start(async (ctx) => {
  const chatId = String(ctx.chat.id); // Приводим к строке
  console.log(`Processing /start for user ${chatId}`);
  const row = checkUserStatus(chatId);
  if (!row) {
    ensureUserExists(chatId); // Создаём пользователя
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
    await sendWelcomeMessage(ctx, row.language || 'ru');
  }
});

// Обработка callback-запросов
bot.on('callback_query', async (ctx) => {
  const chatId = String(ctx.chat.id); // Приводим к строке
  const data = ctx.callbackQuery.data;
  console.log(`Received callback query: ${data} from user ${chatId}`);

  if (data.startsWith('lang_')) {
    const lang = data.split('_')[1];
    const stmt = db.prepare(`UPDATE users SET language = ? WHERE user_id = ?`);
    stmt.run(lang, chatId);
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    await sendWelcomeMessage(ctx, lang);
  } else if (data === 'continue') {
    console.log(`User ${chatId} clicked Continue, sending main menu`);
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    await sendMainMenu(ctx, getUserLanguage(chatId));
  } else if (data === 'main_menu') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    await sendMainMenu(ctx, getUserLanguage(chatId));
  } else if (data === 'registration') {
    await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
    const lang = getUserLanguage(chatId);
    ctx.replyWithPhoto('https://i.imgur.com/QouqMUC.jpeg', {
      caption: getMessage('registration_error', lang),
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
          [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
        ]
      }
    }).catch(err => {
      console.error('Error sending registration error with photo:', err);
      ctx.reply(getMessage('registration_error', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
            [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
          ]
        }
      }).catch(fallbackErr => console.error('Error sending fallback registration error:', fallbackErr));
    });
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
    try {
      const row = checkUserStatus(chatId);
      console.log(`User ${chatId} status - registered: ${row?.registered}, deposited: ${row?.deposited}`);
      const lang = getUserLanguage(chatId);
      if (!row?.registered) {
        await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
        ctx.replyWithPhoto('https://i.imgur.com/QouqMUC.jpeg', {
          caption: getMessage('registration_error', lang),
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
              [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
            ]
          }
        }).catch(err => {
          console.error('Error sending registration error with photo:', err);
          ctx.reply(getMessage('registration_error', lang), {
            reply_markup: {
              inline_keyboard: [
                [{ text: getMessage('register_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
                [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
              ]
            }
          }).catch(fallbackErr => console.error('Error sending fallback registration error:', fallbackErr));
        });
      } else if (!row.deposited) {
        await ctx.deleteMessage().catch(err => console.error('Error deleting message:', err));
        ctx.replyWithPhoto('https://i.imgur.com/eABK5if.jpeg', {
          caption: getMessage('registration_success', lang),
          reply_markup: {
            inline_keyboard: [
              [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
              [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
            ]
          }
        }).catch(err => {
          console.error('Error sending deposit prompt with photo:', err);
          ctx.reply(getMessage('registration_success', lang), {
            reply_markup: {
              inline_keyboard: [
                [{ text: getMessage('deposit_button', lang), url: `${REFERRAL_BASE_LINK}&sub1=${chatId}` }],
                [{ text: getMessage('back_to_menu', lang), callback_data: 'main_menu' }]
              ]
            }
          }).catch(fallbackErr => console.error('Error sending fallback deposit prompt:', fallbackErr));
        });
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
    } catch (err) {
      console.error('Error checking user status:', err);
      ctx.reply('Ошибка базы данных. Попробуйте позже.');
    }
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
    ctx.replyWithPhoto('https://i.imgur.com/KF1GgYS.jpeg', {
      caption: getMessage('luckyjet_welcome', lang),
      reply_markup: {
        inline_keyboard: [
          [{ text: getMessage('get_signal', lang), url: MINI_APP_URL }]
        ]
      }
    }).catch(err => {
      console.error('Error sending Lucky Jet message with photo:', err);
      ctx.reply(getMessage('luckyjet_welcome', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: getMessage('get_signal', lang), url: MINI_APP_URL }]
          ]
        }
      }).catch(fallbackErr => console.error('Error sending fallback Lucky Jet message:', fallbackErr));
    });
  }
  ctx.answerCbQuery().catch(err => console.error('Error answering callback:', err));
});

// Приветственное сообщение
async function sendWelcomeMessage(ctx, lang) {
  const chatId = String(ctx.chat.id); // Приводим к строке
  console.log(`Sending welcome message to user ${chatId} with language ${lang}`);
  ctx.reply(getMessage('welcome', lang), {
    reply_markup: {
      inline_keyboard: [
        [{ text: getMessage('continue_button', lang), callback_data: 'continue' }]
      ]
    }
  }).catch(err => console.error('Error sending welcome message:', err));
}

// Главное меню с фотографией и кнопками в два столбца
async function sendMainMenu(ctx, lang) {
  const chatId = String(ctx.chat.id); // Приводим к строке
  console.log(`Sending main menu to user ${chatId} with language ${lang}`);
  ctx.replyWithPhoto('https://i.imgur.com/x8J6K8l.png', {
    caption: getMessage('main_menu', lang),
    reply_markup: {
      inline_keyboard: [
        [
          { text: getMessage('registration_button', lang), callback_data: 'registration' },
          { text: getMessage('instruction_button', lang), callback_data: 'instruction' }
        ],
        [
          { text: getMessage('select_language_button', lang), callback_data: 'select_language' },
          { text: getMessage('help_button', lang), callback_data: 'help' }
        ],
        [
          { text: getMessage('get_signal_button', lang), callback_data: 'get_signal' }
        ]
      ]
    }
  }).catch(err => {
    console.error('Error sending main menu with photo:', err);
    ctx.reply(getMessage('main_menu', lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: getMessage('registration_button', lang), callback_data: 'registration' },
            { text: getMessage('instruction_button', lang), callback_data: 'instruction' }
          ],
          [
            { text: getMessage('select_language_button', lang), callback_data: 'select_language' },
            { text: getMessage('help_button', lang), callback_data: 'help' }
          ],
          [
            { text: getMessage('get_signal_button', lang), callback_data: 'get_signal' }
          ]
        ]
      }
    }).catch(fallbackErr => console.error('Error sending fallback main menu:', fallbackErr));
  });
}

// Глобальный обработчик ошибок
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('Произошла ошибка. Попробуйте позже.');
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    bot.telegram.setWebhook(`${APP_URL}/webhook`).then(() => {
      console.log(`Webhook set to ${APP_URL}/webhook`);
    }).catch(err => console.error('Error setting webhook:', err));
    app.use(bot.webhookCallback('/webhook'));
  } else {
    bot.launch().then(() => {
      console.log('Bot started in polling mode');
    }).catch(err => console.error('Error starting bot:', err));
  }
});

// Закрытие базы данных при завершении работы
process.on('SIGINT', () => {
  db.close();
  console.log('Database closed');
  process.exit(0);
});
