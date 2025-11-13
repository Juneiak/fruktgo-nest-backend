import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IssueSchema, Issue } from './issue.schema';
import { IssueService } from './issue.service';
import { ISSUE_PORT } from './issue.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Issue.name, schema: IssueSchema }]),
  ],
  providers: [
    IssueService,
    { provide: ISSUE_PORT, useExisting: IssueService }
  ],
  exports: [ISSUE_PORT],
})
export class IssueModule {}