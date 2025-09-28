// application/seller.port.ts
import { Image } from '../infrastructure/image.schema';
import { PaginateResult } from 'mongoose';

export interface ImagesPort {
  uploadImage(image: Image): Promise<Image>;
  getImage(id: string): Promise<Image>;
  deleteImage(id: string): Promise<void>;
}