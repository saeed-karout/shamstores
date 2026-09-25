// frontend/src/components/plans/PlanComparison.tsx
//
// «مقارنة تفصيلية بين الخطط» — أقسامٌ تُطوى وتُفتح، ورأسٌ ثابت بأسماء الخطط
// وأسعارها، وخلايا ✓ / ✗ / قيمة / «كإضافة».
//
// مشتركة بين صفحة الأسعار العامّة (`variant="brand"`) وصفحتَي الخطط في لوحة
// التاجر (`variant="dash"`، مع عمود «خطتك الحالية»). الصفوف في `planRows.ts`.
//
// إمكانية الوصول: كلّ قسم زرٌّ بـ aria-expanded يتحكّم بلوحته، وكلّ لوحة جدولٌ
// (role="table") له رؤوس أعمدةٍ مخفيّة لقارئ الشاشة؛ الرأس الثابت المرئيّ
// زخرفيّ (aria-hidden) كي لا يُقرأ مرّتين.
//
// الجوال: خطةٌ واحدة في وجه الميزات، تُختار من شريطٍ فوق الجدول — لا تمرير
// أفقيّ للصفحة.

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PiCheckBold, PiXBold, PiCaretDownBold, PiInfoBold, PiPlusCircleDuotone, PiClockDuotone } from 'react-icons/pi';
import { planLabel } from '@/utils/planLabels';
import {
  SECTIONS, rowText, isFreePlan, priceParts, planUsd,
  type Cell, type ComparablePlan, type RowCtx, type BusinessKind, type Row
} from './planRows';
import './plans.css';

// ===== الخلايا =====

export const CellView: React.FC<{ cell: Cell; onAddon?: () => void }> = ({ cell, onAddon }) => {
  if (cell === true) {
    return (
      <span className="pc-yes" role="img" aria-label="متاح">
        <PiCheckBold aria-hidden />
      </span>
    );
  }
  if (cell === false) {
    return (
      <span className="pc-no" role="img" aria-label="غير متاح">
        <PiXBold aria-hidden />
      </span>
    );
  }
  if (cell === 'addon') {
    return onAddon ? (
      <button type="button" className="pc-addon" onClick={onAddon} aria-label="متاحة كإضافة منفردة — اعرض الإضافات">
        <PiPlusCircleDuotone aria-hidden /> كإضافة
      </button>
    ) : (
      <span className="pc-addon">
        <PiPlusCircleDuotone aria-hidden /> كإضافة
      </span>
    );
  }
  if (cell === 'soon') {
    return (
      <span className="pc-soon">
        <PiClockDuotone aria-hidden /> قريباً
      </span>
    );
  }
  return <span className={`pc-val ${cell === 'غير محدود' ? 'is-max' : ''}`}>{cell}</span>;
};

export const PlanPrice: React.FC<{ plan: ComparablePlan; size?: 'lg' | 'sm' }> = ({ plan, size = 'lg' }) => {
  if (isFreePlan(plan)) {
    return (
      <span className={`pc-price is-${size}`}>
        <b>مجاناً</b>
        {size === 'lg' && <span>للأبد</span>}
      </span>
    );
  }
  const { amount, unit } = priceParts(plan.pricing, planUsd(plan));
  return (
    <span className={`pc-price is-${size}`}>
      <b className="latin" dir="ltr">{amount}</b>
      <span>
        {unit}
        {unit ? ' ' : ''}/ شهرياً
      </span>
    </span>
  );
};

// ===== تلميح الصفّ =====

