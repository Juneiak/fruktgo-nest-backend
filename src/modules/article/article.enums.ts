import { UserType } from 'src/common/enums/common.enum';

// Тип автора статьи
export enum ArticleAuthorType {
  ADMIN = UserType.ADMIN,  // Статья от администратора
}

// Статус статьи
export enum ArticleStatus {
  DRAFT = 'draft',           // Черновик
  PUBLISHED = 'published',   // Опубликована
  HIDDEN = 'hidden',         // Скрыта
  ARCHIVED = 'archived'      // Архивирована
}

// Целевая аудитория статьи
export enum ArticleTargetAudience {
  ALL = 'all',         // Для всех пользователей
  SELLERS = UserType.SELLER, // Только для продавцов
  EMPLOYEES = UserType.EMPLOYEE, // Только для сотрудников
  CUSTOMERS = UserType.CUSTOMER  // Только для клиентов
}

export enum ArtcilesTag {
  SEASONAL = 'seasonal',           // Сезонные фрукты и овощи
  RECIPES = 'recipes',             // Рецепты и кулинария
  HEALTH = 'health',               // Польза для здоровья
  TIPS = 'tips',                   // Советы по выбору и хранению
  DELIVERY = 'delivery',           // О доставке
  PROMO = 'promo',                 // Акции и специальные предложения
  NEWS = 'news',                   // Новости маркетплейса
  SELLER_GUIDE = 'seller_guide',   // Руководство для продавцов
  CUSTOMER_GUIDE = 'customer_guide', // Руководство для покупателей
  FRUITS = 'fruits',               // О фруктах
  VEGETABLES = 'vegetables',       // Об овощах
  EXOTIC = 'exotic'                // Экзотические продукты
}


