import { Injectable } from '@nestjs/common';
import { ImagesPort } from './images.port';
import { UpdateImageCommand, UploadImageCommand, DeleteImageCommand } from './images.commands';
import { Image } from './image.schema';
import { LocalImagesService } from './local-images.service';
import { CommonCommandOptions } from 'src/common/types/commands';
import { GetImageBufferQuery, GetImageUrlQuery } from './images.queries';
import { CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class ImagesFacade implements ImagesPort {
  constructor(private readonly localImagesService: LocalImagesService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getImageBuffer(query: GetImageBufferQuery, queryOptions?: CommonQueryOptions): Promise<Buffer> {
    return this.localImagesService.getImageBuffer(query, queryOptions);
  }

  getImageUrl(query: GetImageUrlQuery): string {
    return this.localImagesService.getImageUrl(query);
  }

  // ====================================================
  // COMMANDS
  // ====================================================
  async uploadImage(command: UploadImageCommand, commandOptions?: CommonCommandOptions): Promise<Image> {
    return this.localImagesService.uploadImage(command, commandOptions);
  }

  async updateImage(command: UpdateImageCommand, commandOptions?: CommonCommandOptions): Promise<Image> {
    return this.localImagesService.updateImage(command, commandOptions);
  }

  async deleteImage(imageId: string, commandOptions?: CommonCommandOptions): Promise<void> {
    return this.localImagesService.deleteImage(imageId, commandOptions);
  }
}