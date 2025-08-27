import { Controller, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { LoginCodeForCustomerDto} from './customer-auth.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { CustomerAuthDto } from './customer-auth.dtos';
@Controller('')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа клиента'})
  @ApiOkResponse({type: LoginCodeForCustomerDto})
  // ====================================================
  @Get('auth/customer/login-code')
  getLoginCodeForCustomer(): Promise<LoginCodeForCustomerDto> {
    return this.customerAuthService.generateLoginCode();
  }

  @ApiTags('for customer')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего клиента'})
  @ApiOkResponse({type: CustomerAuthDto})
  @ApiBearerAuth()
  // ====================================================
  @UseGuards(JwtAuthGuard)
  @Get('auth/customer/me')
  getCustomerProfile(@GetUser() authedCustomer: AuthenticatedUser): Promise<CustomerAuthDto> {
    return this.customerAuthService.checkAuth(authedCustomer);
  }
}