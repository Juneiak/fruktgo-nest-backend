import { Controller, UseGuards } from '@nestjs/common';
import { EmployeeMeRoleService } from './employee.me.role.service';
import { ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';

@ApiTags('for employee')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('employee')
export class EmployeeMeController {
  constructor(private readonly employeeMeRoleService: EmployeeMeRoleService) {}


}