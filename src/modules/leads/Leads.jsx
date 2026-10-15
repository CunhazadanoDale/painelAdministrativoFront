import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Leads.css';
import { DataGrid } from '../../app/components/DataGrid';
import { FilterPanel, FilterGroup } from '../../app/components/FilterPanel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { Modal } from '../../app/components/Modal';
import { LeadFormModal } from './LeadFormModal';
import { LeadsKanban } from './LeadsKanban';
import { useLeads, TAMANHO_PAGINA } from './useLeads';
import { useKanban } from './useKanban';
import { corDaEtapa, formatarData } from './leadsUtils';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  List,
  LayoutGrid,
  Eye,
} from 'lucide-react';

export default function Leads() {
  const navegar = useNavigate();
  const {
    leads,
    funis,
    etapas,
    etapaMap,
    total,
    temProxima,
    pagina,
    q,
    etapaFiltro,
    carregando,
    erro,
    recarga,
    aplicarFiltros,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
    recarregar,
  } = useLeads();

  const [visao, setVisao] = useState('lista');
  const kanban = useKanban({ funis, etapas, ativo: visao === 'kanban' });

  const [buscaRascunho, setBuscaRascunho] = useState(q);
  const [etapaRascunho, setEtapaRascunho] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [leadEditando, setLeadEditando] = useState(null);
  const [leadParaExcluir, setLeadParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);

  const filtrosAtivos = q !== '' || etapaFiltro !== '';

  const abrirCriacao = () => {
    setLeadEditando(null);
    setModalAberto(true);
  };

  const abrirEdicao = (lead) => {
    setLeadEditando(lead);
    setModalAberto(true);
  };

  const salvar = async (dados) => {
    if (leadEditando) {
      await atualizar(leadEditando.id, dados, leadEditando.etapa_id);
    } else {
      await criar(dados);
    }
    kanban.recarregar();
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(leadParaExcluir.id);
      kanban.recarregar();
      setLeadParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o lead.');
    } finally {
      setExcluindo(false);
    }
  };

  const aplicar = () => aplicarFiltros({ q: buscaRascunho, etapaId: etapaRascunho });

  const limpar = () => {
    setBuscaRascunho('');
    setEtapaRascunho('');
    limparFiltros();
  };

  const colunas = [
    {
      label: 'Nome',
      field: 'nome',
      width: '20%',
      render: (nome, lead) => (
        <button
          type="button"
          className="leads-nome-link"
          title="Ver detalhes do lead"
          onClick={(event) => {
            event.stopPropagation();
            navegar(`/leads/${lead.id}`);
          }}
        >
          {nome}
        </button>
      ),
    },
    { label: 'Email', field: 'email', width: '18%' },
    { label: 'Telefone', field: 'telefone', width: '13%' },
    {
      label: 'Status',
      field: 'etapa_id',
      width: '13%',
      render: (etapaId) => {
        const etapa = etapaMap[etapaId];
        if (!etapa) return <StatusBadge status="neutral" label="—" />;
        return <StatusBadge status={corDaEtapa(etapa)} label={etapa.nome} />;
      },
    },
    {
      label: 'Origem',
      field: 'origem',
      width: '10%',
      render: (valor) => valor || '—',
    },
    {
      label: 'Data',
      field: 'criado_em',
      width: '10%',
      render: (valor) => formatarData(valor),
    },
    {
      label: '',
      field: 'id',
      width: '80px',
      render: (id, lead) => (
        <div className="leads-acoes" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="leads-acao-btn"
            title="Ver detalhes"
            onClick={() => navegar(`/leads/${lead.id}`)}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar"
            onClick={() => abrirEdicao(lead)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn leads-acao-perigo"
            title="Excluir"
            onClick={() => {
              setErroExclusao(null);
              setLeadParaExcluir(lead);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const totalPaginas = total != null ? Math.max(1, Math.ceil(total / TAMANHO_PAGINA)) : null;

  return (
    <div className="leads-container">
      <div className="leads-main">
        <div className="leads-toolbar">
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            Leads
            {visao === 'lista' && (total != null ? ` (${total})` : carregando ? ' …' : '')}
          </div>
          <div className="leads-toolbar-actions">
            <div className="leads-visao-toggle" role="group" aria-label="Visão da lista">
              <button
                type="button"
                className={visao === 'lista' ? 'leads-visao-btn leads-visao-ativo' : 'leads-visao-btn'}
                onClick={() => setVisao('lista')}
              >
                <List size={14} /> Lista
              </button>
              <button
                type="button"
                className={visao === 'kanban' ? 'leads-visao-btn leads-visao-ativo' : 'leads-visao-btn'}
                onClick={() => setVisao('kanban')}
              >
                <LayoutGrid size={14} /> Kanban
              </button>
            </div>

            {visao === 'kanban' && (
              <select
                className="filter-select leads-funil-select"
                value={kanban.funilId}
                onChange={(event) => kanban.selecionarFunil(event.target.value)}
                disabled={funis.length === 0}
                aria-label="Funil do quadro"
              >
                {funis.length === 0 && <option value="">Nenhum funil</option>}
                {funis.map((funil) => (
                  <option key={funil.funil_id} value={funil.funil_id}>
                    {funil.nome}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={abrirCriacao}
            >
              <Plus size={16} /> Novo Lead
            </button>
          </div>
        </div>

        {erro && visao === 'lista' && (
          <div className="leads-erro">
            <AlertCircle size={16} />
            <span>{erro}</span>
            <button type="button" onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        )}

        <div className="leads-content">
          {visao === 'kanban' ? (
            <LeadsKanban
              etapas={kanban.etapas}
              colunas={kanban.colunas}
              carregando={kanban.carregando}
              erro={kanban.erro}
              erroMovimento={kanban.erroMovimento}
              onMover={kanban.mover}
              onAbrir={(lead) => navegar(`/leads/${lead.id}`)}
              onLimparErroMovimento={kanban.limparErroMovimento}
              onRecarregar={kanban.recarregar}
            />
          ) : carregando ? (
            <div className="leads-status">Carregando leads…</div>
          ) : (
            <>
              <DataGrid
                key={`${recarga}-${pagina}-${q}-${etapaFiltro}`}
                columns={colunas}
                data={leads}
              />
              {(totalPaginas != null && totalPaginas > 1) || temProxima || pagina > 1 ? (
                <div className="leads-paginacao">
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    onClick={irParaAnterior}
                    disabled={pagina <= 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="leads-paginacao-texto">
                    Página {pagina}
                    {totalPaginas != null ? ` de ${totalPaginas}` : ''}
                  </span>
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    onClick={irParaProxima}
                    disabled={!temProxima}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : null}
              {!carregando && leads.length === 0 && !erro && (
                <div className="leads-vazio">
                  {filtrosAtivos
                    ? 'Nenhum lead encontrado para os filtros aplicados.'
                    : 'Nenhum lead cadastrado ainda.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {visao === 'lista' && (
        <FilterPanel onApply={aplicar} onClear={limpar}>
          <FilterGroup label="Pesquisa">
            <input
              type="text"
              className="filter-input"
              placeholder="Nome, email, telefone..."
              value={buscaRascunho}
              onChange={(event) => setBuscaRascunho(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') aplicar();
              }}
            />
          </FilterGroup>
          <FilterGroup label="Status (etapa)">
            <select
              className="filter-select"
              value={etapaRascunho}
              onChange={(event) => setEtapaRascunho(event.target.value)}
            >
              <option value="">Todas</option>
              {etapas.map((etapa) => (
                <option key={etapa.etapa_id} value={etapa.etapa_id}>
                  {etapa.nome}
                </option>
              ))}
            </select>
          </FilterGroup>
          <div className="leads-filtros-info">
            {etapaFiltro && <span>Filtro de etapa ativo</span>}
            {q && <span>Busca: “{q}”</span>}
          </div>
        </FilterPanel>
      )}

      {modalAberto && (
        <LeadFormModal
          key={leadEditando?.id ?? 'novo'}
          lead={leadEditando}
          etapas={visao === 'kanban' ? kanban.etapas : etapas}
          onFechar={() => setModalAberto(false)}
          onSalvar={salvar}
        />
      )}

      <Modal
        aberto={!!leadParaExcluir}
        titulo="Excluir lead"
        onFechar={excluindo ? () => {} : () => setLeadParaExcluir(null)}
        largura="420px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setLeadParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn leads-excluir-confirmar"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </button>
          </>
        }
      >
        <p>
          Tem certeza que deseja excluir o lead <strong>{leadParaExcluir?.nome}</strong>? Esta ação
          não pode ser desfeita.
        </p>
        {erroExclusao && <div className="lead-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
