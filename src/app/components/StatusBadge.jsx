import React from 'react';
import './StatusBadge.css';

export function StatusBadge({ status, label }) {
  // status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  return (
    <span className={`status-badge ${status}`}>
      {label}
    </span>
  );
}
