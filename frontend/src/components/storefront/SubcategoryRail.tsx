// frontend/src/components/storefront/SubcategoryRail.tsx
//
// الأقسام الفرعية — صفٌّ من البطاقات المصوّرة تحت القسم المختار.
//
// **ما كان:** شرائح نصّية صغيرة بلون السطح، تبدو كوسومٍ للتصفية لا كأبوابٍ
// إلى أقسام. فيمرّ الزبون عليها ولا يعرف أن «ملابس» فيها «قمصان» و«فساتين».
//
// **ما صار:** بطاقةٌ لكل قسمٍ فرعيّ بصورته — أو صورة أوّل منتجٍ فيه إن لم
// يرفع التاجر صورةً للقسم — واسمه وعدد منتجاته، وأوّلها «الكل» باسم الأب
// للعودة إليه. المختار يُحاط بلون المتجر. والصفّ يتمرّر أفقياً بلا شريط
// تمرير ظاهر، ويظهر بحركةٍ متتابعة خفيفة كي تلفت العين أنه جديد.
//
// **في كل القوالب:** الصفّ جزءٌ من محتوى الصفحة لا من الهيكل، فيظهر بالشكل
// نفسه في الكلاسيكي والبوتيك والمعرض وصفحة الأقسام — وألوانه واستداراته من
// رموز المتجر، فيأخذ هوية كل قالب بلا نسخةٍ لكلٍّ منها.

import React from 'react';
import { motion } from 'framer-motion';
import { IoGridOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { useT } from '@/i18n/storefront';

export interface SubcategoryTile {
  id: string;
  name: string;
  image?: string | null;
  count: number;
}

interface Props {
  parent: { id: string; name: string; count: number };
  items: SubcategoryTile[];
  activeId: string;
  onSelect: (id: string) => void;
}

const SubcategoryRail: React.FC<Props> = ({ parent, items, activeId, onSelect }) => {
  const { t } = useT();
  if (items.length === 0) return null;

  const tiles: Array<SubcategoryTile & { isAll?: boolean }> = [
    { id: parent.id, name: t('الكل'), count: parent.count, isAll: true },
    ...items
  ];

  return (
    <nav aria-label={t('الأقسام الفرعية')} style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: sf.text }}>
          {t('تسوّق داخل')} <span style={{ color: sf.accent }}>{parent.name}</span>
        </span>
        <span style={{ fontSize: 11.5, color: sf.muted }}>
          {items.length} {t('أقسام')}
        </span>
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '2px 2px 6px',
          scrollSnapType: 'x proximity'
        }}
      >
        {tiles.map((tile, index) => {
          const active = activeId === tile.id;
          return (
            <motion.button
              key={tile.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(tile.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.035, duration: 0.22, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              className="sf-lift"
              style={{
                flex: '0 0 auto',
                width: 104,
                scrollSnapAlign: 'start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0,
                padding: 0,
                borderRadius: sd.rCard,
                border: `${sd.borderW} solid ${active ? sf.accent : sf.border}`,
                boxShadow: active ? `0 0 0 2px ${sf.accent}33, ${sd.shadowCard}` : sd.shadowCard,
                background: sf.card,
                color: sf.text,
                cursor: 'pointer',
                fontFamily: 'inherit',
                overflow: 'hidden',
                textAlign: 'center',
                transition: 'border-color .18s ease, box-shadow .18s ease'
              }}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'block',
                  height: 76,
                  background: tile.isAll
                    ? `linear-gradient(135deg, ${sf.accentSoft}, ${sf.surface})`
                    : sf.surface,
                  overflow: 'hidden'
                }}
              >
                {tile.isAll ? (
                  <span
                    aria-hidden="true"
                    style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: sf.accent }}
                  >
                    <IoGridOutline size={26} />
                  </span>
                ) : tile.image ? (
                  <img
                    src={getImageUrl(sizedImage(tile.image, 'sm'))}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transform: active ? 'scale(1.06)' : 'none',
                      transition: 'transform .3s ease'
                    }}
                  />
                ) : (
                  // بلا صورة: الحرف الأوّل على لون المتجر — لا مربّعاً فارغاً
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 26,
                      fontWeight: 900,
                      color: sf.accent,
                      background: sf.accentSoft
                    }}
                  >
                    {tile.name?.[0] || '•'}
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      insetInline: 0,
                      bottom: 0,
                      height: 3,
                      background: sf.accent
                    }}
                  />
                )}
              </span>
              <span style={{ display: 'grid', gap: 1, padding: '7px 8px 8px' }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? 900 : 700,
                    color: active ? sf.accent : sf.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {tile.name}
                </span>
                <span style={{ fontSize: 10.5, color: sf.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {tile.count} {t('منتج')}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default SubcategoryRail;
