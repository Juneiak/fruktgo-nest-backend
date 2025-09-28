import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { promises as fs } from "fs";
import { join, extname } from "path";
import * as sharp from "sharp";
import { Image } from "../infrastructure/image.schema";
import { ImageEntityType, ImageType } from '../images.enums';
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MOBILE_WIDTH,
  DESKTOP_WIDTH
} from "../images.constants";
import { UpdateImageCommand, UploadImageCommand } from "./images.commands";
import { CommonCommandOptions } from "src/common/types/comand-options";


@Injectable()
export class LocalImagesService {
  constructor(
    @InjectModel(Image.name) private readonly imageModel: Model<Image>
  ) {
    // Создаем директории при инициализации сервиса
    this.ensureDirectoriesExist();
  }

  // Создание необходимых директорий
  private async ensureDirectoriesExist() {
    try {
      // Создаем основную директорию для загрузок и поддиректории для разных размеров
      // Опция { recursive: true } позволяет не выбрасывать ошибку, если директории уже существуют
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.mkdir(join(UPLOAD_DIR, 'xs'), { recursive: true }); // Директория для мобильных (430px)
      await fs.mkdir(join(UPLOAD_DIR, 'sm'), { recursive: true }); // Директория для десктопных (1440px)
      await fs.mkdir(join(UPLOAD_DIR, 'md'), { recursive: true }); // Директория для десктопных (1440px)
      await fs.mkdir(join(UPLOAD_DIR, 'lg'), { recursive: true }); // Директория для десктопных (1440px)
      await fs.mkdir(join(UPLOAD_DIR, 'xl'), { recursive: true }); // Директория для десктопных (1440px)
      
      // console.log('Директории для загрузки файлов готовы');
    } catch (error) {
      console.error('Ошибка при создании директорий для загрузки:', error);
      throw new InternalServerErrorException('Не удалось создать директории для загрузки');
    }
  }


