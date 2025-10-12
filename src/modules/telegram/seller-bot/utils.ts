import { Issue, IssueStatusText } from "src/modules/issue/issue.schema";
import * as moment from 'moment';
import { Shift } from "src/modules/shift/shift.schema";

export function formatIssueMessage(issue: Issue, options: {isUpdated: boolean}={isUpdated: false}): string {
  const { createdAt, status, issueText, result, issueId } = issue;
  
  // Используем IssueStatusText для получения читаемого статуса
  const statusText = status ? IssueStatusText[status] : IssueStatusText.NEW;
  
  // Форматируем дату с помощью moment
  const dateStr = moment(createdAt).format('DD.MM.YYYY HH:mm');
  
  // Проверяем, есть ли ответ от поддержки
  const resultText = result ? `*Ответ поддержки:*\n${result}` : '';

  return `
*Обращение №${issueId}${options.isUpdated ? ' обновлен!' : ''}*

*Статус:* ${statusText}
*Создано:* ${dateStr}

*Ваш запрос:*
${issueText}

${resultText}
`.trim();
};

export function formatShiftMessage(shift: Shift, haveOpened: boolean): string {
  
  if (haveOpened) {
    // Открытие смены
    const openedAt = shift.openedAt ? moment(shift.openedAt).format('DD.MM.YY HH:mm') : '—';
    const openedBy = shift.openedBy?.employeeName || '—';
    const comment = shift.openComment ? `*Комментарий:* ${shift.openComment}` : '';
    return `
🟢 Смена в магазине ${typeof shift.shop === 'object' && 'shopName' in shift.shop ? shift.shop.shopName : 'неизвестно'} открыта

*ID смены:* ${shift.shiftId}
*Открыта:* ${openedAt}
*Открыл:* ${openedBy}
${comment}
`.trim();
  } else {
    // Закрытие смены
    const openedAt = shift.openedAt ? moment(shift.openedAt).format('DD.MM.YY HH:mm') : '—';
    const closedAt = shift.closedAt ? moment(shift.closedAt).format('DD.MM.YY HH:mm') : '—';
    let duration = '—';
    if (shift.openedAt && shift.closedAt) {
      const ms = moment(shift.closedAt).diff(moment(shift.openedAt));
      const d = moment.duration(ms);
      duration = `${d.hours()}ч ${d.minutes()}м`;
    }
    const openedBy = shift.openedBy?.employeeName || '—';
    const closedBy = shift.closedBy?.employeeName || '—';
    const ordersCount = shift.statistics?.ordersCount ?? '—';
    const totalIncome = shift.statistics?.totalIncome !== undefined ? `${shift.statistics.totalIncome} ₽` : '—';
    const comment = shift.closeComment ? `*Комментарий:* ${shift.closeComment}` : '';
    return `
🔴 Смена в магазине ${typeof shift.shop === 'object' && 'shopName' in shift.shop ? shift.shop.shopName : 'неизвестно'} закрыта

*ID смены:* ${shift.shiftId}
*Открыта:* ${openedAt}
*Закрыта:* ${closedAt}
*Длительность:* ${duration}
*Открыл:* ${openedBy}
*Закрыл:* ${closedBy}
*Заказов:* ${ordersCount}
*Выручка:* ${totalIncome}
${comment}
`.trim();
  }
}