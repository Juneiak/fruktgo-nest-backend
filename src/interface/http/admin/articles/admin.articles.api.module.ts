
import { Module } from "@nestjs/common";
import { AdminBlogRoleService } from "./admin.blog.role.service";
import { AdminBlogController } from "./admin.blog.controller";

@Module({
  controllers: [AdminArticlesController],
  providers: [AdminArticlesRoleService],
})
export class AdminArticlesApiModule {}