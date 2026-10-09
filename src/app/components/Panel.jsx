import React from 'react';
import './Panel.css';
import { Minimize2, Maximize2 } from 'lucide-react';

export function Panel({ title, children, icon, noPadding = false, actions }) {
  const [minimized, setMinimized] = React.useState(false);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          {icon && <span className="panel-icon">{icon}</span>}
          {title}
        </div>
        <div className="panel-actions">
          {actions}
          <button 
            className="topbar-action-btn" 
            style={{ width: 24, height: 24 }}
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
        </div>
      </div>
      {!minimized && (
        <div className={`panel-content ${noPadding ? 'no-padding' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
