import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssueUserType, IssueStatus, IssueLevel, Issue } from 'src/modules/support/issue.schema';
import { CreatedIssueResponseDto, IssuePreviewResponseDto, IssueFullResponseDto } from './admin.support.response.dtos';
import { UpdateIssueDto } from './admin.support.request.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { NotificationService } from 'src/infra/notification/notification.service';
import { forwardRef, Inject } from '@nestjs/common';
import { IssueStatusFilter } from 'src/modules/support/issue.schema';
import { Customer } from 'src/modules/customer/infrastructure/schemas/customer.schema';
import { Seller } from 'src/modules/seller/seller.schema';
import { IssueQueryDto } from './admin.support.query';

@Injectable()
export class AdminSupportRoleService {
  constructor(
    @InjectModel('Issue') private issueModel: Model<Issue>,
    @InjectModel('Customer') private customerModel: Model<Customer>,
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) {}

  async createIssueToSupport(
    userId: string,
    userType: IssueUserType,
    telegramId: number | null,
    issueText: string,
  ): Promise<CreatedIssueResponseDto> {
    const issue = new this.issueModel({
      fromUserType: userType,
      from: userId,
      issueText,
      fromTelegramId: telegramId,
      status: IssueStatus.NEW,
      level: IssueLevel.LOW,
    });
    const savedIssue = await issue.save();
    return plainToInstance(CreatedIssueResponseDto, savedIssue, {excludeExtraneousValues: true});
  }

