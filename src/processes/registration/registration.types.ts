import { Customer } from 'src/modules/customer';
import { Seller } from 'src/modules/seller';
import { Employee } from 'src/modules/employee';

// ====================================================
// CUSTOMER
// ====================================================
export interface RegisterCustomerInput {
  telegramId: number;
  customerName: string;
  phone: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  email?: string;
}

export interface RegisterCustomerOutput {
  customer: Customer;
}

// ====================================================
// SELLER
// ====================================================
export interface RegisterSellerInput {
  telegramId: number;
  phone: string;
  companyName: string;
  inn: string;
  email: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export interface RegisterSellerOutput {
  seller: Seller;
}

// ====================================================
// EMPLOYEE (Invite)
// ====================================================
export interface CreateEmployeeInviteInput {
  employerId: string;        // Seller ID
  employeeName: string;
  phone: string;
  pinnedTo?: string;         // Shop ID (optional)
  position?: string;
  salary?: string;
  sellerNote?: string;
}

export interface CreateEmployeeInviteOutput {
  employee: Employee;
  inviteToken: string;
  inviteUrl: string;
}

export interface AcceptEmployeeInviteInput {
  inviteToken: string;
  telegramId: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export interface AcceptEmployeeInviteOutput {
  employee: Employee;
}
