import { CustomerPreviewForTelegramBotResponseDto } from "src/modules/customer/customer/customer.request.dto";
import { IssueStatusText } from "src/modules/support/issue.schema";
import * as moment from 'moment';
import { Order } from 'src/modules/order/order.schema';
import {Issue} from 'src/modules/support/issue.schema';
import {OrderStatus} from 'src/modules/order/order.schema';
import { ORDER_STATUS_DISPLAY_MAP } from 'src/modules/order/order.schema';

/**
 * Экранирует специальные символы Markdown в тексте
 * Это нужно для предотвращения ошибок при отправке сообщений в Telegram
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  // Экранируем следующие символы: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

export function formatCustomerInfoMessage(customerInfo: CustomerPreviewForTelegramBotResponseDto): string {
  const {
    isBlocked,
    verifiedStatus,
    customerName,
    phone,
    bonusPoints,
    telegramUsername,
  } = customerInfo;

  const statusStr = isBlocked
    ? '🚫 Заблокирован'
    : '✅ Активен';

  const verifiedStr = verifiedStatus
    ? '🔒 Верифицирован'
    : '❗️ Не верифицирован';

  const name = escapeMarkdown(customerName) || '—';
  const phoneStr = escapeMarkdown(phone) || '—';
  const bonusStr = typeof bonusPoints === 'number' ? bonusPoints : '—';
  const tgUsernameStr = telegramUsername ? `@${escapeMarkdown(telegramUsername)}` : '—';

  const message = `
*Ваши данные:*

*${statusStr} ${verifiedStr}*

*👤 Имя:* ${name}
*📱 Телефон:* ${phoneStr}
*🏅 Бонусы:* ${bonusStr}
*🆔 Telegram:* ${tgUsernameStr}
  `.trim();

  return message;
}

export function formatOrderMessage(order: Order, options: {isUpdated: boolean}={isUpdated: false}): string {
  // Проверяем все необходимые поля
  if (!order) return 'Информация о заказе недоступна';

  // Получаем основные данные заказа
  const orderId = order.orderId.slice(-4);
  const orderStatus = order.orderStatus;
  const orderedAt = order.orderedAt;
  const orderedFrom = order.orderedFrom;
  const canceledReason = order.canceledReason;
  const deliveredAt = order.deliveredAt;
  const canceledAt = order.canceledAt;

  // Получаем финансовые данные
  const finances = order.finances || {};
  const sentSum = finances.sentSum;
  const usedBonusPoints = finances.usedBonusPoints;
  const totalWeightCompensationBonus = finances.totalWeightCompensationBonus;

  // Получаем данные об оценке
  const rating = order.rating || {};
  const settedRating = rating.settedRating;

  // Используем карту статусов из констант
  const statusStr = ORDER_STATUS_DISPLAY_MAP[orderStatus] || escapeMarkdown(orderStatus);

  // Магазин
  const shopStr = orderedFrom?.shopName ? `Магазин: ${escapeMarkdown(orderedFrom.shopName)}` : '';

  // Итоговая сумма
  const sumStr = typeof sentSum === 'number' ? `${sentSum} ₽` : '—';
  
  // Бонусы
  const usedBonusStr = usedBonusPoints ? `- ${usedBonusPoints} бонусов` : '';
  const bonusStr = totalWeightCompensationBonus ? `+${totalWeightCompensationBonus} бонусов` : '';
  
  // Оценка
  const ratingStr = settedRating ? `⭐️ Оценка: ${settedRating}/5` : '';
  
  // Дата создания
  const dateStr = orderedAt ? moment(orderedAt).format('DD.MM.YY HH:mm') : '—';
  
  // Дата доставки/отмены
  const deliveredStr = deliveredAt ? `📦 Доставлен: ${moment(deliveredAt).format('DD.MM.YY HH:mm')}` : '';
  const canceledStr = canceledAt ? `❌ Отменён: ${moment(canceledAt).format('DD.MM.YY HH:mm')}${canceledReason ? ` (${escapeMarkdown(canceledReason)})` : ''}` : '';


  return `
*Заказ №${orderId}${options.isUpdated ? ' обновлен!' : ''}*

*Статус:* ${statusStr}
${shopStr}
*Создан:* ${dateStr}
${deliveredStr || canceledStr}

*Сумма:* ${sumStr} ${usedBonusStr}
${bonusStr}
${ratingStr}
  `.replace(/\n{2,}/g, '\n').trim();
}

export function formatIssueMessage(issue: Issue, options: {isUpdated: boolean}={isUpdated: false}): string {
  const { createdAt, status, issueText, result, issueId } = issue;
  
  // Используем IssueStatusText для получения читаемого статуса
  const statusText = status ? escapeMarkdown(IssueStatusText[status]) : escapeMarkdown(IssueStatusText.NEW);
  
  // Форматируем дату с помощью moment
  const dateStr = moment(createdAt).format('DD.MM.YYYY HH:mm');
  
  // Проверяем, есть ли ответ от поддержки
  const resultText = result ? `*Ответ поддержки:*
${escapeMarkdown(result)}` : '';

  return `
*Обращение №${issueId.slice(-4)}${options.isUpdated ? ' обновлен!' : ''}*

*Статус:* ${statusText}
*Создано:* ${dateStr}

*Ваш запрос:*
${escapeMarkdown(issueText)}

${resultText}
`.trim();
}