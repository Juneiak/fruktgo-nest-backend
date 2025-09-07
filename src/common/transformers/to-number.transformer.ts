// src/common/transformers/to-number.transformer.ts
import { Transform } from 'class-transformer';

type ToNumberOptions = {
  /** Пустую строку превращать в undefined (по умолчанию true) */
  emptyToUndefined?: boolean;
  /** null превращать в undefined (по умолчанию true) */
  nullToUndefined?: boolean;
  /** Парсить как целое или как float (по умолчанию 'float') */
  parse?: 'int' | 'float';
  /** Десятичный разделитель во входе ('.' | ',') */
  decimalSeparator?: '.' | ',';
  /** Значение по умолчанию, если распарсить не удалось */
  defaultValue?: number;
};

function toNumber(raw: unknown, opts: ToNumberOptions): number | undefined | null {
  const {
    emptyToUndefined = true,
    nullToUndefined = true,
    parse = 'float',
    decimalSeparator = '.',
    defaultValue,
  } = opts;

  if (raw === undefined) return undefined;
  if (raw === null) return nullToUndefined ? undefined : null;
  if (typeof raw === 'number') return raw;

  let s = String(raw).trim();
  if (emptyToUndefined && s === '') return undefined;

  // убираем пробелы/тыс.разделители
  s = s.replace(/[\s_]/g, '');
  if (decimalSeparator === ',') s = s.replace(',', '.');

  const n = parse === 'int' ? parseInt(s, 10) : Number(s);
  if (Number.isNaN(n)) return defaultValue ?? undefined;
  return n;
}

/** Трансформер одного числа */
export const ToNumber = (opts: ToNumberOptions = {}) =>
  Transform(({ value }) => toNumber(value, opts), { toClassOnly: true });

/** Трансформер массива чисел (под query ?ids=1&ids=2 или form-data) */
export const ToNumberArray = (opts: ToNumberOptions = {}) =>
  Transform(({ value }) => {
    const arr = Array.isArray(value) ? value : (value === undefined ? [] : [value]);
    return arr
      .map((v) => toNumber(v, opts))
      .filter((v) => v !== undefined) as number[];
  }, { toClassOnly: true });

/** Удобная обёртка для целых */
export const ToInt = (opts: Omit<ToNumberOptions, 'parse'> = {}) =>
  ToNumber({ ...opts, parse: 'int' });