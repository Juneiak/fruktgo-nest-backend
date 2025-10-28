import { VerifiedStatus, BlockStatus } from 'src/common/enums/common.enum';

export class CreateSellerCommand {
  constructor(
    public readonly payload: {
      sellerAccountId: string;
      telegramId: number;
      phone: string;
      companyName: string;
      inn: string;
      email: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
    },
    public readonly sellerId?: string
  ) {}
}

export class UpdateSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: {
      phone?: string;
      verifiedStatus?: VerifiedStatus;
      internalNote?: string | null;
      companyName?: string;
      inn?: string;
      email?: string;
      sellerLogo?: Express.Multer.File | null;
    }
  ) {}
}

export class BlockSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: {
      status: BlockStatus;
      reason?: string | null;
      code?: string | null;
      blockedUntil?: Date | null;
    }
  ) {}
}