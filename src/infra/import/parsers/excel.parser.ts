import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedProduct, ParsedStock, ParsedPrice, ImportOptions } from '../import.types';

@Injectable()
export class ExcelParser {
  /**
   * Парсинг товаров из Excel
   */
  parseProducts(
    buffer: Buffer,
    options?: ImportOptions,
  ): { data: ParsedProduct[]; errors: Array<{ row: number; message: string }> } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    const data: ParsedProduct[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    const mapping = options?.columnMapping || {
      externalCode: 'Код',
      name: 'Наименование',
      description: 'Описание',
      category: 'Категория',
      unit: 'Единица',
      weight: 'Вес',
      barcode: 'Штрихкод',
    };

    rows.forEach((row, index) => {
      try {
        const externalCode = String(row[mapping.externalCode] || '').trim();
        const name = String(row[mapping.name] || '').trim();

        if (!externalCode || !name) {
          errors.push({ row: index + 2, message: 'Отсутствует код или наименование' });
          return;
        }

        data.push({
          externalCode,
          name,
          description: row[mapping.description] || undefined,
          category: row[mapping.category] || undefined,
          unit: row[mapping.unit] || undefined,
          weight: row[mapping.weight] ? Number(row[mapping.weight]) : undefined,
          barcode: row[mapping.barcode] || undefined,
        });
      } catch (err) {
        errors.push({ row: index + 2, message: `Ошибка парсинга: ${err.message}` });
      }
    });

    return { data, errors };
  }

  /**
   * Парсинг остатков из Excel
   */
  parseStock(
    buffer: Buffer,
    options?: ImportOptions,
  ): { data: ParsedStock[]; errors: Array<{ row: number; message: string }> } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    const data: ParsedStock[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    const mapping = options?.columnMapping || {
      externalCode: 'Код',
      productName: 'Наименование',
      barcode: 'Штрихкод',
      quantity: 'Количество',
      minStockLevel: 'Мин. остаток',
    };

    rows.forEach((row, index) => {
      try {
        const externalCode = String(row[mapping.externalCode] || '').trim();
        const quantity = Number(row[mapping.quantity]);

        if (!externalCode) {
          errors.push({ row: index + 2, message: 'Отсутствует код товара' });
          return;
        }

        if (isNaN(quantity) || quantity < 0) {
          errors.push({ row: index + 2, message: 'Некорректное количество' });
          return;
        }

        data.push({
          externalCode,
          productName: row[mapping.productName] || undefined,
          barcode: row[mapping.barcode] || undefined,
          quantity,
          minStockLevel: row[mapping.minStockLevel] ? Number(row[mapping.minStockLevel]) : undefined,
        });
      } catch (err) {
        errors.push({ row: index + 2, message: `Ошибка парсинга: ${err.message}` });
      }
    });

    return { data, errors };
  }

  /**
   * Парсинг цен из Excel
   */
  parsePrices(
    buffer: Buffer,
    options?: ImportOptions,
  ): { data: ParsedPrice[]; errors: Array<{ row: number; message: string }> } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    const data: ParsedPrice[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    const mapping = options?.columnMapping || {
      externalCode: 'Код',
      productName: 'Наименование',
      barcode: 'Штрихкод',
      price: 'Цена',
      oldPrice: 'Старая цена',
    };

    rows.forEach((row, index) => {
      try {
        const externalCode = String(row[mapping.externalCode] || '').trim();
        const price = Number(row[mapping.price]);

        if (!externalCode) {
          errors.push({ row: index + 2, message: 'Отсутствует код товара' });
          return;
        }

        if (isNaN(price) || price < 0) {
          errors.push({ row: index + 2, message: 'Некорректная цена' });
          return;
        }

        data.push({
          externalCode,
          productName: row[mapping.productName] || undefined,
          barcode: row[mapping.barcode] || undefined,
          price,
          oldPrice: row[mapping.oldPrice] ? Number(row[mapping.oldPrice]) : undefined,
        });
      } catch (err) {
        errors.push({ row: index + 2, message: `Ошибка парсинга: ${err.message}` });
      }
    });

    return { data, errors };
  }

  /**
   * Получить шаблон для загрузки товаров
   */
  getProductsTemplate(): Buffer {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Код', 'Наименование', 'Описание', 'Категория', 'Единица', 'Вес', 'Штрихкод'],
      ['001', 'Яблоки Голден', 'Свежие яблоки сорта Голден', 'Фрукты', 'кг', '1', '4600000000001'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Получить шаблон для загрузки остатков
   */
  getStockTemplate(): Buffer {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Код', 'Наименование', 'Количество', 'Мин. остаток'],
      ['001', 'Яблоки Голден', '100', '10'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Остатки');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
