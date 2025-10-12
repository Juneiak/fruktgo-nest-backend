import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageSchema, Image } from './image.schema';
import { LocalImagesService } from './local-images.service';
import { ImagesFacade } from './images.facade';
import { IMAGES_PORT } from './images.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }]),
  ],
  providers: [
    LocalImagesService,
    ImagesFacade,
    { provide: IMAGES_PORT, useExisting: ImagesFacade }
  ],
  exports: [IMAGES_PORT]
})
export class ImagesModule {}