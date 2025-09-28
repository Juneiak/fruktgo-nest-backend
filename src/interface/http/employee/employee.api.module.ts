import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { EmployeeAuthApiModule } from "./auth/employee.auth.api.module";
import { EmployeeMeApiModule } from "./me/employee.me.api.module";

@Module({
  imports: [
    RouterModule.register([
      { path: 'auth', module: EmployeeAuthApiModule },
      { path: 'me', module: EmployeeMeApiModule },
    ]),
  ],
})
export class EmployeeApiModule {}