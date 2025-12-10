# Этап 0.2: Структура проекта

## Краткое содержание

Создание структуры папок по новой архитектуре V2, настройка ESLint правил для изоляции модулей, barrel exports для контролируемого API модулей.

## Предполагаемый результат

- Папки модулей созданы по архитектуре V2
- ESLint правило блокирует неправильные импорты
- Шаблон модуля готов (port, service, schema, commands, queries)
- Barrel exports (index.ts) для каждого модуля

---

## 1. Структура папок

```
src/
├── common/                    # Общие утилиты (существует)
├── infra/                     # Инфраструктурные модули (D, E)
│   ├── event-bus/             # ✅ Создан в stage-1
│   ├── auth/                  # AUTH
│   ├── communications/        # COMMUNICATIONS
│   ├── media/                 # MEDIA
│   ├── audit/                 # AUDIT
│   ├── analytics/             # ANALYTICS (Фаза 4)
│   ├── integrations/          # INTEGRATIONS (Фаза 4)
│   ├── geo/                   # GEO
│   └── logistics/             # LOGISTICS
├── modules/                   # Доменные модули (A, B, C)
│   ├── catalog/               # CATALOG
│   ├── inventory/             # INVENTORY
│   ├── orders/                # ORDERS
│   ├── storefront/            # STOREFRONT
│   ├── business/              # BUSINESS (Seller, Shop)
│   ├── workforce/             # WORKFORCE (Employee, Shift)
│   ├── finance/               # FINANCE (Фаза 2)
│   ├── platform/              # PLATFORM (Фаза 3+)
│   ├── customer/              # CUSTOMER
│   ├── marketing/             # MARKETING (Фаза 3)
│   ├── loyalty/               # LOYALTY (Фаза 3)
│   ├── reputation/            # REPUTATION (Фаза 3)
│   └── support/               # SUPPORT (Фаза 3)
├── processes/                 # Оркестраторы
│   ├── checkout/              # CheckoutProcess
│   ├── order/                 # OrderProcess
│   └── finance/               # FinanceProcess (Фаза 2)
└── interface/                 # Interface Layer (существует)
    ├── http/
    ├── ws/
    └── tg/
```

---

## 2. Шаблон модуля

Каждый модуль имеет стандартную структуру:

```
src/modules/customer/
├── index.ts                   # Barrel export (публичный API)
├── customer.module.ts         # NestJS модуль
├── customer.port.ts           # Интерфейс порта + токен
├── customer.service.ts        # Реализация порта
├── customer.schema.ts         # Mongoose схема
├── customer.commands.ts       # Command классы
├── customer.queries.ts        # Query классы
├── customer.enums.ts          # Enums модуля
├── customer.types.ts          # Типы (если нужны)
└── customer.events.ts         # События модуля
```

---

## 3. Пример Barrel Export

```typescript
// src/modules/customer/index.ts

// Модуль
export { CustomerModule } from './customer.module';

// Порт
export { CustomerPort, CUSTOMER_PORT } from './customer.port';

// Схема (только типы, не модель!)
export { Customer } from './customer.schema';
export type { CustomerDocument } from './customer.schema';

// Commands/Queries как namespace
export * as CustomerCommands from './customer.commands';
export * as CustomerQueries from './customer.queries';

// Enums
export * as CustomerEnums from './customer.enums';

// События
export * from './customer.events';
```

### Правильный импорт:
```typescript
// ✅ ПРАВИЛЬНО
import { CustomerPort, CUSTOMER_PORT, CustomerCommands } from 'src/modules/customer';

// Использование
const query = new CustomerCommands.CreateCustomerCommand({...});
```

### Неправильный импорт:
```typescript
// ❌ НЕПРАВИЛЬНО — прямой путь к файлу
import { CustomerService } from 'src/modules/customer/customer.service';
import { CustomerModel } from 'src/modules/customer/customer.schema';
```

---

## 4. ESLint правило изоляции

### Установка

```bash
npm install -D eslint-plugin-import eslint-plugin-boundaries
```

### Конфигурация

