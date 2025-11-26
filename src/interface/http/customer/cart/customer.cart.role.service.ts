import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DomainErrorCode, handleServiceError } from 'src/common/errors';
import { plainToInstance } from 'class-transformer';
import {
  CartResponseDto,
  UpdatedCartResponseDto,
} from './customer.cart.response.dtos';
import {
  SelectShopForCartDto,
  UpdateProductInCartDto,
  RemoveProductInCartDto
} from './customer.cart.request.dtos';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/interface/http/shared';
import {
  CartPort,
  CART_PORT,
  CartCommands,
  CartQueries,
} from 'src/modules/cart';

@Injectable()
export class CustomerCartRoleService {
  constructor(
    @Inject(CART_PORT) private readonly cartPort: CartPort,
  ) {}

  // ====================================================
  // CART 
  // ====================================================

  async getCustomerCart(authedCustomer: AuthenticatedUser): Promise<CartResponseDto> {
    try {
      const cart = await this.cartPort.getCart(
        new CartQueries.GetCartQuery(authedCustomer.id, { 
          populateProducts: true, 
          populateShop: true 
        })
      );

      return plainToInstance(CartResponseDto, cart, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Корзина не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка получения корзины'),
      });
    }
  }

  async selectShopForCart(
    authedCustomer: AuthenticatedUser, 
    dto: SelectShopForCartDto
  ): Promise<CartResponseDto> {
    try {
      await this.cartPort.selectShop(
        new CartCommands.SelectShopCommand(authedCustomer.id, { 
          shopId: dto.shopId, 
          force: true 
        })
      );

      const populatedCart = await this.cartPort.getCart(
        new CartQueries.GetCartQuery(authedCustomer.id, { 
          populateProducts: true, 
          populateShop: true 
        })
      );

      return plainToInstance(CartResponseDto, populatedCart, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.INVARIANT]: new ConflictException('Магазин недоступен'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Ошибка выбора магазина'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка выбора магазина'),
      });
    }
  }

  async unselectShopForCart(authedCustomer: AuthenticatedUser): Promise<MessageResponseDto> {
    try {
      await this.cartPort.unselectShop(
        new CartCommands.UnselectShopCommand(authedCustomer.id)
      );

      return { message: 'Магазин успешно удален из корзины' };
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Корзина не найдена'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка удаления магазина'),
      });
    }
  }

  async updateProductInCart(
    authedCustomer: AuthenticatedUser, 
    dto: UpdateProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    try {
      const cart = await this.cartPort.updateProductQuantity(
        new CartCommands.UpdateProductQuantityCommand(authedCustomer.id, { 
          shopProductId: dto.shopProductId, 
          quantity: dto.quantity 
        })
      );

      return plainToInstance(UpdatedCartResponseDto, { 
        isReadyToOrder: cart.isReadyToOrder,
        totalSum: cart.totalSum,
      }, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Недостаточно товара в наличии'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID товара'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка обновления корзины'),
      });
    }
  }

  async removeProductInCart(
    authedCustomer: AuthenticatedUser, 
    dto: RemoveProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    try {
      const cart = await this.cartPort.removeProduct(
        new CartCommands.RemoveProductCommand(authedCustomer.id, { 
          shopProductId: dto.shopProductId 
        })
      );

      return plainToInstance(UpdatedCartResponseDto, { 
        isReadyToOrder: cart.isReadyToOrder,
        totalSum: cart.totalSum,
      }, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден в корзине'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID товара'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка удаления товара'),
      });
    }
  }
}