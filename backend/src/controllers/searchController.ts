// backend/src/controllers/searchController.ts
//
// البحث العميق في واجهة المتجر أو المطعم.
//
// **لماذا على الخادم:** الواجهة كانت تفلتر ما حمّلته بالاسم والوصف وحدهما.
// متجرٌ بخمسة آلاف منتج لا يُحمَّل كاملاً إلى جوال زبونه، ورمز SKU المطبوع
// على العلبة — وهو ما يكتبه من يعرف ما يريد — لم يكن يُبحث فيه أصلاً.
//
// **ما يُبحث فيه:** الاسم بالعربية والإنجليزية، والوصف بهما، ورمز SKU،
// والوسوم، وقيم الخيارات (مقاس، لون، سعة)، واسم القسم. وكل كلمةٍ في
// الاستعلام يجب أن تطابق حقلاً ما — «قميص أزرق» لا تُرجع كل قميصٍ وكل أزرق.
//
// **والترتيب بالصلة لا بالتاريخ:** مطابقة SKU التامّة أوّلاً (من كتبها يقصد
// منتجاً واحداً)، ثمّ ما يبدأ اسمه بالكلمة، ثمّ ما يحويها، ثمّ ما جاءت
// الكلمة في وصفه أو قسمه.

import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';

// أدوات التقطيع والمطابقة والصلة مُصدَّرة: بحث «سوق شام ستورز» عبر المتاجر
// (services/souq.service.ts) يستعملها نفسها — كي لا يطابق السوق «ايفون» ويخطئ
// المتجر «آيفون»، أو العكس.

/** سقف المرشّحين قبل الترتيب — يكفي أيّ بحثٍ معقول ويحمي القاعدة من «أ» */
const CANDIDATE_CAP = 400;
const MAX_LIMIT = 48;

/** `%` و`_` في كلام الزبون حرفان لا محرفا بدل */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * أنماط LIKE للكلمة — كما كُتبت، وبصيغةٍ متسامحة مع الهمزات والتاء المربوطة.
 *
 * «ايفون» و«آيفون» كلمةٌ واحدة للزبون، وكذلك «ساعة/ساعه» و«مستشفى/مستشفي».
 * توحيد الاستعلام وحده لا يكفي: المخزَّن نفسه مكتوبٌ بأيٍّ منها. فموضع
 * الألف يصير `_` (أيّ حرفٍ واحد) — أوسع بقليل من «أيّ ألف»، لكنه يعمل على
 * MySQL وMariaDB بلا تعابير منتظمة يختلف دعمها للعربية بينهما.
 *
 * والكلمة القصيرة (حرفان فأقلّ) لا تُوسَّع: «ا» كانت ستصير `_` فتطابق كل شيء.
 */
export const patternsOf = (token: string): string[] => {
  const clean = token.replace(/[ً-ْـ]/g, '');
  const exact = `%${likeEscape(clean)}%`;
  if (clean.length < 3) return [exact];
  const loose = likeEscape(clean)
    .replace(/[اأإآٱ]/g, '_')
    .replace(/[ةه]$/, '_')
    .replace(/[ىي]$/, '_');
  return loose === likeEscape(clean) ? [exact] : [exact, `%${loose}%`];
};

export const tokenize = (raw: string): string[] =>
  raw
    .toLowerCase()
    .replace(/[\u0000-\u001f]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 6);

/** توحيدٌ للمقارنة في الترتيب — بنفس تسامح أنماط البحث وإلا طابق ولم يتقدّم */
const lower = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

type Business = { id: string; type: 'restaurant' | 'store' };

const findBusiness = async (identifier: string): Promise<Business | null> => {
  const where = { OR: [{ slug: identifier }, { subdomain: identifier }], isActive: true };
  const restaurant = await prisma.restaurant.findFirst({ where, select: { id: true } });
  if (restaurant) return { id: restaurant.id, type: 'restaurant' };
  const store = await prisma.store.findFirst({ where, select: { id: true } });
  return store ? { id: store.id, type: 'store' } : null;
};

/**
 * يبني شرط «كل كلمة تطابق حقلاً ما» — بقيمٍ مربوطة لا نصٍّ ملصوق.
 *
 * SQL خام لا Prisma: الوسوم والخيارات عمودا JSON، وPrisma لا يعرف `LIKE`
 * على JSON في MySQL. `CAST(... AS CHAR)` يقرؤهما نصّاً بحروفه العربية.
 */
export const tokenClause = (tokens: string[], columns: Prisma.Sql[]): Prisma.Sql => {
  const perToken = tokens.map((token) => {
    const likes = patternsOf(token).flatMap((pattern) =>
      columns.map((col) => Prisma.sql`${col} LIKE ${pattern}`)
    );
    return Prisma.sql`(${Prisma.join(likes, ' OR ')})`;
  });
  return Prisma.join(perToken, ' AND ');
};

