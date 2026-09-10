// frontend/src/components/common/CsvTools.tsx
//
// أزرار التصدير والاستيراد، ونافذة معاينة الاستيراد.
//
// **التنزيل يمرّ بـ`fetch` لا بـ`<a href>`:** المسارات محروسة بترويسة
// `Authorization`، والرابط المباشر لا يحملها فيرتدّ بـ401 — أو أسوأ، يُنزّل
// ملفّاً محتواه رسالة الخطأ ويظنّ التاجر أن الملفّ تالف.
//
// **والاستيراد يُعاين قبل أن يكتب.** استيرادٌ يكتب أوّلاً ثمّ يُخبر بما فعل
// لا يُثق به: التاجر يرفع ملفّاً ويرى «حُدّث ٤٠ منتجاً» ولا يعرف أيّها ولا
// يستطيع التراجع. فالتقرير أوّلاً بأرقامه وأخطائه بأرقام أسطرها، ثمّ
// التنفيذ بضغطةٍ ثانية.

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline
} from 'react-icons/io5';
import api from '@/services/api';

export interface CsvPalette {
  text: string;
  muted: string;
  card: string;
  surface: string;
  border: string;
  accent: string;
  bg: string;
}

/** يُنزّل ملفّاً من مسارٍ محروس */
export const downloadCsv = async (path: string, fallbackName: string): Promise<void> => {
  const blob = await api.downloadBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

const btn = (colors: CsvPalette, tone: 'plain' | 'accent' = 'plain'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 34,
  padding: '0 12px',
  borderRadius: 10,
  border: `1px solid ${tone === 'accent' ? colors.accent : colors.border}`,
  background: tone === 'accent' ? colors.accent : 'transparent',
  color: tone === 'accent' ? colors.bg : colors.muted,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer'
});

/** زرّ تصدير مستقلّ — يُستعمل وحده في شاشات الطلبات والعملاء */
export const ExportButton: React.FC<{
  path: string;
  filename: string;
  label?: string;
  colors: CsvPalette;
}> = ({ path, filename, label = 'تصدير CSV', colors }) => {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadCsv(path, filename);
        } catch (error: any) {
          toast.error(error?.response?.data?.error || 'تعذّر التصدير');
        } finally {
          setBusy(false);
        }
      }}
      style={{ ...btn(colors), opacity: busy ? 0.6 : 1 }}
    >
      <IoDownloadOutline size={16} />
      {busy ? 'جارٍ التصدير…' : label}
    </button>
  );
};

interface ImportReport {
  rows?: number;
  willCreate?: number;
  willUpdate?: number;
  willSkip?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  newCategories?: string[];
  unknownHeaders?: string[];
  errors?: { row: number; sku: string; message: string }[];
  errorsTotal?: number;
}

/**
 * أدوات المنتجات: قالبٌ فارغ، وتصدير، واستيراد بمعاينة.
 *
 * القالب أوّلاً في الترتيب: من لا يملك جدولاً يحتاجه قبل أن يفهم البقيّة.
 */
