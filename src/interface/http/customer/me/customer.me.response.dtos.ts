import { VerifiedStatus } from 'src/common/enums/common.enum';
import { Expose } from 'class-transformer';
import {
  BlockedResponseDto,
  AddressResponseDto
} from 'src/interface/http/common/common.response.dtos';


export class CustomerResponseDto {
  @Expose() customerId: string;
  @Expose() blocked: BlockedResponseDto;
  @Expose() selectedAddressId: AddressResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() telegramId: number;
  @Expose() phone?: string | null;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
}

export class CustomerPreviewResponseDto {
  @Expose() blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() phone: string;
  @Expose() selectedAddressId: AddressResponseDto;
  @Expose() bonusPoints: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramId: number;
  @Expose() customerId: string;
}
