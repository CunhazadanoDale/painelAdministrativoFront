import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as produtosService from '../../services/produtos';
import { useCadastrosCliente } from '../clientes/useCadastrosCliente';
import { MODELOS, STATUS_PEDIDO, rotuloModelo, statusDoPedido } from './pedidosUtils';
import { PropostaFormModal } from './PropostaFormModal';
import { usePedidos } from './usePedidos';
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import './Pedidos.css';

export default function Pedidos() {
  const { comercial } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const { representantes } = useCadastrosCliente(comercial);
  const {
    pedidos,
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
  } = usePedidos();
  const nomeCliente = useNomesPorId(
    pedidos.map((pedido) => pedido.cliente_id),
    clientesService.obterCliente
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

  const colunas = [
    {
      label: 'Nº',
      field: 'numero',
      width: '8%',
      render: (numero, pedido) => <Link to={`/pedidos/${pedido.id}`}>{numero}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '14%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Cliente', field: 'cliente_id', width: '26%', render: (clienteId) => nomeCliente(clienteId) },
    { label: 'Modelo', field: 'modelo', width: '12%', render: (modelo) => rotuloModelo(modelo) },
    {
      label: 'Status',
      field: 'status',
      width: '16%',
      render: (status) => {
        const situacao = statusDoPedido(status);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    { label: 'Valor', field: 'valor_total_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Prazo',
      field: 'prazo_limite',
      width: '12%',
      render: (prazo) => (prazo ? formatarData(prazo) : '—'),
    },
  ];

  return (
    <div className="pedidos-container">
      <div className="pedidos-toolbar">
        <div className="pedidos-toolbar-titulo">Pedidos</div>
        <div className="pedidos-toolbar-acoes">
          <form className="pedidos-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              inputMode="numeric"
              className="filter-input"
              aria-label="Buscar pelo número"
              placeholder="Número"
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
          <label className="filter-label" htmlFor="pedidos-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="pedidos-empresa"
            className="filter-input pedidos-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="pedidos-status">
            Status
          </label>
          <select
            id="pedidos-status"
            className="filter-input pedidos-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_PEDIDO.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="pedidos-modelo">
            Modelo
          </label>
          <select
            id="pedidos-modelo"
            className="filter-input pedidos-filtro"
            value={filtros.modelo}
            onChange={(evento) => filtrar({ modelo: evento.target.value })}
          >
            <option value="">Todos</option>
            {MODELOS.map((modelo) => (
              <option key={modelo.valor} value={modelo.valor}>
                {modelo.rotulo}
              </option>
            ))}
          </select>
          {comercial && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setNovaAberta(true)}
            >
              <Plus size={16} /> Nova Proposta
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

      <div className="pedidos-conteudo">
        {carregando ? (
          <div className="pedidos-status">Carregando pedidos…</div>
        ) : pedidos.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'pedidos'} columns={colunas} data={pedidos} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="pedidos-paginacao">
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
                <span className="pedidos-paginacao-texto">Página {pagina}</span>
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
          <div className="pedidos-status">
            {filtrando ? 'Nenhum pedido encontrado com estes filtros.' : 'Nenhum pedido nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {novaAberta && (
        <PropostaFormModal
          representantes={representantes}
          nomeCliente={nomeCliente}
          nomeProduto={nomeProduto}
          nomeEmpresa={nomeEmpresa}
          onFechar={() => setNovaAberta(false)}
          onSalvar={criar}
        />
      )}
    </div>
  );
}
