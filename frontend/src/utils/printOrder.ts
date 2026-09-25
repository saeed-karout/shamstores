// frontend/src/utils/printOrder.ts
//
// طباعة فاتورة الطلب وبوليصة الشحن — من لوحة التاجر مباشرةً.
//
// **لماذا صفحة طباعة مستقلّة لا `window.print()` على اللوحة:** طباعة اللوحة
// تُخرج الشريط الجانبي والأزرار وألوان الواجهة على الورق. الفاتورة وثيقةٌ لها
// شكلها: ترويسة المتجر، وجدول الأصناف، والإجماليات، وتقرأ جيداً بالأبيض والأسود.
//
// **والبوليصة بمقاس الملصق:** ‏100×150 ملم — مقاس طابعات الملصقات الحرارية
// الشائع، ويُطبع أيضاً على A4 عادية ويُقصّ. الاسم والهاتف والمبلغ عند
// الاستلام بخطٍّ كبير: من يقرؤها مندوب توصيلٍ على دراجة لا محاسب.
//
// والنصوص تُهرَّب كلها: اسم زبونٍ فيه `<` لا يكسر الوثيقة ولا يحقن فيها.

import { formatPrice } from './currency';

export interface PrintableBusiness {
  name: string;
  logo?: string | null;
  phone?: string | null;
  address?: string | null;
  publicUrl?: string | null;
  currency?: string | null;
}

export interface PrintableOrder {
  id: string;
  orderNumber?: string | number;
  createdAt: string;
  status?: string;
  orderType?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  customerAddress?: string | null;
  governorate?: string | null;
  notes?: string | null;
  total?: number | string;
  subtotal?: number | string | null;
  discountAmount?: number | string | null;
  deliveryFee?: number | string | null;
  couponCode?: string | null;
  isPaid?: boolean;
  paymentMethod?: string | null;
  table?: { name?: string | null } | null;
  orderItems?: Array<{
    quantity: number;
    price: number | string;
    size?: string | null;
    addons?: string[] | string | null;
    notes?: string | null;
    product?: { name?: string; sku?: string | null } | null;
    menuItem?: { name?: string; sku?: string | null } | null;
    name?: string;
  }>;
}

const PAYMENT: Record<string, string> = {
  cash: 'نقداً عند الاستلام',
  card: 'بطاقة',
  online: 'إلكتروني',
  sham_cash: 'شام كاش'
};

const ORDER_TYPE: Record<string, string> = {
  delivery: 'توصيل',
  takeaway: 'استلام من المحل',
  dine_in: 'في المطعم',
  pos: 'بيع مباشر'
};

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (value: unknown) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const addonsOf = (addons: string[] | string | null | undefined): string[] => {
  if (!addons) return [];
  if (Array.isArray(addons)) return addons.filter(Boolean);
  try {
    const parsed = JSON.parse(addons);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    /* نصّ */
  }
  return String(addons).split(',').map((s) => s.trim()).filter(Boolean);
};

const dateText = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #111; background: #fff; }
  .num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
  .muted { color: #555; }
  @media screen { body { background: #eef1ee; } .sheet { box-shadow: 0 6px 30px rgba(0,0,0,.12); margin: 20px auto; } }
  .toolbar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: center; padding: 10px; background: #084835; }
  .toolbar button { font: inherit; font-weight: 800; border: 0; border-radius: 8px; padding: 8px 18px; cursor: pointer; }
  .toolbar .primary { background: #CDEF7C; color: #083024; }
  .toolbar .ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.4); }
  @media print { .toolbar { display: none; } .sheet { box-shadow: none; margin: 0; } }
`;

const openPrintWindow = (title: string, css: string, body: string) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    // المتصفّح حجب النافذة — يُقال للتاجر بدل أن لا يحدث شيء
    alert('المتصفّح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثمّ أعد المحاولة.');
    return;
  }
  win.document.open();
  win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet">
<style>${BASE_CSS}${css}</style></head><body>
<div class="toolbar"><button class="primary" onclick="window.print()">طباعة</button><button class="ghost" onclick="window.close()">إغلاق</button></div>
${body}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });</script>
</body></html>`);
  win.document.close();
};

