import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import { formatarCompetencia } from '../solicitacoes/solicitacoesUtils';
import { linkDoMovimento, nomeDaConta, opcaoDeConta, rotuloMovimento } from './caixaUtils';
import { AlertCircle } from 'lucide-react';
import './Caixa.css';

const VISOES = [
  { valor: 'pendencias', rotulo: 'Pendências do sistema' },
  { valor: 'lancamentos', rotulo: 'Lançamentos de caixa' },
  { valor: 'transferencias', rotulo: 'Transferências' },
  { valor: 'sem_conta', rotulo: 'Pagamentos sem conta' },
];

const carregarContas = (sinal) => contasService.listarTodasContasBancarias({ sinal });

function Valor({ centavos }) {
  return <span className={centavos < 0 ? 'caixa-negativo' : undefined}>{formatarMoeda(centavos)}</span>;
}

function TipoComLink({ movimento }) {
  const link = linkDoMovimento(movimento);
  return link ? <Link to={link}>{rotuloMovimento(movimento.tipo)}</Link> : rotuloMovimento(movimento.tipo);
}

function Filtros({ campos, filtros, filtrar, prefixo }) {
  const [periodo, setPeriodo] = useState({ de: filtros.de, ate: filtros.ate });
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarConta = useCallback((conta) => filtrar({ conta }), [filtrar]);
  const periodoInvalido = periodo.de && periodo.ate && periodo.ate < periodo.de;

  const alterarPeriodo = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ de: novo.de, ate: novo.ate });
  };

  return (
    <div className="caixa-filtros-extras">
      {campos.includes('empresa') && (
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor={`${prefixo}-empresa`}>
            Empresa
          </label>
          <SeletorEmpresa
            id={`${prefixo}-empresa`}
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      )}
      {campos.includes('conta') && (
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor={`${prefixo}-conta`}>
            Conta
          </label>
          <SeletorRemoto
            id={`${prefixo}-conta`}
            className="filter-select"
            valor={filtros.conta}
            onAlterar={filtrarConta}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            placeholder="Todas"
            textoVazio="Nenhuma conta"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
      )}
      <div className="caixa-filtro-campo">
        <label className="filter-label" htmlFor={`${prefixo}-de`}>
          De
        </label>
        <input id={`${prefixo}-de`} className="filter-input" type="date" value={periodo.de} onChange={alterarPeriodo('de')} />
      </div>
      <div className="caixa-filtro-campo">
        <label className="filter-label" htmlFor={`${prefixo}-ate`}>
          Até
        </label>
        <input
          id={`${prefixo}-ate`}
          className="filter-input"
          type="date"
          value={periodo.ate}
          onChange={alterarPeriodo('ate')}
          aria-invalid={periodoInvalido || undefined}
        />
      </div>
      {periodoInvalido && <span className="caixa-form-erro">O fim do período não pode ser antes do início.</span>}
    </div>
  );
}

function Lista({ listar, filtrosIniciais, campos, prefixo, colunas, vazio, ajuda, idDe }) {
  const consulta = useConsulta(listar, filtrosIniciais);
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } = consulta;
  const linhas = idDe ? itens.map((item) => ({ ...item, id: idDe(item) })) : itens;
  const nomeConta = useNomesPorId(
    itens.flatMap((item) => [item.conta_bancaria_id, item.conta_origem_id, item.conta_destino_id]),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const nomeCategoria = useNomesPorId(
    itens.map((item) => item.categoria_financeira_id),
    categoriasService.obterCategoriaFinanceira
  );

  return (
    <>
      <Filtros campos={campos} filtros={filtros} filtrar={filtrar} prefixo={prefixo} />
      {ajuda && <span className="caixa-form-ajuda">{ajuda}</span>}
      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="caixa-conteudo">
        {carregando ? (
          <div className="caixa-status">Carregando…</div>
        ) : linhas.length > 0 ? (
          <>
            <DataGrid columns={colunas({ nomeConta, nomeCategoria })} data={linhas} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="caixa-status">{vazio}</div>
        )}
      </div>
    </>
  );
}

function PendenciasSistema() {
  const [conta, setConta] = useState('');
  const alterarConta = useCallback((valor) => setConta(valor), []);
  const colunas = () => [
    { label: 'Data', field: 'data', width: '12%', render: (data) => formatarData(data) },
    { label: 'Tipo', field: 'tipo', width: '20%', render: (_, movimento) => <TipoComLink movimento={movimento} /> },
    { label: 'Descrição', field: 'descricao' },
    { label: 'Valor', field: 'valor_centavos', width: '14%', render: (valor) => <Valor centavos={valor} /> },
  ];

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="pendencias-sistema-conta">
            Conta *
          </label>
          <SeletorRemoto
            id="pendencias-sistema-conta"
            className="filter-select"
            valor={conta}
            onAlterar={alterarConta}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            textoVazio="Nenhuma conta"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
      </div>
      {conta ? (
        <Lista
          key={conta}
          listar={caixaService.listarPendenciasSistema}
          filtrosIniciais={{ conta, de: '', ate: '' }}
          campos={[]}
          prefixo="pendencias-sistema"
          colunas={colunas}
          idDe={(movimento) => `${movimento.tipo}:${movimento.id}`}
          ajuda="Pagamentos, recebimentos, borderôs e pontas de transferência registrados no sistema que ainda não têm linha no extrato desta conta."
          vazio="Nenhum movimento do sistema sem linha no extrato."
        />
      ) : (
        <div className="caixa-status">Escolha a conta para ver os movimentos sem linha no extrato.</div>
      )}
    </>
  );
}

