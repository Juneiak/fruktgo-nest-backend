import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { SellerAuthService } from 'src/modules/auth/seller-auth/seller-auth.service';
import { INestApplication } from '@nestjs/common';
import { RegisterSellerDto } from 'src/modules/auth/seller-auth/seller-auth.dtos';
import { SellerSharedService } from 'src/modules/seller/seller.shared.service';
import {
  SELLER_BOT_LOGIN_TO_SELLER_DASHBOARD_PREFIX, SELLER_BOT_LOGIN_TO_SHOP_PREFIX} from 'src/common/constants';
import { Seller } from 'src/modules/seller/seller.schema';
import { setupWebhook } from "../telegram-utils";
import { ShiftSharedService } from 'src/modules/shop/shift/shared/shift.shared.service';
import { SupportService } from 'src/modules/support/support.service';
import {IssueUserType, IssueStatusText, IssueStatus, Issue} from 'src/modules/support/issue.schema';
import * as moment from 'moment';
import { TelegramNotificationResponseDto } from 'src/common/dtos';
import { Shift } from 'src/modules/shop/shift/shift.schema';
import { formatIssueMessage, formatShiftMessage } from './utils';
import { message } from 'telegraf/filters';
     
enum MENU_BUTTONS {
  main = '🏠 Главное меню',
  support = 'ℹ️ Поддержка',
  issuesList = '📝 Мои обращения',
  createIssue = 'Создать обращение',
  loginToSellerDashboard = 'Войти в систему продавца',
  loginToShop = 'Войти в магазин',
  register = '📲 Зарегистрироваться',
  shops = 'Мои магазины',
  activeShifts = 'Активные смены',

  helloRuslan = 'Привет, Руслан!',
};

interface SellerContext extends Context {
  state: {
    seller?: Seller | null;
  };
}

@Injectable()
export class TelegramSellerBotService implements OnModuleInit {
  private bot: Telegraf;
  private tempShopLoginCodes = new Map<number, { code: string }>();
  
  // Map для отслеживания ожидания 
  private awaitingSellerLoginCode: Map<number, boolean> = new Map();
  private awaitingShopLoginCode: Map<number, boolean> = new Map();
  private awaitingSellerIssue: Map<number, boolean> = new Map();
  private awaitingChooseIssue: Map<number, boolean> = new Map();

  private async clearMaps() {
    this.awaitingSellerLoginCode.clear();
    this.awaitingShopLoginCode.clear();
    this.awaitingSellerIssue.clear();
    this.awaitingChooseIssue.clear();
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly sellerAuthService: SellerAuthService,
    private readonly sellerSharedService: SellerSharedService,
    private readonly shiftSharedService: ShiftSharedService,
    private readonly supportService: SupportService
  ) {
    const token = this.configService.get<string>('SELLER_BOT_TOKEN');
    if (!token) throw new Error('SELLER_BOT_TOKEN not provided');
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.setupBot();
  }



  public async setApp(app: INestApplication) {
    // Интеграция Telegraf webhook в express NestJS
    app.use('/seller-bot', (req: Request, res: Response, next) => {
      
      if (req.method === 'POST') {
        if (req.body && req.body.update_id) {
          this.bot.handleUpdate(req.body, res);
        } else {
          res.status(400).send('Invalid Telegram update');
        }
      } else {
        res.status(200).send('Seller bot webhook');
      }
    });

    // Устанавливаем webhook с механизмом повторных попыток
    setupWebhook(this.bot, this.configService, 'Seller', '/seller-bot');
  }

