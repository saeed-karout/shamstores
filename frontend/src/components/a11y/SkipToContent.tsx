// frontend/src/components/a11y/SkipToContent.tsx

import { useMemo } from 'react';
import { makeT } from '@/i18n/storefront';
import { readLastLang } from '@/hooks/useStorefrontLanguage';

/**
 * رابط «تخطَّ إلى المحتوى».
 *
 * مخفيّ حتى أول ضغطة Tab، فيظهر أعلى الصفحة. بدونه يضطر من يتنقّل بلوحة
 * المفاتيح أو بقارئ شاشة إلى المرور على كل روابط التنقّل في كل صفحة قبل
 * بلوغ المحتوى — عشرات الضغطات في كل تنقّل.
 *
 * الهدف `#main-content` معرَّف في App.tsx حول شجرة المسارات، ويحمل
 * `tabIndex={-1}` ليقبل التركيز برمجياً عند القفز إليه.
 *
 * **ولماذا `makeT` لا `useT`:** هذا المكوّن يُصيَّر في `App` **فوق** شجرة
 * المسارات، أي خارج مزوّد لغة المتجر. فكان `useT` يرتدّ إلى العربية دائماً
 * — أوّل عنصرٍ يبلغه قارئُ الشاشة في متجرٍ إنجليزيّ بالكامل يخاطبه بالعربية.
 * وآخر لغةٍ اختارها الزائر تصيب الحالتين: عربيةٌ لمن لم يبدّل قطّ، وهو
 * حال صفحات المنصّة.
 */
const SkipToContent: React.FC = () => {
  const t = useMemo(() => makeT(readLastLang() || 'ar'), []);
  return (
    <a href="#main-content" className="skip-link">
      {t('تخطَّ إلى المحتوى')}
    </a>
  );
};

export default SkipToContent;
