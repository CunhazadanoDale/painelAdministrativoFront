import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import * as produtosService from '../../services/produtos';
import { ImportacaoFormModal } from './ImportacaoFormModal';
import { STATUS_IMPORTACAO, formatarValorMoeda, nomeDoFornecedor, statusDaImportacao } from './importacoesUtils';
import { useImportacoes } from './useImportacoes';
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import './Importacoes.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService.listarFornecedores({ busca: texto, tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: nomeDoFornecedor(fornecedor) });

const BOTAO = { flex: 'none', padding: '4px 10px' };

export default function Importacoes() {
  const navegar = useNavigate();
  const { financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    importacoes,
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
  } = useImportacoes();
  const nomeFornecedor = useNomesPorId(
    [...importacoes.map((importacao) => importacao.fornecedor_id), filtros.fornecedor],
    fornecedoresService.obterFornecedor,
    nomeDoFornecedor
  );
  const nomeProduto = useNomesPorId([], produtosService.obterProduto);

  const [termo, setTermo] = useState('');
  const [novaAberta, setNovaAberta] = useState(false);

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ numero: termo.trim() });
  };

  const salvarNova = async (dados) => {
    const resposta = await criar(dados);
    const id = resposta?.dados?.id;
    if (id) navegar(`/importacoes/${id}`);
  };

  const colunas = [
    {
      label: 'Nº',
      field: 'numero',
      width: '7%',
      render: (numero, importacao) => <Link to={`/importacoes/${importacao.id}`}>{numero}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '13%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Fornecedor', field: 'fornecedor_id', width: '22%', render: (fornecedorId) => nomeFornecedor(fornecedorId) },
    { label: 'Referência', field: 'referencia', width: '13%', render: (referencia) => referencia || '—' },
    {
      label: 'Status',
      field: 'status',
      width: '13%',
      render: (status) => {
        const situacao = statusDaImportacao(status);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    ...(financeiro
      ? [
          {
            label: 'Valor',
            field: 'valor_total_moeda_centesimos',
            width: '14%',
            render: (valor, importacao) => formatarValorMoeda(valor, importacao.moeda),
          },
        ]
      : [{ label: 'Moeda', field: 'moeda', width: '14%' }]),
    {
      label: 'Chegada',
      field: 'chegada_prevista',
      width: '18%',
      render: (prevista, importacao) =>
        importacao.chegada_em ? (
          `${formatarData(importacao.chegada_em)} (chegou)`
        ) : prevista ? (
          `${formatarData(prevista)} (prevista)`
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="importacoes-container">
      <div className="importacoes-toolbar">
        <div className="importacoes-toolbar-titulo">Importações</div>
        <div className="importacoes-toolbar-acoes">
          <form className="importacoes-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              inputMode="numeric"
              className="filter-input"
              aria-label="Buscar pelo número"
              placeholder="Número"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
            />
            <button type="submit" className="filter-btn filter-btn-secondary" style={BOTAO} title="Buscar" aria-label="Buscar">
              <Search size={14} />
            </button>
          </form>
          <label className="filter-label" htmlFor="importacoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="importacoes-empresa"
            className="filter-input importacoes-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="importacoes-status">
            Status
          </label>
          <select
            id="importacoes-status"
            className="filter-input importacoes-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_IMPORTACAO.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="importacoes-chegada">
            Chegada até
          </label>
          <input
            id="importacoes-chegada"
            className="filter-input importacoes-filtro"
            type="date"
            value={filtros.chegada_ate}
            onChange={(evento) => filtrar({ chegada_ate: evento.target.value })}
          />
          {financeiro && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setNovaAberta(true)}
            >
              <Plus size={16} /> Nova Importação
            </button>
          )}
        </div>
      </div>

      <div className="importacoes-filtro-fornecedor">
        <label className="filter-label" htmlFor="importacoes-fornecedor">
          Fornecedor
        </label>
        <BuscaRemota
          id="importacoes-fornecedor"
          nomeBusca="fornecedor para filtrar"
          rotuloSelecao="Fornecedor"
          valor={filtros.fornecedor}
          rotuloAtual={nomeFornecedor(filtros.fornecedor)}
          buscar={buscarFornecedores}
          opcaoDe={opcaoDeFornecedor}
          onEscolher={(fornecedor) => filtrar({ fornecedor: fornecedor ? fornecedor.id : '' })}
          placeholderBusca="Nome ou documento"
        />
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

      <div className="importacoes-conteudo">
        {carregando ? (
          <div className="importacoes-status">Carregando importações…</div>
        ) : importacoes.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'importacoes'} columns={colunas} data={importacoes} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="importacoes-paginacao">
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={BOTAO}
                  title="Página anterior"
                  onClick={irParaAnterior}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="importacoes-paginacao-texto">Página {pagina}</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={BOTAO}
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
          <div className="importacoes-status">
            {filtrando ? 'Nenhuma importação encontrada com estes filtros.' : 'Nenhuma importação nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {novaAberta && (
        <ImportacaoFormModal
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          nomeProduto={nomeProduto}
          onFechar={() => setNovaAberta(false)}
          onSalvar={salvarNova}
        />
      )}
    </div>
  );
}
