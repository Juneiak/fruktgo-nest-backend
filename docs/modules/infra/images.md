# Images Infrastructure Module

> **Модуль:** `src/infra/images`  
> **Назначение:** Управление изображениями, загрузка, хранение, обработка и доставка

---

## 1. Обзор

Универсальный модуль для работы с изображениями на платформе:
- Загрузка и хранение изображений
- Поддержка множества storage провайдеров (Local, AWS S3, Cloudflare R2, Wasabi, Backblaze B2, MinIO)
- Автоматическая генерация responsive размеров
- Контроль доступа (PUBLIC / PRIVATE / RESTRICTED)
- Привязка к сущностям (Product, Shop, Customer, Employee и т.д.)

**Основные возможности:**
- **Multi-storage:** поддержка разных провайдеров хранилищ
- **Responsive images:** автогенерация размеров (sm, md, lg, original)
- **Access control:** три уровня доступа к изображениям
- **Entity binding:** привязка изображений к доменным сущностям
- **URL generation:** генерация публичных URL для доступа

---

## 2. Схема данных

### Image Schema

```typescript
{
  _id: ObjectId,
  
  // Основная информация
  filename: string,              // Сгенерированное имя файла
  originalFilename?: string,     // Оригинальное имя файла
  
  // Контроль доступа
  accessLevel: ImageAccessLevel, // PUBLIC | PRIVATE | RESTRICTED
  allowedUsers: [{               // Для RESTRICTED - список пользователей с доступом
    userId: string,
    role: UserType
  }],
  
  // Привязка к сущности
  entityType?: ImageEntityType,  // PRODUCT | SHOP | CUSTOMER и т.д.
  entity?: ObjectId,             // ID сущности
  imageType?: ImageType,         // Тип изображения (главное, галерея и т.д.)
  
  // Хранилище (discriminator)
  storage: {
    provider: 'local' | 's3' | 'r2' | 'wasabi' | 'b2' | 'minio',
    
    // Для local
    path?: string,
    sizes?: {
      original: string,
      lg?: string,
      md?: string,
      sm?: string
    },
    
    // Для S3-совместимых
    bucket?: string,
    key?: string,
    region?: string,
    endpoint?: string,
    url?: string
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Индексы:**
```typescript
{ 'storage.provider': 1 }
{ 'storage.bucket': 1, 'storage.key': 1 }, { unique: true }
{ entityType: 1, entityId: 1, imageType: 1 }
```

---

## 3. Енумы

### ImageAccessLevel

Уровни доступа к изображениям:

```typescript
enum ImageAccessLevel {
  PUBLIC = 'public',        // Доступно всем без авторизации
  PRIVATE = 'private',      // Доступно только владельцу
  RESTRICTED = 'restricted' // Доступно списку пользователей из allowedUsers
}
```

**Использование:**
- `PUBLIC` - изображения товаров, магазинов (для каталога)
- `PRIVATE` - документы селлера, личные фото
- `RESTRICTED` - документы заказа, фото споров

### ImageEntityType

Типы сущностей для привязки:

```typescript
enum ImageEntityType {
  PRODUCT = 'product',
  SHOP = 'shop',
  CUSTOMER = 'customer',
  SHOP_PRODUCT = 'shopProduct',
  EMPLOYEE = 'employee',
  SELLER = 'seller',
  ARTICLE = 'article'
}
```

### ImageType

Типы изображений внутри сущности:

```typescript
enum ImageType {
  PRODUCT_CARD_IMAGE = 'productCardImage',
  SELLER_LOGO = 'sellerLogo',
  SHOP_PRODUCT_IMAGE = 'shopProductImage',  // "Живые" фото с прилавка
  ARTICLE_IMAGE = 'articleImage',
  SHOP_IMAGE = 'shopImage'
}
```

### ImageSize

Размеры для responsive изображений:

```typescript
enum ImageSize {
  ORIGINAL = 'original',  // Оригинальный размер без обработки
  SM = 'sm',              // Смартфоны (~30% от оригинала)
  MD = 'md',              // Планшеты (~60% от оригинала)
  LG = 'lg'               // Десктоп (~85% от оригинала)
}
```

---

## 4. Commands (Write операции)

### UploadImageCommand

Загрузка нового изображения:

```typescript
class UploadImageCommand {
  imageId: string,                    // Генерируется заранее
  payload: {
    imageFile: Express.Multer.File,   // Файл от Multer
    accessLevel: ImageAccessLevel,
    entityType?: ImageEntityType,
    entityId?: string,
    imageType?: ImageType,
    allowedUsers?: {
      userId: string,
      role: string
    }[],
    sizes?: ImageSize[]                // Какие размеры генерировать
  }
}
```

**Процесс:**
1. Валидация файла (размер, тип)
2. Генерация уникального filename
3. Сохранение в выбранное хранилище
4. Генерация responsive размеров (если указаны)
5. Создание записи в БД

### UpdateImageCommand

Обновление метаданных изображения:

```typescript
class UpdateImageCommand {
  imageId: string,
  payload: {
    accessLevel?: ImageAccessLevel,
    entityType?: ImageEntityType,
    entityId?: string,
    imageType?: ImageType,
    allowedUsers?: { userId: string, role: string }[]
  }
}
```

**Обновляются только метаданные**, файл не переза грузается.

### DeleteImageCommand

Удаление изображения:

```typescript
class DeleteImageCommand {
  imageId: string
}
```

**Процесс:**
1. Удаление файла из хранилища (всех размеров)
2. Удаление записи из БД

---

## 5. Queries (Read операции)

### GetImageBufferQuery

Получение binary данных изображения:

```typescript
class GetImageBufferQuery {
  imageId: string,
  size?: ImageSize  // Какой размер вернуть
}
```

**Возвращает:** `Promise<Buffer>`

### GetImageUrlQuery

Генерация публичного URL:

```typescript
class GetImageUrlQuery {
  imageId: string,
  size?: ImageSize
}
```

**Возвращает:** `string` (URL)

**Примеры:**
```
// Local storage
http://localhost:3000/public/images/abc123_original.jpg

