import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  EmployeeResponseDto,
  RequestToEmployeeResponseDto
} from './seller.employees.response.dtos';
import { UpdateEmployeeDto, RequestToEmployeeDto } from './seller.employees.request.dtos';
import { LogLevel } from "src/infra/logs/infrastructure/log.schema";
import { checkEntityStatus } from 'src/common/utils';
import { transformPaginatedResult } from 'src/common/utils';
import { checkId } from 'src/common/utils';
import { SellerModel } from 'src/modules/seller/seller.schema';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { RequestToEmployeeModel } from 'src/modules/employee/request-to-employee.schema';
import { EmployeeModel } from 'src/modules/employee/employee.schema';
import { LogsService } from 'src/infra/log/application/log.service';
import { AuthenticatedUser } from 'src/common/types';
import { RequestToEmployeeStatus } from 'src/modules/employee/request-to-employee.schema';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { NotificationService } from 'src/infra/notification/notification.service';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { EmployeeQueryFilterDto } from './seller.employees.query.dtos';
import { UserType } from "src/common/enums/common.enum";


@Injectable()
export class SellerEmployeesRoleService {
  constructor(
    @InjectModel('Employee') private employeeModel: EmployeeModel,
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('RequestToEmployee') private requestToEmployeeModel: RequestToEmployeeModel,

    private readonly logsService: LogsService,

    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) { }

  // // ====================================================
  // // REQUESTS TO EMPLOYEE
  // // ====================================================
  // async getSellerRequestsToEmployees(authedSeller: AuthenticatedUser): Promise<RequestToEmployeeResponseDto[]> {
  //   const requests = await this.requestToEmployeeModel.find({ from: new Types.ObjectId(authedSeller.id) })
  //     .populate('to', '_id telegramUsername phone employeeName')
  //     .lean({ virtuals: true }).exec();

  //   return plainToInstance(RequestToEmployeeResponseDto, requests, { excludeExtraneousValues: true, exposeDefaultValues: true });
  // }


  // async sendRequestToEmployeeByPhoneFromSeller(authedSeller: AuthenticatedUser, dto: RequestToEmployeeDto): Promise<RequestToEmployeeResponseDto[]> {
  //   const okSeller = await checkEntityStatus(
  //     this.sellerModel,
  //     { _id: new Types.ObjectId(authedSeller.id) }
  //   );
  //   if (!okSeller) throw new NotFoundException('Продавец не найден');

  //   const phoneNumber = parsePhoneNumberFromString(dto.employeePhoneNumber, 'RU');
  //   if (!phoneNumber || !phoneNumber.isValid()) throw new BadRequestException('Некорректный номер телефона');

  //   const foundEmployee = await this.employeeModel.findOne({ phone: phoneNumber.number }).exec();
  //   if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
  //   if (foundEmployee.employer) throw new ForbiddenException('Сотрудник уже работает у другого продавца');

  //   const requestToEmployee = await this.requestToEmployeeModel
  //   .findOne({ from: new Types.ObjectId(authedSeller.id), to: new Types.ObjectId(foundEmployee._id),
  //     requestStatus: RequestToEmployeeStatus.PENDING })
  //   .exec();
  //   if (requestToEmployee) throw new ForbiddenException('Запрос на прекрепление уже отправлен');

  //   const createdRequestToEmployee = await this.requestToEmployeeModel.create({
  //     from: new Types.ObjectId(authedSeller.id),
  //     to: foundEmployee._id,
  //     requestStatus: RequestToEmployeeStatus.PENDING
  //   });

  //   this.notificationService.notifyEmployeeAboutNewRequestFromSeller(foundEmployee.telegramId, createdRequestToEmployee._id.toString());

  //   return this.getSellerRequestsToEmployees(authedSeller);
  // }


  // async deleteRequestToEmployee(authedSeller: AuthenticatedUser, requestToEmployeeId: string): Promise<RequestToEmployeeResponseDto[]> {
  //   checkId([requestToEmployeeId]);
  //   const okSeller = await checkEntityStatus(
  //     this.sellerModel,
  //     { _id: new Types.ObjectId(authedSeller.id)}
  //   );
  //   if (!okSeller) throw new NotFoundException('Продавец не найден');

  //   const request = await this.requestToEmployeeModel.findOneAndDelete({ _id: new Types.ObjectId(requestToEmployeeId), from: new Types.ObjectId(authedSeller.id) }).exec();
  //   if (!request) throw new NotFoundException('Запрос не найден или он вам не принадлежит');

  //   return this.getSellerRequestsToEmployees(authedSeller);
  // }



  // // ====================================================
  // // EMPLOYEES
  // // ====================================================
  // async getSellerEmployee(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
  //   checkId([employeeId]);
  //   const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(employeeId), employer: new Types.ObjectId(authedSeller.id) }).lean({ virtuals: true }).exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден или он не прикреплен к вам');

  //   return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  // };


  // async getSellerEmployees(
  //   authedSeller: AuthenticatedUser,
  //   paginationQuery: PaginationQueryDto,
  //   filterQuery?: EmployeeQueryFilterDto
  // ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
  //   const { page = 1, pageSize = 10 } = paginationQuery;

