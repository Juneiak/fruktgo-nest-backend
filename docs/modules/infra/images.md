# Images Infrastructure Module

> `src/infra/images`

Модуль отвечает за загрузку и хранение изображений. В текущей реализации используется `LocalImagesService`, который сохраняет WebP‑версии разных размеров на диск и хранит метаданные в MongoDB.

## 1. Обзор

- валидация загружаемых файлов (MIME, размер, расширение);
- генерация размеров (SM/MD/LG/ORIGINAL) через `sharp` с конвертацией в WebP;
- хранение сведений о доступе (PUBLIC/PRIVATE/RESTRICTED) и привязки к сущностям (Product, Shop, ShopProduct, Article и т.д.);
- выдача буфера изображения и генерация относительных URL (`/images/:size/:imageId`).

## 2. Схема данных

```typescript
@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true })
export class Image {
  @Prop({ type: String, required: true }) filename: string;            // <imageId>.webp
  @Prop() originalFilename?: string;                                   // имя, пришедшее от клиента

  @Prop({ enum: ImageAccessLevel, default: ImageAccessLevel.PUBLIC })
  accessLevel: ImageAccessLevel;

  @Prop({ enum: ImageEntityType }) entityType?: ImageEntityType;
  @Prop({ type: Types.ObjectId }) entity?: Types.ObjectId;
  @Prop({ enum: ImageType }) imageType?: ImageType;

  @Prop({ type: [AllowedUserSchema], default: () => [] })
  allowedUsers: AllowedUser[]; // только если accessLevel = RESTRICTED

  @Prop({ type: StorageRefBaseSchema, required: true, default: () => ({ provider: 'local', sizes: DEFAULT_IMAGE_SIZES }) })
  storage: StorageRefBase;     // provider=local, включает список сгенерированных размеров
}

ImageSchema.virtual('imageId').get(function () { return this._id.toString(); });
ImageSchema.index({ entityType: 1, entity: 1, imageType: 1 });
ImageSchema.index({ 'storage.provider': 1 });
```

`storage` пока использует только провайдера `local`, но структура подготовлена под другие движки.

## 3. Енумы

```typescript
export enum ImageAccessLevel { PUBLIC = 'public', PRIVATE = 'private', RESTRICTED = 'restricted' }

export enum ImageEntityType {
  PRODUCT = 'product', SHOP = 'shop', CUSTOMER = 'customer', SHOP_PRODUCT = 'shopProduct',
  EMPLOYEE = 'employee', SELLER = 'seller', ARTICLE = 'article',
}

export enum ImageType {
  PRODUCT_CARD_IMAGE = 'productCardImage', SELLER_LOGO = 'sellerLogo',
  SHOP_PRODUCT_IMAGE = 'shopProductImage', ARTICLE_IMAGE = 'articleImage', SHOP_IMAGE = 'shopImage',
}

export enum ImageSize { ORIGINAL = 'original', SM = 'sm', MD = 'md', LG = 'lg' }
```

## 4. Commands

```typescript
new UploadImageCommand(imageId, {
  imageFile, accessLevel, entityType?, entityId?, imageType?, allowedUsers?, sizes?
});

new UpdateImageCommand(imageId, {
  accessLevel?, entityType?, entityId?, imageType?, allowedUsers?
});

new DeleteImageCommand(imageId);
```

`imageId` можно передать извне (например, заранее сгенерированный `ObjectId`) — сервис уважит его при создании записи.

## 5. Queries

```typescript
new GetImageBufferQuery(imageId, size?);
new GetImageUrlQuery(imageId, size);
```

`size` по умолчанию `ImageSize.MD`. `getImageBuffer` возвращает `Buffer`, `getImageUrl` — относительный URL (`/images/:size/:imageId`).

## 6. Port

```typescript
export interface ImagesPort {
  getImageBuffer(query: GetImageBufferQuery, options?): Promise<Buffer>;
  getImageUrl(query: GetImageUrlQuery): string;

  uploadImage(command: UploadImageCommand, options?): Promise<Image>;
  updateImage(command: UpdateImageCommand, options?): Promise<Image>;
  deleteImage(imageId: string, options?): Promise<void>;
}

export const IMAGES_PORT = Symbol('IMAGES_PORT');
```

