import { UserType } from 'src/common/enums/common.enum'

export enum IssueStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed'
};

export enum IssueUserType {
  CUSTOMER = 'Customer',
  SELLER = 'Seller',
  EMPLOYEE = 'Employee'
};

export enum IssueLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum IssueCategory {
  TECHNICAL = 'technical',       // Технические проблемы
  PAYMENT = 'payment',           // Проблемы с оплатой
  DELIVERY = 'delivery',         // Проблемы с доставкой
  PRODUCT = 'product',           // Проблемы с товаром
  ACCOUNT = 'account',           // Проблемы с аккаунтом
  REFUND = 'refund',            // Возврат средств
  FEATURE_REQUEST = 'feature',   // Запрос функционала
  OTHER = 'other'                // Прочее
}