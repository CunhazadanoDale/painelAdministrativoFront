import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarMoeda } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import { DividaFormModal } from './DividaFormModal';
import { GerarContasModal } from './GerarContasModal';
import { CREDOR_TIPOS, STATUS_DIVIDA, nomeDoFornecedor, rotuloCredorTipo, statusDaDivida } from './dividasUtils';
import { useDividas } from './useDividas';
import { AlertCircle, CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import './Dividas.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService.listarFornecedores({ busca: texto, tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: nomeDoFornecedor(fornecedor) });

const SITUACOES = [
  { valor: 'em_aberto', rotulo: 'Em aberto', filtro: { quitada: 'false', vencidas: '' } },
  { valor: 'vencidas', rotulo: 'Com parcela vencida', filtro: { quitada: '', vencidas: 'true' } },
  { valor: 'quitadas', rotulo: 'Quitadas', filtro: { quitada: 'true', vencidas: '' } },
];

function situacaoDosFiltros({ quitada, vencidas }) {
  return SITUACOES.find((item) => item.filtro.quitada === quitada && item.filtro.vencidas === vencidas)?.valor ?? '';
}

const BOTAO = { flex: 'none', padding: '4px 10px' };
const BOTAO_ACAO = { flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 };

export default function Dividas() {
  const navegar = useNavigate();
  const nomeEmpresa = useNomesEmpresas();
  const {
    dividas,
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
    gerar,
  } = useDividas();
  const nomeFornecedor = useNomesPorId(
    [...dividas.map((divida) => divida.fornecedor_id), filtros.fornecedor],
    fornecedoresService.obterFornecedor,
    nomeDoFornecedor
  );

  const [gerarAberto, setGerarAberto] = useState(false);
  const [novaAberta, setNovaAberta] = useState(false);

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const filtrarSituacao = (valor) => {
    const situacao = SITUACOES.find((item) => item.valor === valor);
    filtrar(situacao ? situacao.filtro : { quitada: '', vencidas: '' });
  };

  const salvarNova = async (dados) => {
    const resposta = await criar(dados);
    const id = resposta?.dados?.id;
    if (id) navegar(`/dividas/${id}`);
  };

  const colunas = [
    {
      label: 'Descrição',
      field: 'descricao',
      width: '22%',
      render: (descricao, divida) => <Link to={`/dividas/${divida.id}`}>{descricao}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Credor', field: 'fornecedor_id', width: '18%', render: (fornecedorId) => nomeFornecedor(fornecedorId) },
    { label: 'Tipo', field: 'credor_tipo', width: '9%', render: (tipo) => rotuloCredorTipo(tipo) },
    { label: 'Contrato', field: 'contrato', width: '10%', render: (contrato) => contrato || '—' },
    {
      label: 'Saldo devedor',
      field: 'saldo_devedor_centavos',
      width: '11%',
      render: (saldo) => formatarMoeda(saldo),
    },
    {
      label: 'Vencido',
      field: 'vencido_centavos',
      width: '9%',
      render: (vencido) =>
        vencido > 0 ? <span className="dividas-vencido">{formatarMoeda(vencido)}</span> : formatarMoeda(vencido ?? 0),
    },
    {
      label: 'Status',
      field: 'status',
      width: '9%',
      render: (_status, divida) => {
        const situacao = statusDaDivida(divida);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
  ];

  return (
    <div className="dividas-container">
      <div className="dividas-toolbar">
        <div className="dividas-toolbar-titulo">Dívidas</div>
        <div className="dividas-toolbar-acoes">
          <label className="filter-label" htmlFor="dividas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="dividas-empresa"
            className="filter-input dividas-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="dividas-credor-tipo">
            Tipo de credor
          </label>
          <select
            id="dividas-credor-tipo"
            className="filter-input dividas-filtro"
            value={filtros.credor_tipo}
            onChange={(evento) => filtrar({ credor_tipo: evento.target.value })}
          >
            <option value="">Todos</option>
            {CREDOR_TIPOS.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="dividas-status">
            Status
          </label>
          <select
            id="dividas-status"
            className="filter-input dividas-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_DIVIDA.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="dividas-situacao">
            Situação
          </label>
          <select
            id="dividas-situacao"
            className="filter-input dividas-filtro"
            value={situacaoDosFiltros(filtros)}
            onChange={(evento) => filtrarSituacao(evento.target.value)}
          >
            <option value="">Todas</option>
            {SITUACOES.map((situacao) => (
              <option key={situacao.valor} value={situacao.valor}>
                {situacao.rotulo}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={BOTAO_ACAO}
            onClick={() => setGerarAberto(true)}
          >
            <CalendarPlus size={16} /> Gerar competência
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={BOTAO_ACAO}
            onClick={() => setNovaAberta(true)}
          >
            <Plus size={16} /> Nova Dívida
          </button>
        </div>
      </div>

      <div className="dividas-filtro-fornecedor">
        <label className="filter-label" htmlFor="dividas-fornecedor">
          Credor
        </label>
        <BuscaRemota
          id="dividas-fornecedor"
          nomeBusca="credor para filtrar"
          rotuloSelecao="Credor"
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

      <div className="dividas-conteudo">
        {carregando ? (
          <div className="dividas-status">Carregando dívidas…</div>
        ) : dividas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'dividas'} columns={colunas} data={dividas} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="dividas-paginacao">
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
                <span className="dividas-paginacao-texto">Página {pagina}</span>
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
          <div className="dividas-status">
            {filtrando ? 'Nenhuma dívida encontrada com estes filtros.' : 'Nenhuma dívida nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {novaAberta && (
        <DividaFormModal
          modo="criar"
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          onFechar={() => setNovaAberta(false)}
          onSalvar={salvarNova}
        />
      )}
      {gerarAberto && <GerarContasModal onGerar={gerar} onFechar={() => setGerarAberto(false)} />}
    </div>
  );
}
