import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { IoArchive, IoMailOpen, IoMailUnread, IoRefresh, IoChatbubbleEllipses, IoCheckmarkCircle, IoTime } from 'react-icons/io5';
import toast from 'react-hot-toast';

type MessageStatus = 'new' | 'read' | 'replied' | 'archived';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  yellow: '#FBBF24',
};

const statusMeta: Record<MessageStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  new: { label: 'جديدة', color: C.yellow, bg: 'rgba(251,191,36,0.12)', icon: IoMailUnread },
  read: { label: 'مقروءة', color: C.blue, bg: 'rgba(96,165,250,0.12)', icon: IoMailOpen },
  replied: { label: 'تم الرد', color: C.accent, bg: 'rgba(200,226,53,0.12)', icon: IoCheckmarkCircle },
  archived: { label: 'مؤرشفة', color: C.muted, bg: 'rgba(157,196,172,0.12)', icon: IoArchive },
};

const AdminContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | MessageStatus>('all');

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response: any = await api.get('/admin/contact-messages', filter === 'all' ? undefined : { status: filter });
      const data = response?.data?.data || response?.data || response || [];
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      toast.error('فشل تحميل رسائل التواصل');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: MessageStatus) => {
    setUpdatingId(id);
    try {
      await api.patch(`/admin/contact-messages/${id}/status`, { status });
      toast.success('تم تحديث الرسالة');
      await fetchMessages();
    } catch (error: any) {
      console.error('Error updating message:', error);
      toast.error(error.response?.data?.error || 'تعذر تحديث الرسالة');
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: messages.length,
    newCount: messages.filter(item => item.status === 'new').length,
    repliedCount: messages.filter(item => item.status === 'replied').length,
  }), [messages]);

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0 }}>رسائل التواصل</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>استقبال ومتابعة رسائل contact us من الزوار</p>
        </div>
        <button
          onClick={fetchMessages}
          style={{
            background: C.surf,
            color: C.accent,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          <IoRefresh /> تحديث
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'الإجمالي', value: stats.total, color: C.accent },
          { label: 'الجديدة', value: stats.newCount, color: C.yellow },
          { label: 'تم الرد', value: stats.repliedCount, color: C.blue },
        ].map(card => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: 28, fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['all', 'new', 'read', 'replied', 'archived'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              background: filter === status ? C.accent : C.surf,
              color: filter === status ? C.bg : C.muted,
              border: `1px solid ${filter === status ? C.accent : C.border}`,
              borderRadius: 999,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
              fontWeight: 700,
            }}
          >
            {status === 'all' ? 'الكل' : statusMeta[status].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {messages.map(message => {
          const meta = statusMeta[message.status];
          const StatusIcon = meta.icon;
          return (
            <div key={message.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ color: C.text, fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{message.name}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>{message.email}{message.phone ? ` • ${message.phone}` : ''}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 12, fontWeight: 700 }}>
                  <StatusIcon size={14} /> {meta.label}
                </span>
              </div>

              <div style={{ color: C.accent, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{message.subject || 'رسالة بدون موضوع'}</div>
              <div style={{ color: C.text, lineHeight: 1.9, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{message.message}</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                {new Date(message.createdAt).toLocaleString('ar-SA')}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => updateStatus(message.id, 'read')} disabled={updatingId === message.id} style={{ background: C.surf, color: C.blue, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  <IoMailOpen style={{ display: 'inline', marginLeft: 6 }} /> قراءة
                </button>
                <button onClick={() => updateStatus(message.id, 'replied')} disabled={updatingId === message.id} style={{ background: C.surf, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  <IoChatbubbleEllipses style={{ display: 'inline', marginLeft: 6 }} /> تم الرد
                </button>
                <button onClick={() => updateStatus(message.id, 'archived')} disabled={updatingId === message.id} style={{ background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  <IoArchive style={{ display: 'inline', marginLeft: 6 }} /> أرشفة
                </button>
                <button onClick={() => updateStatus(message.id, 'new')} disabled={updatingId === message.id} style={{ background: C.surf, color: C.yellow, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  <IoTime style={{ display: 'inline', marginLeft: 6 }} /> جديدة
                </button>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 36, textAlign: 'center', color: C.muted }}>
            لا توجد رسائل لعرضها حالياً
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactMessages;