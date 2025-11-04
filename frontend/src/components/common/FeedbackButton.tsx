'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader, Check, X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

interface FeedbackButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  state?: ButtonState;
  onClickAsync?: () => Promise<void>;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  resetDelay?: number;
}

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
  success: 'bg-success-600 hover:bg-success-700 text-white',
  error: 'bg-error-600 hover:bg-error-700 text-white',
  warning: 'bg-warning-600 hover:bg-warning-700 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function FeedbackButton({
  children,
  state: externalState,
  onClickAsync,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  loadingText,
  successText,
  errorText,
  resetDelay = 2000,
  disabled,
  className = '',
  ...props
}: FeedbackButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>('idle');
  const state = externalState || internalState;

  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const timer = setTimeout(() => {
        setInternalState('idle');
      }, resetDelay);
      return () => clearTimeout(timer);
    }
  }, [state, resetDelay]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state === 'loading' || disabled) return;

    if (onClickAsync) {
      setInternalState('loading');
      try {
        await onClickAsync();
        setInternalState('success');
      } catch (error) {
        setInternalState('error');
      }
    } else if (onClick) {
      onClick(e as any);
    }
  };

  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            {loadingText || 'Processing...'}
          </>
        );
      case 'success':
        return (
          <>
            <Check className="w-4 h-4" />
            {successText || 'Success!'}
          </>
        );
      case 'error':
        return (
          <>
            <X className="w-4 h-4" />
            {errorText || 'Failed'}
          </>
        );
      default:
        return (
          <>
            {icon}
            {children}
          </>
        );
    }
  };

  return (
    <motion.button
      whileTap={{ scale: state === 'idle' ? 0.95 : 1 }}
      whileHover={{ scale: state === 'idle' ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {getContent()}
    </motion.button>
  );
}

// Ripple effect component
export function RippleButton({
  children,
  onClick,
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { children: React.ReactNode }) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    onClick?.(e as any);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            animation: 'ripple 600ms ease-out',
          }}
        />
      ))}
      {children}
    </motion.button>
  );
}

// Icon button with pulse animation
export function PulseIconButton({
  icon,
  onClick,
  active = false,
  className = '',
  ...props
}: HTMLMotionProps<'button'> & {
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      onClick={onClick}
      className={`
        relative p-2 rounded-lg transition-colors
        ${active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
        ${className}
      `}
      {...props}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-lg bg-primary-400"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      {icon}
    </motion.button>
  );
}
