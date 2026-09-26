// frontend/src/components/storefront/OptionImageSwatches.tsx
//
// عيّنات الخيارات المصوّرة على صفحة المنتج نفسها — لا في لوح الإضافة وحده.
//
// **لماذا هنا أيضاً:** كان الزبون لا يرى أن للقميص ثلاثة ألوان إلا بعد أن
// يضغط «أضف إلى السلة» فيُفتح اللوح — والقرار يُتّخذ قبل ذلك، أمام الصورة.
// والعيّنة تقلب المعرض إلى صورة لونها، والاختيار يُحمَل إلى اللوح فلا
// يختار الزبون مرّتين.
//
// المجموعات بلا صور لا تُعرض هنا: «المقاس S / M / L» لا يغيّر الصورة،
// ومكانه اللوح كما كان.

import { IoCheckmark } from 'react-icons/io5';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import type { OptionGroup } from './ProductOptionsSheet';

interface Props {
  groups: OptionGroup[];
  /** الصورة الظاهرة في المعرض — القيمة المطابقة لها تُعلَّم مختارة */
  shownImage?: string;
  /** ما ضغطه الزبون صراحةً — يبقى مختاراً ولو قلّب المعرض إلى صورة عامة */
  picks: Record<string, string>;
  onPick: (group: string, label: string, image?: string | null) => void;
  colors: { text: string; muted: string; accent: string; border: string; surf: string };
  t: (text: string) => string;
}

/** المجموعات التي تستحق العرض: مفردة وفيها قيمةٌ واحدة مصوّرة على الأقل */
export const imageOptionGroups = (groups: OptionGroup[]): OptionGroup[] =>
  groups.filter((group) => group.type === 'single' && group.values.some((value) => value.image));

/** القيمة المختارة في مجموعة: ما يطابق الصورة الظاهرة، وإلا ما ضغطه الزبون */
export const activeSwatch = (group: OptionGroup, shownImage: string | undefined, picks: Record<string, string>) =>
  group.values.find((value) => value.image && value.image === shownImage)?.label ?? picks[group.name];

const OptionImageSwatches: React.FC<Props> = ({ groups, shownImage, picks, onPick, colors: C, t }) => {
  const visible = imageOptionGroups(groups);
  if (visible.length === 0) return null;

  return (
    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {visible.map((group) => {
        const active = activeSwatch(group, shownImage, picks);
        return (
          <div key={group.name} role="radiogroup" aria-label={group.name}>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
              {group.name}:{' '}
              <strong style={{ color: C.text, fontWeight: 700 }}>{active || t('اختر')}</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.values.map((value) => {
                const picked = active === value.label;
                return (
                  <button
                    key={value.label}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    title={value.label}
                    onClick={() => onPick(group.name, value.label, value.image)}
                    style={{
                      position: 'relative',
                      width: value.image ? 58 : 'auto',
                      height: 58,
                      minWidth: 58,
                      padding: value.image ? 0 : '0 14px',
                      borderRadius: 12,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `2px solid ${picked ? C.accent : C.border}`,
                      background: C.surf,
                      color: picked ? C.accent : C.text,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: picked ? 700 : 500,
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {value.image ? (
                      <img
                        src={getImageUrl(sizedImage(value.image, 'sm'))}
                        alt={value.label}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      value.label
                    )}
                    {picked && value.image && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          insetInlineEnd: 3,
                          bottom: 3,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: C.accent,
                          color: '#fff',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        <IoCheckmark size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OptionImageSwatches;
