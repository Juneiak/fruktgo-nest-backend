import { EmployeeForEmployeeTelegramBotResponseDto } from "src/modules/employee/employee/employee.response.dto";
import { PUBLIC_URL_OF_SELLERS, PUBLIC_URL_OF_SHOPS } from "src/common/constants";
import { Order } from "src/modules/order/order.schema";
import * as moment from "moment";
import { ORDER_STATUS_DISPLAY_MAP } from 'src/modules/order/order.schema';

export const formatEmployeeInfoMessage = (employeeInfo: EmployeeForEmployeeTelegramBotResponseDto): string => {
  const { isBlocked, verifiedStatus, employeeName, position, salary, pinnedTo, employer } = employeeInfo;
  // Форматирование работодателя
  let employerStr = '—';
  if (employer && employer.companyName) employerStr = `[${employer.companyName}](${PUBLIC_URL_OF_SELLERS}/${employer.sellerId})`;
  
  let pinnedToStr = '—';
  if (pinnedTo && pinnedTo.shopName) pinnedToStr = `[${pinnedTo.shopName}](${PUBLIC_URL_OF_SHOPS}/${pinnedTo.shopId})`;
      
  const message = `
*Ваши данные:*

*${isBlocked ? '🚫 Заблокирован' : '✅ Активен'}${verifiedStatus ? '🔒 Верифицирован' : '❗️ Не верифицирован'}*

*👤 Имя:* ${employeeName || '—'}
      
*💼 Должность:* ${position || '—'}
      
*💰 Зарплата:* ${salary ? salary + ' ₽' : '—'}

*🏢 Работодатель:* ${employerStr}
*🏬 Закреплён за:* ${pinnedToStr}
  `.trim();
  return message;
}
  
export const formatEmployeeAvatar = (domain: string, avatarImageId: string | null = '67f82b037507b250fe6822b3') => {
  // Форматирование аватара (если есть ссылка)
  const avatarUrl = avatarImageId ? domain + '/images/mobile/' + avatarImageId : null;
  return avatarUrl;
}

export const formatNewOrderMessage = (order: Order): string => {
  const { orderId, orderStatus, orderedAt } = order;
  return `
*Новый заказ:*

*ID:* ${orderId.slice(-4)}
*Статус:* ${ORDER_STATUS_DISPLAY_MAP[orderStatus]}
*Дата:* ${moment(orderedAt).format('DD.MM.YY HH:mm')}
  `.trim();
}


  