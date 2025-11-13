import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SellerFullResponseDto, SellerPreviewResponseDto } from './seller.me.response.dtos';
import { AuthenticatedUser } from 'src/common/types';
import { UpdateSellerDto } from './seller.me.request.dtos';
import { checkId } from 'src/common/utils';
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

    const query = new SellerQueries.GetSellerQuery({ sellerId: authedSeller.id });
    const seller = await this.sellerPort.getSeller(query);
    
    if (!seller) throw new NotFoundException('Продавец не найден');

    return plainToInstance(SellerFullResponseDto, seller, { 
      excludeExtraneousValues: true, 
      exposeDefaultValues: true 
    });

  }

  
  async getPreviewSeller(
    authedSeller: AuthenticatedUser
  ): Promise<SellerPreviewResponseDto> {

    const query = new SellerQueries.GetSellerQuery({ sellerId: authedSeller.id });
    const seller = await this.sellerPort.getSeller(query);
    
    if (!seller) throw new NotFoundException('Продавец не найден');

    return plainToInstance(SellerPreviewResponseDto, seller, { 
      excludeExtraneousValues: true, 
      exposeDefaultValues: true 
    });

  }


  async updateSeller(
    authedSeller: AuthenticatedUser,
    updateSellerDto: UpdateSellerDto,
    sellerLogo?: Express.Multer.File
  ): Promise<SellerFullResponseDto> {

    const command = new SellerCommands.UpdateSellerCommand(authedSeller.id, {
      companyName: updateSellerDto.companyName,
      inn: updateSellerDto.inn,
      sellerLogo: sellerLogo || undefined,
    });

    await this.sellerPort.updateSeller(command);
    return this.getFullSeller(authedSeller);

  }
}