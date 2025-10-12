import { Module } from "@nestjs/common";
import { PublicBlogRoleService } from "./public.blog.role.service";
import { PublicBlogController } from "./public.blog.controller";

@Module({
  controllers: [PublicBlogController],
  providers: [PublicBlogRoleService],
})
export class PublicBlogApiModule {}