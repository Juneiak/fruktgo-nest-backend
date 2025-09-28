import { Module, Global } from "@nestjs/common";
import { ImagesService } from "./images.service";
import { ImageSchema, Image } from "./infrastructure/image.schema";
import { MongooseModule } from "@nestjs/mongoose";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Image.name , schema: ImageSchema }]),
  ],
  providers: [ImagesService],
  exports: [ImagesService]
})
export class ImagesModule {}