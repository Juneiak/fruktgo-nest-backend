import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArticleSchema } from './article.schema';
import { BlogService } from './blog.service';
import { BlogAdminController, BlogPublicController } from './blog.controller';
import { UploadsModule } from 'src/common/modules/uploads/uploads.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Article', schema: ArticleSchema }]),
    UploadsModule
  ],
  controllers: [BlogAdminController, BlogPublicController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}