// S3/R2
https://cdn.fruktgo.kz/images/abc123_original.jpg
```

---

## 6. Port (Интерфейс)

```typescript
interface ImagesPort {
  // Queries
  getImageBuffer(query: GetImageBufferQuery): Promise<Buffer>;
  getImageUrl(query: GetImageUrlQuery): string;
  
  // Commands
  uploadImage(command: UploadImageCommand): Promise<Image>;
  updateImage(command: UpdateImageCommand): Promise<Image>;
  deleteImage(imageId: string): Promise<void>;
}

const IMAGES_PORT = Symbol('IMAGES_PORT');
```

---

## 7. Service (Бизнес-логика)

### LocalImagesService

Реализация для локального хранилища:

**Основные методы:**

#### `uploadImage(command)`

```typescript
async uploadImage(command: UploadImageCommand): Promise<Image> {
  // 1. Валидация
  this.validateImageFile(command.payload.imageFile);
  
  // 2. Генерация filename
  const filename = this.generateFilename(command.imageId);
  
  // 3. Сохранение оригинала
  await this.saveFile(command.payload.imageFile, filename);
  
  // 4. Генерация responsive размеров
  const sizes = await this.generateResponsiveSizes(
    command.payload.imageFile,
    command.payload.sizes
  );
  
  // 5. Создание записи в БД
  const image = await this.imageModel.create({
    filename,
    originalFilename: command.payload.imageFile.originalname,
    accessLevel: command.payload.accessLevel,
    entityType: command.payload.entityType,
    entity: command.payload.entityId,
    imageType: command.payload.imageType,
    storage: {
      provider: 'local',
      path: `/public/images/${filename}`,
      sizes
    }
  });
  
  return image;
}
```

#### `generateResponsiveSizes(file, sizes)`

Генерация адаптивных размеров с помощью Sharp:

```typescript
async generateResponsiveSizes(file, sizes: ImageSize[]) {
  const result = { original: filename };
  
  for (const size of sizes) {
    if (size === ImageSize.ORIGINAL) continue;
    
    const resized = await sharp(file.buffer)
      .resize({ width: this.getSizeWidth(size) })
      .toBuffer();
    
    const resizedFilename = `${imageId}_${size}.jpg`;
    await this.saveFile(resized, resizedFilename);
    
    result[size] = `/public/images/${resizedFilename}`;
  }
  
  return result;
}
```

**Ширины размеров:**
- SM: 640px
- MD: 1024px
- LG: 1920px
- ORIGINAL: без изменений

#### `getImageUrl(query)`

```typescript
getImageUrl(query: GetImageUrlQuery): string {
  const image = await this.imageModel.findById(query.imageId);
  const size = query.size || ImageSize.ORIGINAL;
  
  if (image.storage.provider === 'local') {
    return `${this.config.baseUrl}${image.storage.sizes[size]}`;
  }
  
  // Для S3-совместимых
  return `${image.storage.url}/${image.storage.key}_${size}.jpg`;
}
```

---

## 8. Использование

### Загрузка изображения товара

```typescript
import { ImagesPort, IMAGES_PORT } from 'src/infra/images';
import { ImageAccessLevel, ImageEntityType, ImageType, ImageSize } from 'src/infra/images/images.enums';

