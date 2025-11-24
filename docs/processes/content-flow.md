# Процесс: Контент-маркетинг и управление контентом

**Участники:** ContentManager, MarketingManager, Seller, PlatformStaff  
**Зависимости:** Content Module, Media Storage, CMS, Social Media APIs

---

## Краткое содержание

### Основная идея

Контент-менеджер создаёт **контент** (статьи, баннеры, сториз, email-рассылки) для продвижения платформы и товаров. Контент публикуется **мультиканально**: в приложении, через email, в соцсетях, в Telegram. Для всего контента собирается **аналитика**: просмотры, клики, конверсии. Проводится **A/B тестирование** баннеров и заголовков для определения наиболее эффективного варианта.

**Схема:** Создание → модерация → планирование публикации → публикация в каналах → аналитика эффективности.

### Ключевая логика

**Типы контента:**
- **Баннеры** (главная страница, категории) — промо новых товаров, акций
- **Блог** — полезные статьи (рецепты, советы по выбору фруктов)
- **Сториз** — короткие визуальные истории о товарах/магазинах
- **Email-рассылки** — newsletters, дайджесты, персональные предложения
- **Контент магазина** — описания, преимущества (управляется продавцом)
- **Посты в соцсетях** — автоматическая публикация акций в Instagram/Telegram

**Баннеры:**
- Типы: главный баннер (карусель), категорийный, промо-полоса
- Настройка таргетинга: города, сегменты клиентов, время показа
- Приоритет и порядок показа
- Клик → переход на товар/категорию/акцию
- A/B тестирование: 2 варианта баннера, победитель по CTR

**Статьи блога:**
- Создание в WYSIWYG редакторе
- Категории, теги, SEO-оптимизация
- Модерация перед публикацией
- Показываются в разделе "Блог" в приложении
- Интеграция товаров в статью (например, рецепт с товарами)

**Email-рассылки:**
- Сегментация: новички, активные, неактивные (давно не заказывали)
- Шаблоны писем (промо, новости, персональные рекомендации)
- Автоматические триггеры: брошенная корзина → напоминание через 2 часа
- Отслеживание: открытия, клики, конверсия в заказ

**A/B тестирование:**
- Создаются 2 варианта (баннер, заголовок email)
- Трафик делится 50/50
- Через N показов определяется победитель по метрике (CTR, конверсия)
- Автоматическое переключение на лучший вариант

### Публикация в соцсети

Автоматическая публикация акций и новых товаров в Instagram/Telegram канал через API. Контент-менеджер может предварительно просмотреть пост, отредактировать, запланировать публикацию.

---

## Обзор

Система управления контентом для продвижения платформы, магазинов и товаров через различные каналы коммуникации.

**Принципы:**
- Централизованное управление контентом
- Мультиканальная публикация
- Модерация и контроль качества
- A/B тестирование контента
- Аналитика эффективности
- SEO-оптимизация

**Типы контента:**
- **Статьи и блог** - полезные материалы для клиентов
- **Баннеры и промо** - визуальная реклама на платформе
- **Сториз** - короткие визуальные истории
- **Push-уведомления** - промо-сообщения
- **Email-рассылки** - newsletters и дайджесты
- **Социальные сети** - контент для Instagram, Telegram
- **SEO-контент** - описания товаров, категорий

**Каналы публикации:**
- Приложение (главная страница, баннеры)
- Telegram Bot
- Email
- Instagram
- Landing pages

---

## 1. Создание баннера для главной страницы

**Актор:** ContentManager / MarketingManager

### Основной сценарий

