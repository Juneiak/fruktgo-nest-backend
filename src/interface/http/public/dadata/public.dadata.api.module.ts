import { Module } from "@nestjs/common";
import { PublicDadataRoleService } from './public.dadata.role.service';
import { PublicDadataController } from './public.dadata.controller';

@Module({
  controllers: [PublicDadataController],
  providers: [PublicDadataRoleService],
})
export class PublicDadataApiModule {}