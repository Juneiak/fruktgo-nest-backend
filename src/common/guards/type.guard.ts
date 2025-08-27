import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.get<string[]>('types', context.getHandler());
    if (!requiredTypes) return true; // Если типы не указаны, маршрут доступен всем

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredTypes.includes(user.type)) throw new ForbiddenException('Недостаточно прав');

    return true;
  }
}