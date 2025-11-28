import { LoginCodeType } from './auth.enums';

export class GetCodeByValueQuery {
  constructor(
    public readonly code: string,
    public readonly type: LoginCodeType,
  ) {}
}

export class GetCodeByIdQuery {
  constructor(public readonly codeId: string) {}
}

export class GetActiveCodeByEntityQuery {
  constructor(
    public readonly entityId: string,
    public readonly type: LoginCodeType,
  ) {}
}
