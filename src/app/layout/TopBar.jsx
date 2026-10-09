import React from 'react';
import { Search, Bell, HelpCircle, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import './TopBar.css';

export function TopBar() {
  const location = useLocation();
  const { usuario, administrador, encerrar } = useAutenticacao();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentModule =
    pathParts.length > 0
      ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
      : 'Dashboard';

  const nome = (usuario && usuario.nome) || 'Usuário';
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-module-title">{currentModule}</div>
      </div>

      <div className="topbar-search">
        <Search className="topbar-search-icon" size={16} />
        <input type="text" className="topbar-search-input" placeholder="Pesquisar..." />
      </div>

      <div className="topbar-right">
        <button className="topbar-action-btn" title="Ajuda">
          <HelpCircle size={18} />
        </button>
        <button className="topbar-action-btn" title="Notificações">
          <Bell size={18} />
        </button>
        <button className="topbar-action-btn" title="Sair" onClick={encerrar}>
          <LogOut size={18} />
        </button>
        <div className="topbar-user">
          <div className="user-info">
            <span className="user-name">{nome}</span>
            <span className="user-role">{administrador ? 'Administrador' : 'Usuário'}</span>
          </div>
          <div className="user-avatar">{iniciais}</div>
        </div>
      </div>
    </header>
  );
}
