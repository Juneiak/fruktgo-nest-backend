/**
 * Утилитарные типы для TypeScript
 */

/**
 * Требует хотя бы одно поле из объекта T
 * @example
 * type Filter = AtLeastOne<{ id: string; name: string; email: string }>;
 * const valid: Filter = { id: '123' }; // ✅
 * const valid2: Filter = { id: '123', name: 'John' }; // ✅
 * const invalid: Filter = {}; // ❌ TypeScript Error
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>
}[keyof T];

/**
 * Требует ровно одно поле из объекта T
 * @example
 * type Filter = ExactlyOne<{ id: string; name: string }>;
 * const valid: Filter = { id: '123' }; // ✅
 * const invalid: Filter = { id: '123', name: 'John' }; // ❌ TypeScript Error
 */
export type ExactlyOne<T> = {
  [K in keyof T]: Pick<T, K> & { [P in Exclude<keyof T, K>]?: never }
}[keyof T];
