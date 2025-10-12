import { VerifiedStatus } from 'src/common/enums/common.enum';
import { BlockPayload } from 'src/common/types/comands';

export type CreateSellerPayload = {
  sellerAccountId: string;
  telegramId: number;
  phone: string;
  companyName: string;
  inn: string;
  email: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export class CreateSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: CreateSellerPayload
  ) {}
}

export type UpdateSellerPayload = {
  phone?: string,
  verifiedStatus?: VerifiedStatus,
  internalNote?: string | null,
  companyName?: string,
  inn?: string,
  email?: string,
  sellerLogo?: Express.Multer.File | null,
}

export class UpdateSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: UpdateSellerPayload,
  ) {}
}

export class BlockSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: BlockPayload
  ) {}
}