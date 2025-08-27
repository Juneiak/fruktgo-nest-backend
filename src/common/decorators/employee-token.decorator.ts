import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const EmployeeToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-employee-token'];
  },
);