
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from '../schemas/employee.schema';
import { plainToInstance } from 'class-transformer';
import {
  EmployeeResponseDto,
  RequestToEmployeeResponseDto
} from './employee.seller.response.dtos';
import { UpdateEmployeeDto, RequestToEmployeeDto } from './employee.seller.request.dtos';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { Seller } from 'src/modules/seller/seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { Types } from 'mongoose';

import { checkId } from 'src/common/utils';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { RequestToEmployee } from '../schemas/request-to-employee.schema';
import { Shift } from 'src/modules/shop/schemas/shift.schema';
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import {RequestToEmployeeStatus} from 'src/modules/employee/schemas/request-to-employee.schema';
import {EmployeeStatus} from 'src/modules/employee/schemas/employee.schema';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaginationQueryDto, PaginatedResponseDto, PaginationMetaDto } from 'src/common/dtos';
import { EmployeeFilterDto } from './employee.seller.filter.dto';
import { MessageResponseDto } from 'src/common/dtos';

@Injectable()
export class EmployeeSellerService {
  constructor(
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('RequestToEmployee') private requestToEmployeeModel: Model<RequestToEmployee>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    private readonly logsService: LogsService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) {}

  // ====================================================
  // REQUESTS TO EMPLOYEE
  // ====================================================
  async getSellerRequestsToEmployees(authedSeller: AuthenticatedUser): Promise<RequestToEmployeeResponseDto[]> {
    const requests = await this.requestToEmployeeModel.find({ from: new Types.ObjectId(authedSeller.id) })
    .populate('to', '_id telegramUsername phone employeeName')  
    .lean({ virtuals: true }).exec();

    return plainToInstance(RequestToEmployeeResponseDto, requests, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }


  async sendRequestToEmployeeByPhoneFromSeller(authedSeller: AuthenticatedUser, dto: RequestToEmployeeDto): Promise<RequestToEmployeeResponseDto[]> {
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).lean({ virtuals: true }).exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');
    verifyUserStatus(foundSeller);

    const phoneNumber = parsePhoneNumberFromString(dto.employeePhoneNumber, 'RU');
    if (!phoneNumber || !phoneNumber.isValid()) throw new BadRequestException('Некорректный номер телефона');

    const foundEmployee = await this.employeeModel.findOne({ phone: phoneNumber.number }).exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
    if (foundEmployee.employer) throw new ForbiddenException('Сотрудник уже работает у другого продавца');
    
    const requestToEmployee = await this.requestToEmployeeModel.findOne({ from: foundSeller._id, to: foundEmployee._id, requestStatus: RequestToEmployeeStatus.PENDING }).exec();
    if (requestToEmployee) throw new ForbiddenException('Запрос на прекрепление уже отправлен');

    const employeeRequest = new this.requestToEmployeeModel({
      from: foundSeller._id,
      to: foundEmployee._id,
      requestStatus: RequestToEmployeeStatus.PENDING
    });
    await employeeRequest.save();
    this.notificationService.notifyEmployeeAboutNewRequestFromSeller(foundEmployee.telegramId, employeeRequest._id.toString());
    
    return this.getSellerRequestsToEmployees(authedSeller);
  }


  async deleteRequestToEmployee(authedSeller: AuthenticatedUser, requestToEmployeeId: string): Promise<RequestToEmployeeResponseDto[]> {
    checkId([requestToEmployeeId]);

    const seller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    verifyUserStatus(seller);

    const request = await this.requestToEmployeeModel.findById(new Types.ObjectId(requestToEmployeeId)).select('_id from').lean({ virtuals: true }).exec();
    if (!request) throw new NotFoundException('Запрос не найден');
    if (request.from.toString() !== seller._id.toString()) throw new ForbiddenException('Недостаточно прав');

    await this.requestToEmployeeModel.findByIdAndDelete(new Types.ObjectId(requestToEmployeeId)).exec();

    return this.getSellerRequestsToEmployees(authedSeller);
  }



  // ====================================================
  // EMPLOYEES
  // ====================================================
  async getSellerEmployee(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).select('+sellerNote').lean({ virtuals: true }).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на получение информации о этом сотруднике');
    
    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }

  async getSellerEmployees(
    authedSeller: AuthenticatedUser, 
    paginationQuery: PaginationQueryDto,
    filterQuery?: EmployeeFilterDto
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;


    const query: any = { employer: new Types.ObjectId(authedSeller.id) };
    if (filterQuery?.shopId) query.pinnedTo = new Types.ObjectId(filterQuery.shopId);
    
    // Получаем общее количество сотрудников для пагинации
    const totalItems = await this.employeeModel.countDocuments(query).exec();
    
    // Получаем сотрудников с пагинацией
    const foundEmployees = await this.employeeModel.find(query)
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
    
    const items = plainToInstance(EmployeeResponseDto, foundEmployees, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  async updateSellerEmployee(authedSeller: AuthenticatedUser, employeeId: string, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).select('+sellerNote').exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
    
    // Обновляем сотрудника
    Object.assign(employee, dto);
    if (dto.pinnedTo) {
      checkId([dto.pinnedTo]);
      const foundShop = await this.shopModel.findById(new Types.ObjectId(dto.pinnedTo)).lean().exec();
      if (!foundShop) throw new NotFoundException('Магазин не найден');
      if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('У вас нет прав на обновление этого магазина');
      employee.pinnedTo = foundShop._id;
      employee.status = EmployeeStatus.RESTING;
    }

    await employee.save();
    
    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }
  
  
  async unpinEmployeeFromSeller(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');

    if (employee.pinnedTo) {
      const shift = await this.shiftModel.findOne({ shop: employee.pinnedTo, 'openedBy.employee': employee._id }).select('_id').exec();
      if (shift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');
    }
    const oldShopId = employee.pinnedTo?.toString() || null;
    
    employee.employer = null;
    employee.pinnedTo = null;
    employee.status = EmployeeStatus.NOT_PINNED;
    employee.sellerNote = null;
    employee.position = null;
    employee.salary = null;
    await employee.save();

    await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.MEDIUM,
      `Продавец(${authedSeller.id}) открепил сотрудника`
    );
    await this.logsService.addSellerLog(authedSeller.id, LogLevel.MEDIUM,
      `Продавец открепил сотрудника`
    );

    if (oldShopId) await this.logsService.addShopLog(oldShopId, LogLevel.MEDIUM,
      `Сотрудник(${employee._id.toString()}) открепился от магазина, так как продавец(${authedSeller.id}) открепил сотрудника`
    );
    
    return this.getSellerEmployee(authedSeller, employee._id.toString());
  }


  async unpinEmployeeFromShop(authedSeller: AuthenticatedUser, employeeId: string): Promise<MessageResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (employee.employer && employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
    if (!employee.pinnedTo) throw new ForbiddenException('Сотрудник не закреплен');
    if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

    await this.employeeModel.findByIdAndUpdate(employee._id, { pinnedTo: null }).exec();
    return { message: 'Сотрудник откреплен от магазина' };
  }
}