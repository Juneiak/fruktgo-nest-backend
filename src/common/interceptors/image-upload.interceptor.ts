import { FileInterceptor } from "@nestjs/platform-express";
import { BadRequestException } from "@nestjs/common";
import { memoryStorage } from "multer";
import { extname } from "path";

// Настройка Multer для загрузки файлов изображений
const imageFileFilter = (req: any, file: Express.Multer.File, callback: Function) => {
  // Проверяем допустимые расширения файлов
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return callback(new BadRequestException('Разрешены только изображения (jpg, jpeg, png, webp)'), false);
  }
  
  callback(null, true);
};

// Функция-фабрика для создания интерцептора загрузки изображений
export function ImageUploadInterceptor(fieldName: string = 'image') {
  return FileInterceptor(fieldName, {
    storage: memoryStorage(),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
    },
  });
}