// frontend/src/services/ai.ts
//
// واجهة المساعد الذكي: الحالة والحصّة، استخراج المنتجات من صور المنشورات،
// والإنشاء بعد المراجعة، وكتابة الوصف. راجع backend/src/controllers/aiController.ts.

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';

export interface AiQuota {
  allowed: boolean;
  period: 'lifetime' | 'day';
  limit: number;
  used: number;
  remaining: number;
  reason?: 'plan' | 'quota';
}

export interface AiStatus {
  /** المفتاح مضبوطٌ على الخادم — بدونه تختفي الأزرار كلّها */
  configured: boolean;
  businessType: 'restaurant' | 'store';
  isPaid: boolean;
  import: AiQuota;
  describe: AiQuota;
  limits?: { importFreeLifetime: number; importPaidDaily: number; describePaidDaily: number };
}

export interface ImportDraft {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number | null;
  priceUsd: number | null;
  originalPrice: number | null;
  currency: 'SYP' | 'USD' | 'unknown';
  priceText: string;
  category: string;
  options: { name: string; values: string[] }[];
  box: { x: number; y: number; w: number; h: number } | null;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface ProductCopy {
  description: string;
  descriptionEn: string;
  seoTitle: string;
  nameEn: string;
}

// الحالة تُطلب مرّةً لكل الأزرار في الصفحة — نموذج المنتج وأداة الاستيراد
// يسألان معاً عند الفتح، وطلبان متطابقان في اللحظة نفسها هدرٌ
let cached: { at: number; promise: Promise<AiStatus | null> } | null = null;
const TTL_MS = 60_000;

export const fetchAiStatus = (force = false): Promise<AiStatus | null> => {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.promise;
  const promise = api.get<AiStatus>('/ai/status').catch(() => null);
  cached = { at: Date.now(), promise };
  return promise;
};

/** يُبطل الذاكرة بعد استهلاكٍ غيّر الحصّة */
export const invalidateAiStatus = () => {
  cached = null;
};

export const useAiStatus = () => {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = true) => {
    const next = await fetchAiStatus(force);
    setStatus(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let alive = true;
    fetchAiStatus().then((next) => {
      if (!alive) return;
      setStatus(next);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { status, loading, refresh };
};

export const extractFromImage = (image: string, caption?: string) =>
  api.post<{ drafts: ImportDraft[]; quota: AiQuota }>('/ai/import/extract', { image, caption });

export interface CommitItem {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number | null;
  priceUsd?: number | null;
  originalPrice?: number | null;
  category?: string;
  options?: { name: string; values: string[] }[];
  imageUrl?: string | null;
}

export const commitImport = (items: CommitItem[], branchId?: string) =>
  api.post<{
    created: number;
    items: { id: string; name: string }[];
    newCategories: string[];
    errors: { index: number; name: string; message: string }[];
  }>('/ai/import/commit', { items, branchId });

export const describeProduct = (input: {
  name: string;
  price?: number | null;
  category?: string | null;
  notes?: string | null;
  image?: string | null;
}) => api.post<ProductCopy & { quota: AiQuota }>('/ai/describe', input);

/** رسالة الخادم العربية إن وُجدت، وإلا بديلٌ عامّ */
export const aiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error || fallback;

export const quotaLabel = (q: AiQuota): string =>
  q.period === 'lifetime' ? `بقي ${q.remaining} من ${q.limit} صورة مجانية` : `بقي ${q.remaining} من ${q.limit} اليوم`;
