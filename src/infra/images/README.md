# Images Module

> `src/infra/images/`

Загрузка и хранение изображений. Генерирует WebP-версии разных размеров через `sharp`, хранит метаданные в MongoDB.

## Структура

```
src/infra/images/
├── index.ts
├── image.schema.ts
├── images.enums.ts
├── images.constants.ts
├── images.commands.ts
├── images.queries.ts
├── images.port.ts
├── images.module.ts
├── local-images.service.ts
└── storage/
```

## Импорт

```typescript
import {
  ImagesPort,
  IMAGES_PORT,
  ImagesCommands,
  ImagesQueries,
  ImagesEnums,
  Image,
} from 'src/infra/images';

@Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort
```

## Схема

```typescript
class Image {
  filename: string;           // <imageId>.webp
  originalFilename?: string;  // имя от клиента
  
  accessLevel: ImageAccessLevel;  // public | private | restricted
  entityType?: ImageEntityType;
  entity?: Types.ObjectId;
  imageType?: ImageType;
  
  allowedUsers: AllowedUser[];    // для restricted
  storage: StorageRefBase;        // provider + sizes
}
```

## Енумы

```typescript
enum ImageAccessLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
}

enum ImageEntityType {
  PRODUCT = 'product',
  SHOP = 'shop',
  CUSTOMER = 'customer',
  SHOP_PRODUCT = 'shopProduct',
  EMPLOYEE = 'employee',
  SELLER = 'seller',
  ARTICLE = 'article',
}

enum ImageType {
  PRODUCT_CARD_IMAGE = 'productCardImage',
  SELLER_LOGO = 'sellerLogo',
  SHOP_PRODUCT_IMAGE = 'shopProductImage',
  ARTICLE_IMAGE = 'articleImage',
  SHOP_IMAGE = 'shopImage',
}

enum ImageSize {
  ORIGINAL = 'original',
  SM = 'sm',    // ~30% от оригинала
  MD = 'md',    // ~60% от оригинала
  LG = 'lg',    // ~85% от оригинала
}
```

## API

### Queries

| Метод | Описание |
|-------|----------|
| `getImageBuffer(query)` | Получить Buffer изображения |
| `getImageUrl(query)` | Получить относительный URL |

### Commands

| Метод | Описание |
|-------|----------|
| `uploadImage(command)` | Загрузить изображение |
| `updateImage(command)` | Обновить метаданные |
| `deleteImage(imageId)` | Удалить изображение |

## Использование

### Загрузка изображения

```typescript
const imageId = new Types.ObjectId().toString();
const image = await this.imagesPort.uploadImage(
  new ImagesCommands.UploadImageCommand(imageId, {
    imageFile: file, // Express.Multer.File
    accessLevel: ImagesEnums.ImageAccessLevel.PUBLIC,
    entityType: ImagesEnums.ImageEntityType.SHOP_PRODUCT,
    entityId: shopProductId,
    imageType: ImagesEnums.ImageType.SHOP_PRODUCT_IMAGE,
    sizes: [ImagesEnums.ImageSize.MD, ImagesEnums.ImageSize.LG],
  })
);
```

### Получение URL

```typescript
const url = this.imagesPort.getImageUrl(
  new ImagesQueries.GetImageUrlQuery(imageId, ImagesEnums.ImageSize.MD)
);
// → /images/md/<imageId>
```

### Получение Buffer

```typescript
const buffer = await this.imagesPort.getImageBuffer(
  new ImagesQueries.GetImageBufferQuery(imageId, ImagesEnums.ImageSize.MD)
);
```

## Константы

```typescript
const UPLOAD_DIR = 'images';
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const DEFAULT_IMAGE_SIZES = [ImageSize.SM, ImageSize.MD, ImageSize.LG];
const SIZE_SCALE_FACTORS = {
  ORIGINAL: 1,
  SM: 0.3,
  MD: 0.6,
  LG: 0.85,
};
```

## Особенности

### LocalImagesService

1. **Валидация** — проверяет MIME, размер, расширение
2. **Генерация размеров** — создаёт SM/MD/LG/ORIGINAL через `sharp`
3. **Конвертация в WebP** — все изображения хранятся как WebP
4. **Атомарность** — при ошибке удаляет уже сохранённые файлы

### Директории

```
images/
├── sm/
├── md/
├── lg/
└── original/
```

### HTTP Layer

Отдача файлов через контроллер `GET /images/:size/:imageId`:

```typescript
@Get(':size/:imageId')
async getImage(@Param('size') size: string, @Param('imageId') imageId: string) {
  const buffer = await this.imagesPort.getImageBuffer(
    new ImagesQueries.GetImageBufferQuery(imageId, size as ImageSize)
  );
  // Content-Type: image/webp, Cache-Control: ...
}
```

## Best Practices

```typescript
// ✅ Генерировать imageId заранее
const imageId = new Types.ObjectId().toString();

// ✅ Указывать только нужные размеры
sizes: [ImageSize.MD, ImageSize.LG]

// ✅ Привязывать к сущности
entityType: ImageEntityType.SHOP_PRODUCT,
entityId: shopProductId,

// ✅ Использовать imageId как ссылку
shopProduct.image = imageId;
```

## Расширение

Для добавления нового storage provider:
1. Создайте новый сервис в `storage/`
2. Реализуйте `ImagesPort`
3. Зарегистрируйте в модуле
