// backend/src/services/csv.service.ts
//
// توليد CSV وقراءته — بما يفتحه Excel العربيّ ويقبله دون عبث.
//
// **الاختيارات هنا كلّها بسبب Excel لا بسبب المعيار:**
//
//   • **علامة الترتيب (BOM) في أوّل الملفّ.** Excel على ويندوز يقرأ CSV
//     بترميز النظام لا بـUTF-8، فتظهر العربية رموزاً مبعثرة. والـBOM هو
//     ما يجعله يتعرّف على الترميز. بدونه يفتح التاجر الملفّ فيرى «ØºÙ...».
//
//   • **كل خلية بين علامتَي تنصيص.** اسم منتجٍ فيه فاصلة أو سطرٌ جديد
//     يكسر الصفّ، ووصفُ منتجٍ فيه سطران أمرٌ شائع. والتنصيص الدائم أرخص
//     من شرطٍ يُنسى.
//
//   • **الفاصل يُستشعَر عند القراءة.** Excel العربيّ يحفظ بالفاصلة
//     المنقوطة لا بالفاصلة، فملفٌّ خرج من عندنا وعاد بعد تعديلٍ فيه
//     يصل بفاصلٍ مختلف. ورفضُه بحجّة «صيغة خاطئة» يبدو عيباً فينا.
//
// ولا مكتبة: القارئ خمسون سطراً، والمكتبة اعتمادٌ يُحدَّث ويُراجَع لأجلها.

import { Response } from 'express';

/** ما يقبله المولّد في الخلية — كل ما عداه يُحوَّل نصّاً */
export type CsvCell = string | number | boolean | null | undefined;

const quote = (value: CsvCell): string => {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
};

/**
 * يبني ملفّ CSV كاملاً بعلامة الترتيب.
 *
 * `\r\n` لا `\n`: هو ما ينصّ عليه RFC 4180 وما يتوقّعه Excel، وبعض
 * إصداراته يضع الصفوف كلّها في سطرٍ واحد مع `\n` وحده.
 */
export const toCsv = (headers: string[], rows: CsvCell[][]): string => {
  const lines = [headers.map(quote).join(','), ...rows.map((row) => row.map(quote).join(','))];
  return `﻿${lines.join('\r\n')}`;
};

/** يُرسل الملفّ تنزيلاً — والاسم العربيّ يحتاج ترميزاً في الترويسة */
export const sendCsv = (res: Response, filename: string, csv: string): void => {
  // اسمٌ لاتينيّ احتياطيّ مع النسخة المرمَّزة: المتصفّحات القديمة تقرأ
  // الأولى، والحديثة تُفضّل `filename*` فتظهر العربية سليمة
  const ascii = filename.replace(/[^\w.\-]+/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.send(csv);
};

/** الفواصل المحتملة — بترتيب الشيوع في ملفّات التجّار */
const DELIMITERS = [',', ';', '\t'];

/**
 * يستشعر الفاصل من السطر الأوّل.
 *
 * يُحسب **خارج علامات التنصيص** فقط: اسم منتجٍ فيه فاصلة داخل خلية
 * مُنصَّصة كان سيجعل الفاصلة تفوز على الفاصلة المنقوطة في ملفٍّ فاصله
 * الأخيرة.
 */
const sniffDelimiter = (firstLine: string): string => {
  let best = ',';
  let bestCount = -1;

  for (const delimiter of DELIMITERS) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        if (inQuotes && firstLine[i + 1] === '"') i++;
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        count++;
      }
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

/**
 * يقرأ CSV إلى صفوفٍ من خلايا.
 *
 * قارئٌ بحالةٍ واحدة (داخل تنصيص / خارجه) لا تقسيمٌ بـ`split`: الأخير
 * يكسر كل خليةٍ فيها فاصلة أو سطر جديد، وكلاهما شائع في أوصاف المنتجات.
 *
 * ويتجاهل الصفوف الفارغة تماماً — ملفّ Excel ينتهي عادةً بسطرٍ خالٍ،
 * ورفضُه كصفٍّ ناقص يعني خطأً في كل استيراد.
 */
export const parseCsv = (input: string): string[][] => {
  // علامة الترتيب تصل كأوّل محرف فتُلحق باسم أوّل عمود
  let text = input.replace(/^﻿/, '');
  if (!text.trim()) return [];

  const firstBreak = text.search(/\r?\n/);
  const delimiter = sniffDelimiter(firstBreak === -1 ? text : text.slice(0, firstBreak));

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  return rows;
};

/**
 * يحوّل الصفوف إلى كائنات مفهرسة برؤوس الأعمدة.
 *
 * **المطابقة متسامحة عمداً:** يُتجاهل الفراغ وتُقارَن الرؤوس بعد التطبيع.
 * التاجر يفتح الملفّ في Excel فيضيف فراغاً أو يبدّل حرفاً، ورفضُ الملفّ
 * كلّه لأجل ذلك يجعل الميزة بلا فائدة.
 *
 * @param aliases خرائط من رأسٍ معياريّ إلى أسمائه المقبولة
 */
export const rowsToObjects = (
  rows: string[][],
  aliases: Record<string, string[]>
): { records: Record<string, string>[]; unknownHeaders: string[] } => {
  if (rows.length === 0) return { records: [], unknownHeaders: [] };

  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

  const headerToKey = new Map<string, string>();
  Object.entries(aliases).forEach(([key, names]) => {
    names.forEach((name) => headerToKey.set(normalize(name), key));
  });

  const header = rows[0];
  const columnKeys = header.map((name) => headerToKey.get(normalize(name)) || null);
  const unknownHeaders = header.filter((name, index) => !columnKeys[index] && name.trim() !== '');

  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    columnKeys.forEach((key, index) => {
      if (key) record[key] = (row[index] ?? '').trim();
    });
    return record;
  });

  return { records, unknownHeaders };
};

export default { toCsv, sendCsv, parseCsv, rowsToObjects };