1. Контент-менеджер → "Контент" → "Создать баннер"
2. Заполнение параметров:
   ```typescript
   {
     name: "Новогодняя распродажа",
     type: "MAIN_BANNER",  // MAIN_BANNER | CATEGORY_BANNER | PROMO_STRIP
     
     content: {
       title: "🎄 Новогодняя распродажа",
       subtitle: "Скидки до 40% на фрукты и ягоды",
       image: "banner-ny-2024.jpg",
       mobileImage: "banner-ny-2024-mobile.jpg",
       
       cta: {
         text: "Перейти к акции",
         action: "DEEPLINK",
         target: "/campaigns/new-year-2024"
       }
     },
     
     targeting: {
       userSegments: ["ALL"],  // ALL | NEW_USERS | VIP | ACTIVE
       cities: ["Алматы", "Астана"],
       deviceTypes: ["mobile", "desktop"]
     },
     
     schedule: {
       startDate: "2024-12-25 00:00",
       endDate: "2025-01-10 23:59",
       priority: 1  // Порядок отображения
     },
     
     abTest?: {
       enabled: true,
       variants: [
         {
           name: "Вариант A",
           image: "banner-ny-a.jpg",
           weight: 50  // 50% пользователей
         },
         {
           name: "Вариант B",
           image: "banner-ny-b.jpg",
           weight: 50
         }
       ]
     },
     
     status: "DRAFT"
   }
   ```

3. **Предпросмотр:**
   - Desktop версия
   - Mobile версия
   - Разные сегменты пользователей

4. **Модерация:**
   ```typescript
   {
     moderation: {
       status: "PENDING",
       checklist: [
         { item: "Изображение соответствует требованиям", checked: false },
         { item: "Текст без ошибок", checked: false },
         { item: "CTA корректен", checked: false }
       ]
     }
   }
   ```

5. **Одобрение и публикация:**
   ```typescript
   banner.status = "APPROVED";
   banner.publishedAt = new Date();
   
   // Кэширование для быстрой загрузки
   await cacheService.set(`banner:${banner._id}`, banner, { ttl: 3600 });
   ```

6. **Отображение пользователям:**
   - Автоматически показывается на главной странице
   - Учитывается таргетинг и приоритет
   - Трекинг просмотров и кликов

**API:** `POST /platform/content/banners`

### Требования к баннерам

| Тип | Размер (desktop) | Размер (mobile) | Формат |
|-----|------------------|-----------------|--------|
| Main Banner | 1920x600 | 750x400 | JPG, PNG |
| Category Banner | 800x400 | 375x200 | JPG, PNG |
| Promo Strip | 1920x120 | 750x80 | JPG, PNG |

---

## 2. Публикация статьи в блоге

**Актор:** ContentManager

### Основной сценарий

1. Контент-менеджер → "Блог" → "Новая статья"
2. Заполнение формы:
   ```typescript
   {
     title: "10 способов сохранить фрукты свежими дольше",
     slug: "10-sposobov-sohranit-frukty-svezhimi",
     
     content: {
       html: "<p>Текст статьи...</p>",
       markdown: "## Заголовок\n\nТекст...",
       
       excerpt: "Краткое описание для превью",
       coverImage: "article-cover.jpg",
       
       sections: [
         {
           type: "PARAGRAPH",
           content: "Текст параграфа..."
         },
         {
           type: "IMAGE",
           url: "image-1.jpg",
           caption: "Подпись к изображению"
         },
         {
           type: "LIST",
           items: ["Пункт 1", "Пункт 2"]
         }
       ]
     },
     
     metadata: {
       author: authorId,
       category: "Полезные советы",
       tags: ["фрукты", "хранение", "советы"],
       
       readingTime: 5,  // минут
       
       seo: {
         metaTitle: "10 способов сохранить фрукты свежими | FruktGo",
         metaDescription: "Узнайте, как правильно хранить фрукты...",
         keywords: ["хранение фруктов", "свежесть фруктов"]
       }
     },
     
     settings: {
       featured: true,      // Показывать на главной
       commentsEnabled: true,
       shareEnabled: true
     },
     
     schedule: {
       publishAt: "2024-12-10 10:00",
       status: "SCHEDULED"
     }
   }
   ```

3. **SEO-проверка:**
   ```typescript
   {
     seoScore: 85,
     recommendations: [
       "✓ Заголовок оптимален (60 символов)",
       "✓ Мета-описание присутствует",
       "⚠ Добавьте alt-текст к изображениям",
       "⚠ Увеличьте количество внутренних ссылок"
     ]
   }
   ```

