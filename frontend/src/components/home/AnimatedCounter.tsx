// frontend/src/components/AnimatedCounter.tsx

import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  decimal?: boolean;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, suffix = '', decimal = false, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (!inView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentValue = value * progress;
      setCount(decimal ? currentValue : Math.floor(currentValue));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [inView, value, duration, decimal]);

  const displayValue = decimal ? count.toFixed(1) : Math.floor(count);
  return <span ref={ref}>{displayValue}{suffix}</span>;
};

export default AnimatedCounter;