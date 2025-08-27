import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { Types } from 'mongoose';
import { SellerAccountStatus } from './schemas/seller-account.schema';
import { WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';

// ====================================================
// SELLER ACCOUNT
// ====================================================

class BankDetailsDto {
    accountNumber: string;
    bankName: string;
    bik: string;
    correspondentAccount: string;
    accountHolder: string;
    inn: string;
}

export class SellerAccountResponseDto {
    @Expose()
    sellerAccountId: string;
    
    @Expose({ groups: ['admin'] })
    createdAt: Date;
    
    @Expose({ groups: ['admin'] })
    updatedAt: Date;
  
    @ExposeObjectId()
    seller: Types.ObjectId;
  
    @Expose()
    balance: number;
  
    @Expose()
    totalWithdrawnAmount: number;
    
    @Expose()
    @Type(() => BankDetailsDto)
    bankDetails: BankDetailsDto;
    
    @Expose()
    status: SellerAccountStatus;
    
    @Expose()
    statusReason: string;
}


// ====================================================
// WITHDRAWAL REQUEST
// ====================================================

export class WithdrawalRequestResponseDto {
    @Expose()
    withdrawalRequestId: string;
    
    @Expose({ groups: ['admin'] })
    createdAt: Date;
    
    @Expose({ groups: ['admin'] })
    updatedAt: Date;
    
    @ExposeObjectId()
    sellerAccount: Types.ObjectId;
    
    @Expose()
    amount: number;
    
    @Expose()
    status: WithdrawalRequestStatus;
    
    @Expose()
    completedAt: Date;
    
    @Expose()
    @Type(() => BankDetailsDto)
    bankDetails: BankDetailsDto;
    
    @Expose()
    adminComment: string | null;
    
    @Expose({ groups: ['admin'] })
    externalTransactionId: string | null;
}
