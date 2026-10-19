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
  FolderTree,
  UserCog,
  BadgeCheck,
  ShieldCheck,
  Building2,
  Truck,
  Landmark,
  ListTree,
  Warehouse,
  Contact,
  Network,
  Handshake,
  ClipboardList,
  PackageCheck,
  SearchCheck,
  Repeat,
  CalendarRange,
  HandCoins,
  Percent,
  BadgePercent,
  CalendarClock,
  MailWarning,
  FileText,
  PackageX,
  FileWarning
} from 'lucide-react';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import { usePendenciasSolicitacao } from '../../modules/solicitacoes/usePendenciasSolicitacao';
import './Sidebar.css';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { administrador, comercial, financeiro } = useAutenticacao();
  const pendencias = usePendenciasSolicitacao();

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
        { label: 'Leads', icon: <Users size={18} />, path: '/leads', comercial: true },
        { label: 'Funis', icon: <Filter size={18} />, path: '/funis', comercial: true },
        { label: 'Negociações', icon: <Briefcase size={18} />, path: '/negociacoes' },
        { label: 'Pedidos', icon: <ClipboardList size={18} />, path: '/pedidos', end: true },
        { label: 'Entregas', icon: <PackageCheck size={18} />, path: '/entregas' },
        { label: 'Consultas de Pedidos', icon: <SearchCheck size={18} />, path: '/pedidos/consultas' },
        { label: 'Clientes', icon: <Contact size={18} />, path: '/clientes' },
        { label: 'Grupos de Clientes', icon: <Network size={18} />, path: '/grupos-clientes' },
        { label: 'Representantes', icon: <Handshake size={18} />, path: '/representantes', comercial: true },
        { label: 'Minhas Comissões', icon: <Percent size={18} />, path: '/comissoes', comercial: true, semFinanceiro: true }
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { label: 'Solicitações', icon: <CreditCard size={18} />, path: '/solicitacoes', contador: pendencias },
        { label: 'Fornecedores', icon: <Truck size={18} />, path: '/fornecedores' },
        { label: 'Contas Bancárias', icon: <Landmark size={18} />, path: '/contas-bancarias', financeiro: true },
        { label: 'Plano de Contas', icon: <ListTree size={18} />, path: '/plano-de-contas' },
        { label: 'Despesas Recorrentes', icon: <Repeat size={18} />, path: '/despesas-recorrentes', financeiro: true },
        { label: 'Resumo a Pagar', icon: <CalendarRange size={18} />, path: '/contas-a-pagar/resumo', financeiro: true },
        { label: 'Contas a Receber', icon: <HandCoins size={18} />, path: '/titulos-receber', financeiro: true },
        { label: 'Antecipações', icon: <BadgePercent size={18} />, path: '/antecipacoes', financeiro: true },
        { label: 'Resumo a Receber', icon: <CalendarClock size={18} />, path: '/contas-a-receber/resumo', financeiro: true },
        { label: 'Boletos Pendentes', icon: <MailWarning size={18} />, path: '/contas-a-receber/boletos', financeiro: true },
        { label: 'Comissões', icon: <Percent size={18} />, path: '/comissoes', financeiro: true },
        { label: 'Notas Fiscais', icon: <FileText size={18} />, path: '/notas-fiscais', end: true },
        { label: 'Itens sem Produto', icon: <PackageX size={18} />, path: '/notas-fiscais/itens-sem-produto', financeiro: true },
        { label: 'Entregas sem NF', icon: <FileWarning size={18} />, path: '/notas-fiscais/entregas-sem-nota', financeiro: true },
        { label: 'Aprovadores', icon: <ShieldCheck size={18} />, path: '/aprovadores', admin: true }
      ]
    },
    {
      title: 'Site & Catálogo',
      items: [
        { label: 'Formulários', icon: <Inbox size={18} />, path: '/formularios' },
        { label: 'Categorias', icon: <FolderTree size={18} />, path: '/categorias' },
        { label: 'Produtos', icon: <Package size={18} />, path: '/produtos' },
        { label: 'Locais de Estoque', icon: <Warehouse size={18} />, path: '/locais-estoque' }
      ]
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Relatórios', icon: <BarChart2 size={18} />, path: '/relatorios' },
        { label: 'Empresas', icon: <Building2 size={18} />, path: '/empresas', admin: true },
        { label: 'Usuários', icon: <UserCog size={18} />, path: '/usuarios', admin: true },
        { label: 'Cargos', icon: <BadgeCheck size={18} />, path: '/cargos', admin: true },
        { label: 'Configurações', icon: <Settings size={18} />, path: '/configuracoes' }
      ]
    }
  ];

  const gruposVisiveis = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.admin || administrador) &&
          (!item.comercial || comercial) &&
          (!item.financeiro || financeiro) &&
          (!item.semFinanceiro || !financeiro)
      )
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
                    end={item.end}
                    className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
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
