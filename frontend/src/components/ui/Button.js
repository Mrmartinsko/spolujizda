import React from 'react';

const Button = ({
  as: Component = 'button',
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) => {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    size === 'sm' ? 'ui-button--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} type={Component === 'button' ? type : undefined} {...props}>
      {children}
    </Component>
  );
};

export default Button;