  //   const filter: any = { employer: new Types.ObjectId(authedSeller.id) };
  //   if (filterQuery?.shopId) filter.pinnedTo = new Types.ObjectId(filterQuery.shopId);

  //   const result = await this.employeeModel.paginate(filter, {
  //     page,
  //     limit: pageSize,
  //     lean: true,
  //     leanWithId: false,
  //     sort: { createdAt: -1 },
  //   });

  //   return transformPaginatedResult(result, EmployeeResponseDto);
  // };


  // async updateSellerEmployee(
  //   authedSeller: AuthenticatedUser,
  //   employeeId: string,
  //   dto: UpdateEmployeeDto
  // ): Promise<EmployeeResponseDto> {
  //   checkId([employeeId]);
  //   const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).select('+sellerNote').exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (!employee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
  //   if (employee.employer.toString() !== authedSeller.id) throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
  //   if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

  //   const oldData = employee.toObject();
  //   const changes: string[] = [];
  //   if (dto.position !== undefined && dto.position !== employee.position) {
  //     employee.position = dto.position;
  //     changes.push(`Должность: "${oldData.position}" -> "${dto.position ?? '—'}"`);
  //   }

  //   if (dto.salary !== undefined && dto.salary?.toString() !== employee.salary) {
  //     employee.salary = dto.salary?.toString() ?? null;
  //     changes.push(`Оклад: ${oldData.salary} -> ${dto.salary ?? 0}`);
  //   }

  //   if (dto.sellerNote !== undefined && dto.sellerNote !== employee.sellerNote) {
  //     employee.sellerNote = dto.sellerNote;
  //     changes.push(`Заметка продавца: "${oldData.sellerNote}" -> "${dto.sellerNote ?? '—'}"`);
  //   }

  //   if (dto.pinnedTo !== undefined) {
  //     if (dto.pinnedTo === null || dto.pinnedTo === '') {
  //       employee.pinnedTo = null;
  //       employee.status = EmployeeStatus.NOT_PINNED;
  //       changes.push('Откреплён от магазина');
  //     } else {
  //       checkId([dto.pinnedTo]);
  //       const foundShop = await this.shopModel
  //       .findOne({
  //         _id: new Types.ObjectId(dto.pinnedTo),
  //         owner: new Types.ObjectId(authedSeller.id)
  //       })
  //       .exec();

  //       if (!foundShop) throw new NotFoundException('Магазин не найден или он не принадлежит вам');
  //       employee.pinnedTo = new Types.ObjectId(dto.pinnedTo);
  //       employee.status = EmployeeStatus.RESTING;
  //       changes.push(`Закреплён за магазином ${foundShop._id.toString()}`);
  //     }
  //   }

  //   if (changes.length > 0 && employee.isModified()) {
  //     await employee.save();
  //     await this.logsService.addEmployeeLog(
  //       employee._id.toString(),
  //       `Продавец обновил сотрудника (${employee._id.toString()}):\n${changes.join('\n')}`,
  //       { logLevel: LogLevel.LOW, forRoles: [UserType.SELLER] }
  //     );
  //   }
  //   return this.getSellerEmployee(authedSeller, employee._id.toString());
  // };


  // async unpinEmployeeFromSeller(authedSeller: AuthenticatedUser, employeeId: string): Promise<EmployeeResponseDto> {
  //   checkId([employeeId]);
  //   const employee = await this.employeeModel.findOne({ _id: new Types.ObjectId(employeeId), employer: new Types.ObjectId(authedSeller.id) }).exec();
  //   if (!employee) throw new NotFoundException('Сотрудник не найден');
  //   if (employee.openedShift) throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');

  //   const oldShopId = employee.pinnedTo?.toString() || null;

  //   employee.employer = null;
  //   employee.pinnedTo = null;
  //   employee.status = EmployeeStatus.NOT_PINNED;
  //   employee.sellerNote = null;
  //   employee.position = null;
  //   employee.salary = null;

  //   if (employee.isModified()) {
  //     await employee.save();

  //     await this.logsService.addEmployeeLog(
  //       employee._id.toString(),
  //       `Продавец(${authedSeller.id}) открепил сотрудника ${employee._id.toString()}`,
  //       { logLevel: LogLevel.MEDIUM, forRoles: [UserType.SELLER] }
  //     );
  //     await this.logsService.addSellerLog(authedSeller.id,
  //       `Продавец открепил сотрудника ${employee._id.toString()}`,
  //       { logLevel: LogLevel.MEDIUM, forRoles: [UserType.SELLER] }
  //     );
  //     await this.logsService.addSellerLog(authedSeller.id,
  //       `Продавец открепил сотрудника ${employee._id.toString()}`,
  //       { logLevel: LogLevel.MEDIUM, forRoles: [UserType.SELLER] }
  //     );
  //     if (oldShopId) await this.logsService.addShopLog(oldShopId,
  //       `Сотрудник(${employee._id.toString()}) открепился от магазина, так как продавец(${authedSeller.id}) открепил сотрудника`,
  //       { logLevel: LogLevel.MEDIUM, forRoles: [UserType.SELLER] }
  //     );
  //   }
  //   return this.getSellerEmployee(authedSeller, employee._id.toString());
  // };

}