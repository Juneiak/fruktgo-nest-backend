import { Injectable } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssuePort } from './issue.port';

@Injectable()
export class IssueFacade implements IssuePort {
  constructor(private readonly issueService: IssueService) {}

  // ====================================================
  // COMMANDS
  // ====================================================

  
  // ====================================================
  // QUERIES
  // ====================================================

}