@Injectable()
export class ProductService {
  constructor(
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File
  ): Promise<Image> {
    const imageId = new Types.ObjectId().toString();
    
    const image = await this.imagesPort.uploadImage(
      new UploadImageCommand(imageId, {
        imageFile: file,
        accessLevel: ImageAccessLevel.PUBLIC,
        entityType: ImageEntityType.PRODUCT,
        entityId: productId,
        imageType: ImageType.PRODUCT_CARD_IMAGE,
        sizes: [ImageSize.SM, ImageSize.MD, ImageSize.LG, ImageSize.ORIGINAL]
      })
    );
    
    return image;
  }
}
```

### Загрузка "живого" фото с прилавка

```typescript
async uploadShopProductLivePhoto(
  shopProductId: string,
  file: Express.Multer.File,
  employeeId: string
): Promise<Image> {
  const imageId = new Types.ObjectId().toString();
  
  const image = await this.imagesPort.uploadImage(
    new UploadImageCommand(imageId, {
      imageFile: file,
      accessLevel: ImageAccessLevel.PUBLIC,
      entityType: ImageEntityType.SHOP_PRODUCT,
      entityId: shopProductId,
      imageType: ImageType.SHOP_PRODUCT_IMAGE,
      sizes: [ImageSize.MD, ImageSize.ORIGINAL]  // Для живых фото достаточно 2 размеров
    })
  );
  
  // Сохранить в ShopProduct.livePhotos[]
  await this.shopProductModel.updateOne(
    { _id: shopProductId },
    {
      $push: {
        livePhotos: {
          url: image.imageId,
          takenAt: new Date(),
          isActive: true,
          uploadedBy: employeeId
        }
      }
    }
  );
  
  return image;
}
```

### Получение URL изображения

```typescript
const imageUrl = this.imagesPort.getImageUrl({
  imageId: product.image,
  size: ImageSize.MD  // Для каталога
});

// Результат: http://localhost:3000/public/images/abc123_md.jpg
```

### HTTP Controller

```typescript
@Controller('images')
export class ImagesController {
  constructor(
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImageDto
  ) {
    const imageId = new Types.ObjectId().toString();
    
    const image = await this.imagesPort.uploadImage(
      new UploadImageCommand(imageId, {
        imageFile: file,
        ...dto
      })
    );
    
    return {
      imageId: image.imageId,
      url: this.imagesPort.getImageUrl({ imageId: image.imageId })
    };
  }

  @Get(':id')
  async getImage(@Param('id') id: string, @Query('size') size?: ImageSize) {
    const buffer = await this.imagesPort.getImageBuffer({ imageId: id, size });
    return buffer;  // Nestjs автоматически отдаст как image/jpeg
  }
}
```

---

## 9. Конфигурация

### Environment Variables

```bash
# Storage provider
IMAGES_STORAGE=local  # local | s3 | r2 | wasabi | b2 | minio

# Local storage
IMAGES_LOCAL_PATH=./public/images
IMAGES_BASE_URL=http://localhost:3000