  // Валидация изображения
  private validateFile(image: Express.Multer.File): void {
    // Проверяем наличие файла
    if (!image) {
      throw new BadRequestException("Файл не был предоставлен");
    }

    // Проверяем размер файла
    if (image.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Размер файла превышает ${MAX_FILE_SIZE / 1024 / 1024} MB`);
    }

    // Проверяем тип файла
    if (!ALLOWED_MIME_TYPES.includes(image.mimetype)) {
      throw new BadRequestException(
        `Недопустимый тип файла. Разрешены только: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // Проверяем расширение файла
    const ext = extname(image.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Недопустимое расширение файла. Разрешены только: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
    }
  }


  // Оптимизация изображения для мобильных и десктопа
  private async optimizeImage(buffer: Buffer): Promise<{
    mobile: Buffer;
    desktop: Buffer;
  }> {
    try {
      // Создаем версию для мобильных устройств (WebP для лучшей оптимизации)
      const mobile = await sharp(buffer)
        .resize(MOBILE_WIDTH)
        .webp({ quality: 85 }) // Хорошее качество для мобильных устройств
        .toBuffer();

      // Создаем версию для десктопа (WebP для лучшей оптимизации)
      const desktop = await sharp(buffer)
        .resize(DESKTOP_WIDTH)
        .webp({ quality: 90 }) // Более высокое качество для десктопа
        .toBuffer();

      return { mobile, desktop };
    } catch (error) {
      console.error('Ошибка при оптимизации изображения:', error);
      throw new InternalServerErrorException('Не удалось обработать изображение');
    }
  }


  // Сохранение файла на диск
  private async saveFile(buffer: Buffer, filename: string, subdir: string): Promise<string> {
    const filePath = join(UPLOAD_DIR, subdir, filename);
    try {
      await fs.writeFile(filePath, buffer);
      return join(subdir, filename);
    } catch (error) {
      console.error(`Ошибка при сохранении файла ${filePath}:`, error);
      throw new InternalServerErrorException("Не удалось сохранить файл");
    }
  }

  private async getImageById(fileId: string): Promise<Image> {    
    const file = await this.imageModel.findById(fileId).exec();
    if (!file) throw new NotFoundException("Изображение не найдено");
    return file;
  }


  async uploadImage(
    command: UploadImageCommand,
    options: CommonCommandOptions
  ): Promise<Image> {
    // const { file, accessLevel, entityType, entityId, imageType, allowedUsers } = command;
    const { file } = command;
    const { session } = options;

    // Валидируем файл
    this.validateFile(file);

    // Создаем новый ObjectId для файла
    const fileId = new Types.ObjectId();
    const filename = `${fileId.toString()}.webp`; // Всегда сохраняем как WebP
    
    let savedFile: Image | null = null;
    let filesToCleanUp: {mobilePath: string, desktopPath: string} | null = null;
    
    try {
      // Оптимизируем изображение для mobile и desktop
      const { mobile, desktop } = await this.optimizeImage(file.buffer);
      
      // Сохраняем обе версии изображений
      await this.saveFile(mobile, filename, 'mobile');
      await this.saveFile(desktop, filename, 'desktop');
      
      // Запоминаем пути к файлам для возможной очистки при ошибке транзакции
      filesToCleanUp = {
        mobilePath: join(UPLOAD_DIR, 'mobile', filename),
        desktopPath: join(UPLOAD_DIR, 'desktop', filename)
      };
      
      // Проверяем, если нужны allowedUsers для restricted доступа
      if (accessLevel === 'restricted' && (!allowedUsers || allowedUsers.length === 0)) {
        throw new BadRequestException('Для уровня доступа "restricted" необходимо указать пользователей, которым разрешен доступ');
      }
      
      // Преобразуем allowedUsers в формат, необходимый для схемы
      const formattedAllowedUsers = allowedUsers?.map(user => ({
        userId: new Types.ObjectId(user.userId),
        role: user.role
      })) || [];
      
      //TODO: добавить проверку уникальности для fileId
      // Создаем запись в базе данных для хранения метаданных о файле
      console.log('uploadImage', fileId);

      const fileData = {
        _id: fileId,
        filename: filename,
        accessLevel,
        entityType,
        entityId: entityId ? new Types.ObjectId(entityId) : null,
        imageType,
        allowedUsers: formattedAllowedUsers.length > 0 ? formattedAllowedUsers : undefined
      };
      
      // Если используется сессия MongoDB, добавляем отслеживание состояния транзакции
      if (session) {
        // Отслеживаем статус транзакции для удаления файлов при отмене
        const origAbortTransaction = session.abortTransaction.bind(session);
        session.abortTransaction = async function() {
          const result = await origAbortTransaction();
          
          // Удаляем файлы при отмене транзакции
          if (filesToCleanUp) {
            try {
              await fs.unlink(filesToCleanUp.mobilePath).catch(() => {});
              await fs.unlink(filesToCleanUp.desktopPath).catch(() => {});
              // console.log('Файлы удалены при отмене транзакции:', filename);
            } catch (cleanupError) {
              console.error('Ошибка при удалении файлов при отмене транзакции:', cleanupError);
            }
          }
          
          return result;
        };
        
        const createdDocs = await this.uploadedFileModel.create([fileData], { session });
        
        savedFile = createdDocs[0];
      } else {
        const fileDocument = new this.uploadedFileModel(fileData);
        savedFile = await fileDocument.save();
      }
      
      return savedFile;
    } catch (error) {
      // В случае ошибки удаляем созданные файлы и запись в базе данных
      console.error('Ошибка при загрузке изображения:', error);
      
      // Удаляем файлы из файловой системы, если они были созданы
      try {
        await fs.unlink(join(UPLOAD_DIR, 'mobile', filename)).catch(() => {});
        await fs.unlink(join(UPLOAD_DIR, 'desktop', filename)).catch(() => {});
      } catch (unlinkError) {
        console.error('Ошибка при удалении файлов:', unlinkError);
      }
      
      // Удаляем запись из базы данных, если она была создана
      if (savedFile) await this.uploadedFileModel.findByIdAndDelete(fileId).catch(() => {});
      
      // Прокидываем ошибку дальше
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Не удалось загрузить изображение');
    }
  }


  async updateImage(
    command: UpdateImageCommand
  ): Promise<Image> {
    try {
      // Проверяем валидность ID
      if (!Types.ObjectId.isValid(fileId)) throw new BadRequestException(`Некорректный ID файла: ${fileId}`);

      // Получаем файл из БД для проверки существования
      const file = await this.uploadedFileModel.findById(fileId);
      if (!file) throw new NotFoundException(`Файл с ID ${fileId} не найден`);

      // Проверяем особые условия для разных уровней доступа
      if (updateData.accessLevel === 'restricted' && (!updateData.allowedUsers || updateData.allowedUsers.length === 0)) {
        throw new BadRequestException('Для уровня доступа "restricted" необходимо указать пользователей, которым разрешен доступ');
      }

      // Формируем объект для обновления
      const updateObject: any = {};
      
      // Добавляем поля в объект обновления, только если они определены
      if (updateData.accessLevel) updateObject.accessLevel = updateData.accessLevel;
      
      if (updateData.entityType) updateObject.entityType = updateData.entityType;
      
      if (updateData.entityId) {
        updateObject.entityId = Types.ObjectId.isValid(updateData.entityId) 
          ? new Types.ObjectId(updateData.entityId) 
          : null;
      }
      
      if (updateData.imageType) updateObject.imageType = updateData.imageType;
      
      if (updateData.allowedUsers) {
        updateObject.allowedUsers = updateData.allowedUsers.map(user => ({
          userId: Types.ObjectId.isValid(user.userId) 
            ? new Types.ObjectId(user.userId) 
            : null,
          role: user.role
        }));
      }

      // Обновляем файл
      const updatedFile = await this.uploadedFileModel.findByIdAndUpdate(
        fileId,
        { $set: updateObject },
        { new: true } // Возвращаем обновленный документ
      );

      if (!updatedFile) throw new NotFoundException(`Не удалось обновить метаданные файла с ID ${fileId}`);

      return updatedFile;
    } catch (error) {
      console.error('Ошибка при обновлении метаданных изображения:', error);
      
      // Прокидываем ошибку дальше с нужным типом
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Не удалось обновить метаданные изображения');
    }
  }


  

  async getImageBuffer(
    fileId: string, 
    size: 'mobile' | 'desktop' = 'desktop'
  ): Promise<Buffer> {
    const file = await this.getImageById(imageId);
    const filePath = join(UPLOAD_DIR, size, `${file.filename}`);
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new NotFoundException(`Изображение размера ${size} не найдено`);
    }
  }



