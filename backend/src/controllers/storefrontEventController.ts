// backend/src/controllers/storefrontEventController.ts
//
// مدخل الأحداث (عامّ) وتقرير الزيارات (للتاجر).

import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../types';
import {
  recordEvents,
  buildVisitsReport,
  normalizeSource,
  MAX_BATCH,
  Period
} from '../services/storefrontEvents.service';

// ==================== ذاكرةُ وجودِ النشاط ====================

/**
 * أعمارٌ قصيرة لمعرّفات الأنشطة الموجودة.
 *
 * **بلا هذا يصير كلُّ حدثٍ استعلاماً:** الواجهة تُرسل دفعةً لكلّ زائر،
 * وقاعدتنا تسمح بعشرة اتصالاتٍ فقط. والوجودُ لا يتغيّر في دقيقة، فذاكرةٌ
 * صغيرة تكفي — وتمنع أيضاً من يقصف المسار بمعرّفاتٍ مختلقة أن يُشغّل
 * استعلاماً بكلّ واحدة.
 */
const known = new Map<string, { ok: boolean; at: number }>();
const KNOWN_TTL = 60_000;

const businessExists = async (businessType: string, businessId: string): Promise<boolean> => {
  const key = businessType + ':' + businessId;
  const hit = known.get(key);
  if (hit && Date.now() - hit.at < KNOWN_TTL) return hit.ok;

  const ok =
    businessType === 'store'
      ? !!(await prisma.store.findUnique({ where: { id: businessId }, select: { id: true } }))
      : !!(await prisma.restaurant.findUnique({ where: { id: businessId }, select: { id: true } }));

  known.set(key, { ok, at: Date.now() });
  // سقفٌ للذاكرة: لا نُبقيها تنمو بمعرّفاتٍ مختلقة
  if (known.size > 500) {
    const oldest = [...known.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 200);
    oldest.forEach(([k]) => known.delete(k));
  }
  return ok;
};

// ==================== الدخول ====================

/**
 * `POST /api/public/events`
 *
 * **يردّ 204 دائماً تقريباً.** المُرسِل `navigator.sendBeacon` ولا يقرأ
 * رداً ولا يُعيد المحاولة، فرسائل الخطأ لا تبلغ أحداً. وما يفسد يُسقط
 * صامتاً — والمقصود أن لا يُعطّل تتبّعُ الإحصاء تصفّحَ الزبون أبداً.
 */
export const ingestEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const businessType = typeof body.businessType === 'string' ? body.businessType : '';
    const businessId = typeof body.businessId === 'string' ? body.businessId : '';
    const events = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];

    if (!businessId || !events.length) {
      res.status(204).end();
      return;
    }

    if (!(await businessExists(businessType, businessId))) {
      res.status(204).end();
      return;
    }

    // المُحيل من الترويسة لا من الجسم حيث أمكن: ما ترسله الصفحة يمكن
    // تلفيقه، وترويسة Referer يضعها المتصفّح
    const selfHost = (req.headers.host || '').split(':')[0];
    const headerSource = normalizeSource(req.headers.referer, selfHost);

    const withSource = events.map((e: any) => ({
      ...e,
      // الواجهة تعرف مُحيل **الزيارة الأولى**، والترويسة تحمل الصفحة
      // السابقة داخل الموقع. فنُقدّم ما أرسلته الواجهة ونقع على الترويسة
      // حين يكون `direct`
      source: e?.source && e.source !== 'direct' ? e.source : headerSource
    }));

    await recordEvents({ businessType, businessId }, withSource, selfHost);
    res.status(204).end();
  } catch (error) {
    console.error('Error ingesting storefront events:', error);
    res.status(204).end();
  }
};

// ==================== التقرير ====================

const PERIODS = new Set(['today', '7d', '30d', '90d']);

/** `GET /api/store/analytics/visits?period=7d` */
export const getStoreVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const raw = typeof req.query.period === 'string' ? req.query.period : '7d';
    const period = (PERIODS.has(raw) ? raw : '7d') as Period;

    const report = await buildVisitsReport({ businessType: 'store', businessId: storeId }, period);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error building visits report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الزيارات' });
  }
};

/** `GET /api/menu/analytics/visits?period=7d` — نفس التقرير للمطعم */
export const getRestaurantVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const raw = typeof req.query.period === 'string' ? req.query.period : '7d';
    const period = (PERIODS.has(raw) ? raw : '7d') as Period;

    const report = await buildVisitsReport(
      { businessType: 'restaurant', businessId: restaurantId },
      period
    );
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error building visits report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الزيارات' });
  }
};

export default { ingestEvents, getStoreVisits, getRestaurantVisits };
