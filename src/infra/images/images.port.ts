import { Image } from './image.schema';
import { UploadImageCommand, UpdateImageCommand, DeleteImageCommand } from './images.commands';
import { GetImageBufferQuery, GetImageUrlQuery } from './images.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions } from 'src/common/types/queries';

export interface ImagesPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getImageBuffer(query: GetImageBufferQuery, queryOptions?: CommonQueryOptions): Promise<Buffer>;
  getImageUrl(query: GetImageUrlQuery): string;

  // ====================================================
  // COMMANDS
  // ==================================================== 
  uploadImage(command: UploadImageCommand, commandOptions?: CommonCommandOptions): Promise<Image>;
  updateImage(command: UpdateImageCommand, commandOptions?: CommonCommandOptions): Promise<Image>;
  deleteImage(imageId: string, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const IMAGES_PORT = Symbol('IMAGES_PORT');