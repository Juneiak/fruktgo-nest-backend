import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedEmployee } from "src/common/types";

/**
 * Декоратор для получения объекта сотрудника из запроса
 * Используется вместе с EmployeeAuthGuard
 */
export const GetEmployee = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedEmployee => {
    const request = ctx.switchToHttp().getRequest();
    return request.employee;
  },
);
