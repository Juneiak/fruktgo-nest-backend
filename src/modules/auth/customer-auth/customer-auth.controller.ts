import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { LoginCodeResponseDto} from './customer-auth.response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { CustomerAuthResponseDto } from './customer-auth.response.dto';


@Controller('')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @ApiTags('for public')
  @Get('auth/customer/login-code')
  getLoginCodeForCustomer(): Promise<LoginCodeResponseDto> {
    return this.customerAuthService.generateLoginCode();
  }


  @ApiTags('for customer')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/customer/me')
  getCustomerProfile(@GetUser() authedCustomer: AuthenticatedUser): Promise<CustomerAuthResponseDto> {
    return this.customerAuthService.checkAuth(authedCustomer);
  }
}