import React from 'react';

const Alert = ({ children, className = '', variant = 'info' }) => {
  if (!children) return null;

  return <div className={['ui-alert', `ui-alert--${variant}`, className].filter(Boolean).join(' ')}>{children}</div>;
};

export default Alert;
