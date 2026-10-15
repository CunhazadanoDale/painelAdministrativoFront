import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useDashboard } from './useDashboard';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { corDaEtapa, formatarData } from '../leads/leadsUtils';
import { BarChart2, Activity, Users, AlertCircle, RefreshCw } from 'lucide-react';

function Barra({ rotulo, total, maximo, sufixo }) {
  const percentual = maximo > 0 ? Math.round((total / maximo) * 100) : 0;
  return (
    <div className="dashboard-barra">
      <div className="dashboard-barra-topo">
        <span className="dashboard-barra-rotulo">{rotulo}</span>
        <span className="dashboard-barra-valor">
          {total}
          {sufixo ? ` ${sufixo}` : ''}
        </span>
      </div>
      <div className="dashboard-barra-trilho">
        <div
          className="dashboard-barra-preenchimento"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { comercial, usuario } = useAutenticacao();

  if (!comercial) {
    return (
      <div className="dashboard-container">
        <Panel title="Bem-vindo">
          <p className="dashboard-boas-vindas">
            Olá{usuario?.nome ? `, ${usuario.nome}` : ''}. Use o menu ao lado para acessar os
            módulos liberados para o seu perfil.
          </p>
        </Panel>
      </div>
    );
  }

  return <PainelComercial />;
}

function PainelComercial() {
  const {
    funis,
    etapaMap,
    recentes,
    totalLeads,
    funisComContagem,
    maiorFunil,
    carregando,
    erro,
    recarregar,
  } = useDashboard();

  const [funilId, setFunilId] = useState('');

  const funilEfetivoId =
    funilId && funis.some((funil) => funil.funil_id === funilId)
      ? funilId
      : maiorFunil?.funil.funil_id ?? '';

  const etapasDoFunil = funisComContagem.find(
    (linha) => linha.funil.funil_id === funilEfetivoId
  );
  const maximoEtapas = Math.max(1, ...(etapasDoFunil?.etapas ?? []).map((linha) => linha.total));
  const maximoFunis = Math.max(1, ...funisComContagem.map((linha) => linha.total));

  return (
    <div className="dashboard-container">
      <div className="dashboard-toolbar">
        <div style={{ fontWeight: 600, fontSize: 16 }}>Dashboard</div>
        <button
          type="button"
          className="filter-btn filter-btn-secondary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={recarregar}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {carregando ? (
        <div className="dashboard-status">Carregando painel…</div>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-card-title">Leads</span>
              <span className="summary-card-value">{totalLeads}</span>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Funis ativos</span>
              <span className="summary-card-value">{funis.length}</span>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Etapas</span>
              <span className="summary-card-value">{funisComContagem.reduce(
                (soma, linha) => soma + linha.etapas.length,
                0
              )}</span>
            </div>
            <div className="summary-card">
              <span className="summary-card-title">Funil com mais leads</span>
              <span className="summary-card-value summary-card-texto" title={maiorFunil?.funil.nome}>
                {maiorFunil ? maiorFunil.funil.nome : '—'}
              </span>
              {maiorFunil && (
                <span className="summary-card-subtitulo">{maiorFunil.total} lead(s)</span>
              )}
            </div>
          </div>

          <div className="dashboard-grid">
            <Panel title="Leads por funil" icon={<BarChart2 size={16} />}>
              {funisComContagem.length === 0 ? (
                <div className="dashboard-vazio">
                  Nenhum funil cadastrado.{' '}
                  <Link to="/funis">Criar funis e etapas</Link>
                </div>
              ) : (
                <div className="dashboard-barras">
                  {funisComContagem.map((linha) => (
                    <Barra
                      key={linha.funil.funil_id}
                      rotulo={linha.funil.nome}
                      total={linha.total}
                      maximo={maximoFunis}
                      sufixo="lead(s)"
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Leads por etapa"
              icon={<Activity size={16} />}
              actions={
                funis.length > 1 ? (
                  <select
                    className="filter-select dashboard-funil-select"
                    value={funilEfetivoId}
                    onChange={(event) => setFunilId(event.target.value)}
                    aria-label="Funil"
                  >
                    {funis.map((funil) => (
                      <option key={funil.funil_id} value={funil.funil_id}>
                        {funil.nome}
                      </option>
                    ))}
                  </select>
                ) : null
              }
            >
              {!etapasDoFunil || etapasDoFunil.etapas.length === 0 ? (
                <div className="dashboard-vazio">
                  Este funil ainda não tem etapas.{' '}
                  <Link to="/funis">Gerenciar etapas</Link>
                </div>
              ) : (
                <div className="dashboard-barras">
                  {etapasDoFunil.etapas.map(({ etapa, total }) => (
                    <div className="dashboard-etapa-linha" key={etapa.etapa_id}>
                      <Barra
                        rotulo={
                          <StatusBadge
                            status={corDaEtapa(etapa)}
                            label={etapa.nome}
                          />
                        }
                        total={total}
                        maximo={maximoEtapas}
                        sufixo="lead(s)"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <div className="dashboard-grid-amplo">
              <Panel title="Últimos leads" icon={<Users size={16} />}>
                {recentes.length === 0 ? (
                  <div className="dashboard-vazio">
                    Nenhum lead cadastrado ainda.{' '}
                    <Link to="/leads">Ir para Leads</Link>
                  </div>
                ) : (
                  <ul className="dashboard-leads">
                    {recentes.map((lead) => {
                      const etapa = etapaMap[lead.etapa_id];
                      return (
                        <li key={lead.id} className="dashboard-lead-item">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="dashboard-lead-nome"
                          >
                            {lead.nome}
                          </Link>
                          <span className="dashboard-lead-contato">
                            {lead.email || lead.telefone || '—'}
                          </span>
                          {etapa ? (
                            <StatusBadge
                              status={corDaEtapa(etapa)}
                              label={etapa.nome}
                            />
                          ) : (
                            <StatusBadge status="neutral" label="—" />
                          )}
                          <span className="dashboard-lead-data">
                            {formatarData(lead.criado_em)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
