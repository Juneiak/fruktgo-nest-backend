import { RouterModule } from "@nestjs/core";
import { Module } from "@nestjs/common";

import { PublicBlogApiModule } from "./aticles/public.blog.api.module";
import { PublicDadataApiModule } from "./dadata/public.dadata.api.module";
import { PublicShopsApiModule } from "./shops/public.shops.api.module";
import { PublicShopProductsApiModule } from "./shop-products/public.shop-products.api.module";

@Module({
  imports: [
    RouterModule.register([
      { path: 'blog', module: PublicBlogApiModule },
      { path: 'dadata', module: PublicDadataApiModule },
      { path: 'shop-products', module: PublicShopProductsApiModule },
      { path: 'shops', module: PublicShopsApiModule },
    ]),
  ],
})
export class PublicApiModule {}