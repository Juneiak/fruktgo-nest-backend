import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AdminApiModule } from './admin/admin.api.module';

@Module({
  imports: [
    AdminApiModule,
    RouterModule.register([
      { path: 'admin',  module: AdminApiModule },
    ]),
  ],
})
export class HttpApiModule {}