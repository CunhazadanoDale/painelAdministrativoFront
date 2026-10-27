import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import { usePendenciasSolicitacao } from '../../modules/solicitacoes/usePendenciasSolicitacao';
import { filtrarPorPerfil, gruposDeNavegacao } from './navegacao';
import './Sidebar.css';

export function Sidebar({ aberto = false, onFechar = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const { administrador, comercial, financeiro } = useAutenticacao();
  const pendencias = usePendenciasSolicitacao();
  const gruposVisiveis = filtrarPorPerfil(gruposDeNavegacao(pendencias), { administrador, comercial, financeiro });

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${aberto ? 'aberto' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-marca">{collapsed ? 'M' : 'MiaConstrutora'}</span>
        <span className="sidebar-marca-movel">MiaConstrutora</span>
        <button type="button" className="sidebar-fechar" aria-label="Fechar menu" onClick={onFechar}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-content">
        {gruposVisiveis.map((group, idx) => (
          <div key={idx} className="sidebar-group">
            <div className="sidebar-group-title">
              {collapsed ? '...' : group.title}
            </div>
            <ul className="sidebar-nav">
              {group.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                    onClick={onFechar}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.contador && (
                      <span className="sidebar-contador" title={item.contador.titulo}>
                        {item.contador.total}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
