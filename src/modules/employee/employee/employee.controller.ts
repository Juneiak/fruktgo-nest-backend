import { Controller, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';

@ApiTags('for employee')
@ApiBearerAuth('JWT-auth')
@Controller('employees/me')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}


}