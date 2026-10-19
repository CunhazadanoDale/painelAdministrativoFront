import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import { ORIGENS_TITULO, STATUS_TITULO, numeroDoTitulo, rotuloOrigemTitulo, statusDoTitulo, textoDoSaldo } from './receberUtils';
import { TituloFormModal } from './TituloFormModal';
import { useTitulos } from './useTitulos';
import { AlertCircle, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';
import './Receber.css';

const buscarClientes = (texto, sinal) =>
  clientesService.listarClientes({ busca: texto, tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeCliente = (cliente) => ({ valor: cliente.id, rotulo: cliente.nome });

function FiltrosTitulos({ filtros, filtrar, limparFiltros, nomeCliente }) {
  const [vencimento, setVencimento] = useState({ de: filtros.vencimento_de, ate: filtros.vencimento_ate });
  const intervaloInvalido = vencimento.de && vencimento.ate && vencimento.ate < vencimento.de;

  const alterarVencimento = (campo) => (evento) => {
    const novo = { ...vencimento, [campo]: evento.target.value };
    setVencimento(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ vencimento_de: novo.de, vencimento_ate: novo.ate });
  };

  const limpar = () => {
    setVencimento({ de: '', ate: '' });
    limparFiltros();
  };

  return (
    <div className="receber-filtros-extras">
      <div className="receber-filtro-campo">
        <label className="filter-label" htmlFor="titulos-cliente">
          Cliente
        </label>
        <BuscaRemota
          id="titulos-cliente"
          nomeBusca="cliente do filtro"
          valor={filtros.cliente}
          rotuloAtual={nomeCliente(filtros.cliente)}
          buscar={buscarClientes}
          opcaoDe={opcaoDeCliente}
          onEscolher={(cliente) => filtrar({ cliente: cliente ? cliente.id : '' })}
          placeholderBusca="Nome ou documento"
        />
      </div>
      <div className="receber-filtro-campo">
        <label className="filter-label" htmlFor="titulos-vencimento-de">
          Vencimento de
        </label>
        <input
          id="titulos-vencimento-de"
          className="filter-input"
          type="date"
          value={vencimento.de}
          onChange={alterarVencimento('de')}
        />
      </div>
      <div className="receber-filtro-campo">
        <label className="filter-label" htmlFor="titulos-vencimento-ate">
          Vencimento até
        </label>
        <input
          id="titulos-vencimento-ate"
          className="filter-input"
          type="date"
          value={vencimento.ate}
          onChange={alterarVencimento('ate')}
          aria-invalid={intervaloInvalido || undefined}
        />
      </div>
      <button
        type="button"
        className="filter-btn filter-btn-secondary"
        style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
        onClick={limpar}
      >
        Limpar filtros
      </button>
      {intervaloInvalido && <span className="receber-form-erro">O vencimento final não pode ser antes do inicial.</span>}
    </div>
  );
}

export default function Titulos() {
  const nomeEmpresa = useNomesEmpresas();
  const {
    titulos,
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
    limparFiltros,
    criar,
  } = useTitulos();
  const nomeCliente = useNomesPorId(
    [...titulos.map((titulo) => titulo.cliente_id), filtros.cliente],
    clientesService.obterCliente
  );

  const [novoAberto, setNovoAberto] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const colunas = [
    {
      label: 'Número',
      field: 'numero',
      width: '10%',
      render: (_, titulo) => <Link to={`/titulos-receber/${titulo.id}`}>{numeroDoTitulo(titulo)}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Cliente', field: 'cliente_id', width: '22%', render: (clienteId) => nomeCliente(clienteId) },
    {
      label: 'Vencimento',
      field: 'vencimento',
      width: '14%',
      render: (vencimento, titulo) => (
        <span className="receber-celula">
          {formatarData(vencimento)}
          {titulo.vencido && <StatusBadge status="danger" label="Vencido" />}
        </span>
      ),
    },
    { label: 'Saldo', field: 'saldo_centavos', width: '18%', render: (_, titulo) => textoDoSaldo(titulo) },
    {
      label: 'Status',
      field: 'status',
      width: '12%',
      render: (status) => {
        const situacao = statusDoTitulo(status);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    { label: 'Origem', field: 'origem', width: '12%', render: (origem) => rotuloOrigemTitulo(origem) },
  ];

  return (
    <div className="receber-container">
      <div className="receber-toolbar">
        <div className="receber-toolbar-titulo">Contas a receber</div>
        <div className="receber-toolbar-acoes">
          <label className="filter-label" htmlFor="titulos-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="titulos-empresa"
            className="filter-input receber-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="titulos-status">
            Status
          </label>
          <select
            id="titulos-status"
            className="filter-input receber-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_TITULO.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="titulos-origem">
            Origem
          </label>
          <select
            id="titulos-origem"
            className="filter-input receber-filtro"
            value={filtros.origem}
            onChange={(evento) => filtrar({ origem: evento.target.value })}
          >
            <option value="">Todas</option>
            {ORIGENS_TITULO.map((origem) => (
              <option key={origem.valor} value={origem.valor}>
                {origem.rotulo}
              </option>
            ))}
          </select>
          <label className="receber-checkbox" htmlFor="titulos-vencidos">
            <input
              id="titulos-vencidos"
              type="checkbox"
              checked={filtros.vencidos}
              onChange={(evento) => filtrar({ vencidos: evento.target.checked })}
            />
            Só vencidos
          </label>
          <label className="receber-checkbox" htmlFor="titulos-origem-cancelada">
            <input
              id="titulos-origem-cancelada"
              type="checkbox"
              checked={filtros.origemCancelada}
              onChange={(evento) => filtrar({ origemCancelada: evento.target.checked })}
            />
            Origem cancelada
          </label>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((atual) => !atual)}
          >
            <Filter size={14} /> Mais filtros
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setNovoAberto(true)}
          >
            <Plus size={16} /> Novo Título
          </button>
        </div>
      </div>

      {filtrosAbertos && (
        <FiltrosTitulos filtros={filtros} filtrar={filtrar} limparFiltros={limparFiltros} nomeCliente={nomeCliente} />
      )}

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
          <div className="receber-status">Carregando títulos…</div>
        ) : titulos.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'titulos'} columns={colunas} data={titulos} selectable={false} />
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
            {filtrando ? 'Nenhum título encontrado com estes filtros.' : 'Nenhum título a receber nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {novoAberto && <TituloFormModal onFechar={() => setNovoAberto(false)} onSalvar={criar} />}
    </div>
  );
}
