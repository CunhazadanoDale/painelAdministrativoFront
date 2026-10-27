import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Settings,
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
  Tags,
  Wallet,
  BadgePercent,
  CalendarClock,
  MailWarning,
  FileText,
  PackageX,
  FileWarning,
  Ship,
  AlarmClock,
  Banknote,
  ChartPie,
  ReceiptText,
  TrendingUp
} from 'lucide-react';

export function gruposDeNavegacao(pendencias = null) {
  return [
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
        { label: 'Tabela de Preços', icon: <Tags size={18} />, path: '/tabela-precos', comercialOuFinanceiro: true },
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
        { label: 'Importações', icon: <Ship size={18} />, path: '/importacoes', end: true, comercialOuFinanceiro: true },
        { label: 'Alertas de Importação', icon: <AlarmClock size={18} />, path: '/importacoes/alertas', comercialOuFinanceiro: true },
        { label: 'Contas Bancárias', icon: <Landmark size={18} />, path: '/contas-bancarias', financeiro: true },
        { label: 'Plano de Contas', icon: <ListTree size={18} />, path: '/plano-de-contas' },
        { label: 'Despesas Recorrentes', icon: <Repeat size={18} />, path: '/despesas-recorrentes', financeiro: true },
        { label: 'Resumo a Pagar', icon: <CalendarRange size={18} />, path: '/contas-a-pagar/resumo', financeiro: true },
        { label: 'Caixa', icon: <Wallet size={18} />, path: '/caixa', financeiro: true },
        { label: 'Dívidas', icon: <Banknote size={18} />, path: '/dividas', end: true, financeiro: true },
        { label: 'Resumo de Dívidas', icon: <ChartPie size={18} />, path: '/dividas/resumo', financeiro: true },
        { label: 'DRE', icon: <ReceiptText size={18} />, path: '/dre', end: true, financeiro: true },
        { label: 'Faturamento', icon: <TrendingUp size={18} />, path: '/dre/faturamento', financeiro: true },
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
        { label: 'Relatórios', icon: <BarChart2 size={18} />, path: '/dre/relatorio-semanal', financeiro: true },
        { label: 'Empresas', icon: <Building2 size={18} />, path: '/empresas', admin: true },
        { label: 'Usuários', icon: <UserCog size={18} />, path: '/usuarios', admin: true },
        { label: 'Cargos', icon: <BadgeCheck size={18} />, path: '/cargos', admin: true },
        { label: 'Configurações', icon: <Settings size={18} />, path: '/configuracoes' }
      ]
    }
  ];
}

export function filtrarPorPerfil(grupos, { administrador, comercial, financeiro }) {
  return grupos
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.admin || administrador) &&
          (!item.comercial || comercial) &&
          (!item.financeiro || financeiro) &&
          (!item.semFinanceiro || !financeiro) &&
          (!item.comercialOuFinanceiro || comercial || financeiro)
      )
    }))
    .filter((group) => group.items.length > 0);
}

export function telasPermitidas(perfil) {
  return filtrarPorPerfil(gruposDeNavegacao(), perfil).flatMap((group) =>
    group.items.map((item) => ({ grupo: group.title, label: item.label, path: item.path }))
  );
}
