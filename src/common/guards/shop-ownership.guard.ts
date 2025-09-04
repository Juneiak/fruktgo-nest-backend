import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from 'src/modules/shop/shop/shop.schema';

@Injectable()
export class ShopOwnershipGuard implements CanActivate {
  constructor(
    @InjectModel('Shop') private readonly shopModel: Model<Shop>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authedSeller = request.user; // или .seller, в зависимости от твоей стратегии
    const shopId = request.params.shopId;

    if (!shopId || !authedSeller) throw new ForbiddenException('Доступ запрещён');

    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('owner').lean();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (shop.owner.toString() !== authedSeller.id) {
      throw new ForbiddenException('Магазин не принадлежит продавцу');
    }

    return true;
  }
}