import React from 'react';

const Card = ({ children, className = '', interactive = false }) => {
  const classes = ['ui-card', interactive ? 'ui-card--interactive' : '', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

export default Card;
