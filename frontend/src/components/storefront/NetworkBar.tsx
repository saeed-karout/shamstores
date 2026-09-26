// frontend/src/components/storefront/NetworkBar.tsx
//
// شريط حالة الشبكة في واجهة الزبون، ومفتاح «وضع توفير البيانات».
//
// **الشريط يصدق مع الزبون:** حين يعرض المتجر كتالوجاً محفوظاً (لا اتصال،
// أو شبكةٌ لم تُجب) يقول ذلك صراحةً — سعرٌ قديم يظنّه الزبون حالياً ثم
// يجد غيره عند الاستلام أسوأ من شريطٍ أصفر في أعلى الصفحة.
//
// **والمفتاح في مكانين عمداً:** حين يكون الوضع مفعّلاً يظهر شريطٌ رفيع
// أعلى الصفحة يقول لماذا الصور أصغر ويتيح إيقافه — بلا ذلك يظنّ الزبون
// المتجر رديء الصور. وحين يكون مطفأً يكفي رابطٌ هادئ أسفل الصفحة؛ من
// يعاني بطء التحميل يصل إليه، ومن لا يعاني لا يزعجه شريطٌ دائم.

import React from 'react';
import { IoCloudOfflineOutline, IoLeafOutline, IoRefresh } from 'react-icons/io5';
import { useT } from '@/i18n/storefront';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { isSaveDataAuto, setSaveData } from '@/utils/saveData';
import useOnlineStatus from '@/hooks/useOnlineStatus';

const OFFLINE_BG = '#FEF3C7';
const OFFLINE_TEXT = '#78350F';

const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  minHeight: 0,
  color: 'inherit',
  fontWeight: 800,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit'
};

export const StorefrontNetworkBar: React.FC<{ saveData: boolean }> = ({ saveData }) => {
  const { t } = useT();
  const { online, offline } = useOnlineStatus();

  return (
    <>
      {offline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '8px 14px',
            background: OFFLINE_BG,
            color: OFFLINE_TEXT,
            fontSize: 12.5,
            fontWeight: 700,
            textAlign: 'center',
            fontFamily: sf.font,
            lineHeight: 1.7
          }}
        >
          <IoCloudOfflineOutline size={16} aria-hidden="true" />
          <span>
            {online
              ? t('الاتصال ضعيف — نعرض آخر نسخة محفوظة والأسعار قد تكون قديمة')
              : t('أنت غير متصل — الأسعار قد تكون قديمة')}
          </span>
          {online && (
            <button type="button" className="btn-inline" style={linkButton} onClick={() => window.location.reload()}>
              <IoRefresh size={13} style={{ verticalAlign: '-2px', marginInlineEnd: 3 }} aria-hidden="true" />
              {t('تحديث')}
            </button>
          )}
        </div>
      )}

      {saveData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: '5px 14px',
            background: sf.surface,
            color: sf.muted,
            borderBottom: `${sd.borderW} solid ${sf.border}`,
            fontSize: 11.5,
            fontFamily: sf.font,
            textAlign: 'center'
          }}
        >
          <IoLeafOutline size={13} style={{ color: sf.accent }} aria-hidden="true" />
          <span>
            {isSaveDataAuto()
              ? t('وضع توفير البيانات مفعّل تلقائياً لأن الشبكة بطيئة: صور أصغر وبلا حركة')
              : t('وضع توفير البيانات مفعّل: صور أصغر وبلا حركة')}
          </span>
          <button type="button" className="btn-inline" style={{ ...linkButton, color: sf.accent }} onClick={() => setSaveData(false)}>
            {t('إيقاف')}
          </button>
        </div>
      )}
    </>
  );
};

/** الرابط الهادئ أسفل الصفحة — لا يظهر والوضع مفعّل لأن الشريط العلويّ يكفي */
export const SaveDataFooterToggle: React.FC<{ saveData: boolean }> = ({ saveData }) => {
  const { t } = useT();
  if (saveData) return null;

  return (
    <div
      style={{
        background: sf.bg,
        color: sf.muted,
        textAlign: 'center',
        fontSize: 12,
        fontFamily: sf.font,
        // فوق شريط السلّة الثابت أسفل الشاشة — وإلا غطّاه
        padding: '6px 16px calc(84px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <IoLeafOutline size={13} style={{ color: sf.accent, verticalAlign: '-2px', marginInlineEnd: 4 }} aria-hidden="true" />
      {t('الإنترنت بطيء أو الباقة محدودة؟')}{' '}
      <button type="button" className="btn-inline" style={{ ...linkButton, color: sf.accent }} onClick={() => setSaveData(true)}>
        {t('فعّل وضع توفير البيانات')}
      </button>
    </div>
  );
};

export default StorefrontNetworkBar;
