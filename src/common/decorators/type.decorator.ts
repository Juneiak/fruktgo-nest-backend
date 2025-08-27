import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для указания типов пользователей, имеющих доступ к маршруту.
 * Администраторы ('admin') автоматически получают доступ ко всем маршрутам.
 * @param types Типы пользователей
 */
export const UserType = (...types: string[]) => SetMetadata('types', [...types, 'admin']);