import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageSchema, Image } from './image.schema';
import { LocalImagesService } from './local-images.service';
import { IMAGES_PORT } from './images.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }]),
  ],
  providers: [
    LocalImagesService,
    { provide: IMAGES_PORT, useExisting: LocalImagesService }
  ],
  exports: [IMAGES_PORT]
})
export class ImagesModule {}