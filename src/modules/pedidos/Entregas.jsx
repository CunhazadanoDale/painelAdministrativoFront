import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesLocais } from '../../app/estoque/useNomesLocais';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData } from '../../lib/formatar';
import * as pedidosService from '../../services/pedidos';
import { STATUS_ENTREGA, STATUS_ENTREGA_LISTA, textoDoFrete } from './pedidosUtils';
import { useEntregas } from './useEntregas';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import './Pedidos.css';

const numeroDoPedido = (pedido) => (pedido ? `Pedido ${pedido.numero}` : null);

function resumoDosItens(itens) {
  const unidades = itens.reduce((soma, item) => soma + item.quantidade, 0);
  return `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}, ${unidades} unidades`;
}

function andamento(entrega) {
  if (entrega.entregue_em) return `Entregue em ${formatarData(entrega.entregue_em)}`;
  if (entrega.saiu_em) return `Saiu em ${formatarData(entrega.saiu_em)}`;
  return '—';
}

export default function Entregas() {
  const nomeLocal = useNomesLocais();
  const {
    entregas,
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
  } = useEntregas();
  const nomePedido = useNomesPorId(
    entregas.map((entrega) => entrega.pedido_id),
    pedidosService.obterPedido,
    numeroDoPedido
  );

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const colunas = [
    {
      label: 'Status',
      field: 'status',
      width: '12%',
      render: (status) => {
        const situacao = STATUS_ENTREGA[status] ?? { rotulo: status, cor: 'neutral' };
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    {
      label: 'Pedido',
      field: 'pedido_id',
      width: '12%',
      render: (pedidoId) => <Link to={`/pedidos/${pedidoId}`}>{nomePedido(pedidoId)}</Link>,
    },
    { label: 'Itens', field: 'itens', width: '16%', render: (itens) => resumoDosItens(itens) },
    {
      label: 'Locais',
      field: 'id',
      width: '16%',
      render: (_, entrega) => [...new Set(entrega.itens.map((item) => nomeLocal(item.local_id)))].join(', '),
    },
    { label: 'Transportadora', field: 'transportadora', width: '14%', render: (valor) => valor || '—' },
    { label: 'Frete', field: 'frete_tipo', width: '12%', render: (_, entrega) => textoDoFrete(entrega) },
    { label: 'Previsão', field: 'previsao', width: '9%', render: (valor) => (valor ? formatarData(valor) : '—') },
    { label: 'Andamento', field: 'saiu_em', width: '14%', render: (_, entrega) => andamento(entrega) },
  ];

  return (
    <div className="pedidos-container">
      <div className="pedidos-toolbar">
        <div className="pedidos-toolbar-titulo">Entregas</div>
        <div className="pedidos-toolbar-acoes">
          <label className="filter-label" htmlFor="entregas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="entregas-empresa"
            className="filter-input pedidos-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="entregas-status">
            Status
          </label>
          <select
            id="entregas-status"
            className="filter-input pedidos-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_ENTREGA_LISTA.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="entregas-previsao">
            Previsão até
          </label>
          <input
            id="entregas-previsao"
            className="filter-input pedidos-filtro"
            type="date"
            value={filtros.previsao_ate}
            onChange={(evento) => filtrar({ previsao_ate: evento.target.value })}
          />
        </div>
      </div>

      <span className="pedidos-form-ajuda">
        Para programar, dar saída ou concluir uma entrega, abra o pedido dela.
      </span>

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
          <div className="pedidos-status">Carregando entregas…</div>
        ) : entregas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'entregas'} columns={colunas} data={entregas} selectable={false} />
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
            {filtrando ? 'Nenhuma entrega encontrada com estes filtros.' : 'Nenhuma entrega nas empresas do seu acesso.'}
          </div>
        )}
      </div>
    </div>
  );
}
