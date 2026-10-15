import React from 'react';
import './StatusBadge.css';

export function StatusBadge({ status, label }) {
  return (
    <span className={`status-badge ${status}`}>
      {label}
    </span>
  );
}