function LancamentosCaixa() {
  const nomeEmpresa = useNomesEmpresas();
  const colunas = ({ nomeConta, nomeCategoria }) => [
    { label: 'Data', field: 'data', width: '10%', render: (data) => formatarData(data) },
    { label: 'Empresa', field: 'empresa_id', width: '11%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Conta', field: 'conta_bancaria_id', width: '17%', render: (contaId) => nomeConta(contaId) },
    { label: 'Categoria', field: 'categoria_financeira_id', width: '15%', render: (categoriaId) => nomeCategoria(categoriaId) },
    { label: 'Descrição', field: 'descricao' },
    { label: 'Competência', field: 'competencia', width: '10%', render: (competencia) => formatarCompetencia(competencia) },
    { label: 'Valor', field: 'valor_centavos', width: '11%', render: (valor) => <Valor centavos={valor} /> },
    {
      label: 'Situação',
      field: 'estornado',
      width: '10%',
      render: (estornado) => (estornado ? <StatusBadge status="danger" label="Estornado" /> : <StatusBadge status="success" label="Vigente" />),
    },
  ];

  return (
    <Lista
      listar={caixaService.listarLancamentosCaixa}
      filtrosIniciais={{ empresa: '', conta: '', de: '', ate: '' }}
      campos={['empresa', 'conta']}
      prefixo="lancamentos-caixa"
      colunas={colunas}
      ajuda="Linhas do extrato sem par no sistema, classificadas no plano de contas. Desfazer a conciliação estorna o lançamento."
      vazio="Nenhum lançamento de caixa."
    />
  );
}

function Transferencias() {
  const colunas = ({ nomeConta }) => [
    { label: 'Data', field: 'data', width: '10%', render: (data) => formatarData(data) },
    { label: 'Origem', field: 'conta_origem_id', width: '18%', render: (contaId) => nomeConta(contaId) },
    { label: 'Destino', field: 'conta_destino_id', width: '18%', render: (contaId) => nomeConta(contaId) },
    { label: 'Descrição', field: 'descricao' },
    { label: 'Valor', field: 'valor_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Situação',
      field: 'estornado',
      width: '20%',
      render: (estornado, transferencia) => (
        <span className="caixa-celula">
          {transferencia.entre_empresas && <StatusBadge status="info" label="Entre empresas" />}
          {estornado && <StatusBadge status="danger" label="Estornada" />}
        </span>
      ),
    },
  ];

  return (
    <Lista
      listar={caixaService.listarTransferencias}
      filtrosIniciais={{ empresa: '', conta: '', de: '', ate: '' }}
      campos={['empresa', 'conta']}
      prefixo="transferencias"
      colunas={colunas}
      vazio="Nenhuma transferência entre contas."
    />
  );
}

function PagamentosSemConta() {
  const nomeEmpresa = useNomesEmpresas();
  const colunas = () => [
    { label: 'Data', field: 'data', width: '12%', render: (data) => formatarData(data) },
    { label: 'Empresa', field: 'empresa_id', width: '14%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Tipo', field: 'tipo', width: '14%', render: (_, movimento) => <TipoComLink movimento={movimento} /> },
    { label: 'Descrição', field: 'descricao' },
    { label: 'Valor', field: 'valor_centavos', width: '14%', render: (valor) => <Valor centavos={valor} /> },
  ];

  return (
    <Lista
      listar={caixaService.listarPagamentosSemConta}
      filtrosIniciais={{ empresa: '', de: '', ate: '' }}
      campos={['empresa']}
      prefixo="sem-conta"
      colunas={colunas}
      ajuda="Pagamentos registrados antes do contas a pagar exigir a conta bancária: ficam fora da conciliação e só aparecem aqui."
      vazio="Nenhum pagamento sem conta bancária."
    />
  );
}

export function RegistrosCaixa() {
  const [visao, setVisao] = useState('pendencias');

  return (
    <>
      <div className="caixa-visoes" role="group" aria-label="Registros do caixa">
        {VISOES.map((item) => (
          <button
            key={item.valor}
            type="button"
            className={`filter-btn ${visao === item.valor ? 'filter-btn-primary' : 'filter-btn-secondary'}`}
            style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
            aria-pressed={visao === item.valor}
            onClick={() => setVisao(item.valor)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>
      {visao === 'pendencias' && <PendenciasSistema />}
      {visao === 'lancamentos' && <LancamentosCaixa />}
      {visao === 'transferencias' && <Transferencias />}
      {visao === 'sem_conta' && <PagamentosSemConta />}
    </>
  );
}