# AWS S3
AWS_S3_BUCKET=fruktgo-images
AWS_S3_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Cloudflare R2
R2_BUCKET=fruktgo-images
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://images.fruktgo.kz
```

### Лимиты

```typescript
// В constants
MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB
ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
```

---

## 10. Интеграции

### Storage Providers

| Provider | Назначение | Конфигурация |
|----------|------------|--------------|
| **Local** | Разработка, staging | `IMAGES_LOCAL_PATH` |
| **AWS S3** | Production (глобально) | AWS credentials |
| **Cloudflare R2** | Production (без egress fees) | R2 credentials |
| **Wasabi** | Альтернатива S3 (дешевле) | Wasabi credentials |
| **Backblaze B2** | Бюджетное решение | B2 credentials |
| **MinIO** | Self-hosted S3 | MinIO endpoint |

### Sharp (Image Processing)

Библиотека для обработки изображений:
- Resize
- Оптимизация
- Конвертация форматов

```typescript
import * as sharp from 'sharp';

const resized = await sharp(buffer)
  .resize({ width: 1024 })
  .jpeg({ quality: 85 })
  .toBuffer();
```

---

## Производительность

### CDN Delivery

Для production рекомендуется использовать CDN:

```
Client → CDN (CloudFlare) → R2/S3 → Image
         ↑
         Cache (30 days)
```

**Преимущества:**
- Быстрая доставка (edge locations)
- Снижение нагрузки на origin
- Автоматическое кеширование

### Lazy Loading

Рекомендуется использовать:
- SM для preview (blur placeholder)
- MD для mobile
- LG для desktop
- ORIGINAL для zoom/download

```html
<img
  src="image_sm.jpg"
  srcset="image_sm.jpg 640w, image_md.jpg 1024w, image_lg.jpg 1920w"
  sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px"
  loading="lazy"
/>
```

---

## Безопасность

### Валидация файлов

```typescript
validateImageFile(file: Express.Multer.File) {
  // Размер
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('Файл слишком большой');
  }
  
  // MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Неподдерживаемый формат');
  }
  
  // Magic bytes (первые байты файла)
  const magicBytes = file.buffer.slice(0, 12).toString('hex');
  if (!this.isValidImageMagicBytes(magicBytes)) {
    throw new BadRequestException('Файл поврежден');
  }
}
```

### Access Control

```typescript
async canUserAccessImage(userId: string, imageId: string): Promise<boolean> {
  const image = await this.imageModel.findById(imageId);
  
  if (image.accessLevel === ImageAccessLevel.PUBLIC) {
    return true;
  }
  
  if (image.accessLevel === ImageAccessLevel.PRIVATE) {
    // Проверка владельца через entity
    return this.checkOwnership(userId, image.entity, image.entityType);
  }
  
  if (image.accessLevel === ImageAccessLevel.RESTRICTED) {
    return image.allowedUsers.some(u => u.userId === userId);
  }
  
  return false;
}
```

---

## Примеры

### Загрузка логотипа магазина

```typescript
const logo = await imagesPort.uploadImage(
  new UploadImageCommand(imageId, {
    imageFile: file,
    accessLevel: ImageAccessLevel.PUBLIC,
    entityType: ImageEntityType.SHOP,
    entityId: shopId,
    imageType: ImageType.SHOP_IMAGE,
    sizes: [ImageSize.SM, ImageSize.MD]
  })
);
```

### Получение всех изображений товара

```typescript
const images = await this.imageModel.find({
  entityType: ImageEntityType.PRODUCT,
  entity: productId
}).lean();

const urls = images.map(img => 
  this.imagesPort.getImageUrl({ imageId: img._id.toString() })
);
```

### Удаление старых живых фото

```typescript
// Деактивация фото старше 7 дней (см. catalog-flow.md)
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

await this.shopProductModel.updateMany(
  { 'livePhotos.takenAt': { $lt: sevenDaysAgo } },
  { $set: { 'livePhotos.$[elem].isActive': false } },
  { arrayFilters: [{ 'elem.takenAt': { $lt: sevenDaysAgo } }] }
);
```

---

## Заключение

Images Module предоставляет гибкую систему управления изображениями с поддержкой множества storage провайдеров и автоматической генерацией responsive размеров. Модуль используется всеми доменными модулями для хранения изображений товаров, магазинов, профилей и т.д.

**Ключевые особенности:**
- Multi-storage support
- Responsive image generation
- Flexible access control
- Entity binding
- Production-ready (CDN, optimization)
