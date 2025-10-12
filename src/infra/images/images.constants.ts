import { ImageSize } from './images.enums';

export const UPLOAD_DIR = 'images';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Качество WebP по умолчанию
export const DEFAULT_WEBP_QUALITY = 85;

// Целевые размеры для разных устройств (в пикселях)
// Используются как максимальные границы при масштабировании
export const TARGET_SIZES: Record<ImageSize, number | null> = {
  [ImageSize.ORIGINAL]: null,  // Без ограничений - оригинальный размер
  [ImageSize.SM]: 480,         // Смартфоны (iPhone 12/13/14: 390-428px, Android: 360-414px)
  [ImageSize.MD]: 1024,        // Планшеты (iPad: 768-1024px, Android tablets: 800-1280px)
  [ImageSize.LG]: 1920,        // Десктоп (Full HD и выше: 1440-2560px)
};

// Минимальные размеры для каждой категории
// Если оригинал меньше - используется оригинальный размер
export const MIN_SIZES: Record<ImageSize, number> = {
  [ImageSize.ORIGINAL]: 0,     // Без ограничений
  [ImageSize.SM]: 320,         // Минимум для смартфонов
  [ImageSize.MD]: 600,         // Минимум для планшетов
  [ImageSize.LG]: 1024,        // Минимум для десктопа
};

// Коэффициенты масштабирования (используются как fallback)
export const SIZE_SCALE_FACTORS: Record<ImageSize, number> = {
  [ImageSize.ORIGINAL]: 1.0,
  [ImageSize.SM]: 0.3,
  [ImageSize.MD]: 0.6,
  [ImageSize.LG]: 0.85,
};

// Размеры по умолчанию для сохранения
export const DEFAULT_IMAGE_SIZES: ImageSize[] = [ImageSize.SM, ImageSize.MD, ImageSize.LG];