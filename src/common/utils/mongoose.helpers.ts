/**
 * Типобезопасная утилита для выбора полей в Mongoose queries
 * 
 * @example
 * const shift = await shiftModel.findById(id).select(selectFields<Shift>('shop', 'status')).exec();
 */
export function selectFields<T>(...fields: (keyof T)[]): string {
  return fields.join(' ');
}

/**
 * Типобезопасная утилита для исключения полей в Mongoose queries
 * 
 * @example
 * const shift = await shiftModel.findById(id).select(excludeFields<Shift>('statistics', 'events')).exec();
 */
export function excludeFields<T>(...fields: (keyof T)[]): string {
  return fields.map(f => `-${String(f)}`).join(' ');
}
