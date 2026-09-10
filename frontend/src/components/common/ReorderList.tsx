// frontend/src/components/common/ReorderList.tsx
//
// إعادة ترتيب قائمة بالسحب.
//
// **لماذا قائمةٌ عمودية لا سحبٌ داخل الشبكة:** شاشة المنتجات شبكةٌ ملتفّة
// (`auto-fill`)، ومكتبة السحب تتعامل مع قوائمَ رأسية أو أفقية لا مع شبكةٍ
// ثنائية الاتجاه — فالسحب فيها يقفز ويسقط في مواضع خاطئة. والقائمة أوضح
// للمهمّة أصلاً: من يرتّب عشرين منتجاً يريد أن يرى ترتيبها لا صورها.
//
// **والحفظ صريح لا عند كل إسقاط:** من يرتّب عشرين عنصراً يسحب عشرين مرّة،
// وحفظٌ لكل سحبةٍ يعني عشرين نداءً وعشرين فرصةَ فشلٍ في المنتصف. فيُجمَع
// الترتيب محلّياً ويُرسَل مرّةً واحدة — وشريطٌ ثابت يمنع نسيانه.
//
// **ولا تُرسَل الأرقام بل المعرّفات:** الخادم يرقّم بالموضع. ولو أرسلت
// الواجهة رقماً لكل عنصر لاختلفت أرقام متصفّحَين يرتّبان معاً، فظهر
// عنصران في موضعٍ واحد.

import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { IoReorderThreeOutline, IoCheckmark, IoClose, IoImageOutline } from 'react-icons/io5';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';

export interface ReorderItem {
  id: string;
  name: string;
  image?: string | null;
  /** سطرٌ ثانٍ صغير — الفئة، أو عدد المنتجات */
  meta?: string;
}

interface Props {
  items: ReorderItem[];
  onSave: (ids: string[]) => Promise<void> | void;
  onCancel: () => void;
  /** ألوان لوحة التاجر — تختلف بين متجرٍ ومطعم */
  colors: { text: string; muted: string; card: string; surface: string; border: string; accent: string; bg: string };
  saving?: boolean;
}

const ReorderList: React.FC<Props> = ({ items, onSave, onCancel, colors, saving }) => {
  const [order, setOrder] = useState<ReorderItem[]>(items);

  // تبدُّل القائمة من الخارج (حفظٌ نجح، أو تحديث) يُعيد الضبط. والمقارنة
  // بالمعرّفات لا بالمرجع: كل تصيير للصفحة الأمّ يبني مصفوفةً جديدة
  const signature = useMemo(() => items.map((i) => i.id).join('|'), [items]);
  useEffect(() => {
    setOrder(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const dirty = useMemo(
    () => order.some((item, index) => item.id !== items[index]?.id),
    [order, items]
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination!.index, 0, moved);
      return next;
    });
  };

  const rowStyle = (dragging: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '9px 11px',
    marginBottom: 7,
    background: dragging ? colors.surface : colors.card,
    border: `1px solid ${dragging ? colors.accent : colors.border}`,
    borderRadius: 12,
    // الظلّ أثناء السحب وحده: يخبر الإصبع أن العنصر مرفوع
    boxShadow: dragging ? '0 8px 22px rgba(0,0,0,0.32)' : 'none',
    userSelect: 'none'
  });

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="reorder">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {order.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(drag, snapshot) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      style={{ ...rowStyle(snapshot.isDragging), ...drag.draggableProps.style }}
                    >
                      {/* المقبض هو ما يُسحب لا الصفّ كلّه: الصفّ القابل
                          للسحب بكامله يمنع تحديد نصّه ويربك اللمس */}
                      <span
                        {...drag.dragHandleProps}
                        aria-label={`اسحب لتحريك ${item.name}`}
                        style={{
                          color: colors.muted,
                          cursor: 'grab',
                          display: 'grid',
                          placeItems: 'center',
                          padding: 2,
                          touchAction: 'none'
                        }}
                      >
                        <IoReorderThreeOutline size={22} />
                      </span>

                      <span
                        style={{
                          minWidth: 26,
                          color: colors.accent,
                          fontSize: 12.5,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {index + 1}
                      </span>

                      {item.image ? (
                        <img
                          src={getImageUrl(sizedImage(item.image, 'sm'))}
                          alt=""
                          width={38}
                          height={38}
                          style={{
                            width: 38,
                            height: 38,
                            objectFit: 'cover',
                            borderRadius: 9,
                            flexShrink: 0,
                            background: colors.surface
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 9,
                            background: colors.surface,
                            display: 'grid',
                            placeItems: 'center',
                            color: colors.muted,
                            flexShrink: 0
                          }}
                        >
                          <IoImageOutline size={17} />
                        </span>
                      )}

                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            color: colors.text,
                            fontSize: 13.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.name}
                        </span>
                        {item.meta && (
                          <span style={{ display: 'block', color: colors.muted, fontSize: 11.5, marginTop: 1 }}>
                            {item.meta}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* شريط الحفظ — ثابتٌ أسفل الشاشة لأن القائمة قد تطول عن الشاشة،
          فزرٌّ في أسفلها يعني تمريراً طويلاً بحثاً عنه */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          padding: '12px 0 4px',
          background: `linear-gradient(to top, ${colors.bg} 62%, transparent)`
        }}
      >
        <button
          type="button"
          onClick={() => onSave(order.map((item) => item.id))}
          disabled={!dirty || saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            minHeight: 42,
            padding: '0 18px',
            borderRadius: 12,
            border: 'none',
            background: dirty && !saving ? colors.accent : colors.surface,
            color: dirty && !saving ? colors.bg : colors.muted,
            fontSize: 14,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: dirty && !saving ? 'pointer' : 'not-allowed'
          }}
        >
          <IoCheckmark size={17} />
          {saving ? 'جارٍ الحفظ…' : 'حفظ الترتيب'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            minHeight: 42,
            padding: '0 15px',
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: colors.muted,
            fontSize: 13.5,
            fontFamily: 'inherit',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          <IoClose size={16} />
          إنهاء
        </button>

        {dirty && (
          <span style={{ color: colors.accent, fontSize: 12.5, fontWeight: 700 }}>
            ترتيبٌ غير محفوظ
          </span>
        )}
      </div>
    </div>
  );
};

export default ReorderList;
