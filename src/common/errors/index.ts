// Централизованный экспорт всех классов и утилит для обработки ошибок

export {
  DomainError,
  isDomainError,
  DomainErrorCode,
  handleServiceError,
  type DomainErrorMeta,
} from './domain-error';

export { DomainErrorFilter } from './domain-error.filter';