  async updateIssue(authedAdmin: AuthenticatedUser, issueId: string, dto: UpdateIssueDto): Promise<IssueFullResponseDto> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) throw new NotFoundException('Заявка не найдена');
    
    // Обновляем поля, если они предоставлены
    if (dto.status) issue.status = dto.status;
    if (dto.result !== undefined) issue.result = dto.result;
    if (dto.level) issue.level = dto.level;
    
    // Сохраняем изменения
    const updatedIssue = await issue.save();

    // Отправляем уведомление клиенту
    if (updatedIssue.fromUserType === IssueUserType.CUSTOMER) {
      await this.notificationService.notifyCustomerAboutIssueUpdate(updatedIssue._id.toString());
    } else if (updatedIssue.fromUserType === IssueUserType.SELLER) {
      await this.notificationService.notifySellerAboutIssueUpdate(updatedIssue._id.toString());
    }
    return plainToInstance(IssueFullResponseDto, updatedIssue, {excludeExtraneousValues: true});
  }

  async getIssue(authedAdmin: AuthenticatedUser, issueId: string): Promise<IssueFullResponseDto> {
    checkId([issueId]);
    // Сначала находим заявку
    const rawIssue = await this.issueModel.findById(new Types.ObjectId(issueId)).exec();
    if (!rawIssue) throw new NotFoundException('Заявка не найдена');
    
    // Затем делаем популяцию на основе типа пользователя
    let from: any;
    
    // Преобразуем тип пользователя в имя модели в точности как оно зарегистрировано в MongoDB
    if (rawIssue.fromUserType === IssueUserType.CUSTOMER) {
      from = await this.customerModel.findById(rawIssue.from).select('_id email phone telegramId telegramUsername telegramFirstName telegramLastName').lean({virtuals: true}).exec();

    } else if (rawIssue.fromUserType === IssueUserType.SELLER) {
      from = await this.sellerModel.findById(rawIssue.from).select('_id email phone telegramId telegramUsername telegramFirstName telegramLastName').lean({virtuals: true}).exec();
    } else throw new BadRequestException(`Неизвестный тип пользователя: ${rawIssue.fromUserType}`);
    from.id = from._id.toString();
    // Теперь делаем популяцию с явно указанной моделью
    const issue = await this.issueModel.findById(rawIssue._id).lean({ virtuals: true }).exec();
    return plainToInstance(IssueFullResponseDto, {...issue, from: from}, {excludeExtraneousValues: true});
  }

  async getIssues(
    authedAdmin: AuthenticatedUser, 
    filterDto: IssueQueryDto,
    paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssuePreviewResponseDto>> {
    // Инициализируем базовый запрос
    let query: any = {};
    
    // Определяем статус в зависимости от параметра statusFilter
    if (filterDto.status === IssueStatusFilter.ACTIVE) query.status = { $ne: IssueStatus.CLOSED };
    if (filterDto.status === IssueStatusFilter.ALL) delete query.status;
    if (filterDto.status === IssueStatusFilter.NEW) query.status = IssueStatus.NEW;
    if (filterDto.status === IssueStatusFilter.IN_PROGRESS) query.status = IssueStatus.IN_PROGRESS;
    if (filterDto.status === IssueStatusFilter.CLOSED) query.status = IssueStatus.CLOSED;
    
    // Если указан тип пользователя, фильтруем по нему
    if (filterDto.userType) query.fromUserType = filterDto.userType;
    if (filterDto.userId) query.from = filterDto.userId;
    
    // Получаем общее количество заявок для пагинации
    const totalItems = await this.issueModel.countDocuments(query).exec();
    
    // Инициализируем запрос
    let issuesQuery = this.issueModel.find(query).sort({ createdAt: -1 });
    
    // Если пагинация указана, применяем соответствующие параметры
    if (paginationQuery) {
      const { page = 1, pageSize = 10 } = paginationQuery;
      const skip = (page - 1) * pageSize;
      
      issuesQuery = issuesQuery.skip(skip).limit(pageSize);
      
      // Получаем заявки с пагинацией
      const issues = await issuesQuery.lean({ virtuals: true }).exec();
      
      // Формируем метаданные пагинации
      const pagination = {
        totalItems,
        pageSize,
        currentPage: page,
        totalPages: Math.ceil(totalItems / pageSize)
      } as PaginationMetaDto;
      
      const items = plainToInstance(IssuePreviewResponseDto, issues, {excludeExtraneousValues: true});
      return { items, pagination };
    } else {
      // Если пагинация не указана, вытаскиваем все записи
      const issues = await issuesQuery.lean({ virtuals: true }).exec();
      
      // Формируем метаданные пагинации для полного результата
      const pagination = {
        totalItems,
        pageSize: totalItems,
        currentPage: 1,
        totalPages: 1
      } as PaginationMetaDto;
      
      const items = plainToInstance(IssuePreviewResponseDto, issues, {excludeExtraneousValues: true});
      return { items, pagination };
    }
  }



  // ====================================================
  // FOR CUSTOMER
  // ====================================================
  async getCustomerIssues(customerId: string): Promise<IssuePreviewResponseDto[]> {
    // Получаем все заявки клиента, отсортированные по дате создания (сначала новые)
    const issues = await this.issueModel.find({
      fromUserType: IssueUserType.CUSTOMER,
      from: new Types.ObjectId(customerId)
    })
    .sort({ createdAt: -1 }).lean({ virtuals: true }).exec();

    return plainToInstance(IssuePreviewResponseDto, issues, {excludeExtraneousValues: true});
  }

  async getCustomerIssue(customerId: string, issueId: string): Promise<Issue> {
    // Проверяем корректность ID
    try {
      // Проверяем заявку по ID и проверяем, что она принадлежит данному клиенту
      const foundIssue = await this.issueModel.findOne({
        _id: new Types.ObjectId(issueId),
        fromUserType: IssueUserType.CUSTOMER,
        from: new Types.ObjectId(customerId)
      })
      .lean({ virtuals: true }).exec();
      if (!foundIssue) throw new NotFoundException('Заявка не найдена или не принадлежит данному клиенту');

      return foundIssue as Issue;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Некорректный ID заявки');
    }
  }



  // ====================================================
  // FOR SELLER
  // ====================================================
  async getSellerIssues(sellerId: string): Promise<IssuePreviewResponseDto[]> {
    // Получаем все заявки продавца, отсортированные по дате создания (сначала новые)
    const issues = await this.issueModel.find({
      fromUserType: IssueUserType.SELLER,
      from: new Types.ObjectId(sellerId)
    })
    .sort({ createdAt: -1 }).lean({ virtuals: true }).exec();

    return plainToInstance(IssuePreviewResponseDto, issues, {excludeExtraneousValues: true});
  }

  async getSellerIssue(sellerId: string, issueId: string): Promise<Issue> {
    // Проверяем корректность ID
    try {
      // Получаем заявку по ID и проверяем, что она принадлежит данному продавцу
      const issue = await this.issueModel.findOne({
        _id: new Types.ObjectId(issueId),
        fromUserType: IssueUserType.SELLER,
        from: new Types.ObjectId(sellerId)
      })
      .lean({ virtuals: true }).exec();
      if (!issue) throw new NotFoundException('Заявка не найдена или не принадлежит данному продавцу');

      return issue;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Некорректный ID заявки');
    }
  }

}