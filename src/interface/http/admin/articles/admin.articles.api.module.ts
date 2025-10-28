
import { Module } from "@nestjs/common";
import { AdminArticlesRoleService } from "./admin.articles.role.service";
import { AdminArticlesController } from "./admin.articles.controller";
import { ArticleModule } from "src/modules/article/article.module";

@Module({
  imports: [ArticleModule],
  controllers: [AdminArticlesController],
  providers: [AdminArticlesRoleService],
})
export class AdminArticlesApiModule {}