const Hint: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <span className={`pc-hint ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="pc-hint-btn"
        aria-label={`تفاصيل: ${label}`}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <PiInfoBold aria-hidden />
      </button>
      <span role="tooltip" id={id} className="pc-hint-bubble">
        {text}
      </span>
    </span>
  );
};

// ===== المكوّن =====

export interface PlanComparisonProps {
  plans: ComparablePlan[];
  variant: 'brand' | 'dash';
  kind?: BusinessKind;
  /** رموز الإضافات المعروضة للبيع؛ null = لم تُحمَّل بعد */
  addonCodes?: Set<string> | null;
  currentPlanId?: string | null;
  /** بُعد الرأس الثابت عن أعلى الشاشة (ارتفاع شريط التنقّل) */
  stickyTop?: number;
  /** عند النقر على «كإضافة» — عادةً التمرير إلى قسم الإضافات */
  onAddonClick?: () => void;
  /** زرّ أسفل كل عمود */
  renderCta?: (plan: ComparablePlan) => React.ReactNode;
  title?: string;
  className?: string;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({
  plans,
  variant,
  kind,
  addonCodes = null,
  currentPlanId,
  stickyTop = 0,
  onAddonClick,
  renderCta,
  title = 'مقارنة تفصيلية بين الخطط',
  className = ''
}) => {
  const ctx: RowCtx = useMemo(() => ({ kind, addons: addonCodes }), [kind, addonCodes]);
  const [open, setOpen] = useState<Set<string>>(() => new Set([SECTIONS[0].key]));
  const baseId = useId();

  const popularIdx = plans.findIndex((p) => p.isPopular);
  const currentIdx = plans.findIndex((p) => p.id === currentPlanId);
  // على الجوال: خطةٌ واحدة — الأكثر اختياراً، أو التي تلي خطتك الحالية
  const defaultIdx = Math.max(
    0,
    currentIdx >= 0 && currentIdx < plans.length - 1 ? currentIdx + 1 : popularIdx >= 0 ? popularIdx : 0
  );
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked !== null && picked < plans.length ? picked : defaultIdx;

  const allOpen = open.size === SECTIONS.length;
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const colClass = (i: number) =>
    ['pc-col', i === sel ? 'is-sel' : '', i === popularIdx ? 'is-popular' : '', i === currentIdx ? 'is-current' : '']
      .filter(Boolean)
      .join(' ');

  const planName = (p: ComparablePlan, i: number) =>
    `${planLabel(p)}${i === currentIdx ? ' (خطتك الحالية)' : ''}`;

  if (!plans.length) return null;

  const renderCell = (r: Row, p: ComparablePlan) => <CellView cell={r.value(p, ctx)} onAddon={onAddonClick} />;

  return (
    <div
      className={`pc pc--${variant} ${className}`}
      style={{ ['--pc-cols' as any]: plans.length, ['--pc-sticky' as any]: `${stickyTop}px` }}
    >
      <div className="pc-intro">
        <div>
          <h3 className="pc-title">{title}</h3>
          <p className="pc-sub">اضغط على كل قسم لعرض تفاصيل ميزاته.</p>
        </div>
        <button
          type="button"
          className="pc-expand"
          onClick={() => setOpen(allOpen ? new Set() : new Set(SECTIONS.map((s) => s.key)))}
        >
          {allOpen ? 'طيّ كل الأقسام' : 'فتح كل الأقسام'}
        </button>
      </div>

      <ul className="pc-legend" aria-label="دليل الرموز">
        <li><CellView cell={true} /> ضمن الخطة</li>
        <li><CellView cell="addon" /> تشتريها منفردة</li>
        <li><CellView cell={false} /> غير متاحة</li>
      </ul>

      {/* الجوال: اختيار الخطة المعروضة */}
      <div className="pc-picker" role="radiogroup" aria-label="اختر خطة لعرض ميزاتها">
        {plans.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={i === sel}
            className={i === currentIdx ? 'is-current' : ''}
            onClick={() => setPicked(i)}
          >
            {planLabel(p)}
            {i === currentIdx && <small>حالية</small>}
          </button>
        ))}
      </div>

      <div className="pc-table">
        {/* الرأس الثابت — زخرفيّ؛ رؤوس الأعمدة الحقيقية داخل كل جدول */}
        <div className="pc-head" aria-hidden="true">
          <div className="pc-row">
            <div className="pc-feat pc-head-feat">
              <span>الميزات</span>
              <small className="latin">{SECTIONS.reduce((n, s) => n + s.rows.length, 0)} ميزة في {SECTIONS.length} أقسام</small>
            </div>
            {plans.map((p, i) => (
              <div key={p.id} className={colClass(i)}>
                {i === currentIdx ? (
                  <span className="pc-flag is-current">خطتك الحالية</span>
                ) : i === popularIdx ? (
                  <span className="pc-flag">الأكثر اختياراً</span>
                ) : null}
                <span className="pc-pname">{planLabel(p)}</span>
                <PlanPrice plan={p} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {SECTIONS.map((s) => {
          const isOpen = open.has(s.key);
          const panelId = `${baseId}-${s.key}`;
          const Icon = s.icon;
          return (
            <section key={s.key} className={`pc-sec ${isOpen ? 'is-open' : ''}`} aria-labelledby={`${panelId}-h`}>
              <h4 className="pc-sec-h" id={`${panelId}-h`}>
                <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(s.key)}>
                  <span className="pc-sec-icon"><Icon aria-hidden /></span>
                  <span className="pc-sec-title">{s.title}</span>
                  <span className="pc-sec-count latin">{s.rows.length}</span>
                  <PiCaretDownBold className="pc-caret" aria-hidden />
                </button>
              </h4>
              <div id={panelId} className="pc-panel" role="table" aria-label={s.title} hidden={!isOpen}>
                <div role="rowgroup" className="pc-sr">
                  <div role="row">
                    <span role="columnheader">الميزة</span>
                    {plans.map((p, i) => (
                      <span key={p.id} role="columnheader">{planName(p, i)}</span>
                    ))}
                  </div>
                </div>
                <div role="rowgroup">
                  {s.rows.map((r) => {
                    const label = rowText(r.label, ctx) as string;
                    const hint = rowText(r.hint, ctx);
                    return (
                      <div role="row" className="pc-row" key={r.key}>
                        <div role="rowheader" className="pc-feat">
                          <span className="pc-feat-label">{label}</span>
                          {hint && <Hint text={hint} label={label} />}
                        </div>
                        {plans.map((p, i) => (
                          <div role="cell" key={p.id} className={colClass(i)}>
                            {renderCell(r, p)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        {renderCta && (
          <div className="pc-foot">
            <div className="pc-row">
              <div className="pc-feat" />
              {plans.map((p, i) => (
                <div key={p.id} className={colClass(i)}>
                  {renderCta(p)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanComparison;
