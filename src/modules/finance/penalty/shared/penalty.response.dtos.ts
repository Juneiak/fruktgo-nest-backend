import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { Types } from 'mongoose';
import { PenaltyReason, PenaltyStatus } from '../penalty.schema';

// ====================================================
// PENALTY
// ====================================================

class PenaltyReferenceDto {
  @Expose()
  orderId?: string;

  @Expose()
  transactionId?: string;
}

export class PenaltyResponseDto {
  @Expose()
  penaltyId: string;

  @Expose()
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  @ExposeObjectId()
  shopAccount: Types.ObjectId;

  @ExposeObjectId()
  settlementPeriod: Types.ObjectId;

  @Expose()
  amount: number;

  @Expose()
  reason: PenaltyReason;

  @Expose()
  description: string;

  @Expose()
  status: PenaltyStatus;

  @Expose()
  @Type(() => PenaltyReferenceDto)
  references: PenaltyReferenceDto;
}
