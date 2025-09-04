
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  EmployeeResponseDto,
  RequestToEmployeeResponseDto
} from './employee.seller.response.dtos';
import { UpdateEmployeeDto, RequestToEmployeeDto } from './employee.seller.request.dtos';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { verifyUserStatus } from 'src/common/utils';
import { transformPaginatedResult } from 'src/common/utils';

import { checkId } from 'src/common/utils';
import { SellerModel } from 'src/modules/seller/seller.schema';
import { ShopModel } from 'src/modules/shop/shop/shop.schema';
import { RequestToEmployeeModel } from '../request-to-employee.schema';
import { EmployeeModel } from '../employee.schema';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { RequestToEmployeeStatus } from 'src/modules/employee/request-to-employee.schema';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { EmployeeFilterDto } from './employee.seller.filter.dto';


@Injectable()
export class EmployeeSellerService {
  constructor(
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('RequestToEmployee') private requestToEmployeeModel: RequestToEmployeeModel,

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
  };


  async getSellerEmployees(
    authedSeller: AuthenticatedUser, 
    paginationQuery: PaginationQueryDto,
    filterQuery?: EmployeeFilterDto
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const query: any = { employer: new Types.ObjectId(authedSeller.id) };
    if (filterQuery?.shopId) query.pinnedTo = new Types.ObjectId(filterQuery.shopId);

    const result = await this.employeeModel.paginate(query, {
      page,
      limit: pageSize,
      lean: true,
      leanWithId: false,
      sort: { createdAt: -1 },
    });

    return transformPaginatedResult(result, EmployeeResponseDto);
  };


  async updateSellerEmployee(authedSeller: AuthenticatedUser, employeeId: string, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).select('+sellerNote').exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
    if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

    const changes: string[] = [];

    if (dto.position !== undefined && dto.position !== employee.position) {
      const old = employee.position ?? '—';
      employee.position = dto.position;
      changes.push(`Должность: "${old}" -> "${dto.position ?? '—'}"`);
    }

    if (dto.salary !== undefined && dto.salary?.toString() !== employee.salary) {
      const old = employee.salary ?? 0;
      employee.salary = dto.salary?.toString() ?? null;
      changes.push(`Оклад: ${old} -> ${dto.salary ?? 0}`);
    }

    if (dto.sellerNote !== undefined && dto.sellerNote !== employee.sellerNote) {
      const old = employee.sellerNote ?? '—';
      employee.sellerNote = dto.sellerNote;
      changes.push(`Заметка продавца: "${old}" -> "${dto.sellerNote ?? '—'}"`);
    }

    if (dto.pinnedTo !== undefined) {
      if (dto.pinnedTo === null || dto.pinnedTo === '') {
        employee.pinnedTo = null;
        employee.status = EmployeeStatus.NOT_PINNED;
        changes.push('Откреплён от магазина');
      } else {
        checkId([dto.pinnedTo]);
        const foundShop = await this.shopModel.findById(new Types.ObjectId(dto.pinnedTo)).lean().exec();
        if (!foundShop) throw new NotFoundException('Магазин не найден');
        if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('У вас нет прав на обновление этого магазина');
        employee.pinnedTo = foundShop._id;
        employee.status = EmployeeStatus.RESTING;
        changes.push(`Закреплён за магазином ${foundShop._id.toString()}`);
      }
    }

    if (employee.isModified()) await employee.save();

    if (changes.length > 0) {
      const logText = `Продавец обновил сотрудника (${employee._id.toString()}):\n${changes.join('\n')}`;
      await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.LOW, logText);
    }
    return this.getSellerEmployee(authedSeller, employee._id.toString());
  };


  async unpinEmployeeFromSeller(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
    checkId([employeeId]);
    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
    if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

    const oldShopId = employee.pinnedTo?.toString() || null;
    
    employee.employer = null;
    employee.pinnedTo = null;
    employee.status = EmployeeStatus.NOT_PINNED;
    employee.sellerNote = null;
    employee.position = null;
    employee.salary = null;
    await employee.save();

    await this.logsService.addEmployeeLog(employee._id.toString(), LogLevel.MEDIUM,
      `Продавец(${authedSeller.id}) открепил сотрудника ${employee._id.toString()}`
    );
    await this.logsService.addSellerLog(authedSeller.id, LogLevel.MEDIUM,
      `Продавец открепил сотрудника ${employee._id.toString()}`
    );

    if (oldShopId) await this.logsService.addShopLog(oldShopId, LogLevel.MEDIUM,
      `Сотрудник(${employee._id.toString()}) открепился от магазина, так как продавец(${authedSeller.id}) открепил сотрудника`
    );
    
    return this.getSellerEmployee(authedSeller, employee._id.toString());
  };

}