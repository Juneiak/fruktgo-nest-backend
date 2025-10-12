import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArticleSchema } from './article.schema';
import { BlogPublicService } from './roles/public/blog.public.service';
import { BlogPublicController } from './roles/public/blog.public.controller';
import { BlogAdminController } from './roles/admin/blog.admin.controller';
import { UploadsModule } from 'src/infra/images/images.module';
import { BlogAdminService } from './roles/admin/blog.admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Article', schema: ArticleSchema }]),
    UploadsModule
  ],
  controllers: [BlogAdminController, BlogPublicController],
  providers: [BlogAdminService, BlogPublicService],
  exports: [],
})
export class ArticleModule {}