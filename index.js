const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Настройка Express для Mini App
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3000, () => console.log('Server running...'));

// Объект для хранения состояния пользователей
const userState = {};

// Доступные языки и их эмодзи флагов
const languages = {
  ru: { name: 'Русский', flag: '🇷🇺' },
  en: { name: 'English', flag: '🇬🇧' },
  hi: { name: 'Indian', flag: '🇮🇳' },
  pt_br: { name: 'Brazilian', flag: '🇧🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  uz: { name: 'Uzbek', flag: '🇺🇿' },
  az: { name: 'Azerbaijani', flag: '🇦🇿' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
  pt: { name: 'Portuguese', flag: '🇵🇹' }
};

// Тексты на разных языках
const messages = {
  ru: {
    welcome: 'Добро пожаловать, Voxy_Soft! Для использования бота - подпишись на наш канал 🤝',
    mainMenu: 'Главное меню:',
    registrationError: '⚠️ Ошибка: Регистрация не пройдена! ✦ При регистрации обязательно вводите промокод - VIP662 ● После завершения регистрации, Вам автоматически придет уведомление в бота.',
    instruction: `🤖Бот основан и обучен на кластерной нейронной сети OpenAI! 
⚜️Для обучения бота было сыграно 🎰30,000 игр.
В настоящее время пользователи бота успешно генерируют 15-25% от своего 💸 капитала ежедневно!
Бот все еще проходит проверки и исправления! Точность бота составляет 92%!
Чтобы достичь максимальной прибыли, следуйте этой инструкции:
🟢 1. Зарегистрируйтесь в букмекерской конторе 1WIN
[Если не открывается, воспользуйтесь VPN (Швеция). В Play Market/App Store есть много бесплатных сервисов, например: Vpnify, Planet VPN, Hotspot VPN и т.д.!]
      ❗️Без регистрации и промокода доступ к сигналам не будет открыт❗️
🟢 2. Пополните баланс своего счета.
🟢 3. Перейдите в раздел игр 1win и выберите игру.
🟢 4. Установите количество ловушек на три. Это важно!
🟢 5. Запросите сигнал у бота и ставьте ставки в соответствии с сигналами от бота.
🟢 6. В случае неудачного сигнала рекомендуем удвоить (x²) вашу ставку, чтобы полностью покрыть убыток с помощью следующего сигнала.`,
    deposit: `Поздравляем с успешной регистрацией! 🥳
🌐Шаг 2 - Внеси первый депозит.
✦ Чем больше депозит, тем больше УРОВЕНЬ в боте, а чем больше уровень в боте, тем большее количество сигналов с высокой вероятностью проходимости сигнала ты будешь получать.
● После пополнения первого депозита, Вам автоматически придет уведомление в бота.`,
    selectGame: 'Выберите игру:',
    luckyJetWelcome: `Добро пожаловать в VOXI SIGNAL LUCKY JET
LUCKY JET - это игра, в которой вы должны сделать ставку на увеличивающийся коэффициент перед тем, как ракетка улетит.
Чем дольше вы ждете, тем больше можете выиграть, но если ракетка улетит до того, как вы заберете ставку, вы потеряете.
Наш бот может помочь определить оптимальный момент для ставки!`
  },
  en: {
    welcome: 'Welcome, Voxy_Soft! To use the bot, subscribe to our channel 🤝',
    mainMenu: 'Main Menu:',
    registrationError: '⚠️ Error: Registration not completed! ✦ Be sure to enter the promo code - VIP662 ● You will receive a notification in the bot after registration.',
    instruction: `🤖The bot is based and trained on OpenAI's cluster neural network! 
⚜️30,000 games were played to train the bot 🎰.
Currently, bot users successfully generate 15-25% of their 💸 capital daily!
The bot is still undergoing checks and improvements! The bot's accuracy is 92%!
To achieve maximum profit, follow this instruction:
🟢 1. Register at the 1WIN bookmaker
[If it doesn't open, use a VPN (Sweden). There are many free services in Play Market/App Store, e.g., Vpnify, Planet VPN, Hotspot VPN, etc.!]
      ❗️Without registration and promo code, access to signals will not be granted❗️
🟢 2. Fund your account balance.
🟢 3. Go to the 1win games section and select a game.
🟢 4. Set the number of traps to three. This is important!
🟢 5. Request a signal from the bot and place bets according to the bot's signals.
🟢 6. In case of an unsuccessful signal, we recommend doubling (x²) your bet to fully cover the loss with the next signal.`,
    deposit: `Congratulations on successful registration! 🥳
🌐Step 2 - Make your first deposit.
✦ The larger the deposit, the higher the LEVEL in the bot, and the higher the level, the more high-probability signals you will receive.
● You will receive a notification in the bot after making your first deposit.`,
    selectGame: 'Select a game:',
    luckyJetWelcome: `Welcome to VOXI SIGNAL LUCKY JET
LUCKY JET is a game where you place a bet on an increasing multiplier before the rocket flies away.
The longer you wait, the more you can win, but if the rocket flies away before you cash out, you lose.
Our bot can help determine the optimal moment to bet!`
  }
  // Добавьте переводы для других языков по аналогии
};

// Стартовая команда
bot.start((ctx) => {
  ctx.reply('Please select your language:', 
    Markup.inlineKeyboard(
      Object.entries(languages).map(([code, lang]) => 
        [Markup.button.callback(`${lang.flag} ${lang.name}`, `lang_${code}`)]
      )
    )
  );
});

// Обработка выбора языка
Object.keys(languages).forEach((langCode) => {
  bot.action(`lang_${langCode}`, (ctx) => {
    userState[ctx.from.id] = { lang: langCode, subscribed: false, registered: false, deposited: false };
    ctx.editMessageText(messages[langCode].welcome, 
      Markup.inlineKeyboard([
        [Markup.button.url('Subscribe to channel', 'https://t.me/your_channel')],
        [Markup.button.callback('Check subscription', 'check_sub')]
      ])
    );
  });
});

// Проверка подписки
bot.action('check_sub', async (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  
  try {
    const member = await bot.telegram.getChatMember('@your_channel', userId);
    if (['member', 'administrator', 'creator'].includes(member.status)) {
      userState[userId].subscribed = true;
      showMainMenu(ctx, lang);
    } else {
      ctx.answerCbQuery('Please subscribe to the channel first!');
    }
  } catch (error) {
    ctx.answerCbQuery('Error checking subscription. Try again.');
  }
});

// Показ главного меню
function showMainMenu(ctx, lang) {
  ctx.editMessageText(messages[lang].mainMenu, 
    Markup.inlineKeyboard([
      [Markup.button.callback('Registration', 'register')],
      [Markup.button.callback('Instruction', 'instruction')],
      [Markup.button.callback('Select Language', 'select_lang')],
      [Markup.button.callback('Help', 'help')],
      [Markup.button.callback('Get Signal', 'get_signal')]
    ])
  );
}

// Обработка регистрации
bot.action('register', (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  
  ctx.editMessageText(messages[lang].registrationError, 
    Markup.inlineKeyboard([
      [Markup.button.url('Register', 'https://1win.com/register?promo=VIP662')],
      [Markup.button.callback('Back to Main Menu', 'back_to_menu')]
    ])
  );
});

// Обработка инструкции
bot.action('instruction', (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  
  ctx.editMessageText(messages[lang].instruction, 
    Markup.inlineKeyboard([
      [Markup.button.callback('Back to Main Menu', 'back_to_menu')]
    ])
  );
});

// Выбор языка
bot.action('select_lang', (ctx) => {
  ctx.editMessageText('Please select your language:', 
    Markup.inlineKeyboard(
      Object.entries(languages).map(([code, lang]) => 
        [Markup.button.callback(`${lang.flag} ${lang.name}`, `lang_${code}`)]
      )
    )
  );
});

// Помощь
bot.action('help', (ctx) => {
  ctx.reply('Contact support:', Markup.inlineKeyboard([
    [Markup.button.url('Support', 'https://t.me/Soft1win1')]
  ]));
});

// Получение сигнала
bot.action('get_signal', (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  
  if (!userState[userId]?.registered) {
    ctx.editMessageText(messages[lang].registrationError, 
      Markup.inlineKeyboard([
        [Markup.button.url('Register', 'https://1win.com/register?promo=VIP662')],
        [Markup.button.callback('Back to Main Menu', 'back_to_menu')]
      ])
    );
  } else if (!userState[userId]?.deposited) {
    ctx.editMessageText(messages[lang].deposit, 
      Markup.inlineKeyboard([
        [Markup.button.url('Make Deposit', 'https://1win.com/deposit')],
        [Markup.button.callback('Back to Main Menu', 'back_to_menu')]
      ])
    );
  } else {
    ctx.editMessageText(messages[lang].selectGame, 
      Markup.inlineKeyboard([
        [Markup.button.callback('AVIATOR', 'game_aviator')],
        [Markup.button.callback('LUCKY JET', 'game_luckyjet')],
        [Markup.button.callback('MINES', 'game_mines')]
      ])
    );
  }
});

// Обработка выбора игры Lucky Jet
bot.action('game_luckyjet', (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  
  ctx.editMessageText(messages[lang].luckyJetWelcome, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('Get Signal', `${process.env.APP_URL}/luckyjet.html`)]
    ])
  );
});

// Возврат в главное меню
bot.action('back_to_menu', (ctx) => {
  const userId = ctx.from.id;
  const lang = userState[userId]?.lang || 'en';
  showMainMenu(ctx, lang);
});

// Запуск бота
bot.launch();
console.log('Bot is running...');

// Обработка остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));