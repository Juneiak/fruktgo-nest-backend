import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SellerFullResponseDto, SellerPreviewResponseDto } from './seller.me.response.dtos';
import { AuthenticatedUser } from 'src/common/types';
import { UpdateSellerDto } from './seller.me.request.dtos';
import { checkId } from 'src/common/utils';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  SellerPort,
  SELLER_PORT,
  SellerQueries,
  SellerCommands
} from 'src/modules/seller';

@Injectable()
export class SellerMeRoleService {
  constructor(
    @Inject(SELLER_PORT) private readonly sellerPort: SellerPort,
  ) {}

  async getFullSeller(
    authedSeller: AuthenticatedUser
  ): Promise<SellerFullResponseDto> {
    try {
      const query = new SellerQueries.GetSellerQuery({ sellerId: authedSeller.id });
      const seller = await this.sellerPort.getSeller(query);
      
      if (!seller) throw new NotFoundException('Продавец не найден');

      return plainToInstance(SellerFullResponseDto, seller, { 
        excludeExtraneousValues: true, 
        exposeDefaultValues: true 
      });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }

  
  async getPreviewSeller(
    authedSeller: AuthenticatedUser
  ): Promise<SellerPreviewResponseDto> {
    try {
      const query = new SellerQueries.GetSellerQuery({ sellerId: authedSeller.id });
      const seller = await this.sellerPort.getSeller(query);
      
      if (!seller) throw new NotFoundException('Продавец не найден');

      return plainToInstance(SellerPreviewResponseDto, seller, { 
        excludeExtraneousValues: true, 
        exposeDefaultValues: true 
      });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateSeller(
    authedSeller: AuthenticatedUser,
    updateSellerDto: UpdateSellerDto,
    sellerLogo?: Express.Multer.File
  ): Promise<SellerFullResponseDto> {
    try {
      const command = new SellerCommands.UpdateSellerCommand(authedSeller.id, {
        companyName: updateSellerDto.companyName,
        inn: updateSellerDto.inn,
        sellerLogo: sellerLogo || undefined,
      });

      await this.sellerPort.updateSeller(command);
      return this.getFullSeller(authedSeller);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец не найден'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Неверный формат данных'),
        [DomainErrorCode.CONFLICT]: new ConflictException('Продавец с такими данными уже существует'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}