  getImageUrl(fileId: string, size: 'mobile' | 'desktop' = 'desktop'): string {
    // Базовый URL для доступа к изображениям
    return `/images/${size}/${fileId}`;
  }

  // Хранит информацию о файлах, которые должны быть удалены при фиксации транзакций
  private pendingFileDeletions: Map<ClientSession, Set<{mobilePath: string, desktopPath: string}>> = new Map();

  /**
   * Регистрирует файлы для отложенного удаления при фиксации транзакции
   * @param session - Сессия MongoDB
   * @param mobilePath - Путь к мобильной версии файла
   * @param desktopPath - Путь к десктопной версии файла
   */
  private registerFileForDeletion(
    session: ClientSession,
    imagePaths: string[]
  ): void {
    if (!this.pendingFileDeletions.has(session)) {
      this.pendingFileDeletions.set(session, new Set());
      
      // Переопределяем метод commitTransaction для выполнения отложенных удалений
      const origCommitTransaction = session.commitTransaction.bind(session);
      
      // Добавляем поддержку удаления файлов после успешной фиксации транзакции
      session.commitTransaction = async function() {
        // Сначала выполняем оригинальный commit
        const result = await origCommitTransaction();

        // Удаляем все зарегистрированные файлы
        const pendingDeletions = this.pendingFileDeletions.get(session);
        if (pendingDeletions && pendingDeletions.size > 0) {
          try {
            const deletionPromises: Promise<void>[] = [];
            
            for (const paths of pendingDeletions) {
              deletionPromises.push(fs.unlink(paths.mobilePath).catch(() => {}));
              deletionPromises.push(fs.unlink(paths.desktopPath).catch(() => {}));
            }
            
            await Promise.all(deletionPromises);
            // console.log(`Успешно удалено ${pendingDeletions.size} файлов после фиксации транзакции`);
          } catch (err) {
            console.error('Ошибка при удалении файлов после фиксации транзакции:', err);
          } finally {
            // Очищаем наш список
            this.pendingFileDeletions.delete(session);
          }
        }
        
        return result;
      }.bind(this); // Важно привязать this к нашему классу
      
      // Также переопределяем abortTransaction, чтобы очистить наш список при отмене
      const origAbortTransaction = session.abortTransaction.bind(session);
      session.abortTransaction = async function() {
        const result = await origAbortTransaction();
        // При отмене транзакции просто очищаем список, не удаляя файлы
        this.pendingFileDeletions.delete(session);
        return result;
      }.bind(this);
    }
    
    // Добавляем файл в список отложенных удалений
    this.pendingFileDeletions.get(session)!.add({  });
  }


  async deleteImage(imageId: string, options: CommonCommandOptions): Promise<void> {
    const file = await this.getImageById(imageId);
    if (!file) throw new NotFoundException("Файл не найден");
    try {
      // Получаем полные пути к файлам
      
      const imagePaths = [
        join(UPLOAD_DIR, 'xs', file.filename),
        join(UPLOAD_DIR, 'sm', file.filename),
        join(UPLOAD_DIR, 'md', file.filename),
        join(UPLOAD_DIR, 'lg', file.filename),
        join(UPLOAD_DIR, 'xl', file.filename)
      ];
      // Удаляем запись из базы данных
      if (options.session) {
        // Если используется сессия, регистрируем файлы для отложенного удаления
        this.registerFileForDeletion(options.session, xsPath, smPath, mdPath, lgPath, xlPath);
        
        // Удаляем запись в рамках транзакции
        await this.imageModel.findByIdAndDelete(file._id).session(options.session).exec();
      } else {
        // Если сессия не используется, удаляем запись в базе данных и файлы из файловой системы
        await this.imageModel.findByIdAndDelete(file._id);
        // Удаляем файлы из файловой системы
        await fs.unlink(xsPath).catch(() => {});
        await fs.unlink(smPath).catch(() => {});
        await fs.unlink(mdPath).catch(() => {});
        await fs.unlink(lgPath).catch(() => {});
        await fs.unlink(xlPath).catch(() => {});
      }
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
      throw new InternalServerErrorException('Не удалось удалить файл');
    }
  }

}