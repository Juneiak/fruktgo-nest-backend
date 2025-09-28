import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaginatedResponseDto } from "src/interface/http/common/common.response.dtos";
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';

import { plainToInstance } from 'class-transformer';
import { ShiftResponseDto } from './seller.shifts.response.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { AuthenticatedUser } from 'src/common/types';
import { LogsService } from 'src/infra/logs/application/log.service';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';
import { ShiftsQueryDto } from './seller.shifts.query.dtos';
import { ShiftService } from 'src/modules/shift/shift.service';
import { ShiftFilterBuilder } from 'src/modules/shift/shift.types';

@Injectable()
export class SellerShiftsRoleService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly shiftService: ShiftService,
    private readonly logsService: LogsService,
  ) {}

  async getShiftsOfShop(
    authedSeller: AuthenticatedUser, 
    shiftsQueryDto: ShiftsQueryDto, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    checkId([shiftsQueryDto.shopId]);
    const shopObjectId = new Types.ObjectId(shiftsQueryDto.shopId);
    const isShopExists = await this.shopModel.exists({_id: shopObjectId, owner: new Types.ObjectId(authedSeller.id)}).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    const filter = ShiftFilterBuilder.from(shiftsQueryDto);

    const result = await this.shiftService.getShifts(filter, paginationQuery);  
    return transformPaginatedResult(result, ShiftResponseDto);
  }

  async getCurrentShiftOfShop(
    authedSeller: AuthenticatedUser,
    shiftsQueryDto: ShiftsQueryDto
  ): Promise<ShiftResponseDto> {
    checkId([shiftsQueryDto.shopId]);

    const isShopExists = await this.shopModel.exists({ _id:  new Types.ObjectId(shiftsQueryDto.shopId), owner: new Types.ObjectId(authedSeller.id) }).exec();
    if (!isShopExists) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    
    const shift = await this.shiftService.getShift(shiftsQueryDto.shopId);
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
