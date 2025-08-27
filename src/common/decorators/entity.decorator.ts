import { createParamDecorator, ExecutionContext, NotFoundException } from '@nestjs/common';


export const FoundEntity = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.foundResource) {
      throw new NotFoundException(`${data || 'Ресурс'} не найден`);
    }
    return request.foundResource;
  },
);