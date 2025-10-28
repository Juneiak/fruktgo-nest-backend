import { VerifiedStatus, BlockStatus } from 'src/common/enums/common.enum';

export class CreateShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      shopAccountId: string;
      ownerId: string;
      city: string;
      shopName: string;
      address?: {
        city?: string;
        street?: string;
        house?: string;
        latitude?: number;
        longitude?: number;
      };
    }
  ) {}
}

export class UpdateShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      aboutShop?: string | null;
      openAt?: string | null;
      closeAt?: string | null;
      minOrderSum?: number;
      verifiedStatus?: VerifiedStatus;
      internalNote?: string | null;
      sellerNote?: string | null;
      shopImageFile?: Express.Multer.File | null;
    },
  ) {}
}

export class BlockShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      status: BlockStatus;
      reason?: string | null;
      code?: string | null;
      blockedUntil?: Date | null;
    }
  ) {}
}