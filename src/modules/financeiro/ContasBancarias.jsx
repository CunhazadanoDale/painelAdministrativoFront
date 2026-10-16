import React, { useCallback, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { ContaBancariaFormModal } from './ContaBancariaFormModal';
import { TIPOS_CONTA, rotuloDoTipo } from './contasBancariasUtils';
import { SeletorBanco } from './SeletorBanco';
import { useContasBancarias } from './useContasBancarias';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import './Financeiro.css';

export default function ContasBancarias() {
  const { administrador } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    contas,
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
    atualizar,
    alternarSituacao,
    excluir,
  } = useContasBancarias();

  const [contaModal, setContaModal] = useState(undefined);
  const [contaParaExcluir, setContaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [conflitoAcao, setConflitoAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const filtrando = !!(filtros.empresa || filtros.banco || filtros.tipo || filtros.ativa);

  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarBanco = useCallback((banco) => filtrar({ banco }), [filtrar]);

  const trocarSituacao = async (conta) => {
    setErroAcao(null);
    setConflitoAcao(null);
    setAlternando(conta.id);
    try {
      await alternarSituacao(conta);
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflitoAcao(e.message);
      } else {
        setErroAcao(e.message || 'Erro ao alterar a situação da conta.');
      }
    } finally {
      setAlternando(null);
    }
  };

  const recarregarDepoisDoConflito = () => {
    setConflitoAcao(null);
    recarregar();
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(contaParaExcluir.id);
      setContaParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir a conta.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { label: 'Apelido', field: 'apelido', width: '22%' },
    {
      label: 'Empresa',
      field: 'empresa_id',
      width: '16%',
      render: (empresaId) => nomeEmpresa(empresaId),
    },
    { label: 'Banco', field: 'banco_nome', width: '16%' },
    { label: 'Tipo', field: 'tipo', width: '10%', render: (tipo) => rotuloDoTipo(tipo) },
    { label: 'Agência', field: 'agencia_formatada', width: '9%' },
    { label: 'Conta', field: 'conta_formatada', width: '12%' },
    {
      label: 'Situação',
      field: 'ativa',
      width: '8%',
      render: (ativa) => (
        <StatusBadge status={ativa ? 'success' : 'danger'} label={ativa ? 'Ativa' : 'Inativa'} />
      ),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '110px',
      render: (id, conta) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar conta"
            aria-label="Editar conta"
            onClick={() => setContaModal(conta)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={conta.ativa ? 'Desativar conta' : 'Ativar conta'}
            aria-label={conta.ativa ? 'Desativar conta' : 'Ativar conta'}
            onClick={() => trocarSituacao(conta)}
            disabled={alternando === id}
          >
            {conta.ativa ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          {administrador && (
            <button
              type="button"
              className="leads-acao-btn leads-acao-perigo"
              title="Excluir conta"
              aria-label="Excluir conta"
              onClick={() => {
                setErroExclusao(null);
                setContaParaExcluir(conta);
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="financeiro-container">
      <div className="financeiro-toolbar">
        <div className="financeiro-toolbar-titulo">Contas Bancárias</div>
        <div className="financeiro-toolbar-acoes">
          <label className="filter-label" htmlFor="contas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="contas-empresa"
            className="filter-input financeiro-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="contas-banco">
            Banco
          </label>
          <SeletorBanco
            id="contas-banco"
            className="filter-input financeiro-filtro"
            valor={filtros.banco}
            onAlterar={filtrarBanco}
            placeholder="Todos"
          />
          <label className="filter-label" htmlFor="contas-tipo">
            Tipo
          </label>
          <select
            id="contas-tipo"
            className="filter-input financeiro-filtro"
            value={filtros.tipo}
            onChange={(evento) => filtrar({ tipo: evento.target.value })}
          >
            <option value="">Todos</option>
            {TIPOS_CONTA.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="contas-situacao">
            Situação
          </label>
          <select
            id="contas-situacao"
            className="filter-input financeiro-filtro"
            value={filtros.ativa}
            onChange={(evento) => filtrar({ ativa: evento.target.value })}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setContaModal(null)}
          >
            <Plus size={16} /> Nova Conta
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

      {conflitoAcao && (
        <AvisoConflito mensagem={conflitoAcao} onRecarregar={recarregarDepoisDoConflito} />
      )}

      <div className="financeiro-conteudo">
        {carregando ? (
          <div className="financeiro-status">Carregando contas bancárias…</div>
        ) : contas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'contas'} columns={colunas} data={contas} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="financeiro-paginacao">
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
                <span className="financeiro-paginacao-texto">Página {pagina}</span>
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
          <div className="financeiro-status">
            {filtrando
              ? 'Nenhuma conta encontrada com estes filtros.'
              : 'Nenhuma conta bancária cadastrada nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {contaModal !== undefined && (
        <ContaBancariaFormModal
          key={contaModal?.id ?? 'nova-conta'}
          conta={contaModal}
          nomeEmpresa={nomeEmpresa}
          onFechar={() => setContaModal(undefined)}
          onSalvar={(dados) => (contaModal ? atualizar(contaModal.id, dados) : criar(dados))}
        />
      )}

      <Modal
        aberto={!!contaParaExcluir}
        titulo="Excluir conta bancária"
        onFechar={excluindo ? () => {} : () => setContaParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setContaParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn financeiro-excluir-confirmar"
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
          Tem certeza que deseja excluir a conta <strong>{contaParaExcluir?.apelido}</strong>? Só é possível excluir
          conta sem nenhum lançamento; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="financeiro-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