/** درجة الصلة — تُحسب في الذاكرة على مئات المرشّحين لا في القاعدة */
export const scoreOf = (row: any, tokens: string[], phrase: string, categoryName: string): { score: number; matchedIn: string } => {
  const name = lower(row.name);
  const nameEn = lower(row.nameEn);
  const sku = lower(row.sku);
  const q = lower(phrase);
  let score = 0;
  let matchedIn = 'name';

  if (sku && sku === q) {
    score += 1000;
    matchedIn = 'sku';
  } else if (sku && sku.startsWith(q)) {
    score += 600;
    matchedIn = 'sku';
  }

  if (name === q || nameEn === q) score += 500;
  else if (name.startsWith(q) || nameEn.startsWith(q)) score += 320;
  else if (name.includes(q) || nameEn.includes(q)) score += 220;

  const haystacks: Array<[string, string, number]> = [
    ['name', `${name} ${nameEn}`, 60],
    ['category', lower(categoryName), 35],
    ['tags', lower(JSON.stringify(row.tags ?? '')), 30],
    ['options', lower(JSON.stringify(row.options ?? '')), 20],
    ['description', `${lower(row.description)} ${lower(row.descriptionEn)}`, 15]
  ];
  for (const token of tokens) {
    const t = lower(token);
    const hit = haystacks.find(([, text]) => text.includes(t));
    if (hit) {
      score += hit[2];
      if (score < 200 && matchedIn === 'name') matchedIn = hit[0];
    }
  }

  // الرائج يتقدّم بين المتساويين — لا يتخطّى مطابقةً أدقّ
  score += Math.min(10, Number(row.ordersCount) || 0) + (row.isPopular ? 5 : 0);
  return { score, matchedIn };
};

export const searchCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = String(req.params.identifier || '').trim();
    const phrase = String(req.query.q || '').trim().slice(0, 80);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit || '24'), 10) || 24));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
    const tokens = tokenize(phrase);

    if (!identifier || tokens.length === 0) {
      res.json({ success: true, data: { items: [], total: 0, hasMore: false } });
      return;
    }

    const business = await findBusiness(identifier);
    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }

    let ids: string[];
    if (business.type === 'store') {
      const where = tokenClause(tokens, [
        Prisma.sql`p.name`, Prisma.sql`p.nameEn`, Prisma.sql`p.description`, Prisma.sql`p.descriptionEn`,
        Prisma.sql`p.sku`, Prisma.sql`CAST(p.tags AS CHAR)`, Prisma.sql`CAST(p.options AS CHAR)`,
        Prisma.sql`c.name`, Prisma.sql`c.nameEn`
      ]);
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT p.id FROM \`Product\` p
        LEFT JOIN \`Category\` c ON c.id = p.categoryId
        WHERE p.storeId = ${business.id} AND p.isAvailable = 1 AND ${where}
        LIMIT ${CANDIDATE_CAP}`;
      ids = rows.map((r) => r.id);
    } else {
      const where = tokenClause(tokens, [
        Prisma.sql`m.name`, Prisma.sql`m.nameEn`, Prisma.sql`m.description`, Prisma.sql`m.descriptionEn`,
        Prisma.sql`m.sku`, Prisma.sql`CAST(m.options AS CHAR)`, Prisma.sql`c.name`, Prisma.sql`c.nameEn`
      ]);
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT m.id FROM \`MenuItem\` m
        LEFT JOIN \`Category\` c ON c.id = m.categoryId
        WHERE m.restaurantId = ${business.id} AND m.isAvailable = 1 AND ${where}
        LIMIT ${CANDIDATE_CAP}`;
      ids = rows.map((r) => r.id);
    }

    if (ids.length === 0) {
      res.json({ success: true, data: { items: [], total: 0, hasMore: false } });
      return;
    }

    const records: any[] =
      business.type === 'store'
        ? await prisma.product.findMany({ where: { id: { in: ids } }, include: { category: { select: { name: true } } } })
        : await prisma.menuItem.findMany({ where: { id: { in: ids } }, include: { category: { select: { name: true } } } });

    const ranked = records
      .map((row) => ({ row, ...scoreOf(row, tokens, phrase, row.category?.name || '') }))
      .sort((a, b) => b.score - a.score);

    const page = ranked.slice(offset, offset + limit).map(({ row, matchedIn }) => {
      // سعر الشراء والمخزون المحجوز شأن التاجر لا الزبون
      const { cost: _cost, reservedStock: _reserved, maxStockLevel: _max, category, ...visible } = row;
      return {
        ...visible,
        categoryName: category?.name || null,
        matchedIn,
        ...(business.type === 'restaurant'
          ? { soldOut: row.trackStock === true && (row.stock ?? 0) <= 0 }
          : { soldOut: (row.stock ?? 0) <= 0 })
      };
    });

    // النتائج تتغيّر بتعديل التاجر — دقيقةٌ تكفي لتخفيف التكرار بلا تقادمٍ يُلاحَظ
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: {
        items: page,
        total: ranked.length,
        hasMore: offset + limit < ranked.length,
        // وصل السقف: قد توجد نتائج أخرى أبعد صلة — تقوله الواجهة لا تخفيه
        capped: ids.length >= CANDIDATE_CAP
      }
    });
  } catch (error) {
    console.error('خطأ في البحث:', error);
    res.status(500).json({ success: false, error: 'تعذّر البحث الآن' });
  }
};

export default { searchCatalog };
