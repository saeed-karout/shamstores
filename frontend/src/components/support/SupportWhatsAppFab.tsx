// frontend/src/components/support/SupportWhatsAppFab.tsx
//
// «الدعم عبر واتساب» — زرٌّ عائم في لوحة التاجر وحدها (لا في واجهة المتجر:
// هناك زرّ واتساب التاجر نفسه، وزرّان أخضران يربكان الزبون).
//
// يختفي تماماً إن لم يضبط المشرف رقماً: زرٌّ يفتح محادثةً مع لا أحد أسوأ
// من غيابه. ويختفي على شاشة الكاشير — هناك كلّ زاويةٍ من الشاشة زرّ بيع.

import React from 'react';
import { useLocation } from 'react-router-dom';
import { IoLogoWhatsapp } from 'react-icons/io5';
import { useSupportConfig, supportWhatsappUrl } from '@/hooks/useSupportConfig';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import '@/styles/trust.css';

const HIDDEN_ON = ['/store/pos', '/restaurant/pos'];

const SupportWhatsAppFab: React.FC = () => {
  const { pathname } = useLocation();
  const { data } = useSupportConfig();
  const { data: business } = useBusinessSummary();

  if (!data?.whatsapp || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <a
      className="tr-fab"
      href={supportWhatsappUrl(data.whatsapp, business?.name)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="الدعم عبر واتساب"
      title="الدعم عبر واتساب — فريق شام ستورز"
    >
      <IoLogoWhatsapp size={24} aria-hidden="true" />
      <span className="tr-fab-label">الدعم عبر واتساب</span>
    </a>
  );
};

export default SupportWhatsAppFab;
