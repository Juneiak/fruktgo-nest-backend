import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { INestApplication } from '@nestjs/common';
import { setupWebhook } from "../telegram-utils";
import { message } from 'telegraf/filters';
import { AdminAuthService } from 'src/modules/auth/admin-auth/admin-auth.service';
import { AdminSharedService } from 'src/modules/admin/shared/admin.shared.service';
import { ADMIN_BOT_LOGIN_TO_SYSTEM_PREFIX } from 'src/common/constants';
import { TelegramNotificationResponseDto } from 'src/common/dtos';
import { Admin } from 'src/modules/admin/admin.schema';

enum MENU_BUTTONS {
  main = '🏠 Главное меню',
  login = '🏪 Войти в панель управления',
};

interface AdminContext extends Context {
  state: {
    admin?: Admin | null;
  };
}

@Injectable()
export class TelegramAdminBotService implements OnModuleInit {
  private bot: Telegraf;

  // Map для отслеживания ожидания кода авторизации сотрудника
  private awaitingAdminLoginCode: Map<number, boolean> = new Map();

  private async clearMaps() {
    this.awaitingAdminLoginCode.clear();
  }
  constructor(
    private readonly configService: ConfigService,
    private readonly adminSharedService: AdminSharedService,
    private readonly adminAuthService: AdminAuthService,
  ) { 
    const token = this.configService.get<string>('ADMIN_BOT_TOKEN');
    if (!token) throw new Error('ADMIN_BOT_TOKEN not provided');
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.setupBot();
  }



  public async setApp(app: INestApplication) {
    // Интеграция Telegraf webhook в express NestJS
    app.use('/admin-bot', (req: Request, res: Response, next) => {
      
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
    setupWebhook(this.bot, this.configService, 'Admin', '/admin-bot');
  }

  private setupBot() {
    // общее
    this.bot.start(async (ctx) => {
      await this.checkAdminExists(ctx, async (ctx: AdminContext) => {
        await this.handleStart(ctx);
      });
    });

    this.bot.hears(MENU_BUTTONS.main, async (ctx) => {
      await this.checkAdminExists(ctx, async (ctx: AdminContext) => {
        this.clearMaps();
        await this.getMainMenu(ctx);
      });
    });

    // работа с авторизациями
    this.bot.hears(MENU_BUTTONS.login, async (ctx) => {
      await this.checkAdminExists(ctx, async (ctx: AdminContext) => {
        await this.askLoginCode(ctx);
      });
    });


    // Общий обработчик текстовых сообщений для кода авторизации и изменений
    this.bot.on(message('text'), async (ctx) => {
      await this.checkAdminExists(ctx, async (ctx: AdminContext) => {
        const telegramId = ctx.state.admin!.telegramId;
        // работа с авторизацией

        if (this.awaitingAdminLoginCode.get(telegramId)) {
          const message = (ctx.message as any).text;
          await this.handleLogin(ctx, message);
          return;
        }
        await ctx.reply('Команда не распознана', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      });
    });

  }


  
  // ====================================================
  // PRIVATE METHODS
  // ====================================================

  // общее
  private async checkAdminExists(ctx: Context, next: (ctx: AdminContext) => Promise<void>) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await ctx.reply('Ошибка: не найден Telegram ID пользователя.');
    let admin: Admin | null = null;
    try {
      admin = await this.adminSharedService.getAdminByTelegramId(telegramId);
      if (!admin) return await ctx.reply('Ошибка: вы не администратор.');
    } catch (error) {
      console.error(error);
      return await ctx.reply('Ошибка: не удалось проверить администратора.');
    }

    // Можно сохранить employee в ctx.state для дальнейшего использования
    (ctx.state as any).admin = admin;
    await next(ctx as AdminContext);
  };

  private async handleStart(ctx: AdminContext) {
    if (!ctx.message || typeof (ctx.message as any).text !== 'string') return await this.getMainMenu(ctx);
    
    const messageText = (ctx.message as any).text;
    const [command, payload] = messageText.split(' ');

    if (payload) {
      const [action, param] = payload.split('_');
      if (action === ADMIN_BOT_LOGIN_TO_SYSTEM_PREFIX && param) {
        await this.handleLogin(ctx, param);
        return;
      }
      await ctx.reply(`Получен неизвестный payload: ${payload}`, Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      return;
    }
    
    await this.getMainMenu(ctx);
  }
  private async getMainMenu(ctx: AdminContext) {
    return await ctx.reply(
      'Выберите действие:',
      Markup.keyboard([[MENU_BUTTONS.login]])
        .resize()
        .oneTime(false)
    );
  }


  // работа с авторизацией
  //// Авторизация
  private async askLoginCode(ctx: AdminContext) {
    const telegramId = ctx.state.admin!.telegramId;
    this.awaitingAdminLoginCode.set(telegramId, true);
    await ctx.reply('Пожалуйста, введите код авторизации:', {reply_markup: {remove_keyboard: true}});
  }
  private async handleLogin(ctx: AdminContext, code: string) {
    const telegramId = ctx.state.admin!.telegramId;
    try {
      const admin = await this.adminAuthService.confirmLoginCode(telegramId, code);
      //TODO: разкомментировать на проде
      // await ctx.reply('✅ Авторизация подтверждена. Можете вернуться к интерфейсу.', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
      await ctx.reply(admin.token, Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    } catch (err) {
      console.error(err);
      await ctx.reply('❌ Не удалось подтвердить вход. Возможно, код устарел', Markup.keyboard([[MENU_BUTTONS.main]]).resize());
    }
    this.clearMaps();
  }


  // работа с уведомлениями
  //// Уведомления
  async notifyAdmin(message: string): Promise<TelegramNotificationResponseDto> {
    const telegramId = this.configService.get<number>('ADMIN_TELEGRAM_ID');
    if (!telegramId) throw new Error('ADMIN_TELEGRAM_ID not provided');
    try {
      await this.bot.telegram.sendMessage(telegramId, message);
      return {message: 'Сообщение отправлено'};
    } catch (error) {
      console.error(`❌ Ошибка при отправке сообщения администратору ${telegramId}:`, error);
      return {message: 'Ошибка при отправке сообщения', error: error.message};
    }
  }


}
