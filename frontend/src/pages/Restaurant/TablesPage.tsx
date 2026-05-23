import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Table } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import TableQR from '../../components/tables/TableQR';
import { IoAdd, IoPencil, IoTrash, IoQrCode, IoPrint } from 'react-icons/io5';
import toast from 'react-hot-toast';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 4,
  color: C.muted,
};

const TablesPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    seats: 2,
    notes: '',
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const data = await api.get<Table[]>('/tables');
      setTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', nameEn: '', seats: 2, notes: '' });
    setSelectedTable(null);
  };

  const handleOpenModal = (table?: Table) => {
    if (table) {
      setSelectedTable(table);
      setFormData({
        name: table.name,
        nameEn: table.nameEn || '',
        seats: table.seats || 2,
        notes: table.notes || '',
      });
    }
    setShowModal(true);
  };

  const handleOpenQRModal = (table: Table) => {
    setSelectedTable(table);
    setShowQRModal(true);
  };

  const handleSave = async () => {
    try {
      const dataToSend = {
        ...formData,
        seats: Number(formData.seats) || 2,
      };
      if (selectedTable) {
        await api.put(`/tables/${selectedTable.id}`, dataToSend);
        toast.success('تم تحديث الطاولة بنجاح');
      } else {
        await api.post('/tables', dataToSend);
        toast.success('تم إنشاء الطاولة بنجاح');
      }
      setShowModal(false);
      resetForm();
      await fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الطاولة؟')) return;
    try {
      await api.delete(`/tables/${id}`);
      toast.success('تم حذف الطاولة بنجاح');
      await fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const generateAllQRs = async () => {
    try {
      await api.post('/tables/qr/all');
      toast.success('تم إنشاء رموز QR لجميع الطاولات');
      await fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const generateTableQR = async (tableId: string) => {
    try {
      await api.post(`/tables/${tableId}/qr`);
      toast.success('تم إنشاء رمز QR');
      await fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const printAllQRs = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrCodes = tables.map(table => `
      <div style="display: inline-block; margin: 20px; text-align: center; page-break-inside: avoid;">
        <h3>${table.name}</h3>
        ${table.qrSvg ? table.qrSvg : `<img src="data:image/png;base64,${table.qrCode}" style="width: 200px; height: 200px;" />`}
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>رموز QR للطاولات</title>
          <style>
            body {
              text-align: center;
              font-family: Arial, sans-serif;
              padding: 20px;
              direction: rtl;
            }
            @media print {
              body { print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>رموز QR للطاولات</h1>
          <div style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${qrCodes}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>إدارة الطاولات</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={generateAllQRs}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <IoQrCode size={16} />
            إنشاء QR للكل
          </button>
          <button
            onClick={printAllQRs}
            disabled={!tables.some(t => t.qrCode)}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: tables.some(t => t.qrCode) ? C.text : C.muted, padding: '8px 16px', borderRadius: 10, cursor: tables.some(t => t.qrCode) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, opacity: tables.some(t => t.qrCode) ? 1 : 0.5 }}
          >
            <IoPrint size={16} />
            طباعة QR
          </button>
          <button
            onClick={() => handleOpenModal()}
            style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none' }}
          >
            <IoAdd size={16} />
            إضافة طاولة
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {tables.map(table => (
          <div key={table.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: 20 }}>
              {/* Table header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>{table.name}</h3>
                  {table.nameEn && (
                    <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{table.nameEn}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleOpenQRModal(table)}
                    style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 4 }}
                    title="عرض QR"
                  >
                    <IoQrCode size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(table)}
                    style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', padding: 4 }}
                    title="تعديل"
                  >
                    <IoPencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}
                    title="حذف"
                  >
                    <IoTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Table info */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: C.muted, margin: '0 0 6px' }}>
                  عدد المقاعد: <span style={{ color: C.text, fontWeight: 600 }}>{table.seats}</span>
                </p>
                {table.notes && (
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                    ملاحظات: {table.notes}
                  </p>
                )}
              </div>

              {/* QR Code */}
              {table.qrCode ? (
                <div style={{ textAlign: 'center' }}>
                  {table.qrSvg ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: table.qrSvg }}
                      style={{ width: 128, height: 128, margin: '0 auto 8px', background: '#fff', borderRadius: 8, padding: 4 }}
                    />
                  ) : (
                    <img
                      src={`data:image/png;base64,${table.qrCode}`}
                      alt={`QR ${table.name}`}
                      style={{ width: 128, height: 128, margin: '0 auto 8px', display: 'block', borderRadius: 8 }}
                    />
                  )}
                  <button
                    onClick={() => generateTableQR(table.id)}
                    style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                  >
                    تجديد QR
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => generateTableQR(table.id)}
                  style={{ width: '100%', background: C.surf, border: `1px solid ${C.border}`, color: C.muted, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 500 }}
                >
                  إنشاء رمز QR
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedTable ? 'تعديل طاولة' : 'إضافة طاولة جديدة'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>اسم الطاولة (عربي)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>اسم الطاولة (إنجليزي)</label>
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>عدد المقاعد</label>
            <input
              type="number"
              min="1"
              value={formData.seats}
              onChange={(e) => {
                const value = e.target.value === '' ? 2 : parseInt(e.target.value);
                setFormData({ ...formData, seats: value });
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={3}
            />
          </div>
          <button
            onClick={handleSave}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ
          </button>
        </div>
      </Modal>

      {/* QR View Modal */}
      {selectedTable && (
        <TableQR
          table={selectedTable}
          isOpen={showQRModal}
          onClose={() => { setShowQRModal(false); setSelectedTable(null); }}
        />
      )}
    </div>
  );
};

export default TablesPage;
