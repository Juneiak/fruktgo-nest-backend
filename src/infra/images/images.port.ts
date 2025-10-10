// application/seller.port.ts
import { Image } from '../infrastructure/image.schema';
import { UploadImageCommand, UpdateImageCommand } from './images.commands';
import { GetImageBufferQuery } from './images.queries';
import { CommonCommandOptions } from 'src/common/types/comand-options';
import { CommonQueryOptions } from 'src/common/types/query-options';

export interface ImagesPort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  uploadImage(command: UploadImageCommand, options: CommonCommandOptions): Promise<Image>;
  updateImage(command: UpdateImageCommand, options: CommonCommandOptions): Promise<Image>;
  deleteImage(imageId: string, options: CommonCommandOptions): Promise<void>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getImageBuffer(query: GetImageBufferQuery, options: CommonQueryOptions): Promise<Buffer>;
}