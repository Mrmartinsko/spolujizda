import React from 'react';

const Badge = ({ children, className = '', variant = 'neutral' }) => {
  return (
    <span className={['ui-badge', `ui-badge--${variant}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
};

export default Badge;
