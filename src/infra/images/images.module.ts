import { Module, Global } from "@nestjs/common";
import { ImageSchema, Image } from "./infrastructure/image.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { LocalImagesService } from "./application/local-images.service";
import { ImagesFacade } from "./application/images.facade";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Image.name , schema: ImageSchema }]),
  ],
  providers: [
    LocalImagesService,
    ImagesFacade,
    { provide: 'ImagesPort', useExisting: ImagesFacade }
  ],
  exports: ['ImagesPort']
})
export class ImagesModule {}