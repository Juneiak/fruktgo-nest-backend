import { Image } from './image.schema';
import { UploadImageCommand, UpdateImageCommand } from './images.commands';
import { GetImageBufferQuery } from './images.queries';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonQueryOptions } from 'src/common/types/queries';
import { ImageSize } from './images.enums';

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
  getImageUrl(imageId: string, size: ImageSize): string;
}

export const IMAGES_PORT = Symbol('IMAGES_PORT');