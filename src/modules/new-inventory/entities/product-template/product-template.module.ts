import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductTemplate,
  ProductTemplateSchema,
} from './product-template.schema';
import { ProductTemplateService } from './product-template.service';
import { PRODUCT_TEMPLATE_PORT } from './product-template.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductTemplate.name, schema: ProductTemplateSchema },
    ]),
  ],
  providers: [
    ProductTemplateService,
    {
      provide: PRODUCT_TEMPLATE_PORT,
      useExisting: ProductTemplateService,
    },
  ],
  exports: [PRODUCT_TEMPLATE_PORT, ProductTemplateService],
})
export class ProductTemplateModule {}
