import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RegisterCustomerDto } from 'src/modules/auth/customer-auth/customer-auth.dtos';
import { INestApplication } from '@nestjs/common';
import { message } from 'telegraf/filters';
import { CustomerAuthService } from 'src/modules/auth/customer-auth/customer-auth.service';
import { CUSTOMER_BOT_LOGIN_TO_SYSTEM_PREFIX } from 'src/common/constants';
import { CustomerSharedService } from 'src/modules/customer/shared/customer.shared.service';
import { formatCustomerInfoMessage, formatOrderMessage, formatIssueMessage } from './utils';
import { setupWebhook } from "../telegram-utils";
import { CustomerPreviewResponseDto } from 'src/modules/customer/shared/customer.shared.response.dto';
import { OrderSharedService } from 'src/modules/order/shared/order.shared.service';
import { SupportService } from 'src/modules/support/support.service';
import { IssueUserType, IssueStatusText, IssueStatus, Issue} from 'src/modules/support/issue.schema';
import * as moment from 'moment';
import { TelegramNotificationResponseDto } from 'src/common/dtos';
import { Order } from 'src/modules/order/order.schema';

enum MENU_BUTTONS {
  main = '🏠 Главное меню',
  support = 'ℹ️ Поддержка',
  issuesList = '📝 Мои обращения',
  createIssue = 'Создать обращение',
  register = '📲 Зарегистрироваться',
  login = '🏪 Войти',
  activeOrders = 'Актуальные заказы',
  profile = '👤 Мои данные',
};

interface CustomerContext extends Context {
  state: {
    customer?: CustomerPreviewResponseDto | null;
  };
}

@Injectable()
export class TelegramCustomerBotService implements OnModuleInit {
  private bot: Telegraf;

  // Map для отслеживания ожидания кода авторизации сотрудника
  private awaitingCustomerLoginCode: Map<number, boolean> = new Map();
  private awaitingCustomerIssue: Map<number, boolean> = new Map();
  private awaitingChooseIssue: Map<number, boolean> = new Map();

  private async clearMaps() {
    this.awaitingCustomerLoginCode.clear();
    this.awaitingCustomerIssue.clear();
    this.awaitingChooseIssue.clear();
  }
  constructor(
    private readonly configService: ConfigService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly customerSharedService: CustomerSharedService,
    private readonly orderSharedService: OrderSharedService,
    private readonly supportService: SupportService
  ) { 
    const token = this.configService.get<string>('CUSTOMER_BOT_TOKEN');
    if (!token) throw new Error('CUSTOMER_BOT_TOKEN not provided');
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.setupBot();
  }



  public async setApp(app: INestApplication) {
    // Интеграция Telegraf webhook в express NestJS
    app.use('/customer-bot', (req: Request, res: Response, next) => {
      
      if (req.method === 'POST') {
        if (req.body && req.body.update_id) {
          this.bot.handleUpdate(req.body, res);
        } else {
          res.status(400).send('Invalid Telegram update');
        }
      } else {
        res.status(200).send('Customer bot webhook');
      }
    });
    // Устанавливаем webhook с механизмом повторных попыток
    setupWebhook(this.bot, this.configService, 'Customer', '/customer-bot');
  }

