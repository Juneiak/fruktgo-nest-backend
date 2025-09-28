
import { Module } from "@nestjs/common";
import { AdminBlogRoleService } from "./admin.blog.role.service";
import { AdminBlogController } from "./admin.blog.controller";

@Module({
  controllers: [AdminBlogController],
  providers: [AdminBlogRoleService],
})
export class AdminBlogApiModule {}