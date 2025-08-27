import { Injectable, OnModuleInit, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EmployeeAuthService } from 'src/modules/auth/employee-auth/employee-auth.service';
import { RegisterEmployeeDto } from 'src/modules/auth/employee-auth/employee-auth.dtos';
import { INestApplication } from '@nestjs/common';
import { message } from 'telegraf/filters';
import { EmployeeForEmployeeService } from 'src/modules/employee/for-employee/employee-for-employee.service';
import { formatEmployeeInfoMessage, formatEmployeeAvatar, formatNewOrderMessage } from './utils';
import { EmployeeForEmployeeTelegramBotResponseDto } from 'src/modules/employee/for-employee/employee-for-employee.dtos';
import { EMPLOYEE_BOT_LOGIN_TO_SHOP_PREFIX } from 'src/common/constants';
import { TelegramNotificationResponseDto } from 'src/common/dtos';
import { Order } from 'src/modules/order/order.schema';
import {RequestToEmployeeStatus} from 'src/modules/employee/schemas/request-to-employee.schema'
import {EmployeeLoginCode} from 'src/modules/auth/employee-auth/employee-login-code.schema'
import { setupWebhook } from "../telegram-utils"

enum MENU_BUTTONS {
  main = '🏠 Главное меню',
  edit = '🔧 Изменить',
  leaveTheSeller = '❌ Открепится от компании',
  leaveConfirm = '❌ Подтвердить открепление',
  help = 'ℹ️ Помощь',
  loginToShop = '🏪 Войти в магазин',
  profile = '👤 Мои данные',
  register = '📲 Зарегистрироваться',
  requests = 'Запросы',
  acceptRequest = '✅ Принять',
  rejectRequest = '❌ Отклонить',

  loginToShopAccept = '✅ Войти',
  loginToShopReject = '❌ Это не я',
};

enum EDIT_BUTTONS {
  name = 'Имя',
  avatar = 'Аватар'
}

interface EmployeeContext extends Context {
  state: {
    employee?: EmployeeForEmployeeTelegramBotResponseDto | null;
  };
}


@Injectable()
export class TelegramEmployeeBotService implements OnModuleInit {
  private bot: Telegraf;

  // Map для отслеживания ожидания кода авторизации сотрудника
  private awaitingEmployeeLoginToShopCode: Map<number, boolean> = new Map();
  private awaitingEmployeeEditName: Map<number, boolean> = new Map();
  private awaitingEmployeeEditAvatar: Map<number, boolean> = new Map();
  private awaitingChoosingEmployeeRequestId: Map<number, boolean> = new Map();
  private awaitingRequestChangeStatus: Map<number, {requestId: string}> = new Map();

  private awaitingEmployeeAnswerToLoginToShop: Map<number, EmployeeLoginCode> = new Map();

