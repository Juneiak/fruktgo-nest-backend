import { LoginCode } from './login-code.schema';
import * as AuthCommands from './auth.commands';
import * as AuthQueries from './auth.queries';

export const AUTH_PORT = Symbol('AUTH_PORT');

export interface GeneratedCode {
  code: string;
  expiresAt: Date;
  codeId: string;
}

export interface AuthPort {
  /**
   * Генерирует код авторизации
   */
  generateCode(command: AuthCommands.GenerateCodeCommand): Promise<GeneratedCode>;

  /**
   * Подтверждает код и привязывает к сущности
   */
  confirmCode(command: AuthCommands.ConfirmCodeCommand): Promise<LoginCode>;

  /**
   * Получает код по значению
   */
  getCodeByValue(query: AuthQueries.GetCodeByValueQuery): Promise<LoginCode | null>;

  /**
   * Получает код по ID
   */
  getCodeById(query: AuthQueries.GetCodeByIdQuery): Promise<LoginCode | null>;

  /**
   * Получает активный код для сущности
   */
  getActiveCodeByEntity(query: AuthQueries.GetActiveCodeByEntityQuery): Promise<LoginCode | null>;

  /**
   * Инвалидирует код
   */
  invalidateCode(command: AuthCommands.InvalidateCodeCommand): Promise<void>;

  /**
   * Инвалидирует все коды сущности
   */
  invalidateCodesByEntity(command: AuthCommands.InvalidateCodesByEntityCommand): Promise<void>;
}
