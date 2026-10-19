import React, { useCallback, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { formatarMoeda } from '../../lib/formatar';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as fornecedoresService from '../../services/fornecedores';
import { formatarCompetencia } from '../solicitacoes/solicitacoesUtils';
import { DespesaRecorrenteFormModal } from './DespesaRecorrenteFormModal';
import { GerarCompetenciaModal } from './GerarCompetenciaModal';
import { useDespesasRecorrentes } from './useDespesasRecorrentes';
import {
  AlertCircle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import './Financeiro.css';

function textoDoVencimento(despesa) {
  return `Dia ${despesa.dia_vencimento}${despesa.vencimento_mes_seguinte ? ' do mês seguinte' : ''}`;
}

function textoDaVigencia(despesa) {
  const inicio = formatarCompetencia(despesa.inicio);
  return despesa.fim ? `${inicio} a ${formatarCompetencia(despesa.fim)}` : `${inicio} em diante`;
}

export default function DespesasRecorrentes() {
  const { administrador } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    despesas,
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
    gerar,
  } = useDespesasRecorrentes();
  const nomeFornecedor = useNomesPorId(
    despesas.map((despesa) => despesa.fornecedor_id),
    fornecedoresService.obterFornecedor
  );
  const nomeCategoria = useNomesPorId(
    despesas.map((despesa) => despesa.categoria_financeira_id),
    categoriasService.obterCategoriaFinanceira
  );

  const [despesaModal, setDespesaModal] = useState(undefined);
  const [gerarAberto, setGerarAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [conflitoAcao, setConflitoAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const filtrando = !!(filtros.empresa || filtros.ativa);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const descricaoDe = (id) => despesas.find((despesa) => despesa.id === id)?.descricao ?? 'Despesa recorrente';

  const trocarSituacao = async (despesa) => {
    setErroAcao(null);
    setConflitoAcao(null);
    setAlternando(despesa.id);
    try {
      await alternarSituacao(despesa);
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflitoAcao(e.message);
      else setErroAcao(e.message || 'Erro ao alterar a situação da despesa recorrente.');
    } finally {
      setAlternando(null);
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(paraExcluir.id);
      setParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir a despesa recorrente.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { label: 'Descrição', field: 'descricao', width: '20%' },
    { label: 'Empresa', field: 'empresa_id', width: '10%', render: (valor) => nomeEmpresa(valor) },
    { label: 'Categoria', field: 'categoria_financeira_id', width: '12%', render: (valor) => nomeCategoria(valor) },
    {
      label: 'Fornecedor',
      field: 'fornecedor_id',
      width: '13%',
      render: (valor) => (valor ? nomeFornecedor(valor) : '—'),
    },
    {
      label: 'Valor',
      field: 'valor_centavos',
      width: '12%',
      render: (valor, despesa) => (
        <span className="financeiro-empilhado">
          <span>{formatarMoeda(valor)}</span>
          {despesa.estimado && <StatusBadge status="neutral" label="Estimado" />}
        </span>
      ),
    },
    { label: 'Vencimento', field: 'dia_vencimento', width: '12%', render: (_, despesa) => textoDoVencimento(despesa) },
    { label: 'Vigência', field: 'inicio', width: '11%', render: (_, despesa) => textoDaVigencia(despesa) },
    {
      label: 'Situação',
      field: 'ativa',
      width: '7%',
      render: (ativa) => <StatusBadge status={ativa ? 'success' : 'danger'} label={ativa ? 'Ativa' : 'Inativa'} />,
    },
    {
      label: 'Ações',
      field: 'id',
      width: '110px',
      render: (id, despesa) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar despesa recorrente"
            aria-label="Editar despesa recorrente"
            onClick={() => setDespesaModal(despesa)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={despesa.ativa ? 'Desativar despesa recorrente' : 'Ativar despesa recorrente'}
            aria-label={despesa.ativa ? 'Desativar despesa recorrente' : 'Ativar despesa recorrente'}
            onClick={() => trocarSituacao(despesa)}
            disabled={alternando === id}
          >
            {despesa.ativa ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          {administrador && (
            <button
              type="button"
              className="leads-acao-btn leads-acao-perigo"
              title="Excluir despesa recorrente"
              aria-label="Excluir despesa recorrente"
              onClick={() => {
                setErroExclusao(null);
                setParaExcluir(despesa);
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
        <div className="financeiro-toolbar-titulo">Despesas Recorrentes</div>
        <div className="financeiro-toolbar-acoes">
          <label className="filter-label" htmlFor="recorrentes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="recorrentes-empresa"
            className="filter-input financeiro-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="recorrentes-situacao">
            Situação
          </label>
          <select
            id="recorrentes-situacao"
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
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setGerarAberto(true)}
          >
            <CalendarPlus size={16} /> Gerar competência
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setDespesaModal(null)}
          >
            <Plus size={16} /> Nova Despesa
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
        <AvisoConflito
          mensagem={conflitoAcao}
          onRecarregar={() => {
            setConflitoAcao(null);
            recarregar();
          }}
        />
      )}

      <div className="financeiro-conteudo">
        {carregando ? (
          <div className="financeiro-status">Carregando despesas recorrentes…</div>
        ) : despesas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'recorrentes'} columns={colunas} data={despesas} selectable={false} />
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
              ? 'Nenhuma despesa recorrente encontrada com estes filtros.'
              : 'Nenhuma despesa recorrente cadastrada.'}
          </div>
        )}
      </div>

      {despesaModal !== undefined && (
        <DespesaRecorrenteFormModal
          key={despesaModal?.id ?? 'nova-despesa'}
          despesa={despesaModal}
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          onFechar={() => setDespesaModal(undefined)}
          onSalvar={(dados) => (despesaModal ? atualizar(despesaModal.id, dados) : criar(dados))}
        />
      )}

      {gerarAberto && (
        <GerarCompetenciaModal descricaoDe={descricaoDe} onGerar={gerar} onFechar={() => setGerarAberto(false)} />
      )}

      <Modal
        aberto={!!paraExcluir}
        titulo="Excluir despesa recorrente"
        onFechar={excluindo ? () => {} : () => setParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setParaExcluir(null)}
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
          Tem certeza que deseja excluir <strong>{paraExcluir?.descricao}</strong>? Só é possível excluir a despesa que
          ainda não gerou solicitações; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="financeiro-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
