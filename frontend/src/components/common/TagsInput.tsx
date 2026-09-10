// frontend/src/components/common/TagsInput.tsx
//
// حقل وسومٍ بشرائح.
//
// **الاقتراح من وسوم المتجر هو الغرض الأوّل:** بلا اقتراحٍ يكتب التاجر
// «قطن» في منتج و«قطن ‏» في آخر و«قطني» في ثالث، فيظهر ثلاث شرائح في
// شريط تصفية الزبون لوسمٍ واحد. والقائمة المقترحة تُشتقّ من منتجاته نفسها
// — لا جدول وسومٍ يُدار.
//
// **والإثبات لا يعتمد على مفتاحٍ يُعرَف:** المسافة وEnter والفاصلة
// تُثبّت، لكنّ **زرّ «أضف» المرئيّ** هو الطريق المضمون — تاجرٌ حقيقيّ
// كتب وسماً وضغط «حفظ المنتج» فخرجت المصفوفة فارغة وسأل «ما هي
// الشرائح؟». الحقل الذي يحتاج تعليماً حقلٌ ناقص. و`Backspace` على حقلٍ
// فارغ يحذف آخر شريحة — وهو ما يتوقّعه من استعمل أي حقل وسوم.

import React, { useMemo, useState } from 'react';
import { IoAddOutline, IoCloseOutline, IoPricetagOutline } from 'react-icons/io5';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** كل الوسوم المستعملة في المتجر — للاقتراح */
  suggestions?: string[];
  colors: { text: string; muted: string; surface: string; border: string; accent: string; bg: string };
  max?: number;
}

const MAX_TAG_LENGTH = 28;

const TagsInput: React.FC<Props> = ({ value, onChange, suggestions = [], colors, max = 12 }) => {
  const [draft, setDraft] = useState('');

  /**
   * يضيف وسماً أو عدّة في **نداءٍ واحد** لـ`onChange`.
   *
   * كان كلٌّ منها نداءً مستقلاً يبني على `value` نفسها من الإغلاق، فلصقُ
   * «قطن, صيفي» كان يُنتج وسماً واحداً: الثاني يكتب فوق الأوّل.
   */
  const addMany = (raws: string[]) => {
    const next = [...value];
    // المقارنة بعد التطبيع، والمحفوظ ما كتبه التاجر: حالة الأحرف قد تكون
    // مقصودة في «SHEIN»
    const seen = new Set(next.map((t) => t.toLowerCase()));

    for (const raw of raws) {
      const tag = raw.replace(/\s+/g, ' ').trim();
      if (!tag || tag.length > MAX_TAG_LENGTH) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      if (next.length >= max) break;
      seen.add(key);
      next.push(tag);
    }

    setDraft('');
    if (next.length !== value.length) onChange(next);
  };

  const add = (raw: string) => addMany([raw]);

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const unused = useMemo(() => {
    const taken = new Set(value.map((t) => t.toLowerCase()));
    return suggestions.filter((t) => !taken.has(t.toLowerCase())).slice(0, 12);
  }, [suggestions, value]);

  const chip = (extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
    padding: '0 9px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: 'inherit',
    ...extra
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 7,
          alignItems: 'center',
          minHeight: 46,
          padding: 8,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.surface
        }}
      >
        {value.map((tag) => (
          <span key={tag} style={chip({ background: colors.accent, color: colors.bg })}>
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`أزل ${tag}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.bg,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                padding: 0
              }}
            >
              <IoCloseOutline size={15} />
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(e) => {
            // الفاصلة والفاصلة المنقوطة تُثبّتان الوسم فوراً — من يلصق
            // «قطن, صيفي» يريد وسمين لا وسماً واحداً باسمٍ فيه فاصلة
            const raw = e.target.value;
            if (/[,;،]/.test(raw)) {
              addMany(raw.split(/[,;،]/));
              return;
            }
            setDraft(raw);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (draft.trim()) {
                e.preventDefault();
                add(draft);
              }
            } else if (e.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length >= max ? `الحدّ ${max} وسماً` : 'مثال: قطن'}
          disabled={value.length >= max}
          maxLength={MAX_TAG_LENGTH}
          style={{
            flex: 1,
            minWidth: 120,
            border: 'none',
            background: 'transparent',
            color: colors.text,
            fontSize: 13.5,
            fontFamily: 'inherit',
            outline: 'none',
            minHeight: 28
          }}
        />

        {/* زرُّ الإضافة — يظهر ما دام في الحقل نصٌّ لم يُثبَّت.
            **هذا هو الإصلاح:** المسافة وEnter كانا الطريقَين الوحيدين،
            وكلاهما غير مرئيّ. فمن كتب «قطن» وضغط «حفظ المنتج» ظنّ أنه
            وسم منتجه، والمصفوفة تخرج فارغة. زرٌّ مكتوبٌ عليه ما يفعل
            يُغني عن أن يعرف التاجر شيئاً. */}
        {draft.trim() && value.length < max && (
          <button
            type="button"
            onClick={() => add(draft)}
            style={chip({
              background: colors.accent,
              color: colors.bg,
              border: 'none',
              cursor: 'pointer',
              minHeight: 28
            })}
          >
            <IoAddOutline size={14} />
            أضف «{draft.trim()}»
          </button>
        )}
      </div>

      {/* سطرٌ يقول ما يحدث — لا تعليماتٍ عن مفاتيح */}
      {!value.length && !draft.trim() && (
        <div style={{ color: colors.muted, fontSize: 11.5, marginTop: 6 }}>
          كلماتٌ يبحث بها زبونك: «قطن»، «صيفي»، «هدية». اكتب الكلمة ثمّ اضغط «أضف»
          — الوسم لا يُحفظ حتى يصير شريحةً ملوّنة.
        </div>
      )}

      {unused.length > 0 && (
        <div style={{ marginTop: 9 }}>
          <div style={{ color: colors.muted, fontSize: 11.5, marginBottom: 6 }}>
            وسومٌ تستعملها في منتجاتك — انقر لتضيفها
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unused.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => add(tag)}
                style={chip({
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  cursor: 'pointer',
                  minHeight: 28
                })}
              >
                <IoPricetagOutline size={13} />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsInput;
