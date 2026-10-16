import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { GrupoFormModal } from './GrupoFormModal';
import { useGruposClientes } from './useGruposClientes';
import { AlertCircle, ChevronLeft, ChevronRight, Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import './Clientes.css';

export default function GruposClientes() {
  const { comercial } = useAutenticacao();
  const {
    grupos,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
    criar,
    renomear,
    alternarSituacao,
  } = useGruposClientes();

  const [termo, setTermo] = useState('');
  const [grupoModal, setGrupoModal] = useState(undefined);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const filtrando = !!(filtros.busca || filtros.ativos);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ busca: termo.trim() });
  };

  const trocarSituacao = async (grupo) => {
    setErroAcao(null);
    setAlternando(grupo.id);
    try {
      await alternarSituacao(grupo);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do grupo.');
    } finally {
      setAlternando(null);
    }
  };

  const colunas = [
    { label: 'Nome', field: 'nome', width: '70%' },
    {
      label: 'Situação',
      field: 'ativo',
      width: '15%',
      render: (ativo) => <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />,
    },
  ];

  if (comercial) {
    colunas.push({
      label: 'Ações',
      field: 'id',
      width: '100px',
      render: (id, grupo) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Renomear grupo"
            aria-label="Renomear grupo"
            onClick={() => setGrupoModal(grupo)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={grupo.ativo ? 'Desativar grupo' : 'Ativar grupo'}
            aria-label={grupo.ativo ? 'Desativar grupo' : 'Ativar grupo'}
            onClick={() => trocarSituacao(grupo)}
            disabled={alternando === id}
          >
            {grupo.ativo ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="clientes-container">
      <div className="clientes-toolbar">
        <div className="clientes-toolbar-titulo">Grupos de Clientes</div>
        <div className="clientes-toolbar-acoes">
          <form className="clientes-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              className="filter-input"
              aria-label="Buscar grupo"
              placeholder="Nome do grupo"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
            />
            <button
              type="submit"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '4px 10px' }}
              title="Buscar"
              aria-label="Buscar"
            >
              <Search size={14} />
            </button>
          </form>
          <label className="filter-label" htmlFor="grupos-situacao">
            Situação
          </label>
          <select
            id="grupos-situacao"
            className="filter-input clientes-filtro"
            value={filtros.ativos}
            onChange={(evento) => filtrar({ ativos: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          {comercial && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setGrupoModal(null)}
            >
              <Plus size={16} /> Novo Grupo
            </button>
          )}
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

      {erroAcao && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      <div className="clientes-conteudo">
        {carregando ? (
          <div className="clientes-status">Carregando grupos…</div>
        ) : grupos.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'grupos'} columns={colunas} data={grupos} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="clientes-paginacao">
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Página anterior"
                  onClick={irParaAnterior}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="clientes-paginacao-texto">Página {pagina}</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Próxima página"
                  onClick={irParaProxima}
                  disabled={!temProxima}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        ) : erro ? null : (
          <div className="clientes-status">
            {filtrando ? 'Nenhum grupo encontrado com estes filtros.' : 'Nenhum grupo de clientes cadastrado.'}
          </div>
        )}
      </div>

      {grupoModal !== undefined && (
        <GrupoFormModal
          key={grupoModal?.id ?? 'novo-grupo'}
          grupo={grupoModal}
          onFechar={() => setGrupoModal(undefined)}
          onSalvar={(nome) => (grupoModal ? renomear(grupoModal.id, nome) : criar(nome))}
        />
      )}
    </div>
  );
}
