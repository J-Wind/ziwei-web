/* ============================================================
   水墨玄紫装饰组件
   ============================================================ */

import React from 'react';

/* ============================================================
   水墨背景装饰
   ============================================================ */
export const InkBackground = () => (
  <div className="ink-astrology-bg">
    {/* 星点闪烁层 */}
    <div className="star-bg" style={{ zIndex: -1 }} />
  </div>
);

/* ============================================================
   八卦盘装饰组件
   ============================================================ */
export const BaguaDecoration = ({
  size = 200,
  rotate = false,
  className = ''
}: {
  size?: number;
  rotate?: boolean;
  className?: string;
}) => (
  <div
    className={`bagua-circle relative ${className}`}
    style={{
      width: size,
      height: size,
      animation: rotate ? 'bagua-rotate 120s linear infinite' : 'none'
    }}
  >
    {/* 中心太极 */}
    <div className="bagua-center" />
    
    {/* 八卦线条装饰 */}
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: '40%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)',
          transform: `translate(-50%, -50%) rotate(${i * 45}deg)`
        }}
      />
    ))}
    
    {/* 外圆装饰 */}
    <div
      className="absolute inset-0 border border-gold/20 rounded-full"
      style={{ boxShadow: 'inset 0 0 30px rgba(139, 92, 246, 0.1)' }}
    />
  </div>
);

/* ============================================================
   水墨晕染文字装饰
   ============================================================ */
export const InkTextTitle = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h1
    className={`relative inline-block ${className}`}
    style={{
      fontFamily: 'var(--font-brush)',
      textShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(139, 92, 246, 0.2)'
    }}
  >
    <span className="animate-gold-flow">{children}</span>
    <span className="absolute inset-0 blur-sm opacity-60 -z-10" style={{ color: 'var(--color-gold)' }}>
      {children}
    </span>
  </h1>
);

/* ============================================================
   水墨分割线
   ============================================================ */
export const InkDivider = ({ className = '' }: { className?: string }) => (
  <div className={`relative h-8 w-full overflow-hidden ${className}`}>
    <div className="absolute top-1/2 left-0 right-0 h-px transform -translate-y-1/2">
      <div className="h-full w-full" style={{
        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), rgba(251, 191, 36, 0.5), rgba(139, 92, 246, 0.3), transparent)'
      }} />
    </div>
    {/* 装饰圆点 */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{
        background: 'radial-gradient(circle, var(--color-gold) 0%, var(--color-gold-light) 50%, transparent 100%)',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
      }} />
    </div>
  </div>
);

/* ============================================================
   水墨玄紫卡片包装
   ============================================================ */
export const InkCard = ({
  children,
  className = '',
  glow = false
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) => (
  <div className={`ink-wash-card glass ${glow ? 'glass-glow' : ''} ${className}`}>
    {children}
  </div>
);

export default {
  InkBackground,
  BaguaDecoration,
  InkTextTitle,
  InkDivider,
  InkCard
};
