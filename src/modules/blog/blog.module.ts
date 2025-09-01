import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArticleSchema } from './article.schema';
import { BlogPublicService } from './public/blog.public.service';
import { BlogPublicController } from './public/blog.public.controller';
import { BlogAdminController } from './admin/blog.admin.controller';
import { UploadsModule } from 'src/common/modules/uploads/uploads.module';
import { BlogAdminService } from './admin/blog.admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Article', schema: ArticleSchema }]),
    UploadsModule
  ],
  controllers: [BlogAdminController, BlogPublicController],
  providers: [BlogAdminService, BlogPublicService],
  exports: [],
})
export class BlogModule {}