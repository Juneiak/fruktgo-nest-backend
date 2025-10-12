import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IssueSchema, Issue } from './issue.schema';
import { IssueService } from './issue.service';
import { IssueFacade } from './issue.facade';
import { ISSUE_PORT } from './issue.port';
import { SellerModule } from '../seller/seller.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Issue.name, schema: IssueSchema }]),
    SellerModule,  // Для доступа к SellerPort
  ],
  providers: [
    IssueService,
    IssueFacade,
    { provide: ISSUE_PORT, useExisting: IssueFacade }
  ],
  exports: [ISSUE_PORT],
})
export class IssueModule {}