  private async clearMaps() {
    this.awaitingEmployeeLoginToShopCode.clear();
    this.awaitingEmployeeEditName.clear();
    this.awaitingEmployeeEditAvatar.clear();
    this.awaitingChoosingEmployeeRequestId.clear();
    this.awaitingRequestChangeStatus.clear();

    this.awaitingEmployeeAnswerToLoginToShop.clear();
  }
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EmployeeAuthService))
    private readonly employeeAuthService: EmployeeAuthService,
    private readonly employeeForEmployeeService: EmployeeForEmployeeService
  ) {
    const token = this.configService.get<string>('EMPLOYEE_BOT_TOKEN');
    if (!token) throw new Error('EMPLOYEE_BOT_TOKEN not provided');
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.setupBot();
  }



  public async setApp(app: INestApplication) {
    // Интеграция Telegraf webhook в express NestJS
    app.use('/employee-bot', (req: Request, res: Response, next) => {
      
      if (req.method === 'POST') {
        if (req.body && req.body.update_id) {
          this.bot.handleUpdate(req.body, res);
        } else {
          res.status(400).send('Invalid Telegram update');
        }
      } else {
        res.status(200).send('Employee bot webhook');
      }
    });
    
    // Устанавливаем webhook с механизмом повторных попыток
    setupWebhook(this.bot, this.configService, 'Employee', '/employee-bot');
  }

  private setupBot() {
    // общее
    this.bot.start(async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.handleStart(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.main, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        this.clearMaps();
        await this.getMainMenu(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.help, (ctx) => {
      ctx.reply('Для регистрации нажмите на "📲 Зарегистрироваться" и отправьте ваш номер телефона.');
    });



    // работа с авторизациями
    this.bot.hears(MENU_BUTTONS.register, async (ctx) => {
      await this.handleContactRequest(ctx);
    });
    this.bot.on(message('contact'), async (ctx) => {
      await this.handleEmployeeRegister(ctx);
    });
    this.bot.hears(MENU_BUTTONS.loginToShop, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.askEmployeeLoginToShop(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.loginToShopAccept, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.handleAcceptLoginToShop(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.loginToShopReject, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.handleRejectLoginToShop(ctx);
      });
    });



    // работа с запросами
    this.bot.hears(MENU_BUTTONS.requests, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.getRequests(ctx);
      });
    });
    this.bot.hears(/^📍 (.+)#(.+)$/, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        const requestId = (ctx.message as any).text.match(/^📍 (.+)#(.+)$/)[2];
        await this.chooseRequest(ctx, requestId);
      });
    });
    this.bot.hears(MENU_BUTTONS.acceptRequest, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.changeRequestStatus(ctx, RequestToEmployeeStatus.ACCEPTED);
      });
    });
    this.bot.hears(MENU_BUTTONS.rejectRequest, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.changeRequestStatus(ctx, RequestToEmployeeStatus.REJECTED);
      });
    });

    

    // работа с данными
    this.bot.hears(MENU_BUTTONS.profile, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.getEmployeeInfo(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.edit, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.getEditMenu(ctx);
      });
    });
    this.bot.hears(EDIT_BUTTONS.name, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.askEditName(ctx);
      });
    });
    this.bot.hears(EDIT_BUTTONS.avatar, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.askEditAvatar(ctx);
      });
    });



    // работа с откреплением от компании
    this.bot.hears(MENU_BUTTONS.leaveTheSeller, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.getLeaveTheSellerMenu(ctx);
      });
    });
    this.bot.hears(MENU_BUTTONS.leaveConfirm, async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        await this.confirmLeaveTheSeller(ctx);
      });
    });



    // Общий обработчик текстовых сообщений для кода авторизации и изменений
    this.bot.on(message('text'), async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        const telegramId = ctx.state.employee!.telegramId;
        // работа с авторизацией
        if (this.awaitingEmployeeLoginToShopCode.get(telegramId)) {
          const code = (ctx.message as any).text;
          await this.handleLoginToShop(ctx, code);
          return;
        }
      
        // Проверка изменения имени
        if (this.awaitingEmployeeEditName.get(telegramId)) {
          const name = (ctx.message as any).text;
          await this.handleEditName(ctx, name);
          return;
        }

        await ctx.reply('Команда не распознана', {reply_markup: {keyboard: [[MENU_BUTTONS.main]]}});
      });
    });

    // работа с аватаром
    this.bot.on('photo', async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        const telegramId = ctx.state.employee!.telegramId;        
        // Проверка изменения аватара
        if (this.awaitingEmployeeEditAvatar.get(telegramId)) {
          if (ctx.message && 'photo' in ctx.message) {
            // Берем последнее фото из массива - оно с наибольшим разрешением
            const photoArray = ctx.message.photo;
            const biggestPhoto = photoArray[photoArray.length - 1];
            const fileId = biggestPhoto.file_id;
            await this.handleEditAvatar(ctx, fileId);
            
            // Сбрасываем ожидание фото после обработки
            this.awaitingEmployeeEditAvatar.delete(telegramId);
          } else {
            console.error('Не удалось получить фото из сообщения');
            await ctx.reply('Ошибка при обработке фото. Попробуйте еще раз.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
          }
          return;
        } else console.log('Получено фото, но не ожидалось аватара.');
      });
    });
    this.bot.on('document', async (ctx) => {
      await this.checkEmployeeExists(ctx, async (ctx: EmployeeContext) => {
        const telegramId = ctx.state.employee!.telegramId;        
        // Проверка изменения аватара
        if (this.awaitingEmployeeEditAvatar.get(telegramId)) {
          if (ctx.message && 'document' in ctx.message) {
            const doc = ctx.message.document;
            
            // Проверяем, что это изображение
            if (doc.mime_type && doc.mime_type.startsWith('image/')) {
              const fileId = doc.file_id;
              await this.handleEditAvatar(ctx, fileId);
              
              // Сбрасываем ожидание фото после обработки
              this.awaitingEmployeeEditAvatar.delete(telegramId);
            } else {
              await ctx.reply('Пожалуйста, отправьте изображение для аватара.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
            }
          } else {
            console.error('Не удалось получить документ из сообщения');
            await ctx.reply('Ошибка при обработке файла. Попробуйте еще раз.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
          }
        }
      });
    });

  }


  
  // ====================================================
  // PRIVATE METHODS
  // ====================================================

  // общее
  private async handleStart(ctx: EmployeeContext) {
    if (!ctx.message || typeof (ctx.message as any).text !== 'string') return await this.getMainMenu(ctx);
    
    const messageText = (ctx.message as any).text;
    const [command, payload] = messageText.split(' ');

    if (payload) {
      const [action, param] = payload.split('_');
      if (action === EMPLOYEE_BOT_LOGIN_TO_SHOP_PREFIX && param) {
        await this.handleLoginToShop(ctx, param);
        return;
      }
      await ctx.reply(`Получен неизвестный payload: ${payload}`, Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      return;
    }
    
    await this.getMainMenu(ctx);
  }
  private async getMainMenu(ctx: Context) {
    this.clearMaps();
    return await ctx.reply(
      'Выберите действие:',
      Markup.keyboard([
        [MENU_BUTTONS.loginToShop],
        [MENU_BUTTONS.profile],
        [MENU_BUTTONS.help],
        [MENU_BUTTONS.requests],
      ])
        .resize()
        .oneTime(false)
    );
  }
  private async checkEmployeeExists(ctx: Context, next: (ctx: EmployeeContext) => Promise<void>) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await ctx.reply('Ошибка: не найден Telegram ID пользователя.');

    const employee = await this.employeeForEmployeeService.getEmployeeByTelegramId(telegramId);
    if (!employee) {
      await ctx.reply(
        'Вы не зарегистрированы как сотрудник. Пожалуйста, зарегистрируйтесь через меню.',
        Markup.keyboard([
          [MENU_BUTTONS.register],
          [MENU_BUTTONS.help],
        ]).resize().oneTime(false)
      );
      return;
    }
    // Можно сохранить employee в ctx.state для дальнейшего использования
    (ctx.state as any).employee = employee;
    await next(ctx as EmployeeContext);
  }



  // вход в магазин
  private async askEmployeeLoginToShop(ctx: EmployeeContext) {
    const telegramId = ctx.state.employee!.telegramId;
    this.awaitingEmployeeLoginToShopCode.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите код авторизации сотрудника:', {reply_markup: {remove_keyboard: true}});
  }
  private async handleLoginToShop(ctx: Context, code: string) {
    const telegramId = ctx.state.employee!.telegramId;
    try {
      
      const employee = await this.employeeAuthService.confirmLoginCode(telegramId, code);
      //TODO: разкомментировать на проде
      // await ctx.reply('✅ Авторизация подтверждена. Можете вернуться к планшету.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      await ctx.reply(employee.token);
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Не удалось подтвердить вход. Возможно, код устарел или вы не закреплены за магазином.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    }
    this.clearMaps();
  }

  private async handleContactRequest(ctx: Context) {
    await ctx.reply(
      'Пожалуйста, отправьте свой номер телефона для регистрации.',
      Markup.keyboard([
        Markup.button.contactRequest('📞 Отправить номер телефона'),
      ]).resize()
    );
  }

  private async handleEmployeeRegister(ctx: Context) {
    if (!ctx.message || !('contact' in ctx.message) || !ctx.from) return;
    const contact = (ctx.message as any).contact;
    const telegramUser = ctx.from;

    const dto: RegisterEmployeeDto = {
      phone: contact.phone_number,
      telegramId: telegramUser.id,
      telegramUsername: telegramUser.username ?? '',
      telegramFirstName: telegramUser.first_name ?? '',
      telegramLastName: telegramUser.last_name ?? '',
      employeeName: telegramUser.first_name + ' ' + (telegramUser.last_name ?? ''),
    };

    try {
      const result = await this.employeeAuthService.registerViaTelegram(dto);

      // await ctx.reply(`Ваш токен доступа: ${result.token}`);
    } catch (error) {
      if (error instanceof BadRequestException) await ctx.reply(`⚠️ Ошибка: ${error.message}`);
      else {
        console.error(error);
        await ctx.reply('❌ Неизвестная ошибка при регистрации.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      }
    }
  }

  private async handleAcceptLoginToShop(ctx: EmployeeContext) {
    const telegramId = ctx.state.employee!.telegramId;
    const loginCode = this.awaitingEmployeeAnswerToLoginToShop.get(telegramId);
    if (!loginCode) return await ctx.reply('❌ У вас нет кода для входа в магазин.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    try {
      await this.employeeAuthService.confirmLoginToShop(loginCode);
      await ctx.reply('✅ Авторизация подтверждена. Можете вернуться к планшету.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Не удалось подтвердить вход. Возможно, код устарел или вы не закреплены за магазином.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    }
    this.clearMaps();
  }

  private async handleRejectLoginToShop(ctx: EmployeeContext) {
    const telegramId = ctx.state.employee!.telegramId;
    const loginCode = this.awaitingEmployeeAnswerToLoginToShop.get(telegramId);
    if (!loginCode) return await ctx.reply('❌ У вас нет кода для входа в магазин.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    try {
      await this.employeeAuthService.rejectLoginToShop(loginCode);
      await ctx.reply('✅ Авторизация отменена.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Не удалось отменить вход. Возможно, код устарел или вы не закреплены за магазином.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    }
    this.clearMaps();
  }



  // открепоение
  private async getLeaveTheSellerMenu(ctx: EmployeeContext) {
    return await ctx.reply(
      'Вы уверены, что хотите открепиться от компании?',
      Markup.keyboard([
        [MENU_BUTTONS.leaveConfirm],
        [MENU_BUTTONS.main]
      ])
        .resize()
        .oneTime(false)
    );
  }
  private async confirmLeaveTheSeller(ctx: EmployeeContext) {
    const telegramId = ctx.state.employee!.telegramId;
    await this.employeeForEmployeeService.leaveTheEmployer(telegramId);
    await ctx.reply('✅ Вы открепились от компании.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
  }



  // работа с данными сотрудника
  private async getEmployeeInfo(ctx: EmployeeContext) {
    const employeeInfo: EmployeeForEmployeeTelegramBotResponseDto = ctx.state.employee!;

    const domain = this.configService.get<string>('WEBHOOK_DOMAIN') || 'http://localhost:3000';
    const message = formatEmployeeInfoMessage(employeeInfo);
    const avatarUrl = formatEmployeeAvatar(domain, employeeInfo.employeeAvatar);

    if (avatarUrl) {
      try {
        await ctx.replyWithPhoto(avatarUrl);
      } catch (e: any) {
        if (
          e.description && (
            e.description.includes('failed to get HTTP URL content') ||
            e.description.includes('wrong type of the web page content')
          )
        ) {
          await ctx.reply('⚠️ Не удалось загрузить аватар. Проверьте, что файл существует и доступен по ссылке, а также что это именно изображение.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
        } else {
          throw e;
        }
      }
    }
    await ctx.replyWithMarkdown(message, {
      reply_markup: {
        keyboard: [[MENU_BUTTONS.main],[MENU_BUTTONS.edit]],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }
  private async getEditMenu(ctx: EmployeeContext) {
    const employee = ctx.state.employee!;
    const keyboardArray = employee.employer ? [
      [EDIT_BUTTONS.name, EDIT_BUTTONS.avatar], [MENU_BUTTONS.leaveTheSeller]
    ] : [
      [EDIT_BUTTONS.name, EDIT_BUTTONS.avatar]
    ];
    return ctx.reply('Выберите действие:', Markup.keyboard(keyboardArray)
      .resize()
      .oneTime(false)
    );
  }



  // изменение имени
  private async askEditName(ctx: EmployeeContext) {
    this.clearMaps();
    const telegramId = ctx.state.employee!.telegramId;
    this.awaitingEmployeeEditName.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите новое имя:', {reply_markup: {remove_keyboard: true}});
  }
  private async handleEditName(ctx: EmployeeContext, name: string) {
    const telegramId = ctx.state.employee!.telegramId;
    try {
      await this.employeeForEmployeeService.updateEmployeeName(telegramId, name);
      await ctx.reply('✅ Имя изменено.');
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Не удалось изменить имя.');
    }
    this.clearMaps();
    await this.getEmployeeInfo(ctx);
  }



  // изменение аватар
  private async askEditAvatar(ctx: EmployeeContext) {
    this.clearMaps();
    const telegramId = ctx.state.employee!.telegramId;
    this.awaitingEmployeeEditAvatar.set(telegramId, true);
    await ctx.reply('Пожалуйста, загрузите новое фото:', {reply_markup: {remove_keyboard: true}});
  }
  private async handleEditAvatar(ctx: EmployeeContext, fileId: string) {
    const telegramId = ctx.state.employee!.telegramId;
    try {
      await this.employeeForEmployeeService.updateEmployeeAvatarViaTelegram(telegramId, fileId);
      await ctx.reply('✅ Фото изменено.');
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Не удалось изменить фото.');
    }
    this.clearMaps();
    await this.getEmployeeInfo(ctx);
  }



  // работа с запрсами
  private async getRequests(ctx: EmployeeContext) {
    const telegramId = (ctx.state.employee!.telegramId);

    const requests = await this.employeeForEmployeeService.getEmployeeRequestsByTelegramId(telegramId);
    if (!requests || requests.length === 0) return await ctx.reply('❌ У вас нет запросов на прекрепление.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());

    this.awaitingChoosingEmployeeRequestId.set(telegramId, true);
    
    const requestsMenu = requests.map(request => [`📍 ${request.from.companyName}#${request.id}`]);
    await ctx.reply('Выберите запрос:', Markup.keyboard([...requestsMenu, [MENU_BUTTONS.main]]).resize());
  }

  private async chooseRequest(ctx: EmployeeContext, requestId: string) {
    const telegramId = (ctx.state.employee!.telegramId);
    const isAwaiting = this.awaitingChoosingEmployeeRequestId.get(telegramId);
    if (!isAwaiting) return await ctx.reply('❌ У вас нет запросов на прекрепление.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());

    this.awaitingRequestChangeStatus.set(telegramId, { requestId });
    await ctx.reply('Выберите действие:', Markup.keyboard([
      [MENU_BUTTONS.acceptRequest, MENU_BUTTONS.rejectRequest, MENU_BUTTONS.main]
    ]).resize());
  }

  private async changeRequestStatus(ctx: EmployeeContext, newStatus: RequestToEmployeeStatus.ACCEPTED | RequestToEmployeeStatus.REJECTED) {
    const telegramId = (ctx.state.employee!.telegramId);
    const choosedRequest = this.awaitingRequestChangeStatus.get(telegramId);
    const isAwaiting  = this.awaitingChoosingEmployeeRequestId.get(telegramId);
    if (!isAwaiting || !choosedRequest) return await ctx.reply('❌ У вас нет запросов на прекрепление.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());

    await this.employeeForEmployeeService.changeEmployeeRequestStatusByEmployee(telegramId, choosedRequest.requestId, newStatus);
    this.clearMaps();
    await ctx.reply('✅ Запрос на прекрепление изменён.');

    const requests = await this.employeeForEmployeeService.getEmployeeRequestsByTelegramId(telegramId);
    if (!requests || requests.length === 0) return await this.getMainMenu(ctx);
    await this.getRequests(ctx);
  }


  // ====================================================
  // PUBLIC METHODS
  // ====================================================

  async notifyEmployee(telegramId: number, message: string, options?: any): Promise<TelegramNotificationResponseDto> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, options);
      console.log(`✅ Сообщение отправлено сотруднику ${telegramId}`);
      return {message: 'Сообщение отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения сотруднику ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }


  async notifyEmployeeAboutNewOrder(telegramId: number, order: Order): Promise<TelegramNotificationResponseDto> {
    try {
      await this.notifyEmployee(telegramId, formatNewOrderMessage(order));
      return {message: 'Сообщение об новом заказе отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения об новом заказе сотруднику ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения об новом заказе', error: error.message};
    }

  }

  async notifyEmployeeAboutNewRequestFromSeller(telegramId: number, requestToEmployeeId: string): Promise<TelegramNotificationResponseDto> {
    this.clearMaps();
    this.awaitingChoosingEmployeeRequestId.set(telegramId, true);
    this.awaitingRequestChangeStatus.set(telegramId, { requestId: requestToEmployeeId });
    try {
      const requestToEmployee = await this.employeeForEmployeeService.getEmployeeRequestById(requestToEmployeeId);
      await this.notifyEmployee(
        telegramId,
        `Новый запрос на прекрепление 📍 ${requestToEmployee.from.companyName}#${requestToEmployee.id}`,
        Markup.keyboard([[MENU_BUTTONS.acceptRequest, MENU_BUTTONS.rejectRequest, MENU_BUTTONS.main]]).resize()
      );
      return {message: 'Сообщение об новом запросе отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения об новом запросе сотруднику ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения об новом запросе', error: error.message};
    }
  }

  async notifyEmployeeAboutLoginToShop(telegramId: number, loginCode: EmployeeLoginCode): Promise<TelegramNotificationResponseDto> {
    try {
      this.awaitingEmployeeAnswerToLoginToShop.set(telegramId, loginCode);
      await this.notifyEmployee(
        telegramId, `Войти в магазин ${loginCode.shopName}?`,
        Markup.keyboard([[MENU_BUTTONS.loginToShopAccept, MENU_BUTTONS.loginToShopReject]]).resize()
      );
      return {message: 'Сообщение о коде для входа в магазин отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения о коде для входа в магазин сотруднику ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения о коде для входа в магазин', error: error.message};
    }
  }

}
