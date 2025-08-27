import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

/**
 * Устанавливает webhook для Telegram бота с механизмом повторных попыток
 * @param bot Экземпляр Telegraf бота
 * @param configService Сервис конфигурации для получения домена
 * @param botName Название бота для логов (например, 'Admin', 'Employee')
 * @param path Путь для webhook (например, '/admin-bot')
 * @param maxRetries Максимальное количество попыток
 * @param retryInterval Интервал между попытками в миллисекундах
 */
export async function setupWebhook(
  bot: Telegraf,
  configService: ConfigService,
  botName: string,
  path: string,
  maxRetries = 5,
  retryInterval = 60000
): Promise<boolean> {
  const webhookUrl = configService.get<string>('WEBHOOK_DOMAIN') || 'http://localhost:3000';
  const fullWebhookUrl = `${webhookUrl}${path}`;
  
  let retries = 0;
  let success = false;
  
  const trySetWebhook = async (): Promise<boolean> => {
    try {
      await bot.telegram.setWebhook(fullWebhookUrl);
      console.log(`🤖 ${botName} Telegram bot is running in webhook mode at ${fullWebhookUrl}`);
      return true;
    } catch (error) {
      retries++;
      console.error(`⚠️ Failed to set webhook for ${botName} Telegram bot (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        console.log(`🕒 Retrying in ${retryInterval/1000} seconds...`);
        return false;
      } else {
        console.log(`❌ Maximum retry attempts (${maxRetries}) reached. ${botName} bot will continue without webhook.`);
        return false;
      }
    }
  };
  
  // Первая попытка
  success = await trySetWebhook();
  
  // Если первая попытка не удалась, настраиваем повторные попытки
  if (!success && retries < maxRetries) {
    // Создаем рекурсивную функцию для повторных попыток
    const retryWithDelay = () => {
      setTimeout(async () => {
        success = await trySetWebhook();
        if (!success && retries < maxRetries) {
          retryWithDelay();
        }
      }, retryInterval);
    };
    
    retryWithDelay();
  }
  
  return success;
}