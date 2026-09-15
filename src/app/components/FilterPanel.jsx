import React from 'react';
import './FilterPanel.css';
import { Filter } from 'lucide-react';

export function FilterPanel({ title = "FILTROS", children, onApply, onClear }) {
  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <div className="filter-panel-title">
          <Filter size={16} />
          {title}
        </div>
      </div>
      <div className="filter-panel-content">
        {children}
        <div className="filter-actions">
          <button className="filter-btn filter-btn-primary" onClick={onApply}>Aplicar</button>
          <button className="filter-btn filter-btn-secondary" onClick={onClear}>Limpar</button>
        </div>
      </div>
    </div>
  );
}

export function FilterGroup({ label, children }) {
  return (
    <div className="filter-group">
      {label && <label className="filter-label">{label}</label>}
      {children}
    </div>
  );
}
