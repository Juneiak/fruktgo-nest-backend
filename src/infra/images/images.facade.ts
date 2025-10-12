import { Injectable } from '@nestjs/common';
import { ImagesPort } from './images.port';
import { UpdateImageCommand, UploadImageCommand } from './images.commands';
import { Image } from './image.schema';
import { LocalImagesService } from './local-images.service';
import { CommonCommandOptions } from 'src/common/types/comands';
import { GetImageBufferQuery } from './images.queries';
import { CommonQueryOptions } from 'src/common/types/queries';
import { ImageSize } from './images.enums';

@Injectable()
export class ImagesFacade implements ImagesPort {
  constructor(private readonly localImagesService: LocalImagesService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async uploadImage(command: UploadImageCommand, options: CommonCommandOptions): Promise<Image> {
    return this.localImagesService.uploadImage(command, options);
  }

  async updateImage(command: UpdateImageCommand, options: CommonCommandOptions): Promise<Image> {
    return this.localImagesService.updateImage(command, options);
  }

  async deleteImage(imageId: string, options: CommonCommandOptions): Promise<void> {
    return this.localImagesService.deleteImage(imageId, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getImageBuffer(query: GetImageBufferQuery, options: CommonQueryOptions): Promise<Buffer> {
    return this.localImagesService.getImageBuffer(query, options);
  }

  getImageUrl(imageId: string, size: ImageSize): string {
    return this.localImagesService.getImageUrl(imageId, size);
  }
}