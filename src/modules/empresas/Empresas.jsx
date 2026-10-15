import React, { useState } from 'react';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { Modal } from '../../app/components/Modal';
import { EmpresaFormModal } from './EmpresaFormModal';
import { useEmpresas } from './useEmpresas';
import { rotuloDoRegime } from './empresasUtils';
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import './Empresas.css';

export default function Empresas() {
  const {
    empresas,
    pagina,
    situacao,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrarSituacao,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  } = useEmpresas();

  const [empresaModal, setEmpresaModal] = useState(undefined);
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const trocarSituacao = async (empresa) => {
    setErroAcao(null);
    setAlternando(empresa.id);
    try {
      await alternarSituacao(empresa);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação da empresa.');
    } finally {
      setAlternando(null);
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(empresaParaExcluir.id);
      setEmpresaParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir a empresa.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { label: 'Nome fantasia', field: 'nome_fantasia', width: '16%' },
    {
      label: 'Razão social',
      field: 'razao_social',
      width: '28%',
      render: (valor) => <span className="empresas-razao">{valor}</span>,
    },
    {
      label: 'CNPJ',
      field: 'cnpj_formatado',
      width: '17%',
      render: (valor, empresa) => valor || empresa.cnpj,
    },
    { label: 'UF', field: 'uf', width: '6%' },
    {
      label: 'Regime',
      field: 'regime_tributario',
      width: '14%',
      render: (valor) => rotuloDoRegime(valor),
    },
    {
      label: 'Situação',
      field: 'ativa',
      width: '10%',
      render: (ativa) => (
        <StatusBadge status={ativa ? 'success' : 'danger'} label={ativa ? 'Ativa' : 'Inativa'} />
      ),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '110px',
      render: (id, empresa) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar empresa"
            aria-label="Editar empresa"
            onClick={() => setEmpresaModal(empresa)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={empresa.ativa ? 'Desativar empresa' : 'Ativar empresa'}
            aria-label={empresa.ativa ? 'Desativar empresa' : 'Ativar empresa'}
            onClick={() => trocarSituacao(empresa)}
            disabled={alternando === id}
          >
            {empresa.ativa ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button
            type="button"
            className="leads-acao-btn leads-acao-perigo"
            title="Excluir empresa"
            aria-label="Excluir empresa"
            onClick={() => {
              setErroExclusao(null);
              setEmpresaParaExcluir(empresa);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="empresas-container">
      <div className="empresas-toolbar">
        <div className="empresas-toolbar-titulo">Empresas</div>
        <div className="empresas-toolbar-acoes">
          <label className="filter-label" htmlFor="empresas-situacao">
            Situação
          </label>
          <select
            id="empresas-situacao"
            className="filter-input empresas-filtro"
            value={situacao}
            onChange={(evento) => filtrarSituacao(evento.target.value)}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setEmpresaModal(null)}
          >
            <Plus size={16} /> Nova Empresa
          </button>
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

      <div className="empresas-conteudo">
        {carregando ? (
          <div className="empresas-status">Carregando empresas…</div>
        ) : empresas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'empresas'} columns={colunas} data={empresas} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="empresas-paginacao">
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
                <span className="empresas-paginacao-texto">Página {pagina}</span>
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
          <div className="empresas-status">
            {situacao ? 'Nenhuma empresa nesta situação.' : 'Nenhuma empresa cadastrada.'}
          </div>
        )}
      </div>

      {empresaModal !== undefined && (
        <EmpresaFormModal
          key={empresaModal?.id ?? 'nova-empresa'}
          empresa={empresaModal}
          onFechar={() => setEmpresaModal(undefined)}
          onSalvar={(dados) => (empresaModal ? atualizar(empresaModal.id, dados) : criar(dados))}
        />
      )}

      <Modal
        aberto={!!empresaParaExcluir}
        titulo="Excluir empresa"
        onFechar={excluindo ? () => {} : () => setEmpresaParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setEmpresaParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn empresas-excluir-confirmar"
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
          Tem certeza que deseja excluir a empresa <strong>{empresaParaExcluir?.nome_fantasia}</strong>?
          Só é possível excluir empresa sem nenhum vínculo; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="empresas-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
