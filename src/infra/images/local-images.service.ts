import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { promises as fs } from "fs";
import { join, extname } from "path";
import * as sharp from "sharp";
import { Image } from "./image.schema";
import { ImageSize } from './images.enums';
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  SIZE_SCALE_FACTORS,
  DEFAULT_IMAGE_SIZES,
  DEFAULT_WEBP_QUALITY,
  TARGET_SIZES,
  MIN_SIZES
} from "./images.constants";
import { UpdateImageCommand, UploadImageCommand, DeleteImageCommand } from "./images.commands";
import { GetImageBufferQuery, GetImageUrlQuery } from "./images.queries";
import { CommonCommandOptions } from "src/common/types/commands";
import { CommonQueryOptions } from "src/common/types/queries";
import { DomainError } from "src/common/errors/domain-error";
import { assignField } from "src/common/utils";
import { ImagesPort } from "./images.port";


@Injectable()
export class LocalImagesService implements ImagesPort {
  constructor(
    @InjectModel(Image.name) private readonly imageModel: Model<Image>
  ) {
    // Создаем директории при инициализации сервиса
    this.ensureDirectoriesExist();
  }

  // Создание необходимых директорий
  private async ensureDirectoriesExist() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      for (const size of Object.values(ImageSize)) {
        await fs.mkdir(join(UPLOAD_DIR, size), { recursive: true });
      }
    } catch (error) {
      console.error('Ошибка при создании директорий для загрузки:', error);
      throw DomainError.unavailable('Не удалось создать директории для загрузки');
    }
  }


  // Валидация изображения
  private validateFile(image: Express.Multer.File): void {
    if (!image) {
      throw DomainError.validation('Файл не был предоставлен');
    }

    if (image.size > MAX_FILE_SIZE) {
      throw DomainError.validation(`Размер файла превышает ${MAX_FILE_SIZE / 1024 / 1024} MB`);
    }

    if (!ALLOWED_MIME_TYPES.includes(image.mimetype)) {
      throw DomainError.validation(`Недопустимый тип файла. Разрешены только: ${ALLOWED_MIME_TYPES.join(", ")}`);
    }

    
    const ext = extname(image.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw DomainError.validation(`Недопустимое расширение файла. Разрешены только: ${ALLOWED_EXTENSIONS.join(", ")}`);
    }
  }


  /**
   * Получает метаданные изображения (ширину и высоту) из buffer
   */
  private async getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw DomainError.validation('Не удалось получить размеры изображения');
      }
      return { width: metadata.width, height: metadata.height };
    } catch (error) {
      console.error('Ошибка при получении метаданных изображения:', error);
      throw DomainError.unavailable('Не удалось обработать изображение');
    }
  }


  /**
   * Вычисляет оптимальную ширину для заданного размера
   * @param originalWidth - ширина оригинального изображения
   * @param size - целевой размер
   */
  private calculateTargetWidth(originalWidth: number, size: ImageSize): number {
    if (size === ImageSize.ORIGINAL) return originalWidth;

    // Вычисляем базовую ширину по коэффициенту
    const scaledWidth = Math.round(originalWidth * SIZE_SCALE_FACTORS[size]);
    
    // Получаем целевые ограничения
    const targetMax = TARGET_SIZES[size];
    const targetMin = MIN_SIZES[size];

    let finalWidth = scaledWidth;

    // Ограничиваем максимумом (не генерируем избыточно большие изображения)
    if (targetMax && finalWidth > targetMax) finalWidth = targetMax;

    // Проверяем минимум
    // Если оригинал тоже меньше минимума - используем оригинал, иначе минимум
    if (finalWidth < targetMin) finalWidth = Math.min(originalWidth, targetMin);

    // Если оригинал меньше вычисленной ширины - используем оригинал (без upscale)
    if (originalWidth < finalWidth) finalWidth = originalWidth;

    return finalWidth;
  }


  /**
   * Создает версии изображения для разных размеров
   * @param buffer - исходный buffer изображения
   * @param baseWidth - базовая ширина изображения
   * @param sizes - массив размеров для генерации
   * @param quality - качество WebP (по умолчанию 85)
   */
  private async generateImageSizes(
    buffer: Buffer,
    baseWidth: number,
    sizes: ImageSize[],
    quality: number = DEFAULT_WEBP_QUALITY
  ): Promise<Record<ImageSize, Buffer>> {
    const result: Partial<Record<ImageSize, Buffer>> = {};

    try {
      for (const size of sizes) {
        const targetWidth = this.calculateTargetWidth(baseWidth, size);
        let processedBuffer: Buffer;

        if (size === ImageSize.ORIGINAL || targetWidth === baseWidth) {
          // Для ORIGINAL или если размер равен оригиналу - только конвертируем в WebP
          processedBuffer = await sharp(buffer)
            .webp({ quality })
            .toBuffer();
        } else {
          // Масштабируем и конвертируем
          processedBuffer = await sharp(buffer)
            .resize(targetWidth, undefined, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality })
            .toBuffer();
        }

        result[size] = processedBuffer;
      }

      return result as Record<ImageSize, Buffer>;
    } catch (error) {
      console.error('Ошибка при генерации размеров изображения:', error);
      throw DomainError.unavailable('Не удалось обработать изображение');
    }
  }


  /**
   * Сохраняет buffer в файл
   */
  private async saveFile(buffer: Buffer, filename: string, size: ImageSize): Promise<void> {
    const filePath = join(UPLOAD_DIR, size, filename);
    try {
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      console.error(`Ошибка при сохранении файла ${filePath}:`, error);
      throw DomainError.unavailable('Не удалось сохранить файл');
    }
  }


  /**
   * Получает изображение по ID
   */
  private async getImage(imageId: string): Promise<Image> {
    const image = await this.imageModel.findById(imageId).exec();
    if (!image) throw DomainError.notFound('Image', imageId);
    return image;
  }


  async uploadImage(
    command: UploadImageCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Image> {
    const { imageId, payload } = command;
    
    // Валидируем файл
    this.validateFile(payload.imageFile);

    // Получаем метаданные изображения
    const { width } = await this.getImageMetadata(payload.imageFile.buffer);

    // Определяем размеры для генерации
    const sizes = payload.sizes || DEFAULT_IMAGE_SIZES;

    // Генерируем версии изображения
    const imageSizes = await this.generateImageSizes(payload.imageFile.buffer, width, sizes);

    // Используем предоставленный imageId или генерируем новый
    const finalImageId = imageId ? new Types.ObjectId(imageId) : new Types.ObjectId();
    const filename = `${finalImageId.toString()}.webp`;

    // Сохраняем все версии
    const savedPaths: string[] = [];
    try {
      for (const [size, buffer] of Object.entries(imageSizes)) {
        await this.saveFile(buffer, filename, size as ImageSize);
        savedPaths.push(join(UPLOAD_DIR, size, filename));
      }

      // Проверяем allowed Users для restricted доступа
      if (payload.accessLevel === 'restricted' && (!payload.allowedUsers || payload.allowedUsers.length === 0)) {
        throw DomainError.validation('Для уровня доступа "restricted" необходимо указать пользователей');
      }

      // Формат allowedUsers
      const formattedAllowedUsers = payload.allowedUsers?.map(user => ({
        userId: user.userId,
        role: user.role
      })) || [];

      // Создаем запись в БД
      const imageData: any = {
        _id: finalImageId,
        filename,
        originalFilename: payload.imageFile.originalname,
        accessLevel: payload.accessLevel,
        entityType: payload.entityType,
        entityId: payload.entityId ? new Types.ObjectId(payload.entityId) : undefined,
        imageType: payload.imageType,
        allowedUsers: formattedAllowedUsers.length > 0 ? formattedAllowedUsers : undefined,
        storage: {
          provider: 'local',
          sizes
        }
      };

      const queryOptions: any = {};
      if (commandOptions?.session) queryOptions.session = commandOptions.session;

      const image = await this.imageModel.create([imageData], queryOptions).then(docs => docs[0]);
      
      return image;
    } catch (error) {
      // Откатываем сохраненные файлы при ошибке
      for (const path of savedPaths) await fs.unlink(path).catch(() => {});
      
      if (error instanceof DomainError) throw error;
      console.error('Ошибка при загрузке изображения:', error);
      throw DomainError.unavailable('Не удалось загрузить изображение');
    }
  }


  async updateImage(
    command: UpdateImageCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Image> {
    const { imageId, payload } = command;

    const dbQuery = this.imageModel.findById(imageId);
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const image = await dbQuery.exec();
    if (!image) throw DomainError.notFound('Image', command.imageId);

    // Проверяем restricted доступ
    if (payload.accessLevel === 'restricted' && (!payload.allowedUsers || payload.allowedUsers.length === 0)) {
      throw DomainError.validation('Для уровня доступа "restricted" необходимо указать пользователей');
    }

    assignField(image, 'accessLevel', payload.accessLevel, { onNull: 'skip' });
    assignField(image, 'entityType', payload.entityType);
    assignField(image, 'entity', payload.entityId ? new Types.ObjectId(payload.entityId) : null);
    assignField(image, 'imageType', payload.imageType);
    
    if (payload.allowedUsers) {
      image.allowedUsers = payload.allowedUsers.map(user => ({
        userId: user.userId,
        role: user.role as any
      }));
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    
    await image.save(saveOptions);
    return image;
  }


  async getImageBuffer(
    query: GetImageBufferQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Buffer> {
    const image = await this.getImage(query.imageId);
    const size = query.size || ImageSize.MD;
    const filePath = join(UPLOAD_DIR, size, image.filename);
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw DomainError.notFound('ImageFile', `size-${size}`);
    }
  }


  getImageUrl(query: GetImageUrlQuery): string {
    const { imageId, size } = query;
    return `/images/${size}/${imageId}`;
  }


  async deleteImage(
    imageId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const image = await this.getImage(imageId);
    
    // Удаляем запись из БД
    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;
    
    await this.imageModel.findByIdAndDelete(image._id, deleteOptions).exec();
    
    // Удаляем все файлы
    const sizes = Object.values(ImageSize);
    const deletionPromises = sizes.map(size => {
      const filePath = join(UPLOAD_DIR, size, image.filename);
      return fs.unlink(filePath).catch(() => {});
    });
    
    await Promise.all(deletionPromises);
  }
}