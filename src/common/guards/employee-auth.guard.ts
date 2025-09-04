// src/common/guards/employee-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Employee } from "src/modules/employee/employee.schema";
import { AuthenticatedEmployee } from "src/common/types";

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel('Employee') private employeeModel: Model<Employee>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const employeeToken = request.headers['x-employee-token'];
    
    if (!employeeToken) throw new UnauthorizedException('Отсутствует токен сотрудника');
    
    // Получаем ID магазина из объекта пользователя (request.user)
    const user = request.user;
    if (!user || !user.id || user.type !== 'shop') throw new UnauthorizedException('Магазин не авторизован или не имеет ID');
    
    // Проверяем токен сотрудника в контексте магазина
    const employee = await this.validateEmployeeTokenForShop(employeeToken, user.id);
    
    if (!employee) throw new UnauthorizedException('Недействительный токен сотрудника или сотрудник не имеет прав для этого магазина');
    
    // Добавляем информацию о сотруднике в запрос
    request.employee = employee;
    
    return true;
  }
  
  // Метод для проверки токена сотрудника из заголовка X-Employee-Token
  async validateEmployeeTokenForShop(employeeToken: string, shopId: string): Promise<AuthenticatedEmployee | null> {
    try {
      // Проверяем валидность JWT
      const payload = this.jwtService.verify(employeeToken);
      
      // Проверяем, что это токен сотрудника и он содержит нужный shopId
      if (payload.type !== 'employee' || payload.shopId !== shopId) return null;
      
      // Ищем сотрудника в базе данных
      const employee = await this.employeeModel.findById(payload.employeeId).select("_id pinnedTo employeeName employer telegramId").lean().exec();
      if (!employee) return null;
      
      // Проверяем, закреплен ли сотрудник за этим магазином
      if (employee.pinnedTo && employee.pinnedTo.toString() !== shopId) return null;
      
      return {
        id: employee._id.toString(),
        employeeName: employee.employeeName,
        telegramId: employee.telegramId,
        employer: employee.employer?.toString() || null,
        pinnedTo: employee.pinnedTo?.toString() || null
      };

    } catch (e) {
      // При любой ошибке (невалидный токен, истекший срок и т.д.)
      return null;
    }
  }
}