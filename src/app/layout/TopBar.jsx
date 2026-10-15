import React, { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import './TopBar.css';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, administrador, comercial, sair } = useAutenticacao();
  const [termo, setTermo] = useState('');

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

  const pesquisar = (evento) => {
    evento.preventDefault();
    const busca = termo.trim();
    navigate(busca ? `/leads?q=${encodeURIComponent(busca)}` : '/leads');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-module-title">{currentModule}</div>
      </div>

      {comercial ? (
        <form className="topbar-search" role="search" onSubmit={pesquisar}>
          <Search className="topbar-search-icon" size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Pesquisar leads"
            className="topbar-search-input"
            placeholder="Pesquisar leads..."
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
          />
        </form>
      ) : (
        <div className="topbar-search" />
      )}

      <div className="topbar-right">
        <button type="button" className="topbar-action-btn" title="Sair" aria-label="Sair" onClick={sair}>
          <LogOut size={18} aria-hidden="true" />
        </button>
        <Link className="topbar-user" to="/perfil" title="Meu perfil">
          <div className="user-info">
            <span className="user-name">{nome}</span>
            <span className="user-role">{administrador ? 'Administrador' : 'Usuário'}</span>
          </div>
          <div className="user-avatar">{iniciais}</div>
        </Link>
      </div>
    </header>
  );
}