export const ProductCsvTools: React.FC<{ colors: CsvPalette; onDone: () => void }> = ({
  colors,
  onDone
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (text: string, dryRun: boolean) => {
    setBusy(true);
    try {
      // نصّ خامّ لا JSON: المسار له محلّلٌ خاصّ بحدٍّ أعلى على الخادم
      const data: any = await api.postRaw(
        `/store/products/import${dryRun ? '?dryRun=1' : ''}`,
        text,
        'text/csv'
      );
      setReport(data);
      if (!dryRun) {
        toast.success(`أُضيف ${data.created} وحُدّث ${data.updated}`);
        onDone();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر قراءة الملفّ');
      setReport(null);
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    await send(text, true);
  };

  const close = () => {
    setCsvText(null);
    setReport(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const applied = report && (report.created !== undefined || report.updated !== undefined);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ExportButton
          path="/store/products/template"
          filename="products-template.csv"
          label="قالب فارغ"
          colors={colors}
        />
        <ExportButton path="/store/products/export" filename="products.csv" colors={colors} />

        <button type="button" onClick={() => fileRef.current?.click()} style={btn(colors)}>
          <IoCloudUploadOutline size={16} />
          استيراد CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
          }}
        />
      </div>

      {csvText !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الاستيراد"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0,0,0,0.62)',
            display: 'grid',
            placeItems: 'center',
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) close();
          }}
        >
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 560,
              maxHeight: '86vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <IoDocumentTextOutline size={19} style={{ color: colors.accent }} />
              <h3 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 800, flex: 1 }}>
                {applied ? 'تمّ الاستيراد' : 'ما سيقع'}
              </h3>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="إغلاق"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.muted,
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <IoCloseOutline size={20} />
              </button>
            </div>

            <p style={{ color: colors.muted, fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.8 }}>
              {fileName}
              {!applied && ' — لم يُكتب شيء بعد.'}
            </p>

            {busy && !report && (
              <p style={{ color: colors.muted, fontSize: 13.5 }}>جارٍ قراءة الملفّ…</p>
            )}

            {report && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 9,
                    marginBottom: 16
                  }}
                >
                  <Tile
                    colors={colors}
                    n={applied ? report.created : report.willCreate}
                    label={applied ? 'أُضيف' : 'سيُضاف'}
                  />
                  <Tile
                    colors={colors}
                    n={applied ? report.updated : report.willUpdate}
                    label={applied ? 'حُدّث' : 'سيُحدَّث'}
                  />
                  <Tile
                    colors={colors}
                    n={applied ? report.skipped : report.willSkip}
                    label="سطرٌ متروك"
                    warn
                  />
                </div>

                {!!report.newCategories?.length && (
                  <Note colors={colors} icon={<IoCheckmarkCircleOutline size={15} />}>
                    فئاتٌ ستُنشأ: {report.newCategories.join(' · ')}
                  </Note>
                )}

                {!!report.unknownHeaders?.length && (
                  <Note colors={colors} icon={<IoWarningOutline size={15} />} warn>
                    أعمدةٌ لم تُفهَم فتُتجاهل: {report.unknownHeaders.join(' · ')}
                  </Note>
                )}

                {!!report.errors?.length && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: colors.text, fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                      الأسطر المتروكة
                      {report.errorsTotal && report.errorsTotal > report.errors.length
                        ? ` (أوّل ${report.errors.length} من ${report.errorsTotal})`
                        : ''}
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {report.errors.map((e, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 8,
                            fontSize: 12.5,
                            color: colors.muted,
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 9,
                            padding: '7px 10px'
                          }}
                        >
                          <span style={{ color: '#FBBF24', fontWeight: 800, flexShrink: 0 }}>
                            سطر {e.row}
                          </span>
                          <span style={{ flex: 1 }}>
                            {e.sku && <b style={{ color: colors.text }}>{e.sku}: </b>}
                            {e.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!applied && (
                  <div style={{ display: 'flex', gap: 9, marginTop: 20, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={busy || (!report.willCreate && !report.willUpdate)}
                      onClick={() => csvText && send(csvText, false)}
                      style={{
                        ...btn(colors, 'accent'),
                        minHeight: 42,
                        padding: '0 18px',
                        fontSize: 14,
                        opacity: busy || (!report.willCreate && !report.willUpdate) ? 0.55 : 1
                      }}
                    >
                      <IoCheckmarkCircleOutline size={17} />
                      {busy ? 'جارٍ التنفيذ…' : 'نفّذ الاستيراد'}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      disabled={busy}
                      style={{ ...btn(colors), minHeight: 42, padding: '0 15px' }}
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                {applied && (
                  <button
                    type="button"
                    onClick={close}
                    style={{ ...btn(colors, 'accent'), minHeight: 42, padding: '0 18px', marginTop: 20 }}
                  >
                    تمّ
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const Tile: React.FC<{ colors: CsvPalette; n?: number; label: string; warn?: boolean }> = ({
  colors,
  n,
  label,
  warn
}) => (
  <div
    style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 11,
      padding: '12px 10px',
      textAlign: 'center'
    }}
  >
    <div
      style={{
        color: warn && (n ?? 0) > 0 ? '#FBBF24' : colors.accent,
        fontSize: 24,
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1
      }}
    >
      {n ?? 0}
    </div>
    <div style={{ color: colors.muted, fontSize: 11.5, marginTop: 5 }}>{label}</div>
  </div>
);

const Note: React.FC<{
  colors: CsvPalette;
  icon: React.ReactNode;
  warn?: boolean;
  children: React.ReactNode;
}> = ({ colors, icon, warn, children }) => (
  <div
    style={{
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      fontSize: 12.5,
      lineHeight: 1.8,
      color: warn ? '#FBBF24' : colors.muted,
      background: warn ? 'rgba(251,146,60,0.09)' : colors.surface,
      border: `1px solid ${warn ? 'rgba(251,146,60,0.3)' : colors.border}`,
      borderRadius: 10,
      padding: '9px 11px',
      marginTop: 9
    }}
  >
    <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
    <span>{children}</span>
  </div>
);

export default ProductCsvTools;
