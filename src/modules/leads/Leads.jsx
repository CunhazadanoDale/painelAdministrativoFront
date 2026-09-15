import React from 'react';
import './Leads.css';
import { DataGrid } from '../../app/components/DataGrid';
import { FilterPanel, FilterGroup } from '../../app/components/FilterPanel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { Plus } from 'lucide-react';

const MOCK_LEADS = [
  { id: 1, nome: 'João da Silva', empresa: 'Silva Construtora', status: 'novo', origem: 'Site', responsavel: 'Maria', data: '14/09/2026' },
  { id: 2, nome: 'Empresa ABC', empresa: 'Empresa ABC', status: 'contatado', origem: 'Telefone', responsavel: 'Carlos', data: '14/09/2026' },
  { id: 3, nome: 'Maria Oliveira', empresa: 'Oliveira Arq', status: 'negociacao', origem: 'Indicação', responsavel: 'Maria', data: '13/09/2026' },
  { id: 4, nome: 'Pedro Santos', empresa: '-', status: 'perdido', origem: 'Site', responsavel: 'Carlos', data: '12/09/2026' },
];

export default function Leads() {
  const columns = [
    { label: 'Nome', field: 'nome', width: '25%' },
    { label: 'Empresa', field: 'empresa', width: '20%' },
    { 
      label: 'Status', 
      field: 'status', 
      width: '15%',
      render: (val) => {
        const statusMap = {
          'novo': { label: 'Novo', type: 'info' },
          'contatado': { label: 'Contatado', type: 'warning' },
          'negociacao': { label: 'Em Negociação', type: 'success' },
          'perdido': { label: 'Perdido', type: 'danger' },
        };
        const s = statusMap[val] || { label: val, type: 'neutral' };
        return <StatusBadge status={s.type} label={s.label} />;
      }
    },
    { label: 'Origem', field: 'origem', width: '15%' },
    { label: 'Responsável', field: 'responsavel', width: '15%' },
    { label: 'Data', field: 'data', width: '10%' },
  ];

  return (
    <div className="leads-container">
      <div className="leads-main">
        <div className="leads-toolbar">
          <div style={{ fontWeight: 600, fontSize: 16 }}>Leads (4)</div>
          <div className="leads-toolbar-actions">
            <button className="filter-btn filter-btn-secondary" style={{ width: 'auto', padding: '4px 12px' }}>Ações em massa</button>
            <button className="filter-btn filter-btn-primary" style={{ width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={16} /> Novo Lead
            </button>
          </div>
        </div>

        <div className="leads-content">
          <DataGrid columns={columns} data={MOCK_LEADS} />
        </div>
      </div>

      <FilterPanel onApply={() => {}} onClear={() => {}}>
        <FilterGroup label="Pesquisa">
          <input type="text" className="filter-input" placeholder="Nome, email, telefone..." />
        </FilterGroup>
        <FilterGroup label="Período de Criação">
          <select className="filter-select">
            <option>Últimos 30 dias</option>
            <option>Este mês</option>
            <option>Personalizado</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Status">
          <select className="filter-select">
            <option>Todos</option>
            <option>Novo</option>
            <option>Contatado</option>
            <option>Em Negociação</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Responsável">
          <select className="filter-select">
            <option>Todos</option>
            <option>Maria</option>
            <option>Carlos</option>
          </select>
        </FilterGroup>
      </FilterPanel>
    </div>
  );
}
