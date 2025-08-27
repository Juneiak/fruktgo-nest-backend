import { Controller, Delete, Patch, Get,Body, Param, UseGuards, Post } from '@nestjs/common';
import { EmployeeForEmployeeService } from './employee-for-employee.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiBody} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { EmployeeForSellerResponseDto, UpdateEmployeeDto, PinEmployeeDto } from './employees-for-employee.dtos';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';

@ApiTags('for employee')
@ApiBearerAuth('JWT-auth')
@Controller('employees/for-employee')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('employee')
export class EmployeeForEmployeeController {
  constructor(private readonly employeeForEmployeeService: EmployeeForEmployeeService) {}


}