import { ApiBody, ApiConsumes } from "@nestjs/swagger";
import { applyDecorators } from "@nestjs/common";

// Тип свойства схемы Swagger
export interface SwaggerSchemaProperty {
  type: string;
  format?: string;
  example?: any;
  description?: string;
  enum?: any[];
  items?: SwaggerSchemaProperty;
  properties?: Record<string, SwaggerSchemaProperty>;
}

// Тип для схемы свойств
export type SwaggerSchemaProperties = Record<string, SwaggerSchemaProperty>;

/**
 * Декоратор для загрузки файла с дополнительными полями
 * 
 * @param fieldName Имя поля для загрузки файла
 * @param required Обязательный ли файл
 * @param properties Дополнительные свойства для схемы
 */
export function ApiFormData(
  fieldName: string = "file",
  required: boolean = false,
  properties?: SwaggerSchemaProperties | any
) {
  // Создаем базовую схему с полем для файла
  let schema: any = {
    type: "object",
    properties: {
      [fieldName]: {
        type: "string",
        format: "binary",
        description: "Загружаемый файл"
      }
    },
    required: required ? [fieldName] : []
  };
  
  // Если переданы дополнительные свойства, добавляем их
  if (properties) {
    if (typeof properties === 'object') {
      schema.properties = {
        ...schema.properties,
        ...properties
      };
    }
  }
  
  // Возвращаем декораторы для использования в контроллере
  return applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiBody({ schema })
  );
}