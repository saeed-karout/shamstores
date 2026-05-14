import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Table } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import TableQR from '../../components/tables/TableQR';
import { IoAdd, IoPencil, IoTrash, IoQrCode, IoPrint } from 'react-icons/io5';
import toast from 'react-hot-toast';

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
    setFormData({
      name: '',
      nameEn: '',
      seats: 2,
      notes: '',
    });
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
      // التأكد من أن القيم الرقمية صحيحة
      const dataToSend = {
        ...formData,
        seats: Number(formData.seats) || 2, // تحويل إلى رقم والتأكد من وجود قيمة
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الطاولات</h1>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            variant="outline"
            onClick={generateAllQRs}
          >
            <IoQrCode className="inline ml-1" />
            إنشاء QR للكل
          </Button>
          <Button
            variant="outline"
            onClick={printAllQRs}
            disabled={!tables.some(t => t.qrCode)}
          >
            <IoPrint className="inline ml-1" />
            طباعة QR
          </Button>
          <Button
            variant="primary"
            onClick={() => handleOpenModal()}
          >
            <IoAdd className="inline ml-1" />
            إضافة طاولة
          </Button>
        </div>
      </div>

      {/* قائمة الطاولات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{table.name}</h3>
                  {table.nameEn && (
                    <p className="text-sm text-gray-500">{table.nameEn}</p>
                  )}
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => handleOpenQRModal(table)}
                    className="text-green-500 hover:text-green-700"
                    title="عرض QR"
                  >
                    <IoQrCode size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(table)}
                    className="text-blue-500 hover:text-blue-700"
                    title="تعديل"
                  >
                    <IoPencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="text-red-500 hover:text-red-700"
                    title="حذف"
                  >
                    <IoTrash size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  عدد المقاعد: {table.seats}
                </p>
                {table.notes && (
                  <p className="text-sm text-gray-500">
                    ملاحظات: {table.notes}
                  </p>
                )}
              </div>

              {/* رمز QR */}
              {table.qrCode ? (
                <div className="text-center">
                  {table.qrSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: table.qrSvg }} className="w-32 h-32 mx-auto mb-2" />
                  ) : (
                    <img
                      src={`data:image/png;base64,${table.qrCode}`}
                      alt={`QR ${table.name}`}
                      className="w-32 h-32 mx-auto mb-2"
                    />
                  )}
                  <button
                    onClick={() => generateTableQR(table.id)}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    تجديد QR
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => generateTableQR(table.id)}
                  className="w-full bg-gray-100 text-gray-600 py-2 rounded hover:bg-gray-200"
                >
                  إنشاء رمز QR
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* مودال إضافة/تعديل طاولة */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedTable ? 'تعديل طاولة' : 'إضافة طاولة جديدة'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الطاولة (عربي)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الطاولة (إنجليزي)</label>
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">عدد المقاعد</label>
            <input
              type="number"
              min="1"
              value={formData.seats}
              onChange={(e) => {
                const value = e.target.value === '' ? 2 : parseInt(e.target.value);
                setFormData({ ...formData, seats: value });
              }}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            fullWidth
          >
            حفظ
          </Button>
        </div>
      </Modal>

      {/* مودال عرض QR */}
      {selectedTable && (
        <TableQR
          table={selectedTable}
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTable(null);
          }}
        />
      )}
    </div>
  );
};

export default TablesPage;