```javascript
// eslint.config.mjs
import boundaries from 'eslint-plugin-boundaries';

export default [
  // ... существующие правила
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'common', pattern: 'src/common/*' },
        { type: 'infra', pattern: 'src/infra/*' },
        { type: 'modules', pattern: 'src/modules/*' },
        { type: 'processes', pattern: 'src/processes/*' },
        { type: 'interface', pattern: 'src/interface/*' },
      ],
      'boundaries/ignore': ['**/*.spec.ts', '**/*.test.ts'],
    },
    rules: {
      // Модули могут импортировать только через index.ts
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // common доступен всем
            { from: '*', allow: ['common'] },
            
            // infra может использовать common
            { from: 'infra', allow: ['common'] },
            
            // modules могут использовать common и infra
            { from: 'modules', allow: ['common', 'infra'] },
            
            // processes могут использовать modules (через порты!)
            { from: 'processes', allow: ['common', 'infra', 'modules'] },
            
            // interface может использовать всё
            { from: 'interface', allow: ['common', 'infra', 'modules', 'processes'] },
          ],
        },
      ],
      
      // Запрет импорта внутренних файлов модуля
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/modules/*/*.service', 'src/modules/*/*.schema'],
              message: 'Import through module index.ts only',
            },
          ],
        },
      ],
    },
  },
];
```

---

## 5. Создание пустых модулей

### Скрипт генерации

```bash
#!/bin/bash
# scripts/create-module.sh

MODULE_NAME=$1
MODULE_PATH="src/modules/${MODULE_NAME}"

mkdir -p ${MODULE_PATH}

# index.ts
cat > ${MODULE_PATH}/index.ts << EOF
export { ${MODULE_NAME^}Module } from './${MODULE_NAME}.module';
export { ${MODULE_NAME^}Port, ${MODULE_NAME^^}_PORT } from './${MODULE_NAME}.port';
export * as ${MODULE_NAME^}Commands from './${MODULE_NAME}.commands';
export * as ${MODULE_NAME^}Queries from './${MODULE_NAME}.queries';
export * as ${MODULE_NAME^}Enums from './${MODULE_NAME}.enums';
EOF

# Остальные файлы создаются пустыми с TODO
touch ${MODULE_PATH}/${MODULE_NAME}.module.ts
touch ${MODULE_PATH}/${MODULE_NAME}.port.ts
touch ${MODULE_PATH}/${MODULE_NAME}.service.ts
touch ${MODULE_PATH}/${MODULE_NAME}.schema.ts
touch ${MODULE_PATH}/${MODULE_NAME}.commands.ts
touch ${MODULE_PATH}/${MODULE_NAME}.queries.ts
touch ${MODULE_PATH}/${MODULE_NAME}.enums.ts

echo "Module ${MODULE_NAME} created at ${MODULE_PATH}"
```

### Создание модулей Фазы 1

```bash
# Группа A: Core Commerce
./scripts/create-module.sh catalog
./scripts/create-module.sh inventory
./scripts/create-module.sh orders
./scripts/create-module.sh storefront

# Группа B: Back-office
./scripts/create-module.sh business
./scripts/create-module.sh workforce

# Группа C: Engagement
./scripts/create-module.sh customer

# Infra
mkdir -p src/infra/auth
mkdir -p src/infra/communications
mkdir -p src/infra/geo
mkdir -p src/infra/logistics
```

---

## 6. Пример пустого порта

```typescript
// src/modules/customer/customer.port.ts
export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');

export interface CustomerPort {
  // TODO: Будет заполнено в stage-2 Фазы 1
}
```

---

## 7. Проверка

### Тест ESLint

```typescript
// src/modules/orders/orders.service.ts

// ❌ ESLint error: Import through module index.ts only
import { CustomerService } from 'src/modules/customer/customer.service';

// ✅ OK
import { CustomerPort, CUSTOMER_PORT } from 'src/modules/customer';
```

---

## Чеклист готовности

- [ ] Все папки модулей созданы
- [ ] Каждый модуль имеет index.ts
- [ ] ESLint правила настроены
- [ ] `npm run lint` проходит без ошибок
- [ ] Неправильные импорты блокируются