  private setupBot() {
    // общее
    this.bot.start(async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.handleStart(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.main, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        this.clearMaps();
        await this.getMainMenu(ctx);
      });
    });



    // работа с поддержкой
    this.bot.hears(MENU_BUTTONS.support, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.getSupportMenu(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.createIssue, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.writeIssue(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.issuesList, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.getIssuesList(ctx);
      });
    });
    this.bot.hears(/^❓ Обращение от (\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}) - ([А-Яа-я\s]+) \(ID: ([a-f0-9]{24})\)$/, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        const telegramId = ctx.state.customer!.telegramId;
        if (!this.awaitingChooseIssue.get(telegramId)) return;
        const issueId = (ctx.message as any).text.match(/^❓ Обращение от (\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}) - ([А-Яа-я\s]+) \(ID: ([a-f0-9]{24})\)$/)[3];
        await this.getFullIssue(ctx, issueId);
        this.clearMaps();
      });
    });


    // работа с данными
    this.bot.hears(MENU_BUTTONS.profile, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.getCustomerInfo(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.activeOrders, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.getCustomerActiveOrders(ctx);
      });
    });



    // работа с авторизациями
    this.bot.hears(MENU_BUTTONS.register, async (ctx) => {
      await this.handleContactRequest(ctx);
    });
    this.bot.on(message('contact'), async (ctx) => {
      await this.handleCustomerRegister(ctx);
    });
    this.bot.hears(MENU_BUTTONS.login, async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        await this.askLoginCode(ctx);
      });
    });


    // Общий обработчик текстовых сообщений для кода авторизации и изменений
    this.bot.on(message('text'), async (ctx) => {
      await this.checkCustomerExists(ctx, async (ctx: CustomerContext) => {
        const telegramId = ctx.state.customer!.telegramId;
        // работа с авторизацией
        if (this.awaitingCustomerLoginCode.get(telegramId)) {
          const code = (ctx.message as any).text;
          await this.handleLogin(ctx, code);
          return;
        }
        if (this.awaitingCustomerIssue.get(telegramId)) {
          const message = (ctx.message as any).text;
          await this.sendIssueToSupport(ctx, message);
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
  private async checkCustomerExists(ctx: Context, next: (ctx: CustomerContext) => Promise<void>) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await ctx.reply('Ошибка: не найден Telegram ID пользователя.');

    const customer = await this.customerSharedService.getCustomerByTelegramId(telegramId);
    if (!customer) {
      await ctx.replyWithMarkdown(
`
*Fruktgo* — свежие фрукты, орехи, овощи от более 120 магазинов 🍓  
🚚 Быстрая доставка | 🛒 Качественные продукты | 📍 Локальные магазины  
👉 Нажмите на «📲 Зарегистрироваться», чтобы начать
`,
        Markup.keyboard([
          [MENU_BUTTONS.register],
        ]).resize().oneTime(false)
      );
      return;
    }
    // Можно сохранить employee в ctx.state для дальнейшего использования
    (ctx.state as any).customer = customer;
    await next(ctx as CustomerContext);
  }
  private async handleStart(ctx: CustomerContext) {
    if (!ctx.message || typeof (ctx.message as any).text !== 'string') return await this.getMainMenu(ctx);
    
    const messageText = (ctx.message as any).text;
    const [command, payload] = messageText.split(' ');

    if (payload) {
      const [action, code] = payload.split('_');
      if (action === CUSTOMER_BOT_LOGIN_TO_SYSTEM_PREFIX && code) {
        await this.handleLogin(ctx, code);
        return;
      }
      await ctx.reply(`Получен неизвестный payload: ${payload}`, Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      return;
    }
    
    await this.getMainMenu(ctx);
  }
  private async getMainMenu(ctx: CustomerContext) {
    return await ctx.reply(
      'Выберите действие:',
      Markup.keyboard([
        [MENU_BUTTONS.login],
        [MENU_BUTTONS.activeOrders],
        [MENU_BUTTONS.profile],
        [MENU_BUTTONS.support],
      ])
        .resize()
        .oneTime(false)
    );
  }

  // работа с данными
  private async getCustomerInfo(ctx: CustomerContext) {
    const customerInfo = ctx.state.customer!;
    const message = formatCustomerInfoMessage(customerInfo);

    await ctx.replyWithMarkdown(message, {
      reply_markup: {
        keyboard: [[MENU_BUTTONS.main]],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }
  private async getCustomerActiveOrders(ctx: CustomerContext) {
    const telegramId = ctx.state.customer!.telegramId;
    try {
      const orders = await this.orderSharedService.getActiveOrderForCustomerBot(telegramId);
      if (orders.length === 0) return await ctx.reply('У вас нет активных заказов.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      
      for (const order of orders) {
        await ctx.replyWithMarkdown(formatOrderMessage(order));
      }
      await ctx.reply('Выберите действие:', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    } catch (error) {
      console.error('Ошибка при получении активных заказов:', error);
      await ctx.reply('Ошибка при получении активных заказов. Пожалуйста, попробуйте снова.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    }
  }


  // работа с поддержкой
  private async getSupportMenu(ctx: CustomerContext) {
    await ctx.reply('Выберите действие:', {reply_markup: {keyboard: [[MENU_BUTTONS.issuesList, MENU_BUTTONS.createIssue, MENU_BUTTONS.main]]}});
  }
  private async writeIssue(ctx: CustomerContext) {
    const telegramId = ctx.state.customer!.telegramId;
    this.clearMaps();
    this.awaitingCustomerIssue.set(telegramId, true);

    await ctx.replyWithMarkdown(`
📨 Напишите свой вопрос — мы передадим его в поддержку.  
⌛ Обычно отвечаем в течение 15–30 минут в рабочее время.
`, {reply_markup: {remove_keyboard: true}});
  }
  private async getIssuesList(ctx: CustomerContext) {
    const customerId = ctx.state.customer!.customerId;
    const telegramId = ctx.state.customer!.telegramId;
    const issues = await this.supportService.getCustomerIssues(customerId);
    
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
  private async getFullIssue(ctx: CustomerContext, issueId: string) {
    const customerId = ctx.state.customer!.customerId;

    try {
      const issue = await this.supportService.getCustomerIssue(customerId, issueId);
      if (!issue) return await ctx.reply('Ошибка: не удалось найти обращение.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      
      // Форматируем сообщение и отправляем пользователю
      const formattedMessage = formatIssueMessage(issue);
      await ctx.replyWithMarkdown(formattedMessage, {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    } catch (error) {
      console.error('Ошибка при получении детальной информации об обращении:', error);
      await ctx.reply('Произошла ошибка при получении информации об обращении. Пожалуйста, попробуйте позже.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    }
  }
  private async sendIssueToSupport(ctx: CustomerContext, issueText: string) {
    const telegramId = ctx.state.customer!.telegramId;
    const customerId = ctx.state.customer!.customerId;
    try {
      await this.supportService.createIssueToSupport(customerId, IssueUserType.CUSTOMER, telegramId, issueText);
      await ctx.reply('Спасибо! Ваш запрос передан в поддержку. Скоро мы с вами свяжемся!', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
    } catch (error) {
      console.error('Ошибка при отправке запроса в поддержку:', error);
      await ctx.reply('Ошибка при отправке запроса в поддержку. Пожалуйста, попробуйте снова.', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      return;
    }
    this.clearMaps();
  }


  // работа с авторизацией
  //// Регистрация
  private async handleContactRequest(ctx: Context) {
    //TODO: добавить ссылки на документы
    await ctx.replyWithMarkdown(
`
Пожалуйста, отправьте свои данные для регистрации.
Продолжая регистрацию, вы:

✅ *даёте согласие на обработку персональных данных*  
✅ *подтверждаете ознакомление с* [Политикой конфиденциальности](#)  
✅ *принимаете условия* [Пользовательского соглашения](#)
`,
      Markup.keyboard([Markup.button.contactRequest('📞 Отправить номер телефона'),]).resize()
    );
  }
  private async handleCustomerRegister(ctx: Context) {
    if (!ctx.message || !('contact' in ctx.message) || !ctx.from) return;
    const contact = (ctx.message as any).contact;
    const telegramUser = ctx.from;

    const dto: RegisterCustomerDto = {
      phone: contact.phone_number,
      telegramId: telegramUser.id,
      telegramUsername: telegramUser.username ?? '',
      telegramFirstName: telegramUser.first_name ?? '',
      telegramLastName: telegramUser.last_name ?? '',
      customerName: telegramUser.first_name + ' ' + (telegramUser.last_name ?? ''),
    };
    try {
      const result = await this.customerAuthService.registerViaTelegram(dto);
      await ctx.reply('✅ Регистрация завершена.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (error) {
      if (error instanceof BadRequestException) await ctx.reply(`⚠️ Ошибка: ${error.message}`);
      else {
        console.error(error);
        await ctx.reply('❌ Не удалось зарегистрироваться.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      }
    }
  }
  //// Авторизация
  private async askLoginCode(ctx: CustomerContext) {
    const telegramId = ctx.state.customer!.telegramId;
    this.awaitingCustomerLoginCode.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите код авторизации:', {reply_markup: {remove_keyboard: true}});
  }
  private async handleLogin(ctx: Context, code: string) {
    const telegramId = ctx.state.customer!.telegramId;
    try {
      const customer = await this.customerAuthService.confirmLoginCode(telegramId, code);
      //TODO: разкомментировать на проде
      // await ctx.reply('✅ Авторизация подтверждена. Можете вернуться к интерфейсу.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      await ctx.reply(customer.token);
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Не удалось подтвердить вход. Возможно, код устарел', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    }
    this.clearMaps();
  }




  // ====================================================
  // PUBLIC METHODS
  // ====================================================

  async notifyCustomer(telegramId: number, message: string, options?: {reply_markup?: any}): Promise<TelegramNotificationResponseDto> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, options);
      return {message: 'Сообщение отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения покупателю ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }

  async notifyCustomerAboutOrderUpdate(telegramId: number, order: Order): Promise<TelegramNotificationResponseDto> {
    try {
      await this.bot.telegram.sendMessage(telegramId, formatOrderMessage(order, {isUpdated: true}));
      return {message: 'Сообщение об обновлении заказа отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения об обновлении заказа покупателю ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения об обновлении заказа', error: error.message};
    }
  }

  async notifyCustomerAboutIssueUpdate(telegramId: number, issue: Issue): Promise<TelegramNotificationResponseDto> {
    try {
      await this.bot.telegram.sendMessage(telegramId, formatIssueMessage(issue, {isUpdated: true}));
      return {message: 'Сообщение об обновлении обращения отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения об обновлении обращения покупателю ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения об обновлении обращения', error: error.message};
    }
  }
}
