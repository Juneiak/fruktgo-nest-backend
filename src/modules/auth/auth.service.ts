import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoginCode } from './login-code.schema';
import { AuthPort, GeneratedCode } from './auth.port';
import * as AuthCommands from './auth.commands';
import * as AuthQueries from './auth.queries';
import { DomainError } from 'src/common/errors';
import { generateAuthCode } from 'src/common/utils';

const DEFAULT_CODE_EXPIRES_MS = 5 * 60 * 1000; // 5 минут

@Injectable()
export class AuthService implements AuthPort {
  constructor(
    @InjectModel(LoginCode.name) private readonly loginCodeModel: Model<LoginCode>,
  ) {}

  async generateCode(command: AuthCommands.GenerateCodeCommand): Promise<GeneratedCode> {
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + (command.expiresInMs ?? DEFAULT_CODE_EXPIRES_MS));

    const loginCode = await this.loginCodeModel.create({
      code,
      type: command.type,
      expiresAt,
      context: command.context ?? {},
    });

    return {
      code: loginCode.code,
      expiresAt: loginCode.expiresAt,
      codeId: loginCode._id.toString(),
    };
  }

  async confirmCode(command: AuthCommands.ConfirmCodeCommand): Promise<LoginCode> {
    const loginCode = await this.loginCodeModel.findOne({
      code: command.code,
      type: command.type,
      confirmed: false,
    });

    if (!loginCode) {
      throw DomainError.notFound('LoginCode', command.code);
    }

    if (loginCode.expiresAt < new Date()) {
      throw DomainError.invariant('Код истёк');
    }

    loginCode.confirmed = true;
    loginCode.entityId = new Types.ObjectId(command.entityId);
    loginCode.entityModel = command.entityModel;
    await loginCode.save();

    return loginCode;
  }

  async getCodeByValue(query: AuthQueries.GetCodeByValueQuery): Promise<LoginCode | null> {
    return this.loginCodeModel.findOne({
      code: query.code,
      type: query.type,
      confirmed: false,
      expiresAt: { $gt: new Date() },
    }).lean();
  }

  async getCodeById(query: AuthQueries.GetCodeByIdQuery): Promise<LoginCode | null> {
    return this.loginCodeModel.findById(query.codeId).lean();
  }

  async getActiveCodeByEntity(query: AuthQueries.GetActiveCodeByEntityQuery): Promise<LoginCode | null> {
    return this.loginCodeModel.findOne({
      entityId: new Types.ObjectId(query.entityId),
      type: query.type,
      confirmed: false,
      expiresAt: { $gt: new Date() },
    }).lean();
  }

  async invalidateCode(command: AuthCommands.InvalidateCodeCommand): Promise<void> {
    await this.loginCodeModel.deleteOne({ _id: new Types.ObjectId(command.codeId) });
  }

  async invalidateCodesByEntity(command: AuthCommands.InvalidateCodesByEntityCommand): Promise<void> {
    await this.loginCodeModel.deleteMany({
      entityId: new Types.ObjectId(command.entityId),
      type: command.type,
    });
  }
}
