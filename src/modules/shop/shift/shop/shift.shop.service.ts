
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
} from './shift.shop.request.dto';
import { ShiftPreviewResponseDto } from './shift.shop.response.dto';
import { verifyUserStatus } from 'src/common/utils';
import { ShopModel, ShopStatus } from "src/modules/shop/schemas/shop.schema";
import { EmployeeModel, EmployeeStatus } from "src/modules/employee/schemas/employee.schema";
import {checkId} from 'src/common/utils';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {AuthenticatedUser, AuthenticatedEmployee} from 'src/common/types';
import { ShiftModel } from '../../schemas/shift.schema';


@Injectable()
export class ShiftShopService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('Shift') private shiftModel: ShiftModel,
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    private logsService: LogsService,
    private notificationService: NotificationService
  ) {}
  
  // ====================================================
  // COMMON 
  // ====================================================
  async getShopPreviewInfo(authedShop: AuthenticatedUser): Promise<ShiftPreviewResponseDto> {
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).populate('currentShift pinnedEmployees').exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
  
    return plainToInstance(ShiftPreviewResponseDto, shop, { excludeExtraneousValues: true });
  }

  // ====================================================
  // SHIFT
  // ====================================================
  async openShiftByEmployee(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee, 
    dto: OpenShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {

    // Проверяем корректность ID магазина
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(shop);
    
    // Проверяем права доступа магазина
    if (!shop._id.equals(new Types.ObjectId(authedShop.id))) throw new ForbiddenException('Недостаточно прав доступа к магазину');
    
    // Проверяем существование сотрудника
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).lean().exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
    verifyUserStatus(foundEmployee);
    
    // Проверяем, что сотрудник привязан к этому магазину
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к этому магазину');
    
    // Проверяем, нет ли уже открытой смены
    // const existingOpenShift = await this.shiftModel.findOne({
    //   shop: shop._id,
    //   closedAt: null
    // }).lean().exec();
    
    // if (existingOpenShift) throw new BadRequestException('У магазина уже есть открытая смена');
    
    // Создаем новую смену
    const newShift = new this.shiftModel({
      shop: shop._id,
      openedAt: dto.openAt || new Date(),
      openComment: dto.comment,
      openedBy: {
        employee: foundEmployee._id,
        employeeName: foundEmployee.employeeName
      }
    });
    
    const savedShift = await newShift.save();
    
    // Обновляем магазин, записывая текущую смену
    await this.shopModel.findByIdAndUpdate(shop._id, {
      currentShift: savedShift._id,
      status: ShopStatus.OPENED
    }).exec();
    
    // Увеличиваем счетчик смен у сотрудника и меняем статус на работает
    await this.employeeModel.findByIdAndUpdate(foundEmployee._id, {
      $inc: { totalShifts: 1 },
      status: EmployeeStatus.WORKING
    }).exec();
    
    // Логирование действия
    await this.logsService.addShiftLog(savedShift._id.toString(), LogLevel.MEDIUM, 
      `Смена (${savedShift._id.toString()}) открыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Комментарий: ${dto.comment}
      Дата открытия: ${savedShift.openedAt}`
    );
    console.log(savedShift);
    this.notificationService.notifySellerAboutShiftUpdate(savedShift._id.toString(), true);
    
    // Преобразуем и возвращаем объект смены
    return this.getShopPreviewInfo(authedShop);
  }
  

  async closeShiftByEmployee(
    authedShop: AuthenticatedUser, 
    authedEmployee: AuthenticatedEmployee,
    shiftId: string,
    dto: CloseShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    // Проверяем корректность ID магазина и смены
    checkId([shiftId]);
    
    // Находим магазин
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    
    // Проверяем права доступа магазина
    if (!shop._id.equals(new Types.ObjectId(authedShop.id))) throw new ForbiddenException('Недостаточно прав доступа к магазину');
    
    // Проверяем существование сотрудника
    const foundEmployee = await this.employeeModel.findById(new Types.ObjectId(authedEmployee.id)).lean().exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');

    // Проверяем статус сотрудника
    verifyUserStatus(foundEmployee);
    // Проверяем, что сотрудник привязан к этому магазину
    if (foundEmployee.pinnedTo && foundEmployee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не привязан к этому магазину');
    
    // Получаем смену по ID
    const shift = await this.shiftModel.findById(new Types.ObjectId(shiftId)).exec();
    if (!shift) throw new NotFoundException('Смена не найдена');
    
    // Проверяем, что смена принадлежит этому магазину
    if (shift.shop.toString() !== shop._id.toString()) throw new ForbiddenException('Смена не принадлежит этому магазину');
  
    // Проверяем, что смена является текущей для магазина
    if (!shop.currentShift || shop.currentShift.toString() !== shift._id.toString()) throw new BadRequestException('Эта смена не является текущей для магазина');
    
    // Проверяем закрыта ли смена по наличию даты закрытия
    if (shift.closedAt) throw new BadRequestException('Смена уже закрыта');
    
    
    // Обновляем смену
    shift.closedAt = dto.closeAt || new Date();
    shift.closeComment = dto.comment;
    shift.closedBy = {
      employee: foundEmployee._id,
      employeeName: foundEmployee.employeeName
    };
    // Добавляем комментарий в логи, так как у схемы Shift нет поля comment
    // И также нет поля status
    
    // У схемы Shift нет поля logs, логи добавляются через сервис shopsCommonService
    
    await shift.save();
    
    // Обновляем магазин, очищая текущую смену
    await this.shopModel.findByIdAndUpdate(shop._id, {
      currentShift: null,
      status: ShopStatus.CLOSED
    }).exec();
    
    // Логирование действия в логах смены
    await this.logsService.addShiftLog(shift._id.toString(), LogLevel.MEDIUM, 
      `Смена (${shift._id.toString()}) закрыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Дата закрытия: ${shift.closedAt}
      Комментарий: ${dto.comment || ''}`
    );
    
    // Логирование действия в логах магазина
    await this.logsService.addShopLog(shop._id.toString(), LogLevel.MEDIUM, 
      `Смена (${shift._id.toString()}) закрыта сотрудником ${foundEmployee.employeeName}(${foundEmployee._id.toString()}).
      Дата закрытия: ${shift.closedAt}
      Статус магазина изменен на: ${ShopStatus.CLOSED}
      Комментарий: ${dto.comment || ''}`
    );

    this.notificationService.notifySellerAboutShiftUpdate(shift._id.toString(), false);

    // Преобразуем и возвращаем объект смены
    return this.getShopPreviewInfo(authedShop);
  }
};
