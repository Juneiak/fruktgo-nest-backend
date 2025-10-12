import { VerifiedStatus } from 'src/common/enums/common.enum';
import { BlockPayload } from 'src/common/types/comands';

export type CreateShopPayload = {
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

export class CreateShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: CreateShopPayload
  ) {}
}

export type UpdateShopPayload = {
  aboutShop?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  minOrderSum?: number;
  verifiedStatus?: VerifiedStatus;
  internalNote?: string | null;
  sellerNote?: string | null;
  shopImage?: Express.Multer.File | null;
}

export class UpdateShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: UpdateShopPayload,
  ) {}
}

export class BlockShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: BlockPayload
  ) {}
}