4. **Публикация в запланированное время:**
   ```typescript
   // Cron job проверяет каждую минуту
   const articlesToPublish = await Article.find({
     status: "SCHEDULED",
     publishAt: { $lte: new Date() }
   });
   
   for (const article of articlesToPublish) {
     article.status = "PUBLISHED";
     article.publishedAt = new Date();
     await article.save();
     
     // Уведомление подписчикам
     await notificationService.notifySubscribers({
       type: "NEW_ARTICLE",
       article: article._id
     });
     
     // Публикация в соцсетях
     await socialMediaService.shareArticle(article);
   }
   ```

5. **Отображение на сайте:**
   - В разделе "Блог"
   - На главной (если featured)
   - В рекомендациях по категории

**API:** `POST /platform/content/articles`

---

## 3. Создание сториз (истории)

**Актор:** ContentManager / Seller

### Основной сценарий

1. Создание набора сториз:
   ```typescript
   {
     title: "Сезонные фрукты декабря",
     author: {
       type: "PLATFORM",  // PLATFORM | SHOP
       id: authorId
     },
     
     slides: [
       {
         type: "IMAGE",
         media: "story-1.jpg",
         duration: 5,  // секунд
         
         content: {
           text: "🍊 Сезон мандаринов!",
           position: "bottom",
           backgroundColor: "#FF6B35"
         },
         
         cta?: {
           text: "Купить",
           action: "DEEPLINK",
           target: "/products/mandariny"
         }
       },
       {
         type: "VIDEO",
         media: "story-2.mp4",
         duration: 10,
         
         content: {
           text: "Как выбрать спелые мандарины",
           position: "top"
         }
       },
       {
         type: "POLL",
         media: "story-3.jpg",
         duration: 8,
         
         poll: {
           question: "Какие фрукты вы любите зимой?",
           options: [
             { text: "Мандарины", votes: 0 },
             { text: "Яблоки", votes: 0 },
             { text: "Груши", votes: 0 }
           ]
         }
       }
     ],
     
     targeting: {
       userSegments: ["ACTIVE", "VIP"],
       expiresAt: "2024-12-31 23:59"  // Сториз истекают
     },
     
     status: "PUBLISHED"
   }
   ```

2. **Отображение в приложении:**
   ```
   ┌─────────┬─────────┬─────────┐
   │ [фото]  │ [фото]  │ [фото]  │
   │         │         │         │
   │ FruktGo │  Магазин│  Акция  │
   │ •••     │         │         │
   └─────────┴─────────┴─────────┘
   
   • = новая сториз (не просмотрена)
   ```

3. **Просмотр сториз:**
   ```typescript
   // При просмотре
   await StoryView.create({
     story: storyId,
     slide: slideIndex,
     user: userId,
     viewedAt: new Date(),
     completedSlide: true  // Досмотрел до конца
   });
   
   // Аналитика
   {
     totalViews: 2500,
     uniqueUsers: 1800,
     completionRate: 72,  // % досмотревших до конца
     avgTimeSpent: 8,     // секунд
     
     bySlide: [
       { slide: 1, views: 2500, completionRate: 85 },
       { slide: 2, views: 2125, completionRate: 70 },
       { slide: 3, views: 1487, completionRate: 100 }
     ],
     
     interactions: {
       ctaClicks: 320,
       pollVotes: 450,
       shares: 85
     }
   }
   ```

**API:** `POST /platform/content/stories`

---

## 4. Email-рассылка (newsletter)

**Актор:** MarketingManager

### Основной сценарий

