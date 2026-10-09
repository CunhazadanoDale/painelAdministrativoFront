import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CreditCard,
  BarChart2,
  Filter,
  UserCog,
  BadgeCheck,
  ShieldCheck
} from 'lucide-react';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import './Sidebar.css';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { administrador } = useAutenticacao();

  const navGroups = [
    {
      title: 'Início',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' }
      ]
    },
    {
      title: 'Comercial',
      items: [
        { label: 'Leads', icon: <Users size={18} />, path: '/leads' },
        { label: 'Funis', icon: <Filter size={18} />, path: '/funis' },
        { label: 'Negociações', icon: <Briefcase size={18} />, path: '/negociacoes' }
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { label: 'Solicitações', icon: <CreditCard size={18} />, path: '/solicitacoes' },
        { label: 'Aprovadores', icon: <ShieldCheck size={18} />, path: '/aprovadores', admin: true }
      ]
    },
    {
      title: 'Site & Catálogo',
      items: [
        { label: 'Formulários', icon: <Inbox size={18} />, path: '/formularios' },
        { label: 'Produtos', icon: <Package size={18} />, path: '/produtos' }
      ]
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Relatórios', icon: <BarChart2 size={18} />, path: '/relatorios' },
        { label: 'Usuários', icon: <UserCog size={18} />, path: '/usuarios', admin: true },
        { label: 'Cargos', icon: <BadgeCheck size={18} />, path: '/cargos', admin: true },
        { label: 'Configurações', icon: <Settings size={18} />, path: '/configuracoes' }
      ]
    }
  ];

  const gruposVisiveis = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.admin || administrador)
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {collapsed ? 'M' : 'MiaConstrutora'}
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
                    className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
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
