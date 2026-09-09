// frontend/src/components/storefront/QuantityStepper.tsx

import React from 'react';
import { IoAdd, IoRemove, IoTrashOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** يعرض أيقونة سلة بدل "−" عندما تكون الكمية 1 */
  removeAtMin?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
  ariaLabel?: string;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  removeAtMin = false,
  size = 'md',
  disabled = false,
  ariaLabel = 'الكمية'
}) => {
  const { t } = useT();
  const dimension = size === 'sm' ? 34 : 40;
  const canDecrease = !disabled && (removeAtMin ? value >= min : value > min);
  const canIncrease = !disabled && value < max;

  const buttonStyle = (enabled: boolean): React.CSSProperties => ({
    width: dimension,
    height: dimension,
    display: 'grid',
    placeItems: 'center',
    borderRadius: sd.rButton,
    border: `1px solid ${sf.border}`,
    background: sf.surface,
    color: enabled ? sf.text : sf.muted,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.45,
    transition: 'background .15s ease, transform .1s ease',
    flexShrink: 0,
    padding: 0
  });

  const showRemoveIcon = removeAtMin && value <= min;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: sf.card,
        borderRadius: sd.rButton,
        padding: 3,
        border: `1px solid ${sf.border}`
      }}
    >
      <button
        type="button"
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={showRemoveIcon ? 'إزالة من السلة' : 'إنقاص الكمية'}
        style={{
          ...buttonStyle(canDecrease),
          color: showRemoveIcon && canDecrease ? '#FF6B6B' : buttonStyle(canDecrease).color
        }}
      >
        {showRemoveIcon ? <IoTrashOutline size={size === 'sm' ? 15 : 17} /> : <IoRemove size={size === 'sm' ? 16 : 18} />}
      </button>

      <span
        aria-live="polite"
        style={{
          minWidth: size === 'sm' ? 24 : 30,
          textAlign: 'center',
          fontSize: size === 'sm' ? 14 : 15,
          fontWeight: 800,
          color: sf.text,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={t('زيادة الكمية')}
        style={{
          ...buttonStyle(canIncrease),
          background: canIncrease ? sf.accent : sf.surface,
          color: canIncrease ? sf.onAccent : sf.muted,
          borderColor: canIncrease ? 'transparent' : sf.border
        }}
      >
        <IoAdd size={size === 'sm' ? 16 : 18} />
      </button>
    </div>
  );
};

export default QuantityStepper;
