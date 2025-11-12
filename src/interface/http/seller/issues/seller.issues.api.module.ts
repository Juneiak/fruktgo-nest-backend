import { Module } from '@nestjs/common';
import { SellerIssuesController } from './seller.issues.controller';
import { SellerIssuesRoleService } from './seller.issues.role.service';

@Module({
  controllers: [SellerIssuesController],
  providers: [SellerIssuesRoleService],
})
export class SellerIssuesApiModule {}
