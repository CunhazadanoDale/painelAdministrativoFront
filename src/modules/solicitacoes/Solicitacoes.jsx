import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { AlertCircle, Eye, Plus } from 'lucide-react';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { useSolicitacoes } from './useSolicitacoes';
import { SolicitacaoFormModal } from './SolicitacaoFormModal';
import {
  corStatus,
  rotuloFormaPagamento,
  rotuloStatus,
  statusPermitidosNoEscopo,
} from './solicitacoesUtils';
import './Solicitacoes.css';

export default function Solicitacoes() {
  const {
    itens,
    escopos,
    escopo,
    status,
    pagina,
    temProxima,
    carregando,
    erro,
    trocarEscopo,
    trocarStatus,
    irParaAnterior,
    irParaProxima,
    criar,
    recarregar,
  } = useSolicitacoes();
  const navegar = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);

  const opcoesStatus = statusPermitidosNoEscopo(escopo);

  const colunas = [
    { label: 'Valor', field: 'valor_centavos', width: '130px', render: (valor) => formatarMoeda(valor) },
    { label: 'Prazo', field: 'prazo_pagamento', width: '110px', render: (valor) => formatarData(valor) },
    {
      label: 'Forma',
      field: 'forma_pagamento',
      width: '110px',
      render: (valor) => rotuloFormaPagamento(valor),
    },
    { label: 'Observação', field: 'observacao' },
    {
      label: 'Status',
      field: 'status',
      width: '190px',
      render: (valor) => <StatusBadge status={corStatus(valor)} label={rotuloStatus(valor)} />,
    },
    {
      label: 'Ações',
      field: 'id',
      width: '70px',
      render: (valor) => (
        <button
          type="button"
          className="leads-acao-btn"
          title="Ver detalhes"
          onClick={() => navegar(`/solicitacoes/${valor}`)}
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="solicitacoes-container">
      <div className="solicitacoes-toolbar">
        <div className="solicitacoes-toolbar-titulo">
          Solicitações {carregando ? '…' : `(${itens.length})`}
        </div>
        <div className="solicitacoes-toolbar-acoes">
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setModalAberto(true)}
          >
            <Plus size={16} /> Nova Solicitação
          </button>
        </div>
      </div>

      <div className="solicitacoes-escopos">
        {escopos.map((item) => (
          <button
            key={item.valor}
            type="button"
            className={`solicitacoes-escopo-btn ${item.valor === escopo ? 'solicitacoes-escopo-ativo' : ''}`}
            onClick={() => trocarEscopo(item.valor)}
          >
            {item.rotulo}
          </button>
        ))}
        <div className="solicitacoes-status-filtro">
          <label className="filter-label" htmlFor="solicitacoes-status">
            Status
          </label>
          <select
            id="solicitacoes-status"
            className="filter-select"
            value={status}
            onChange={(event) => trocarStatus(event.target.value)}
          >
            <option value="">Todos</option>
            {opcoesStatus.map((valor) => (
              <option key={valor} value={valor}>
                {rotuloStatus(valor)}
              </option>
            ))}
          </select>
        </div>
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

      <div className="solicitacoes-conteudo">
        {carregando ? (
          <div className="solicitacoes-status">Carregando solicitações…</div>
        ) : itens.length === 0 && !erro ? (
          <div className="solicitacoes-status">Nenhuma solicitação encontrada.</div>
        ) : (
          <DataGrid columns={colunas} data={itens} selectable={false} />
        )}
      </div>

      {!carregando && itens.length > 0 && (
        <div className="solicitacoes-paginacao">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 12px' }}
            onClick={irParaAnterior}
            disabled={pagina === 1}
          >
            Anterior
          </button>
          <span className="solicitacoes-paginacao-texto">Página {pagina}</span>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 12px' }}
            onClick={irParaProxima}
            disabled={!temProxima}
          >
            Próxima
          </button>
        </div>
      )}

      {modalAberto && (
        <SolicitacaoFormModal
          onFechar={() => setModalAberto(false)}
          onSalvar={(dados) => criar(dados)}
        />
      )}
    </div>
  );
}
