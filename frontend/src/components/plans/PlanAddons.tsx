// frontend/src/components/plans/PlanAddons.tsx
//
// «إضافات اختيارية تكمّل خطتك» — بطاقاتٌ من `GET /api/public/addons`: السعر
// الشهري (بالليرة حين يتوفّر سعر الصرف)، وما تشمله كلّ إضافة، ومن أيّ خطة
// تصبح مشمولة بلا شراء.

import React, { useEffect, useState } from 'react';
import {
  PiCheckBold, PiEyeSlashDuotone, PiGlobeHemisphereEastDuotone, PiChartLineUpDuotone, PiTicketDuotone,
  PiMegaphoneDuotone, PiHandshakeDuotone, PiBarcodeDuotone, PiTranslateDuotone, PiDeviceMobileDuotone,
  PiPuzzlePieceDuotone
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import api from '@/services/api';
import { ADDON_BULLETS, addonIncludedFrom, priceParts, type ComparablePlan, type PublicAddon } from './planRows';
import './plans.css';

const ICONS: Record<string, IconType> = {
  branding_removal: PiEyeSlashDuotone,
  custom_domain: PiGlobeHemisphereEastDuotone,
  analytics: PiChartLineUpDuotone,
  coupons: PiTicketDuotone,
  promotions: PiMegaphoneDuotone,
  affiliate: PiHandshakeDuotone,
  pos: PiBarcodeDuotone,
  multi_language: PiTranslateDuotone,
  pwa: PiDeviceMobileDuotone
};

/** الإضافات المعروضة للبيع — null أثناء التحميل، [] عند الفشل */
export const usePublicAddons = () => {
  const [addons, setAddons] = useState<PublicAddon[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicAddon[]>('/public/addons')
      .then((res: any) => {
        const list: PublicAddon[] = Array.isArray(res) ? res : res?.data || [];
        if (!cancelled) setAddons(list.filter((a) => a && a.code && !a.isOneTime));
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setAddons([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { addons, failed };
};

export const PLAN_ADDONS_ID = 'pc-addons';

export const scrollToAddons = () => {
  const el = document.getElementById(PLAN_ADDONS_ID);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
};

interface Props {
  addons: PublicAddon[] | null;
  plans: ComparablePlan[];
  variant: 'brand' | 'dash';
  /** زرّ في أسفل كل بطاقة (في اللوحة: «اشترِها من صفحة الميزات») */
  renderCta?: (addon: PublicAddon) => React.ReactNode;
  note?: React.ReactNode;
}

const PlanAddons: React.FC<Props> = ({ addons, plans, variant, renderCta, note }) => {
  if (addons && !addons.length) return null;

  return (
    <div className={`pc-addons pc--${variant}`} id={PLAN_ADDONS_ID} tabIndex={-1} aria-labelledby="pc-addons-title">
      <div className="pc-intro">
        <div>
          <h3 className="pc-title" id="pc-addons-title">إضافات اختيارية تكمّل خطتك</h3>
          <p className="pc-sub">اشترِ الميزة التي تحتاجها وحدها باشتراكٍ شهريّ، على أيّ خطة — دون أن تغيّر خطتك.</p>
        </div>
      </div>

      {!addons ? (
        <div className="pc-addon-grid" aria-busy="true" aria-label="جارٍ تحميل الإضافات">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="pc-addon-card is-skeleton" />
          ))}
        </div>
      ) : (
        <ul className="pc-addon-grid">
          {addons.map((a) => {
            const Icon = ICONS[a.code] || PiPuzzlePieceDuotone;
            const bullets = ADDON_BULLETS[a.code] || (a.description ? [a.description] : []);
            const { amount, unit } = priceParts(a.pricing, a.price);
            const from = addonIncludedFrom(plans, a.code);
            return (
              <li key={a.code} className="pc-addon-card">
                <div className="pc-addon-top">
                  <span className="pc-addon-icon"><Icon aria-hidden /></span>
                  <div className="pc-addon-price">
                    <b className="latin" dir="ltr">{amount}</b>
                    <span>{unit ? `${unit} ` : ''}/ شهرياً</span>
                  </div>
                </div>
                <h4>{a.name}</h4>
                <ul className="pc-addon-list">
                  {bullets.slice(0, 4).map((b) => (
                    <li key={b}>
                      <PiCheckBold aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
                {from && <span className="pc-addon-from">{from}</span>}
                {renderCta && <div className="pc-addon-cta">{renderCta(a)}</div>}
              </li>
            );
          })}
        </ul>
      )}
      {note && <p className="pc-note">{note}</p>}
    </div>
  );
};

export default PlanAddons;
