import React, { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidths = { sm: 440, md: 560, lg: 720, xl: 960 };

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
          background: '#112E23',
          border: '1px solid rgba(200,226,53,0.15)',
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
              padding: '18px 24px', borderBottom: '1px solid rgba(200,226,53,0.15)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#E8F5E9', fontFamily: 'Cairo, sans-serif' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(200,226,53,0.08)', border: 'none', borderRadius: 8,
                color: '#9DC4AC', cursor: 'pointer', padding: 6, display: 'flex',
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
              style={{
                float: 'left', background: 'rgba(200,226,53,0.08)', border: 'none',
                borderRadius: 8, color: '#9DC4AC', cursor: 'pointer', padding: 6,
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
