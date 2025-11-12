import { Module } from "@nestjs/common";
import { PublicArticlesRoleService } from "./public.aticles.role.service";
import { PublicArticlesController } from "./public.aticles.controller";
import { ArticleModule } from "src/modules/article/article.module";

@Module({
  imports: [ArticleModule],
  controllers: [PublicArticlesController],
  providers: [PublicArticlesRoleService],
})
export class PublicArticlesApiModule {}