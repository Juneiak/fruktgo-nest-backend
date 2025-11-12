import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UpdateShopDto, CreateShopDto } from './seller.shops.request.dtos';
import { ShopFullResponseDto, ShopPreviewResponseDto } from './seller.shops.response.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries,
  ShopCommands
} from 'src/modules/shop';

@Injectable()
export class SellerShopsRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort
  ) {}




  async getShops(
    authedSeller: AuthenticatedUser
  ): Promise<ShopPreviewResponseDto[]> {
    const query = new ShopQueries.GetShopsQuery({ 
      sellerId: authedSeller.id
    });
    const result = await this.shopPort.getShops(query);

    return plainToInstance(ShopPreviewResponseDto, result.docs, { 
      excludeExtraneousValues: true 
    });
  }


  async getFullShop(
    authedSeller: AuthenticatedUser, 
    shopId: string
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    const query = new ShopQueries.GetShopQuery({ shopId });
    const shop = await this.shopPort.getShop(query);
    
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    if (shop.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    }

    return plainToInstance(ShopFullResponseDto, shop, { 
      excludeExtraneousValues: true 
    });
  }


  // TODO: Реализовать createShop через ShopPort
  // CreateShopCommand требует shopAccountId, который нужно создавать автоматически
  // async createShop(
  //   authedSeller: AuthenticatedUser,
  //   dto: CreateShopDto,
  //   shopImage?: Express.Multer.File
  // ): Promise<ShopPreviewResponseDto> {
  //   const command = new ShopCommands.CreateShopCommand(
  //     new Types.ObjectId().toString(),
  //     {
  //       shopAccountId: new Types.ObjectId().toString(), // Требуется создание ShopAccount
  //       ownerId: authedSeller.id,
  //       city: dto.city || '',
  //       shopName: dto.shopName || '',
  //       address: {
  //         city: dto.city,
  //         street: dto.street,
  //         house: dto.house,
  //         latitude: dto.latitude ? Number(dto.latitude) : undefined,
  //         longitude: dto.longitude ? Number(dto.longitude) : undefined
  //       }
  //     }
  //   );
  //   const shop = await this.shopPort.createShop(command);
  //   return plainToInstance(ShopPreviewResponseDto, shop, { excludeExtraneousValues: true });
  // }


  async updateShop(
    authedSeller: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto,
    shopImage?: Express.Multer.File
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    // Проверяем владение магазином
    const query = new ShopQueries.GetShopQuery({ shopId });
    const shop = await this.shopPort.getShop(query);
    
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    if (shop.owner.toString() !== authedSeller.id) {
      throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    }

    const command = new ShopCommands.UpdateShopCommand(shopId, {
      aboutShop: dto.aboutShop,
      openAt: dto.openAt,
      closeAt: dto.closeAt,
      minOrderSum: dto.minOrderSum,
      shopImageFile: shopImage || undefined,
    });

    await this.shopPort.updateShop(command);
    return this.getFullShop(authedSeller, shopId);
  }
}