import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";
import { plainToInstance } from 'class-transformer';
import { ShiftPreviewResponseDto, ShiftFullResponseDto } from './shift.seller.response.dto';
import { checkId } from 'src/common/utils';
import { ShiftModel } from '../../schemas/shift.schema';
import { ShopModel } from '../../schemas/shop.schema';
import { AuthenticatedUser } from 'src/common/types';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class ShiftSellerService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('Shift') private shiftModel: ShiftModel,
    private readonly logsService: LogsService,
  ) {}

  async getShifts(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    
    // Получаем параметры пагинации с значениями по умолчанию
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество смен для пагинации
    const totalItems = await this.shiftModel.countDocuments({ shop: foundShop._id }).exec();
    
    // Получаем смены с пагинацией
    const foundShifts = await this.shiftModel.find({ shop: foundShop._id })
      .sort({ openedAt: -1 }) // -1 для сортировки по убыванию (новые сначала)
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    const items = plainToInstance(ShiftPreviewResponseDto, foundShifts, { excludeExtraneousValues: true });
    return { items, pagination };
  }

  async getCurrentShift(
    authedSeller: AuthenticatedUser,
    shopId: string
  ): Promise<ShiftFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findOne({ _id: new Types.ObjectId(shopId), owner: new Types.ObjectId(authedSeller.id) }).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    const shift = await this.shiftModel.findOne({ shop: foundShop._id }).sort({ openedAt: -1 }).lean({ virtuals: true }).exec();
    return plainToInstance(ShiftFullResponseDto, shift, { excludeExtraneousValues: true });
  }
  

  async getShift(
    authedSeller: AuthenticatedUser,
    shopId: string,
    shiftId: string
  ): Promise<ShiftFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findOne({ _id: new Types.ObjectId(shopId), owner: new Types.ObjectId(authedSeller.id) }).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    checkId([shiftId]);
    const shift = await this.shiftModel.findOne({ _id: new Types.ObjectId(shiftId), shop: foundShop._id }).lean({ virtuals: true }).exec();
    if (!shift) throw new NotFoundException('Смена не найден');
    
    return plainToInstance(ShiftFullResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShiftLogs(
    authedSeller: AuthenticatedUser,
    shopId: string,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    checkId([shopId, shiftId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    
    const shift = await this.shiftModel.findOne({ _id: new Types.ObjectId(shiftId), shop: foundShop._id }).lean({ virtuals: true }).exec();
    if (!shift) throw new NotFoundException('Смена не найден');

    return this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }
    
};
