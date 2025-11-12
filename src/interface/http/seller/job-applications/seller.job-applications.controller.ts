import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { SellerJobApplicationsRoleService } from './seller.job-applications.role.service';
import { JobApplicationResponseDto } from './seller.job-applications.response.dtos';
import { CreateJobApplicationDto } from './seller.job-applications.request.dtos';
import { JobApplicationQueryFilterDto } from './seller.job-applications.query.dtos';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerJobApplicationsController {
  constructor(
    private readonly sellerJobApplicationsRoleService: SellerJobApplicationsRoleService,
  ) {}

  @ApiOperation({summary: 'Получение списка заявок на прикрепление сотрудников'})
  @Get('')
  async getJobApplications(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() filterQuery: JobApplicationQueryFilterDto,
  ): Promise<PaginatedResponseDto<JobApplicationResponseDto>> {
    return this.sellerJobApplicationsRoleService.getJobApplications(
      authedSeller,
      paginationQuery,
      filterQuery
    );
  }
  

  @ApiOperation({summary: 'Создание заявки на прикрепление сотрудника'})
  @Post('')
  async createJobApplication(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateJobApplicationDto,
  ): Promise<JobApplicationResponseDto> {
    return this.sellerJobApplicationsRoleService.createJobApplication(authedSeller, dto);
  }


  @ApiOperation({summary: 'Удаление заявки на прикрепление сотрудника'})
  @Delete(':jobApplicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJobApplication(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('jobApplicationId') jobApplicationId: string,
  ): Promise<void> {
    return this.sellerJobApplicationsRoleService.deleteJobApplication(authedSeller, jobApplicationId);
  }
}
