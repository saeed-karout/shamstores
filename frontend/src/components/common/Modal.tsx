// components/common/Modal.tsx

import React, { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidths = { sm: 440, md: 560, lg: 720, xl: 960 };

// ✅ الألوان الثابتة للمودال
const colors = {
  background: '#112E23',
  border: 'rgba(200,226,53,0.15)',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  accent: '#C8E235',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          width: '100%',
          maxWidth: maxWidths[size],
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          direction: 'rtl',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: colors.text, fontFamily: 'Cairo, sans-serif' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                background: `${colors.accent}14`, border: 'none', borderRadius: 8,
                color: colors.muted, cursor: 'pointer', padding: 6, display: 'flex',
                transition: 'all 0.15s',
              }}
            >
              <IoClose size={20} />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: title ? '20px 24px 24px' : '24px' }}>
          {!title && (
            <button
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                float: 'left', background: `${colors.accent}14`, border: 'none',
                borderRadius: 8, color: colors.muted, cursor: 'pointer', padding: 6,
                display: 'flex', marginBottom: 8,
              }}
            >
              <IoClose size={20} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;