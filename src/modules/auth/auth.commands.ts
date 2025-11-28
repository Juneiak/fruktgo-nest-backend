import { LoginCodeType } from './auth.enums';
import { LoginCodeContext } from './login-code.schema';

export class GenerateCodeCommand {
  constructor(
    public readonly type: LoginCodeType,
    public readonly context?: LoginCodeContext,
    public readonly expiresInMs?: number,
  ) {}
}

export class ConfirmCodeCommand {
  constructor(
    public readonly code: string,
    public readonly type: LoginCodeType,
    public readonly entityId: string,
    public readonly entityModel: string,
  ) {}
}

export class InvalidateCodeCommand {
  constructor(public readonly codeId: string) {}
}

export class InvalidateCodesByEntityCommand {
  constructor(
    public readonly entityId: string,
    public readonly type: LoginCodeType,
  ) {}
}
