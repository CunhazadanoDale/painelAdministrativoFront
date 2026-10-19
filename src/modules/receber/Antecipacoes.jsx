import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import { AntecipacaoFormModal } from './AntecipacaoFormModal';
import { STATUS_ANTECIPACAO, statusDaAntecipacao } from './receberUtils';
import { useAntecipacoes } from './useAntecipacoes';
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import './Receber.css';

export default function Antecipacoes() {
  const nomeEmpresa = useNomesEmpresas();
  const {
    antecipacoes,
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
  } = useAntecipacoes();
  const nomeFornecedor = useNomesPorId(
    antecipacoes.map((antecipacao) => antecipacao.fornecedor_id),
    fornecedoresService.obterFornecedor
  );
  const [novaAberta, setNovaAberta] = useState(false);
  const [periodo, setPeriodo] = useState({ de: '', ate: '' });

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const periodoInvalido = periodo.de && periodo.ate && periodo.ate < periodo.de;

  const alterarPeriodo = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ de: novo.de, ate: novo.ate });
  };

  const colunas = [
    {
      label: 'Operado em',
      field: 'operado_em',
      width: '12%',
      render: (operadoEm, antecipacao) => <Link to={`/antecipacoes/${antecipacao.id}`}>{formatarData(operadoEm)}</Link>,
    },
    { label: 'Borderô', field: 'numero', width: '10%', render: (numero) => numero || '—' },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Fomento', field: 'fornecedor_id', width: '20%', render: (fornecedorId) => nomeFornecedor(fornecedorId) },
    { label: 'Bruto', field: 'valor_bruto_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    { label: 'Líquido', field: 'valor_liquido_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    { label: 'Encargos', field: 'encargos_centavos', width: '10%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Status',
      field: 'status',
      width: '10%',
      render: (status) => {
        const situacao = statusDaAntecipacao(status);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
  ];

  return (
    <div className="receber-container">
      <div className="receber-toolbar">
        <div className="receber-toolbar-titulo">Antecipações</div>
        <div className="receber-toolbar-acoes">
          <label className="filter-label" htmlFor="antecipacoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="antecipacoes-empresa"
            className="filter-input receber-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="antecipacoes-status">
            Status
          </label>
          <select
            id="antecipacoes-status"
            className="filter-input receber-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_ANTECIPACAO.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="antecipacoes-de">
            Operado de
          </label>
          <input
            id="antecipacoes-de"
            className="filter-input receber-filtro"
            type="date"
            value={periodo.de}
            onChange={alterarPeriodo('de')}
          />
          <label className="filter-label" htmlFor="antecipacoes-ate">
            Operado até
          </label>
          <input
            id="antecipacoes-ate"
            className="filter-input receber-filtro"
            type="date"
            value={periodo.ate}
            onChange={alterarPeriodo('ate')}
            aria-invalid={periodoInvalido || undefined}
          />
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setNovaAberta(true)}
          >
            <Plus size={16} /> Nova Antecipação
          </button>
        </div>
      </div>

      {periodoInvalido && <span className="receber-form-erro">O fim do período não pode ser antes do início.</span>}

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="receber-conteudo">
        {carregando ? (
          <div className="receber-status">Carregando antecipações…</div>
        ) : antecipacoes.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'antecipacoes'} columns={colunas} data={antecipacoes} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="receber-paginacao">
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
                <span className="receber-paginacao-texto">Página {pagina}</span>
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
          <div className="receber-status">
            {filtrando ? 'Nenhuma antecipação encontrada com estes filtros.' : 'Nenhuma antecipação registrada.'}
          </div>
        )}
      </div>

      {novaAberta && <AntecipacaoFormModal onFechar={() => setNovaAberta(false)} onSalvar={criar} />}
    </div>
  );
}
