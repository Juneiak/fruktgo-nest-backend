import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicDadataController } from "./public.dadata.controller";
import { PublicDadataService } from "./public.dadata.service";

@Module({
  imports: [ConfigModule],
  controllers: [PublicDadataController],
  providers: [PublicDadataService],
  exports: [PublicDadataService],
})
export class DadataModule {}
