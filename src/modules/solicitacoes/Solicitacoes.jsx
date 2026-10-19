import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { AlertCircle, Eye, Filter, Plus } from 'lucide-react';
import * as fornecedoresService from '../../services/fornecedores';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { useSolicitacoes } from './useSolicitacoes';
import { SolicitacaoFormModal } from './SolicitacaoFormModal';
import {
  ORIGENS,
  corStatus,
  formatarCompetencia,
  rotuloFormaPagamento,
  rotuloStatus,
  statusPermitidosNoEscopo,
} from './solicitacoesUtils';
import './Solicitacoes.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome });

function FiltrosContaAPagar({ filtros, filtrar, limparFiltros, nomeFornecedor }) {
  const [vencimento, setVencimento] = useState({ de: filtros.vencimento_de, ate: filtros.vencimento_ate });
  const filtrarCategoria = useCallback((categoria) => filtrar({ categoria }), [filtrar]);
  const intervaloInvalido = vencimento.de && vencimento.ate && vencimento.ate < vencimento.de;

  const alterarVencimento = (campo) => (evento) => {
    const novo = { ...vencimento, [campo]: evento.target.value };
    setVencimento(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ vencimento_de: novo.de, vencimento_ate: novo.ate });
  };

  const limpar = () => {
    setVencimento({ de: '', ate: '' });
    limparFiltros();
  };

  return (
    <div className="solicitacoes-filtros-extras">
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-fornecedor">
          Fornecedor
        </label>
        <BuscaRemota
          id="filtro-fornecedor"
          nomeBusca="fornecedor do filtro"
          valor={filtros.fornecedor}
          rotuloAtual={nomeFornecedor(filtros.fornecedor)}
          buscar={buscarFornecedores}
          opcaoDe={opcaoDeFornecedor}
          onEscolher={(fornecedor) => filtrar({ fornecedor: fornecedor ? fornecedor.id : '' })}
          placeholderBusca="Nome ou documento"
        />
      </div>
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-categoria">
          Categoria
        </label>
        <SeletorCategoriaDespesa
          id="filtro-categoria"
          valor={filtros.categoria}
          onAlterar={filtrarCategoria}
          placeholder="Todas"
        />
      </div>
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-competencia">
          Competência
        </label>
        <input
          id="filtro-competencia"
          className="filter-input"
          type="month"
          value={filtros.competencia}
          onChange={(evento) => filtrar({ competencia: evento.target.value })}
        />
      </div>
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-vencimento-de">
          Vencimento de
        </label>
        <input
          id="filtro-vencimento-de"
          className="filter-input"
          type="date"
          value={vencimento.de}
          onChange={alterarVencimento('de')}
        />
      </div>
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-vencimento-ate">
          Vencimento até
        </label>
        <input
          id="filtro-vencimento-ate"
          className="filter-input"
          type="date"
          value={vencimento.ate}
          onChange={alterarVencimento('ate')}
          aria-invalid={intervaloInvalido || undefined}
        />
      </div>
      <div className="solicitacoes-filtro-campo">
        <label className="filter-label" htmlFor="filtro-origem">
          Origem
        </label>
        <select
          id="filtro-origem"
          className="filter-select"
          value={filtros.origem}
          onChange={(evento) => filtrar({ origem: evento.target.value })}
        >
          <option value="">Todas</option>
          {ORIGENS.map((origem) => (
            <option key={origem.valor} value={origem.valor}>
              {origem.rotulo}
            </option>
          ))}
        </select>
      </div>
      <label className="solicitacoes-form-checkbox" htmlFor="filtro-vencidas">
        <input
          id="filtro-vencidas"
          type="checkbox"
          checked={filtros.vencidas}
          onChange={(evento) => filtrar({ vencidas: evento.target.checked })}
        />
        Só vencidas
      </label>
      <button
        type="button"
        className="filter-btn filter-btn-secondary"
        style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
        onClick={limpar}
      >
        Limpar filtros
      </button>
      {intervaloInvalido && (
        <span className="solicitacoes-form-erro">O vencimento final não pode ser antes do inicial.</span>
      )}
    </div>
  );
}

export default function Solicitacoes() {
  const {
    itens,
    escopos,
    escopo,
    status,
    empresa,
    pagina,
    temProxima,
    carregando,
    erro,
    trocarEscopo,
    trocarStatus,
    trocarEmpresa,
    filtros,
    filtrar,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    recarregar,
  } = useSolicitacoes();
  const nomeEmpresa = useNomesEmpresas();
  const navegar = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const nomeFornecedor = useNomesPorId(
    [...itens.map((item) => item.fornecedor_id), filtros.fornecedor],
    fornecedoresService.obterFornecedor
  );

  const opcoesStatus = statusPermitidosNoEscopo(escopo);

  const colunas = [
    { label: 'Empresa', field: 'empresa_id', width: '140px', render: (valor) => nomeEmpresa(valor) },
    { label: 'Valor', field: 'valor_centavos', width: '130px', render: (valor) => formatarMoeda(valor) },
    { label: 'Prazo', field: 'prazo_pagamento', width: '110px', render: (valor) => formatarData(valor) },
    {
      label: 'Competência',
      field: 'competencia',
      width: '100px',
      render: (valor) => formatarCompetencia(valor),
    },
    {
      label: 'Fornecedor',
      field: 'fornecedor_id',
      width: '160px',
      render: (valor) => (valor ? nomeFornecedor(valor) : '—'),
    },
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
      render: (valor, item) => (
        <span className="solicitacoes-status-celula">
          <StatusBadge status={corStatus(valor)} label={rotuloStatus(valor)} />
          {item.vencida && <StatusBadge status="danger" label="Vencida" />}
        </span>
      ),
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
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
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
          <label className="filter-label" htmlFor="solicitacoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="solicitacoes-empresa"
            valor={empresa}
            onAlterar={trocarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
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
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((atual) => !atual)}
          >
            <Filter size={14} /> Mais filtros
          </button>
        </div>
      </div>

      {filtrosAbertos && (
        <FiltrosContaAPagar
          filtros={filtros}
          filtrar={filtrar}
          limparFiltros={limparFiltros}
          nomeFornecedor={nomeFornecedor}
        />
      )}

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