  private setupBot() {
    // общее
    this.bot.start(async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        await this.handleStart(ctx);
      });
    });
    
    this.bot.hears(MENU_BUTTONS.main, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        this.clearMaps();
        this.tempShopLoginCodes.clear();
        await this.getMainMenu(ctx);
      });
    });




    // работа с поддержкой
      this.bot.hears(MENU_BUTTONS.support, async (ctx) => {
        await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
          await this.getSupportMenu(ctx);
        });
      });

      this.bot.hears(MENU_BUTTONS.createIssue, async (ctx) => {
        await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
          await this.writeIssue(ctx);
        });
      });

      this.bot.hears(MENU_BUTTONS.issuesList, async (ctx) => {
        await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
          await this.getIssuesList(ctx);
        });
      });

      this.bot.hears(/^❓ Обращение от (\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}) - ([А-Яа-я\s]+) \(ID: ([a-f0-9]{24})\)$/, async (ctx) => {
        await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
          const telegramId = ctx.state.seller!.telegramId;
          if (!this.awaitingChooseIssue.get(telegramId)) return;
          const issueId = (ctx.message as any).text.match(/^❓ Обращение от (\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}) - ([А-Яа-я\s]+) \(ID: ([a-f0-9]{24})\)$/)[3];
          await this.getFullIssue(ctx, issueId);
          this.clearMaps();
        });
      });




    // авторизация
    //// Зарегистрироваться
    this.bot.hears(MENU_BUTTONS.register, async (ctx) => {
      await this.handleSellerRegister(ctx);
    });

    this.bot.on(message('contact'), async (ctx) => {
      await this.handleContact(ctx);
    });

    //// вход в дашборд селлера по коду
    this.bot.hears(MENU_BUTTONS.loginToSellerDashboard, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        await this.hendleWriteCodeToLoginToSellerDashboard(ctx);
      });
    });

    //// вход в магазин по коду
    this.bot.hears(MENU_BUTTONS.loginToShop, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        await this.hendleWriteCodeToLoginToShop(ctx);
      });
    });

    //// выбор магазина для входа
    this.bot.hears(/^📍 (.+)#([a-f0-9]{24})$/, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        const shopId = (ctx.message as any).text.match(/^📍 (.+)#([a-f0-9]{24})$/)[2];
        await this.handleShopLogin(ctx, shopId);
      });
    });




    // работа с данными
    this.bot.hears(MENU_BUTTONS.shops, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        await this.getSellerShopsList(ctx);
      });
    });

    this.bot.hears(MENU_BUTTONS.activeShifts, async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        await this.getSellerActiveShifts(ctx);
      });
    })




    // Общий обработчик текстовых сообщений для обоих типов кодов
    this.bot.on(message('text'), async (ctx) => {
      await this.checkSellerExists(ctx, async (ctx: SellerContext) => {
        const telegramId = (ctx.state.seller!.telegramId);

        if (this.awaitingSellerLoginCode.get(telegramId)) {
          const code = (ctx.message as any).text;
          await this.handleLoginToSellerDashboard(ctx, code);
          this.clearMaps();
          return;
        }
      
        // Проверка кода магазина
        if (this.awaitingShopLoginCode.get(telegramId)) {
          const code = (ctx.message as any).text;
          await this.handleShopSelectToLogin(ctx, code);
          this.clearMaps();
          return;
        }

        if (this.awaitingSellerIssue.get(telegramId)) {
          const issueText = (ctx.message as any).text;
          await this.sendIssueToSupport(ctx, issueText);
          this.clearMaps();
          return;
        }

        await ctx.reply('Команда не распознана', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      });
    });
  }


  // ====================================================
  // PRIVATE METHODS
  // ====================================================

  // общее
  private async checkSellerExists(ctx: Context, next: (ctx: SellerContext) => Promise<void>) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await ctx.reply('Ошибка: не найден Telegram ID пользователя.');
    const seller = await this.sellerSharedService.getSellerByTelegramId(telegramId);
    if (!seller) {
      await ctx.replyWithMarkdown(
`
*Продавайте больше с Fruktgo!*  
Маркетплейс для фруктовых лавок, которым доверяют.

🍊 120+ продавцов уже с нами — от частных лавок до сетей

🚚 Мы берём на себя онлайн-продажи, оплату и доставку

📈 Помогаем зарабатывать больше:
  • +22% к обороту уже в первый месяц
  • +15% к среднему чеку благодаря платёжеспособной аудитории
  • -10% к списаниям за счёт прогнозов спроса
_По данным действующих продавцов на платформе_

📱 Удобное управление: Telegram + личный кабинет
🔒 Без скрытых комиссий и с полной поддержкой

⏳ *Каждый день без Fruktgo — это недополученные клиенты*

👉 Нажмите «📲 Зарегистрироваться» и подключите свой магазин за 5 минут
`,
        Markup.keyboard([
          [MENU_BUTTONS.register],
        ]).resize().oneTime(false)
      );
      return;
    }
    // Можно сохранить employee в ctx.state для дальнейшего использования
    (ctx.state as any).seller = seller;
    await next(ctx as SellerContext);
  }

  private async handleStart(ctx: SellerContext) {
    const telegramId = ctx.state.seller!.telegramId;
    if (!ctx.message || typeof (ctx.message as any).text !== 'string') return await this.getMainMenu(ctx);
    
    const messageText = (ctx.message as any).text;
    const [command, payload] = messageText.split(' ');

    console.log(payload);
    
    if (payload) {
      const [action, code] = payload.split('_');
      if (action === SELLER_BOT_LOGIN_TO_SELLER_DASHBOARD_PREFIX && code) {
        await this.handleLoginToSellerDashboard(ctx, code);
        return;
      }

      if (action === SELLER_BOT_LOGIN_TO_SHOP_PREFIX && code) {
        await this.handleShopSelectToLogin(ctx, code);
        return;
      }
    }
    
    if (this.awaitingSellerIssue.get(telegramId)) {
      const issueText = (ctx.message as any).text;
      await this.sendIssueToSupport(ctx, issueText);
      return;
    }

    await ctx.reply('❌ Неизвестная команда. Проверьте QR-код.', Markup.keyboard([[MENU_BUTTONS.main]]));
  }

  private async getMainMenu(ctx: SellerContext) {
    return await ctx.reply(
      'Выберите действие:',
      Markup.keyboard([
        [MENU_BUTTONS.shops],
        [MENU_BUTTONS.activeShifts],
        [MENU_BUTTONS.loginToSellerDashboard],
        [MENU_BUTTONS.loginToShop],
        [MENU_BUTTONS.support],
      ])
        .resize()
        .oneTime(false)
    );
  }

  // авторизации
  //// рега селлера
  private async handleSellerRegister(ctx: Context) {
    await ctx.reply(
      'Пожалуйста, отправьте свой номер телефона для регистрации.',
      Markup.keyboard([
        Markup.button.contactRequest('📞 Отправить номер телефона'),
      ]).resize()
    );
  }

  private async handleContact(ctx: Context) {
    const message = ctx.message as { contact?: any };
    const contact = message.contact;
    const telegramUser = ctx.from;

    if (!contact || !telegramUser) return;

    const dto: RegisterSellerDto = {
      phone: contact.phone_number,
      telegramId: telegramUser.id,
      telegramUsername: telegramUser.username ?? '',
      telegramFirstName: telegramUser.first_name ?? '',
      telegramLastName: telegramUser.last_name ?? '',
    };

    try {
      const result = await this.sellerAuthService.registerSellerViaTelegram(dto);
      await ctx.reply('✅ Регистрация завершена.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (error) {
      if (error instanceof BadRequestException) await ctx.reply(`⚠️ Ошибка: ${error.message}`);
      else {
        console.error(error);
        await ctx.reply('❌ Неизвестная ошибка при регистрации.');
      }
    }
    await this.getMainMenu(ctx);
  }

  //// в дашборд селлера
  private async hendleWriteCodeToLoginToSellerDashboard(ctx: SellerContext) {
    const telegramId = (ctx.state.seller!.telegramId);
    this.clearMaps();
    this.awaitingSellerLoginCode.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите код авторизации продавца:', {reply_markup: {remove_keyboard: true}});
  }

  private async handleLoginToSellerDashboard(ctx: SellerContext, code: string) {
    const telegramId = (ctx.state.seller!.telegramId);
    try {
      const seller = await this.sellerAuthService.confirmLoginSellerCode(code, telegramId);
      //TODO: разкомментировать на проде
      // await ctx.reply('✅ Вход в дашборд продавца подтверждён.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
      await ctx.reply(seller.token, Markup.keyboard([[MENU_BUTTONS.main],]).resize());
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Ошибка при подтверждении входа в дашборд.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
    }
    this.clearMaps();
  }

  //// в дашборд магазина
  private async hendleWriteCodeToLoginToShop(ctx: SellerContext) {
    const telegramId = (ctx.state.seller!.telegramId);
    this.clearMaps();
    this.awaitingShopLoginCode.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите код авторизации магазина:', {reply_markup: {remove_keyboard: true}});
  }

  private async handleShopSelectToLogin(ctx: SellerContext, code: string) {
    const telegramId = (ctx.state.seller!.telegramId);
    
    const shops = await this.sellerSharedService.getSellerShopsByTelegramId(telegramId);
    if (!shops || shops.length === 0) return await ctx.reply('❌ У вас нет доступных магазинов.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
    
    this.tempShopLoginCodes.set(telegramId, { code });

    await ctx.reply('Выберите магазин для входа:', Markup.keyboard(
      shops.map(shop => [`📍 ${shop.shopName}#${shop._id.toString()}`])
    ).resize());
  }

  private async handleShopLogin(ctx: SellerContext, shopId: string) {
    const telegramId = (ctx.state.seller!.telegramId);

    const shopLoginData = this.tempShopLoginCodes.get(telegramId);
    if (!shopLoginData) return await ctx.reply('❌ Не найден активный код входа.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());

    try {
      const shop = await this.sellerAuthService.confirmLoginCodeForShop(shopLoginData.code, telegramId, shopId);
      this.tempShopLoginCodes.delete(telegramId);

      //TODO: разкомментировать на проде
      // await ctx.reply('✅ Вход в магазин подтверждён. Можете вернуться в дашборд.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
      await ctx.reply(shop.token);
    } catch (error) {
        console.error(error);
        this.tempShopLoginCodes.delete(telegramId);
        await ctx.reply('❌ Не удалось подтвердить вход. Возможно, код устарел или вы не привязаны к магазину.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
      }
      this.clearMaps();
  }




  // работа с поддержкой
  private async getSupportMenu(ctx: SellerContext) {
    await ctx.reply('Выберите действие:', {reply_markup: {keyboard: [[MENU_BUTTONS.issuesList, MENU_BUTTONS.createIssue, MENU_BUTTONS.main]]}});
  }

  private async writeIssue(ctx: SellerContext) {
    const telegramId = ctx.state.seller!.telegramId;
    this.clearMaps();
    this.awaitingSellerIssue.set(telegramId, true);

    await ctx.replyWithMarkdown(`
📨 Напишите свой вопрос — мы передадим его в поддержку.  
⌛ Обычно отвечаем в течение 15–30 минут в рабочее время.
`, {reply_markup: {remove_keyboard: true}});
  }
  
  private async getIssuesList(ctx: SellerContext) {
    const sellerId = ctx.state.seller!.sellerId;
    const telegramId = ctx.state.seller!.telegramId;
    const issues = await this.supportService.getSellerIssues(sellerId);
    
    if (issues.length === 0) return await ctx.reply('У вас нет активных обращений.', {reply_markup: {keyboard: [[MENU_BUTTONS.createIssue, MENU_BUTTONS.main]]}});
    
    const issueButtons = issues.map(issue => {
      const date = new Date(issue.createdAt);
      const formattedDate = moment(date).format('DD.MM.YY');
      return [`❓ Обращение от ${formattedDate} - ${IssueStatusText[issue.status || IssueStatus.NEW]} (ID: ${issue.issueId})`]
    });
    
    this.clearMaps();
    this.awaitingChooseIssue.set(telegramId, true);
    issueButtons.push([MENU_BUTTONS.main]);
    await ctx.reply('Выберите обращение:', {reply_markup: {keyboard: issueButtons}});
  }

  private async getFullIssue(ctx: SellerContext, issueId: string) {
    const sellerId = ctx.state.seller!.sellerId;

    try {
      const issue = await this.supportService.getSellerIssue(sellerId, issueId);
      if (!issue) return await ctx.reply('Ошибка: не удалось найти обращение.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      
      // Форматируем сообщение и отправляем пользователю
      const formattedMessage = formatIssueMessage(issue);
      await ctx.replyWithMarkdown(formattedMessage, {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    } catch (error) {
      console.error('Ошибка при получении детальной информации об обращении:', error);
      await ctx.reply('Произошла ошибка при получении информации об обращении. Пожалуйста, попробуйте позже.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    }
  }

  private async sendIssueToSupport(ctx: SellerContext, issueText: string) {
    const telegramId = ctx.state.seller!.telegramId;
    const sellerId = ctx.state.seller!.sellerId;
    try {
      await this.supportService.createIssueToSupport(sellerId, IssueUserType.SELLER, telegramId, issueText);
      await ctx.reply('Спасибо! Ваш запрос передан в поддержку. Скоро мы с вами свяжемся!', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    } catch (error) {
      console.error('Ошибка при отправке запроса в поддержку:', error);
      await ctx.reply('Ошибка при отправке запроса в поддержку. Пожалуйста, попробуйте снова.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      return;
    }
    this.clearMaps();
  }




  // работа с данными
  private async getSellerShopsList(ctx: SellerContext) {
    const telegramId = (ctx.state.seller!.telegramId);
    try {
      const shops = await this.sellerSharedService.getSellerShopsByTelegramId(telegramId);
      if (!shops || shops.length === 0) return await ctx.reply('❌ У вас нет доступных магазинов.');

      await ctx.reply('Выберите магазин:', Markup.keyboard(
        shops.map(shop => [`📍 ${shop.shopName} #${shop._id.toString()}`])
      ).resize());
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Не удалось получить список магазинов.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
    }
  }

  private async getSellerActiveShifts(ctx: SellerContext) {
    const telegramId = (ctx.state.seller!.telegramId);
    try {
      const activeShifts = await this.shiftSharedService.getSellerActiveShiftsByTelegramId(telegramId);
      if (!activeShifts || activeShifts.length === 0) return await ctx.reply('❌ У вас нет активных смен.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());

      for (const shift of activeShifts) {
        const msg = [
          `⏰ Смена #${shift.shiftId}`,
          `Магазин: ${shift.shop.shopName || shift.shop || '—'}`,
          `Открыта: ${shift.openedAt ? new Date(shift.openedAt).toLocaleString('ru-RU') : '—'}`,
          `Открыл: ${shift.openedBy?.employeeName || '—'}`,
          `Заказов: ${shift.statistics?.ordersCount ?? 0}`,
        ].join('\n');
        await ctx.reply(msg);
      }
      // Можно оставить клавиатуру для возврата в меню
      await ctx.reply('Для возврата используйте меню.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Не удалось получить список активных смен.', Markup.keyboard([[MENU_BUTTONS.main],]).resize());
    }
  }


  // ====================================================
  // PUBLIC METHODS
  // ====================================================

  async notifySeller(telegramId: number, message: string, options?: {reply_markup?: any}): Promise<TelegramNotificationResponseDto> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, options);
      console.log(`✅ Сообщение отправлено продавцу ${telegramId}`);
      return {message: 'Сообщение отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения продавцу ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }

  async notifySellerAboutShiftUpdate(telegramId: number, shift: Shift, haveOpened: boolean): Promise<TelegramNotificationResponseDto> {
    const prepperedMessage = `${formatShiftMessage(shift, haveOpened)}`;
    
    try {
      await this.notifySeller(telegramId, prepperedMessage);
      return {message: 'Уведомление отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения продавцу ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }

  async notifySellerAboutIssueUpdate(telegramId: number, issue: Issue): Promise<TelegramNotificationResponseDto> {
    const prepperedMessage = `${formatIssueMessage(issue)}`;
    
    try {
      await this.notifySeller(telegramId, prepperedMessage);
      return {message: 'Уведомление отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения продавцу ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }

}