/** فاتورة الطلب — A4 أو أيّ مقاس */
export const printInvoice = (order: PrintableOrder, business: PrintableBusiness) => {
  const currency = business.currency || 'SYP';
  const money = (v: unknown) => esc(formatPrice(num(v), currency as any));
  const items = order.orderItems || [];
  const itemsTotal = items.reduce((sum, item) => sum + num(item.price) * item.quantity, 0);
  const total = num(order.total) || itemsTotal;
  const discount = num(order.discountAmount);
  const delivery = num(order.deliveryFee);
  const address = order.deliveryAddress || order.customerAddress;
  const number = order.orderNumber ?? order.id.slice(-6).toUpperCase();

  const rows = items
    .map((item, index) => {
      const name = item.product?.name || item.menuItem?.name || item.name || 'صنف';
      const sku = item.product?.sku || item.menuItem?.sku;
      const extras = [item.size, ...addonsOf(item.addons)].filter(Boolean).join(' · ');
      return `<tr>
        <td class="num">${index + 1}</td>
        <td><b>${esc(name)}</b>${extras ? `<div class="muted small">${esc(extras)}</div>` : ''}${
          item.notes ? `<div class="muted small">ملاحظة: ${esc(item.notes)}</div>` : ''
        }${sku ? `<div class="muted small num">SKU ${esc(sku)}</div>` : ''}</td>
        <td class="num c">${item.quantity}</td>
        <td class="num">${money(item.price)}</td>
        <td class="num">${money(num(item.price) * item.quantity)}</td>
      </tr>`;
    })
    .join('');

  const css = `
    .sheet { width: 210mm; min-height: 297mm; padding: 16mm 14mm; background: #fff; }
    @page { size: A4; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #084835; padding-bottom: 12px; }
    .brand { display: flex; gap: 12px; align-items: center; }
    .brand img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; }
    .brand h1 { margin: 0; font-size: 22px; }
    .doc { text-align: left; }
    .doc h2 { margin: 0; font-size: 26px; color: #084835; letter-spacing: .5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
    .box { border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px; font-size: 13px; line-height: 1.9; }
    .box h3 { margin: 0 0 4px; font-size: 12px; color: #084835; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #084835; color: #fff; padding: 8px; text-align: start; font-weight: 800; }
    td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    td.c { text-align: center; }
    .small { font-size: 11.5px; }
    .totals { margin-top: 14px; margin-inline-start: auto; width: 290px; font-size: 13.5px; }
    .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals .grand { border-top: 2px solid #111; margin-top: 4px; padding-top: 8px; font-size: 18px; font-weight: 800; }
    .paid { display: inline-block; margin-top: 12px; padding: 4px 12px; border-radius: 999px; font-weight: 800; font-size: 12px; border: 2px solid; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px dashed #bbb; text-align: center; font-size: 12px; }
  `;

  const body = `<div class="sheet">
    <header>
      <div class="brand">
        ${business.logo ? `<img src="${esc(business.logo)}" alt="">` : ''}
        <div>
          <h1>${esc(business.name)}</h1>
          <div class="muted small">${[business.phone, business.address].filter(Boolean).map(esc).join(' · ')}</div>
          ${business.publicUrl ? `<div class="muted small num">${esc(business.publicUrl.replace(/^https?:\/\//, ''))}</div>` : ''}
        </div>
      </div>
      <div class="doc">
        <h2>فاتورة</h2>
        <div class="num"><b>#${esc(number)}</b></div>
        <div class="muted small">${esc(dateText(order.createdAt))}</div>
      </div>
    </header>

    <div class="grid">
      <div class="box">
        <h3>الزبون</h3>
        ${esc(order.customerName || 'زبون')}<br>
        ${order.customerPhone ? `<span class="num">${esc(order.customerPhone)}</span><br>` : ''}
        ${address ? `${esc(address)}${order.governorate ? ` — ${esc(order.governorate)}` : ''}` : ''}
        ${order.table?.name ? `طاولة ${esc(order.table.name)}` : ''}
      </div>
      <div class="box">
        <h3>الطلب</h3>
        نوع الطلب: ${esc(ORDER_TYPE[order.orderType || ''] || order.orderType || '—')}<br>
        طريقة الدفع: ${esc(PAYMENT[order.paymentMethod || ''] || order.paymentMethod || '—')}<br>
        ${order.couponCode ? `كوبون: <span class="num">${esc(order.couponCode)}</span>` : ''}
      </div>
    </div>

    <table>
      <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>مجموع الأصناف</span><span class="num">${money(itemsTotal)}</span></div>
      ${discount > 0 ? `<div><span>الخصم</span><span class="num">−${money(discount)}</span></div>` : ''}
      ${delivery > 0 ? `<div><span>التوصيل</span><span class="num">${money(delivery)}</span></div>` : ''}
      <div class="grand"><span>الإجمالي</span><span class="num">${money(total)}</span></div>
      <span class="paid" style="color:${order.isPaid ? '#0C7A55' : '#B42318'}">${order.isPaid ? 'مدفوع' : 'غير مدفوع'}</span>
    </div>

    ${order.notes ? `<div class="box" style="margin-top:18px"><h3>ملاحظات</h3>${esc(order.notes)}</div>` : ''}

    <footer>شكراً لتسوّقك من ${esc(business.name)}</footer>
  </div>`;

  openPrintWindow(`فاتورة ${number}`, css, body);
};

/** بوليصة الشحن — ملصق 100×150 ملم */
export const printShippingLabel = (order: PrintableOrder, business: PrintableBusiness) => {
  const currency = business.currency || 'SYP';
  const items = order.orderItems || [];
  const pieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const cod = order.isPaid ? 0 : num(order.total);
  const address = order.deliveryAddress || order.customerAddress;
  const number = order.orderNumber ?? order.id.slice(-6).toUpperCase();

  const css = `
    .sheet { width: 100mm; min-height: 150mm; padding: 5mm; background: #fff; display: flex; flex-direction: column; gap: 3mm; border: 1px solid #000; }
    @page { size: 100mm 150mm; margin: 0; }
    .row { border: 1.5px solid #000; border-radius: 3mm; padding: 3mm; }
    .lbl { font-size: 9pt; font-weight: 800; color: #333; }
    .to-name { font-size: 16pt; font-weight: 800; line-height: 1.3; }
    .to-phone { font-size: 15pt; font-weight: 800; }
    .addr { font-size: 11pt; line-height: 1.6; }
    .order { display: flex; justify-content: space-between; align-items: center; }
    .order b { font-size: 20pt; }
    .cod { text-align: center; background: #000; color: #fff; border-radius: 3mm; padding: 3mm; }
    .cod .amount { font-size: 18pt; font-weight: 800; }
    .from { font-size: 9.5pt; line-height: 1.6; }
    .foot { margin-top: auto; font-size: 8.5pt; display: flex; justify-content: space-between; }
  `;

  const body = `<div class="sheet">
    <div class="row order"><span class="lbl">رقم الطلب</span><b class="num">#${esc(number)}</b></div>
    <div class="row">
      <div class="lbl">إلى</div>
      <div class="to-name">${esc(order.customerName || 'الزبون')}</div>
      ${order.customerPhone ? `<div class="to-phone num">${esc(order.customerPhone)}</div>` : ''}
      <div class="addr">${esc(address || 'استلام من المحل')}${order.governorate ? `<br><b>${esc(order.governorate)}</b>` : ''}</div>
    </div>
    <div class="cod">
      ${cod > 0
        ? `<div class="lbl" style="color:#fff">المبلغ عند الاستلام</div><div class="amount num">${esc(formatPrice(cod, currency as any))}</div>`
        : `<div class="amount">مدفوع — لا تحصيل</div>`}
    </div>
    <div class="row from">
      <div class="lbl">من</div>
      <b>${esc(business.name)}</b>${business.phone ? ` · <span class="num">${esc(business.phone)}</span>` : ''}
      ${business.address ? `<br>${esc(business.address)}` : ''}
    </div>
    ${order.notes ? `<div class="row addr"><span class="lbl">ملاحظات:</span> ${esc(order.notes)}</div>` : ''}
    <div class="foot"><span>${pieces} قطعة</span><span>${esc(dateText(order.createdAt))}</span></div>
  </div>`;

  openPrintWindow(`بوليصة ${number}`, css, body);
};

export default { printInvoice, printShippingLabel };