## 7. Service

`LocalImagesService` реализует порт. Основные шаги:

1. **`validateFile`.** Проверяет наличие, размер (≤5 МБ), MIME (`image/jpeg | image/png | image/webp`) и расширение `.jpg/.jpeg/.png/.webp`.
2. **`getImageMetadata`.** Извлекает ширину/высоту через `sharp(metadata)`.
3. **`generateImageSizes`.** Для каждой цели рассчитывает ширину на основе `SIZE_SCALE_FACTORS`, `TARGET_SIZES`, `MIN_SIZES`. Все версии сохраняются как WebP.
4. **`uploadImage`.** Создаёт директории (`images/{sm,md,lg,original}`), пишет файлы, а затем документ в MongoDB. При ошибке удаляет уже сохранённые версии.
5. **`getImageBuffer`.** Читает файл с диска: `images/<size>/<imageId>.webp`.
6. **`getImageUrl`.** Возвращает относительный путь, чтобы HTTP‑слой мог настроить отдачу файлов.
7. **`deleteImage`.** Удаляет запись и соответствующие файлы всех размеров.

## 8. Использование

```typescript
@Injectable()
export class ShopProductImagesService {
  constructor(@Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort) {}

  async uploadLivePhoto(shopProductId: string, file: Express.Multer.File, uploadedBy: string) {
    const imageId = new Types.ObjectId().toString();
    const image = await this.imagesPort.uploadImage(
      new UploadImageCommand(imageId, {
        imageFile: file,
        accessLevel: ImageAccessLevel.PUBLIC,
        entityType: ImageEntityType.SHOP_PRODUCT,
        entityId: shopProductId,
        imageType: ImageType.SHOP_PRODUCT_IMAGE,
        sizes: [ImageSize.MD, ImageSize.LG],
      }),
    );

    await this.shopProductModel.updateOne(
      { _id: shopProductId },
      {
        $push: {
          livePhotos: {
            url: image.imageId,
            takenAt: new Date(),
            isActive: true,
            uploadedBy,
          },
        },
      },
    );

    return image.imageId;
  }

  getPublicUrl(imageId: string) {
    return this.imagesPort.getImageUrl(new GetImageUrlQuery(imageId, ImageSize.MD));
  }
}
```

HTTP‑слой обычно отдаёт файлы через контроллер `GET /images/:size/:imageId`, который вызывает `getImageBuffer` и выставляет заголовки (`Content-Type: image/webp`, `Cache-Control`).

## 9. Константы и ограничения

```typescript
export const UPLOAD_DIR = 'images';
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const DEFAULT_IMAGE_SIZES = [ImageSize.SM, ImageSize.MD, ImageSize.LG];
export const SIZE_SCALE_FACTORS = {
  [ImageSize.ORIGINAL]: 1,
  [ImageSize.SM]: 0.3,
  [ImageSize.MD]: 0.6,
  [ImageSize.LG]: 0.85,
};

export const TARGET_SIZES = { ORIGINAL: null, SM: 480, MD: 1024, LG: 1920 };
export const MIN_SIZES = { ORIGINAL: 0, SM: 320, MD: 600, LG: 1024 };
```

## 10. Связи

- Используется всеми доменными модулями, которым нужны изображения (Product, ShopProduct, Article и т.д.).
- Публичные URL отдаёт HTTP интерфейс `src/interface/http/public/images`.
- Удаление изображений не каскадируется автоматически — ответственность на вызывающей стороне (например, при удалении товара).

## 11. Best Practices

1. **Проверяйте права доступа** до загрузки/удаления изображений: привязывайте `entityId` только после `AccessPort` проверки.
2. **Явно задавайте размеры** в командах: если нужны только SM/MD — передайте массив `sizes`, чтобы не генерировать лишние файлы.
3. **Используйте `imageId` как ссылку** в доменных документах. Получатели строят URL через `ImagesPort.getImageUrl`.

