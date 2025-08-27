import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { rootMongooseTestModule } from './helpers/database.module';
import { SellersModule } from '../src/modules/seller/sellers.module';
import { ShopsModule } from '../src/modules/shops/shops.module';
// Импортируйте другие необходимые модули

@Module({
  imports: [
    rootMongooseTestModule(),
    SellersModule,
    ShopsModule,
    // Другие модули
  ],
})
export class AppTestModule {}