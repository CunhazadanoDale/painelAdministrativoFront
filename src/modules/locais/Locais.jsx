import React, { useCallback, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { LocalFormModal } from './LocalFormModal';
import { SaldosLocalModal } from './SaldosLocalModal';
import { useLocais } from './useLocais';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import './Locais.css';

export default function Locais() {
  const { administrador } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    locais,
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
    excluir,
  } = useLocais();

  const [localModal, setLocalModal] = useState(undefined);
  const [localSaldos, setLocalSaldos] = useState(null);
  const [localParaExcluir, setLocalParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const filtrando = !!(filtros.empresa || filtros.ativos);

  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const trocarSituacao = async (local) => {
    setErroAcao(null);
    setAlternando(local.id);
    try {
      await alternarSituacao(local);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do local.');
    } finally {
      setAlternando(null);
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(localParaExcluir.id);
      setLocalParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o local.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { label: 'Nome', field: 'nome', width: '40%' },
    { label: 'Empresa', field: 'empresa_id', width: '30%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Situação',
      field: 'ativo',
      width: '12%',
      render: (ativo) => <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />,
    },
    {
      label: 'Ações',
      field: 'id',
      width: '140px',
      render: (id, local) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Ver saldos"
            aria-label="Ver saldos"
            onClick={() => setLocalSaldos(local)}
          >
            <Boxes size={14} />
          </button>
          {administrador && (
            <>
              <button
                type="button"
                className="leads-acao-btn"
                title="Renomear local"
                aria-label="Renomear local"
                onClick={() => setLocalModal(local)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="leads-acao-btn"
                title={local.ativo ? 'Desativar local' : 'Ativar local'}
                aria-label={local.ativo ? 'Desativar local' : 'Ativar local'}
                onClick={() => trocarSituacao(local)}
                disabled={alternando === id}
              >
                {local.ativo ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
              <button
                type="button"
                className="leads-acao-btn leads-acao-perigo"
                title="Excluir local"
                aria-label="Excluir local"
                onClick={() => {
                  setErroExclusao(null);
                  setLocalParaExcluir(local);
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="locais-container">
      <div className="locais-toolbar">
        <div className="locais-toolbar-titulo">Locais de Estoque</div>
        <div className="locais-toolbar-acoes">
          <label className="filter-label" htmlFor="locais-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="locais-empresa"
            className="filter-input locais-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="locais-situacao">
            Situação
          </label>
          <select
            id="locais-situacao"
            className="filter-input locais-filtro"
            value={filtros.ativos}
            onChange={(evento) => filtrar({ ativos: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setLocalModal(null)}
            >
              <Plus size={16} /> Novo Local
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

      <div className="locais-conteudo">
        {carregando ? (
          <div className="locais-status">Carregando locais de estoque…</div>
        ) : locais.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'locais'} columns={colunas} data={locais} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="locais-paginacao">
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
                <span className="locais-paginacao-texto">Página {pagina}</span>
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
          <div className="locais-status">
            {filtrando
              ? 'Nenhum local encontrado com estes filtros.'
              : 'Nenhum local de estoque nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {localModal !== undefined && (
        <LocalFormModal
          key={localModal?.id ?? 'novo-local'}
          local={localModal}
          nomeEmpresa={nomeEmpresa}
          onFechar={() => setLocalModal(undefined)}
          onSalvar={(dados) => (localModal ? renomear(localModal.id, dados) : criar(dados))}
        />
      )}

      {localSaldos && (
        <SaldosLocalModal key={localSaldos.id} local={localSaldos} onFechar={() => setLocalSaldos(null)} />
      )}

      <Modal
        aberto={!!localParaExcluir}
        titulo="Excluir local de estoque"
        onFechar={excluindo ? () => {} : () => setLocalParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setLocalParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn locais-excluir-confirmar"
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
          Tem certeza que deseja excluir o local <strong>{localParaExcluir?.nome}</strong>? Só é possível excluir local
          sem saldo, lote nem movimento; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="locais-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
