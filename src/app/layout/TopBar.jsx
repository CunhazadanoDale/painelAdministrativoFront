import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './TopBar.css';

export function TopBar() {
  const location = useLocation();
  
  // Basic logic to get module name from path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentModule = pathParts.length > 0 
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-module-title">
          {currentModule}
        </div>
      </div>
      
      <div className="topbar-search">
        <Search className="topbar-search-icon" size={16} />
        <input type="text" className="topbar-search-input" placeholder="Pesquisar..." />
      </div>

      <div className="topbar-right">
        <button className="topbar-action-btn">
          <HelpCircle size={18} />
        </button>
        <button className="topbar-action-btn">
          <Bell size={18} />
        </button>
        <div className="topbar-user">
          <div className="user-info">
            <span className="user-name">João Silva</span>
            <span className="user-role">Administrador</span>
          </div>
          <div className="user-avatar">JS</div>
        </div>
      </div>
    </header>
  );
}
