import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
} from './shop.shifts.request.dtos';
import { ShiftPreviewResponseDto } from './shop.shifts.response.dtos';
import { transformPaginatedResult, verifyUserStatus } from 'src/common/utils';
import { ShopModel } from "src/modules/shop/shop.schema"; 
import { EmployeeModel, } from "src/modules/employee/employee.schema";
import { LogLevel } from "src/infra/logs/logs.schema";
import { LogsService } from 'src/infra/logs/logs.service';
import { NotificationService } from 'src/infra/notification/notification.service';
import {AuthenticatedUser, AuthenticatedEmployee} from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { ActorType } from 'src/modules/shift/shift.schema';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { ShiftService } from 'src/modules/shift/shift.service';


@Injectable()
export class ShopShiftsRoleService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    private shiftService: ShiftService,
    private logsService: LogsService,
    private notificationService: NotificationService
  ) {}


  async getShifts(
    authedShop: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const result = await this.shiftService.getShifts(
      { shop: new Types.ObjectId(authedShop.id) } as any,
      { page, pageSize, sortByDate: 'desc' }
    );
    return transformPaginatedResult(result as any, ShiftPreviewResponseDto);
  } 

  async getShift(
    authedShop: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftPreviewResponseDto> {

    const shift = await this.shiftService.getShift(shiftId);  
    if (!shift) throw new NotFoundException('Смена не найдена');
    if (shift.shop.toString() !== authedShop.id) throw new NotFoundException('Смена не принадлежит этому магазину');
    
    return plainToInstance(ShiftPreviewResponseDto, shift, { excludeExtraneousValues: true });
  }


  async openShiftByEmployee(
    authedShop: AuthenticatedUser,
    authedEmployee: AuthenticatedEmployee,
    dto: OpenShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    // Валидации
    const shop = await this.shopModel.findById(authedShop.id).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(shop);

    const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(authedEmployee.id), pinnedTo: shop._id }).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден или не привязан к магазину');
    verifyUserStatus(employee);

    // Открываем смену через ядро
    await this.shiftService.openShift(
      authedShop.id,
      { actorType: ActorType.EMPLOYEE, actorId: new Types.ObjectId(authedEmployee.id), actorName: employee.employeeName },
      dto.comment || null,
    );

    const shopAfter = await this.shopModel.findById(authedShop.id).select('currentShift shopName').lean().exec();
    const shift = await this.shiftService.getShift(shopAfter!.currentShift!.toString());

    // Логи
    await this.logsService.addShiftLog(
      shift._id.toString(),
      `Смена открыта сотрудником ${employee.employeeName} (${employee._id.toString()}) ${dto.comment ? `с комментарием: ${dto.comment}` : ''}`,
      { forRoles: [UserType.EMPLOYEE, UserType.SELLER], logLevel: LogLevel.MEDIUM }
    );
    await this.logsService.addShopLog(
      shop._id.toString(),
      `Открыта смена (${shift._id.toString()}) сотрудником ${employee.employeeName} (${employee._id.toString()}) ${dto.comment ? `с комментарием: ${dto.comment}` : ''}`,
      { forRoles: [UserType.SELLER], logLevel: LogLevel.HIGH }
    );
    await this.logsService.addEmployeeLog(
      employee._id.toString(),
      `Открыта смена (${shift._id.toString()}) в магазине ${shopAfter!.shopName} (${shop._id.toString()}) ${dto.comment ? `с комментарием: ${dto.comment}` : ''}`,
      { forRoles: [UserType.EMPLOYEE], logLevel: LogLevel.MEDIUM }
    );

    return plainToInstance(ShiftPreviewResponseDto, shift, { excludeExtraneousValues: true });
  }
  

  async closeShiftByEmployee(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee,
    shiftId: string,
    dto: CloseShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    const shop = await this.shopModel.findOne({ _id: new Types.ObjectId(authedShop.id), currentShift: new Types.ObjectId(shiftId) }).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(shop);

    const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(authedEmployee.id), pinnedTo: shop._id }).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден или не привязан к магазину');
    verifyUserStatus(employee);

    const shift = await this.shiftService.getShift(shiftId);
    if (!shift || shift.shop.toString() !== shop._id.toString()) throw new NotFoundException('Смена не найдена или не принадлежит этому магазину');

    await this.shiftService.startClosing(shiftId, { actorType: ActorType.EMPLOYEE, actorId: new Types.ObjectId(authedEmployee.id), actorName: employee.employeeName }, dto.comment || undefined);
    await this.shiftService.closeShift(shiftId, { actorType: ActorType.EMPLOYEE, actorId: new Types.ObjectId(authedEmployee.id), actorName: employee.employeeName }, dto.comment || undefined);

    await this.logsService.addShiftLog(
      shiftId,
      `Смена (${shiftId}) закрыта сотрудником ${employee.employeeName}(${employee._id.toString()}).` + (dto.comment ? ` Комментарий: ${dto.comment}` : ''),
      { forRoles: [UserType.EMPLOYEE, UserType.SELLER], logLevel: LogLevel.MEDIUM }
    );
    await this.logsService.addShopLog(
      shop._id.toString(),
      `Смена (${shiftId}) закрыта сотрудником ${employee.employeeName}(${employee._id.toString()}).`,
      { forRoles: [UserType.SELLER], logLevel: LogLevel.LOW }
    );

    this.notificationService.notifySellerAboutShiftUpdate(shiftId, false);
    return plainToInstance(ShiftPreviewResponseDto, await this.shiftService.getShift(shiftId), { excludeExtraneousValues: true });
  }

  // --- Пауза/возобновление смены сотрудником ---
  async pauseShiftByEmployee(
    authedShop: AuthenticatedUser,
    authedEmployee: AuthenticatedEmployee,
    shiftId: string,
    comment?: string
  ): Promise<ShiftPreviewResponseDto> {
    const shop = await this.shopModel.findOne({ _id: new Types.ObjectId(authedShop.id), currentShift: new Types.ObjectId(shiftId) }).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(authedEmployee.id), pinnedTo: shop._id }).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден или не привязан к магазину');

    const shift = await this.shiftService.getShift(shiftId);
    if (!shift || shift.shop.toString() !== shop._id.toString()) throw new NotFoundException('Смена не найдена или не принадлежит этому магазину');

    await this.shiftService.pauseShift(shiftId, { actorType: ActorType.EMPLOYEE, actorId: new Types.ObjectId(authedEmployee.id), actorName: employee.employeeName }, comment);

    await this.logsService.addShiftLog(
      shiftId,
      `Смена (${shiftId}) поставлена на паузу сотрудником ${employee.employeeName}(${employee._id.toString()}).` + (comment ? ` Комментарий: ${comment}` : ''),
      { forRoles: [UserType.EMPLOYEE, UserType.SELLER], logLevel: LogLevel.LOW }
    );

    return plainToInstance(ShiftPreviewResponseDto, await this.shiftService.getShift(shiftId), { excludeExtraneousValues: true });
  }

  async resumeShiftByEmployee(
    authedShop: AuthenticatedUser,
    authedEmployee: AuthenticatedEmployee,
    shiftId: string,
    comment?: string
  ): Promise<ShiftPreviewResponseDto> {
    const shop = await this.shopModel.findOne({ _id: new Types.ObjectId(authedShop.id), currentShift: new Types.ObjectId(shiftId) }).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(authedEmployee.id), pinnedTo: shop._id }).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден или не привязан к магазину');

    const shift = await this.shiftService.getShift(shiftId);
    if (!shift || shift.shop.toString() !== shop._id.toString()) throw new NotFoundException('Смена не найдена или не принадлежит этому магазину');

    await this.shiftService.resumeShift(shiftId, { actorType: ActorType.EMPLOYEE, actorId: new Types.ObjectId(authedEmployee.id), actorName: employee.employeeName }, comment);

    await this.logsService.addShiftLog(
      shiftId,
      `Смена (${shiftId}) возобновлена сотрудником ${employee.employeeName}(${employee._id.toString()}).` + (comment ? ` Комментарий: ${comment}` : ''),
      { forRoles: [UserType.EMPLOYEE, UserType.SELLER], logLevel: LogLevel.LOW }
    );

    return plainToInstance(ShiftPreviewResponseDto, await this.shiftService.getShift(shiftId), { excludeExtraneousValues: true });
  }
};
