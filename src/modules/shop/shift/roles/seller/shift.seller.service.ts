import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaginationQueryDto, PaginatedResponseDto } from "src/common/dtos";
import { plainToInstance } from 'class-transformer';
import { ShiftResponseDto } from './shift.seller.response.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { ShopModel } from '../../shop/shop.schema';
import { AuthenticatedUser } from 'src/common/types';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { ShiftFilterDto } from './shift.seller.filter.dtos';
import { ShiftService } from '../shift.service';
import { ShiftFilterBuilder } from '../shift.types';

@Injectable()
export class ShiftSellerService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly shiftService: ShiftService,
    private readonly logsService: LogsService,
  ) {}

  async getShiftsOfShop(
    authedSeller: AuthenticatedUser, 
    shiftFilterDto: ShiftFilterDto, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    checkId([shiftFilterDto.shopId]);
    const shopObjectId = new Types.ObjectId(shiftFilterDto.shopId);
    const isShopExists = await this.shopModel.exists({_id: shopObjectId, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    const filter = ShiftFilterBuilder.from(shiftFilterDto);

    const result = await this.shiftService.getShifts(filter, paginationQuery);  
    return transformPaginatedResult(result, ShiftResponseDto);
  }

  async getCurrentShiftOfShop(
    authedSeller: AuthenticatedUser,
    shiftFilterDto: ShiftFilterDto
  ): Promise<ShiftResponseDto> {
    checkId([shiftFilterDto.shopId]);

    const isShopExists = await this.shopModel.exists({ _id:  new Types.ObjectId(shiftFilterDto.shopId), owner: new Types.ObjectId(authedSeller.id) }).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    
    const shift = await this.shiftService.getShift(shiftFilterDto.shopId);
    if (!shift) throw new NotFoundException('Смена не найден');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }
  

  async getShift(
    authedSeller: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftResponseDto> {
    checkId([shiftId]);
    const shift = await this.shiftService.getShift(shiftId);
    if (!shift) throw new NotFoundException('Смена не найден');

    const isShopExists = await this.shopModel.exists({_id: shift.shop, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShiftLogs(
    authedSeller: AuthenticatedUser,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    checkId([shiftId]);
    const shift = await this.shiftService.getShift(shiftId);
    if (!shift) throw new NotFoundException('Смена не найден');

    const isShopExists = await this.shopModel.exists({_id: shift.shop, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');

    return this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }
    
};
