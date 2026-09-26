// frontend/src/hooks/useUsdPricing.ts
//
// إعداد «سعّر بالدولار، بِع بالليرة» كما يراه الخادم.
//
// **المعاينة هنا والسعر هناك:** `usdToSyp` نسخةٌ حرفية من دالة الخادم كي
// يرى التاجر وهو يكتب الرقمَ نفسه الذي سيُحفظ. لكن الخادم يعيد الحساب عند
// الحفظ وعند كل طلب — فاختلافٌ هنا يخطئ المعاينة لا المبلغ المحصَّل.

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';

export interface UsdPricingConfig {
  mode: 'SYP' | 'USD';
  rateSource: 'platform' | 'custom';
  customRate: number | null;
  customRateUpdatedAt: string | null;
  roundingStep: number;
  platformRate: number | null;
  effectiveRate: number | null;
  minRate: number;
  maxRate: number;
  usdPricedItems?: number;
  outOfSyncItems?: number;
  /** أصناف بلا سعر دولاري — تُعرض قبل «حوّل أسعاري الحالية» */
  sypOnlyItems?: number;
}

/** نفس `usdToSyp` في backend/src/services/usdPricing.service.ts */
export const usdToSyp = (usd: number, rate: number, step = 0): number => {
  const raw = usd * rate;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (step > 0) return Math.max(step, Math.round(raw / step) * step);
  return Math.round(raw);
};

/** خيارات التقريب المعروضة — بالليرة. الصغيرة للّيرة الجديدة بعد حذف الصفرين */
export const ROUNDING_STEPS = [0, 10, 50, 100, 500, 1000];

export const useUsdPricing = (params?: { storeId?: string; restaurantId?: string }) => {
  const [config, setConfig] = useState<UsdPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const storeId = params?.storeId;
  const restaurantId = params?.restaurantId;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (storeId) query.storeId = storeId;
      if (restaurantId) query.restaurantId = restaurantId;
      const data = await api.get<UsdPricingConfig>('/pricing', query);
      setConfig(data || null);
    } catch {
      // غياب الإعداد يعني السلوك القديم: السعر بالليرة كما كان
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [storeId, restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isUsd = config?.mode === 'USD' && !!config.effectiveRate;

  const preview = useCallback(
    (usd: number | string | null | undefined): number | null => {
      const n = typeof usd === 'string' ? parseFloat(usd) : Number(usd);
      if (!config?.effectiveRate || !Number.isFinite(n) || n <= 0) return null;
      return usdToSyp(n, config.effectiveRate, config.roundingStep);
    },
    [config]
  );

  return { config, loading, reload, isUsd, preview, setConfig };
};

export default useUsdPricing;
