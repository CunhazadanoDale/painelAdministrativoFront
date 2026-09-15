import React from 'react';
import './Dashboard.css';
import { Panel } from '../../app/components/Panel';
import { BarChart2, Users, Activity, Inbox } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>Período:</span>
          <select style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}>
            <option>Este Mês</option>
            <option>Mês Passado</option>
          </select>
        </div>
        <button className="filter-btn filter-btn-secondary" style={{ width: 'auto', padding: '4px 12px' }}>Atualizar</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-card-title">Leads</span>
          <span className="summary-card-value">142</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Oportunidades</span>
          <span className="summary-card-value">38</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Clientes Novos</span>
          <span className="summary-card-value">12</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Conversão</span>
          <span className="summary-card-value">8.4%</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <Panel title="Funil de Vendas" icon={<BarChart2 size={16} />}>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [Gráfico de Funil]
          </div>
        </Panel>

        <Panel title="Atividades Recentes" icon={<Activity size={16} />}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>Ligação para João Silva - Hoje, 14:00</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>Reunião com Empresa ABC - Ontem, 16:30</li>
            <li style={{ padding: '8px 0' }}>Proposta enviada - 12/09/2026</li>
          </ul>
        </Panel>

        <Panel title="Novos Leads" icon={<Users size={16} />}>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [Tabela Compacta de Leads]
          </div>
        </Panel>

        <Panel title="Formulários Recebidos" icon={<Inbox size={16} />}>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [Tabela de Formulários]
          </div>
        </Panel>
      </div>
    </div>
  );
}
