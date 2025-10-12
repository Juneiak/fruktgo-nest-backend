export enum ImageEntityType {
  PRODUCT = 'product',
  SHOP = 'shop',
  CUSTOMER = 'customer',
  SHOP_PRODUCT = 'shopProduct',
  EMPLOYEE = 'employee',
  SELLER = 'seller',
  ARTICLE = 'article',
};

export enum ImageType {
  PRODUCT_CARD_IMAGE = 'productCardImage',
  SELLER_LOGO = 'sellerLogo',
  SHOP_PRODUCT_IMAGE = 'shopProductImage',
  ARTICLE_IMAGE = 'articleImage',
  SHOP_IMAGE = 'shopImage'
}

export enum ImageAccessLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
}

export enum ImageSize {
  ORIGINAL = 'original',  // Оригинальный размер без обработки
  SM = 'sm',              // Смартфоны (~30% от оригинала)
  MD = 'md',              // Планшеты (~60% от оригинала)
  LG = 'lg',              // Десктоп (~85% от оригинала)
}
