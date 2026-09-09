// frontend/src/utils/storefrontDesignContext.tsx
//
// نموذج العرض المختار، متاحاً لكل مكوّنات المتجر.
//
// **لماذا سياق ولا يكفي متغيّر CSS:** الاستدارة والظلّ يتبدّلان بمتغيّر
// لأنهما قيمة. أمّا «بطاقة بغطاء» مقابل «بطاقة قياسية» فترتيبٌ مختلف
// للعناصر — نصٌّ فوق الصورة لا تحتها — ولا يُعبَّر عنه بقيمة.
//
// **والافتراضي بلا مزوّد مقصود:** البطاقة تُستعمل أيضاً في لوحة التاجر
// وفي المعاينة، حيث لا متجر ولا هوية. فالمزوّد الغائب يعني القالب
// الافتراضي لا انهياراً.

import React, { createContext, useContext, useMemo } from 'react';
import { DEFAULT_DESIGN, resolveDesign, type StorefrontDesign } from './storefrontDesign';

const DesignContext = createContext<StorefrontDesign>(DEFAULT_DESIGN);

export const StorefrontDesignProvider: React.FC<{
  /** الخام كما وصل من الخادم — يُنقّى هنا فلا يُكرَّر التنقية في كل صفحة */
  value?: unknown;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const design = useMemo(() => resolveDesign(value), [value]);
  return <DesignContext.Provider value={design}>{children}</DesignContext.Provider>;
};

/** التصميم الفعّال — القالب الافتراضي إن لم يوجد مزوّد */
export const useDesign = (): StorefrontDesign => useContext(DesignContext);

export default StorefrontDesignProvider;
