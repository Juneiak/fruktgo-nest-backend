import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DadataController } from "./dadata.controller";
import { DadataService } from "./dadata.service";

@Module({
  imports: [ConfigModule],
  controllers: [DadataController],
  providers: [DadataService],
  exports: [DadataService],
})
export class DadataModule {}