1. Создание email-кампании:
   ```typescript
   {
     name: "Еженедельный дайджест",
     type: "NEWSLETTER",  // NEWSLETTER | PROMOTIONAL | TRANSACTIONAL
     
     template: "weekly-digest",
     
     content: {
       subject: "🍎 Еженедельный дайджест: новинки и акции",
       preheader: "Свежие фрукты, новые акции и полезные советы",
       
       blocks: [
         {
           type: "HEADER",
           content: {
             logo: "logo.png",
             title: "Еженедельный дайджест"
           }
         },
         {
           type: "HERO",
           content: {
             image: "hero-image.jpg",
             headline: "Сезон мандаринов!",
             cta: {
               text: "Смотреть акции",
               url: "https://fruktgo.kz/campaigns/mandarins"
             }
           }
         },
         {
           type: "PRODUCTS_GRID",
           products: [productId1, productId2, productId3]
         },
         {
           type: "ARTICLE",
           article: articleId
         },
         {
           type: "FOOTER",
           content: {
             socialLinks: [...],
             unsubscribeLink: true
           }
         }
       ]
     },
     
     recipients: {
       segments: ["ACTIVE", "VIP"],
       excludeSegments: ["UNSUBSCRIBED"],
       
       filters: {
         hasOrders: true,
         lastOrderDays: { $lte: 30 }
       },
       
       totalCount: 8500
     },
     
     schedule: {
       sendAt: "2024-12-09 09:00",
       timezone: "Asia/Almaty"
     },
     
     settings: {
       trackOpens: true,
       trackClicks: true,
       abTest?: {
         subjectLines: [
           "🍎 Еженедельный дайджест",
           "Новинки недели в FruktGo"
         ],
         splitPercentage: 50
       }
     }
   }
   ```

2. **Тестовая отправка:**
   ```typescript
   await emailService.sendTest({
     campaignId,
     recipients: ["test@fruktgo.kz"]
   });
   ```

3. **Запуск рассылки:**
   ```typescript
   // В запланированное время
   const campaign = await EmailCampaign.findOne({ sendAt: { $lte: new Date() } });
   
   // Батчами по 1000 писем
   const batches = chunkArray(campaign.recipients, 1000);
   
   for (const batch of batches) {
     await emailService.sendBatch({
       template: campaign.template,
       content: campaign.content,
       recipients: batch
     });
     
     await sleep(5000);  // Задержка между батчами
   }
   
   campaign.status = "SENT";
   ```

4. **Аналитика рассылки:**
   ```typescript
   {
     sent: 8500,
     delivered: 8350,     // 98.2%
     bounced: 150,        // 1.8%
     
     opened: 3340,        // 40% (от delivered)
     clicked: 835,        // 10% (от delivered)
     
     unsubscribed: 42,    // 0.5%
     
     conversions: {
       orders: 127,
       revenue: 317500
     },
     
     topLinks: [
       { url: "/campaigns/mandarins", clicks: 425 },
       { url: "/products/mandariny", clicks: 210 }
     ],
     
     deviceStats: {
       desktop: 45,
       mobile: 50,
       tablet: 5
     }
   }
   ```

**API:** `POST /platform/content/email-campaigns`

---

## 5. Управление контентом магазина (для селлера)

**Актор:** Seller

### Создание поста о магазине

```typescript
{
  shop: shopId,
  type: "SHOP_POST",
  
  content: {
    title: "Новое поступление сезонных ягод!",
    body: "Свежие клубника и черника прямо с фермы",
    images: ["berries-1.jpg", "berries-2.jpg"],
    
    products: [productId1, productId2],  // Связанные товары
    
    tags: ["новинки", "ягоды", "сезон"]
  },
  
  visibility: {
    showOnShopPage: true,
    notifyFollowers: true
  },
  
  status: "PUBLISHED"
}
```

### Обновление описания магазина

```typescript
{
  shop: shopId,
  
  description: {
    short: "Свежие фрукты и овощи с доставкой",
    
    full: `
      # О нас
      Мы - семейная ферма с 15-летним опытом.
      
      ## Почему выбирают нас:
      - Свежие продукты прямо с грядки
      - Доставка в день заказа
      - Органическое выращивание
      
      ## Режим работы
      Пн-Вс: 08:00 - 22:00
    `,
    
    gallery: [
      "shop-photo-1.jpg",
      "shop-photo-2.jpg",
      "farm-photo.jpg"
    ],
    
    certificates: [
      { name: "Сертификат органик", image: "cert-1.jpg" }
    ]
  }
}
```

**API:** `POST /seller/content/posts`

---

## 6. Публикация в социальные сети

**Актор:** ContentManager (автоматически или вручную)

### Автоматическая публикация

