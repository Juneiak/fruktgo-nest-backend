// Тип автора статьи
export enum ArticleAuthorType {
  ADMIN = 'Admin',  // Статья от администратора
}

// Статус статьи
export enum ArticleStatus {
  PUBLISHED = 'published', // Опубликована
  ARCHIVED = 'archived'  // Архивная
}

// Целевая аудитория статьи
export enum ArticleTargetAudience {
  ALL = 'all',         // Для всех пользователей
  SELLERS = 'sellers', // Только для продавцов
  EMPLOYEES = 'employees', // Только для сотрудников
  CUSTOMERS = 'customers'  // Только для клиентов
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
