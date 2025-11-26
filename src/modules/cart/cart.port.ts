import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions } from 'src/common/types/queries';
import { Cart } from './cart.schema';
import {
  SelectShopCommand,
  UnselectShopCommand,
  AddProductCommand,
  UpdateProductQuantityCommand,
  RemoveProductCommand,
  SetDeliveryCommand,
  ClearCartCommand,
  CreateCartCommand,
} from './cart.commands';
import { GetCartQuery, ValidateCartQuery } from './cart.queries';
import { CartValidationResult } from './cart.results';

export interface CartPort {
  // ====================================================
  // QUERIES
  // ====================================================
  getCart(query: GetCartQuery, queryOptions?: CommonQueryOptions): Promise<Cart | null>;
  validateCart(query: ValidateCartQuery, queryOptions?: CommonQueryOptions): Promise<CartValidationResult>;

  // ====================================================
  // COMMANDS
  // ====================================================
  createCart(command: CreateCartCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  selectShop(command: SelectShopCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  unselectShop(command: UnselectShopCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  addProduct(command: AddProductCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  updateProductQuantity(command: UpdateProductQuantityCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  removeProduct(command: RemoveProductCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  setDelivery(command: SetDeliveryCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
  clearCart(command: ClearCartCommand, commandOptions?: CommonCommandOptions): Promise<Cart>;
}

export const CART_PORT = Symbol('CART_PORT');