```typescript
// При публикации статьи
async function shareArticle(article: Article) {
  // Telegram
  await telegramBot.sendMessage({
    chatId: CHANNEL_ID,
    text: `
      📝 Новая статья: ${article.title}
      
      ${article.excerpt}
      
      Читать полностью: ${article.url}
    `,
    photo: article.coverImage
  });
  
  // Instagram (через Facebook Graph API)
  await instagramAPI.createPost({
    imageUrl: article.coverImage,
    caption: `
      ${article.title}
      
      ${article.excerpt}
      
      #fruktgo #фрукты #здоровье
      
      Ссылка в шапке профиля ☝️
    `
  });
  
  // Сохранение публикации
  await SocialMediaPost.create({
    content: article._id,
    platform: "telegram",
    postId: telegramResult.message_id,
    publishedAt: new Date()
  });
}
```

### Аналитика соцсетей

```typescript
{
  telegram: {
    subscribers: 12000,
    postsThisMonth: 28,
    
    avgEngagement: {
      views: 4500,
      reactions: 320,
      shares: 85
    },
    
    topPost: {
      text: "🎄 Новогодняя распродажа",
      views: 8500,
      reactions: 680
    }
  },
  
  instagram: {
    followers: 8500,
    postsThisMonth: 20,
    
    avgEngagement: {
      likes: 340,
      comments: 45,
      saves: 60,
      reach: 5200
    },
    
    topPost: {
      caption: "Сезон мандаринов!",
      likes: 750,
      comments: 92
    }
  }
}
```

**API:** `POST /platform/content/social-media/publish`

---

## 7. A/B тестирование контента

**Актор:** MarketingManager

### Настройка A/B теста

```typescript
{
  testName: "Баннер главной: текст vs изображение",
  
  variants: [
    {
      name: "Control (текущий)",
      weight: 50,
      
      content: {
        type: "IMAGE_BANNER",
        image: "banner-control.jpg"
      }
    },
    {
      name: "Variant (новый)",
      weight: 50,
      
      content: {
        type: "TEXT_BANNER",
        text: "Скидки до 40%!",
        backgroundColor: "#FF6B35"
      }
    }
  ],
  
  metrics: [
    "impressions",
    "clicks",
    "ctr",
    "conversions",
    "revenue"
  ],
  
  duration: 7,  // дней
  
  successCriteria: {
    primaryMetric: "ctr",
    minImprovement: 10,  // %
    confidenceLevel: 95
  }
}
```

### Результаты теста

```typescript
{
  testId,
  status: "COMPLETED",
  
  results: {
    control: {
      impressions: 25000,
      clicks: 1250,
      ctr: 5.0,
      conversions: 125,
      revenue: 312500
    },
    
    variant: {
      impressions: 25000,
      clicks: 1750,
      ctr: 7.0,      // +40% улучшение ✓
      conversions: 175,
      revenue: 437500
    }
  },
  
  winner: "variant",
  confidence: 98,
  
  recommendation: "Переключить всех пользователей на вариант B"
}
```

**API:** `POST /platform/content/ab-tests`

---

## Техническая сводка

### Сущность Banner

```typescript
{
  name: string,
  type: "MAIN_BANNER" | "CATEGORY_BANNER" | "PROMO_STRIP",
  
  content: {
    title: string,
    subtitle?: string,
    image: string,
    mobileImage?: string,
    cta?: {
      text: string,
      action: "DEEPLINK" | "EXTERNAL_URL" | "CATEGORY" | "PRODUCT",
      target: string
    }
  },
  
  targeting: {
    userSegments: string[],
    cities?: string[],
    deviceTypes?: string[]
  },
  
  schedule: {
    startDate: Date,
    endDate: Date,
    priority: number
  },
  
  analytics: {
    impressions: number,
    clicks: number,
    ctr: number
  },
  
  status: "DRAFT" | "PENDING" | "APPROVED" | "PUBLISHED" | "EXPIRED"
}
```

### Сущность Article

```typescript
{
  title: string,
  slug: string,
  
  content: {
    html: string,
    excerpt: string,
    coverImage: string,
    sections: Section[]
  },
  
  metadata: {
    author: ObjectId,
    category: string,
    tags: string[],
    readingTime: number,
    seo: {
      metaTitle: string,
      metaDescription: string,
      keywords: string[]
    }
  },
  
  settings: {
    featured: boolean,
    commentsEnabled: boolean,
    shareEnabled: boolean
  },
  
  analytics: {
    views: number,
    uniqueViews: number,
    avgTimeOnPage: number,
    shares: number,
    comments: number
  },
  
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED",
  publishedAt?: Date
}
```

### Сущность Story

```typescript
{
  title: string,
  author: {
    type: "PLATFORM" | "SHOP",
    id: ObjectId
  },
  
  slides: [{
    type: "IMAGE" | "VIDEO" | "POLL",
    media: string,
    duration: number,
    
    content?: {
      text: string,
      position: "top" | "bottom" | "center",
      backgroundColor?: string
    },
    
    cta?: {
      text: string,
      action: string,
      target: string
    },
    
    poll?: {
      question: string,
      options: [{ text: string, votes: number }]
    }
  }],
  
  targeting: {
    userSegments: string[],
    expiresAt: Date
  },
  
  analytics: {
    totalViews: number,
    uniqueUsers: number,
    completionRate: number,
    interactions: {
      ctaClicks: number,
      pollVotes: number,
      shares: number
    }
  }
}
```

### API

**Platform:**
- `POST /platform/content/banners` - создать баннер
- `POST /platform/content/articles` - создать статью
- `POST /platform/content/stories` - создать сториз
- `POST /platform/content/email-campaigns` - email-рассылка
- `POST /platform/content/ab-tests` - A/B тест
- `POST /platform/content/social-media/publish` - публикация в соцсети
- `GET /platform/content/analytics` - аналитика контента

**Seller:**
- `POST /seller/content/posts` - пост о магазине
- `PATCH /seller/shops/:id/description` - обновить описание
- `GET /seller/content/analytics` - аналитика контента магазина

**Public:**
- `GET /content/banners` - получить баннеры (с таргетингом)
- `GET /content/articles` - список статей
- `GET /content/articles/:slug` - статья
- `GET /content/stories` - список сториз
- `POST /content/stories/:id/view` - просмотр сториз

### Бизнес-правила

1. **Баннеры отображаются по приоритету** (1 = высший)
2. **Модерация обязательна** для всего пользовательского контента
3. **Сториз истекают** через 24 часа по умолчанию
4. **Email-рассылки** - не чаще 2 раз в неделю одному пользователю
5. **A/B тесты** - минимум 1000 показов на вариант
6. **SEO score** должен быть >70 для публикации
7. **Изображения** автоматически оптимизируются и сжимаются
8. **Контент кэшируется** на CDN для быстрой загрузки
9. **Unsubscribe** обязателен в каждом email
10. **Соцсети:** автопостинг при публикации featured статей

---

## Примеры

### Создание баннера с A/B тестом

```typescript
await contentService.createBanner({
  name: "Новогодняя акция",
  type: "MAIN_BANNER",
  content: { ... },
  abTest: {
    enabled: true,
    variants: [
      { name: "Красный фон", image: "variant-a.jpg", weight: 50 },
      { name: "Зелёный фон", image: "variant-b.jpg", weight: 50 }
    ]
  }
});
```

### Отправка email-рассылки

```typescript
await emailService.createCampaign({
  name: "Еженедельный дайджест",
  template: "newsletter",
  recipients: {
    segments: ["ACTIVE"],
    filters: { lastOrderDays: { $lte: 30 } }
  },
  sendAt: "2024-12-09 09:00"
});
```

### Публикация сториз

```typescript
await contentService.createStory({
  title: "Сезон мандаринов",
  slides: [
    {
      type: "IMAGE",
      media: "story-1.jpg",
      content: { text: "🍊 Мандарины в наличии!" },
      cta: { text: "Купить", target: "/products/mandariny" }
    }
  ]
});
```

---

## Связь с другими процессами

**Marketing Flow:**
- Контент поддерживает маркетинговые кампании
- Баннеры для промокодов и акций

**Analytics Flow:**
- Детальная аналитика эффективности контента
- A/B тесты и оптимизация

**Notification Flow:**
- Push-уведомления о новом контенте
- Email-рассылки

**Catalog Flow:**
- SEO-описания товаров и категорий
- Продвижение товаров через контент

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-24
