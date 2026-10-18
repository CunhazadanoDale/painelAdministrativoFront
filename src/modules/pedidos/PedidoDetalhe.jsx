import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as produtosService from '../../services/produtos';
import { useCadastrosCliente } from '../clientes/useCadastrosCliente';
import {
  CancelarPedidoModal,
  ConfirmarPedidoModal,
  RegistrarEntradaModal,
  ReservarPendenciasModal,
} from './AcoesDoPedido';
import {
  descricaoDaCondicao,
  rotuloAcaoHistorico,
  rotuloModelo,
  statusDoPedido,
} from './pedidosUtils';
import { PropostaFormModal } from './PropostaFormModal';
import { usePedidoDetalhe } from './usePedidoDetalhe';
import { usePedidoHistorico } from './usePedidoHistorico';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Pedidos.css';

const ABERTOS = ['confirmado', 'parcialmente_entregue'];
const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px' };

function HistoricoDoPedido({ pedidoId, geracao }) {
  const { eventos, carregando, erro, recarregar } = usePedidoHistorico(pedidoId, geracao);

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (carregando && eventos.length === 0) return <div className="pedidos-secundario">Carregando histórico…</div>;
  if (eventos.length === 0) return <div className="pedidos-secundario">Sem eventos.</div>;

  return (
    <ul className="pedidos-historico">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <span className="pedidos-historico-data">{formatarDataHora(evento.criado_em)}</span>
          <span>{rotuloAcaoHistorico(evento.acao)}</span>
          {evento.detalhe && <span className="pedidos-secundario">{evento.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const { comercial, financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const { representantes, nomeRepresentante } = useCadastrosCliente(comercial);
  const {
    pedido,
    carregando,
    erro,
    geracao,
    recarregar,
    atualizar,
    confirmar,
    reservarPendencias,
    registrarEntrada,
    cancelar,
  } = usePedidoDetalhe(id);
  const nomeCliente = useNomesPorId([pedido?.cliente_id], clientesService.obterCliente);
  const nomeObra = useNomesPorId([pedido?.obra_id], clientesService.obterObra);
  const nomeProduto = useNomesPorId(
    (pedido?.itens ?? []).map((item) => item.produto_id),
    produtosService.obterProduto
  );
  const [acao, setAcao] = useState(null);

  const voltar = (
    <Link className="pedidos-voltar" to="/pedidos">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="pedidos-detalhe">
        {voltar}
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (carregando && !pedido) return <div className="pedidos-status">Carregando pedido…</div>;
  if (!pedido) return null;

  const situacao = statusDoPedido(pedido.status);
  const proposta = pedido.status === 'proposta';
  const aberto = ABERTOS.includes(pedido.status);
  const faltaCobrir = (pedido.itens ?? []).some((item) => (item.falta_cobrir ?? 0) > 0);
  const podeEntrada = financeiro && pedido.modelo === 'importacao' && aberto && !pedido.entrada_paga_em;
  const fechar = () => setAcao(null);

  const dados = [
    ['Empresa', nomeEmpresa(pedido.empresa_id)],
    ['Cliente', <Link key="cliente" to={`/clientes/${pedido.cliente_id}`}>{nomeCliente(pedido.cliente_id)}</Link>],
    ['Obra', pedido.obra_id ? nomeObra(pedido.obra_id) : '—'],
    ['Representante', nomeRepresentante(pedido.representante_id)],
    ['Modelo', rotuloModelo(pedido.modelo)],
    ['Condição', descricaoDaCondicao(pedido.condicao)],
    ['Prazo limite', pedido.prazo_limite ? formatarData(pedido.prazo_limite) : '—'],
    ['Pedido do cliente', pedido.numero_pedido_cliente || '—'],
  ];
  if (pedido.modelo === 'importacao') {
    dados.push([
      'Entrada paga',
      pedido.entrada_paga_em
        ? `${formatarMoeda(pedido.entrada_paga_centavos)} em ${formatarData(pedido.entrada_paga_em)}`
        : 'Ainda não registrada',
    ]);
  }
  if (pedido.status === 'cancelado') {
    dados.push(['Motivo do cancelamento', pedido.cancelado_motivo || '—']);
    if (pedido.valor_a_devolver_centavos) {
      dados.push(['Valor a devolver', formatarMoeda(pedido.valor_a_devolver_centavos)]);
    }
  }

  return (
    <div className="pedidos-detalhe">
      {voltar}

      <div className="pedidos-toolbar">
        <div className="pedidos-detalhe-titulo">
          <h1 className="pedidos-toolbar-titulo">Pedido {pedido.numero}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
        </div>
        <div className="pedidos-toolbar-acoes">
          {comercial && proposta && (
            <>
              <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('editar')}>
                Editar proposta
              </button>
              <button type="button" className="filter-btn filter-btn-primary" style={BOTAO} onClick={() => setAcao('confirmar')}>
                Confirmar
              </button>
            </>
          )}
          {comercial && aberto && faltaCobrir && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('reservar')}>
              Reservar pendências
            </button>
          )}
          {podeEntrada && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('entrada')}>
              Registrar entrada
            </button>
          )}
          {comercial && (proposta || aberto) && (
            <button type="button" className="filter-btn pedidos-perigo" style={BOTAO} onClick={() => setAcao('cancelar')}>
              Cancelar pedido
            </button>
          )}
        </div>
      </div>

      <div className="pedidos-detalhe-paineis">
        <Panel title="Dados do pedido">
          <dl className="pedidos-detalhe-lista">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          {pedido.observacoes && <p className="pedidos-detalhe-observacoes">{pedido.observacoes}</p>}
        </Panel>

        <Panel title="Histórico">
          <HistoricoDoPedido pedidoId={pedido.id} geracao={geracao} />
        </Panel>
      </div>

      <Panel title="Itens">
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Subtotal</th>
                <th>Entregue</th>
                <th>Restante</th>
                <th>Reservado</th>
                <th>Falta cobrir</th>
              </tr>
            </thead>
            <tbody>
              {(pedido.itens ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{nomeProduto(item.produto_id)}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatarMoeda(item.preco_unitario_centavos)}</td>
                  <td>{formatarMoeda(item.subtotal_centavos)}</td>
                  <td>{item.quantidade_entregue}</td>
                  <td>{item.restante}</td>
                  <td>{item.reservado ?? '—'}</td>
                  <td className={item.falta_cobrir > 0 ? 'pedidos-alerta' : undefined}>{item.falta_cobrir ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pedidos-itens-total">
          Total: <strong>{formatarMoeda(pedido.valor_total_centavos)}</strong>
        </div>
      </Panel>

      {acao === 'editar' && (
        <PropostaFormModal
          pedido={pedido}
          representantes={representantes}
          nomeCliente={nomeCliente}
          nomeProduto={nomeProduto}
          nomeEmpresa={nomeEmpresa}
          onFechar={fechar}
          onSalvar={atualizar}
        />
      )}
      {acao === 'confirmar' && (
        <ConfirmarPedidoModal pedido={pedido} onConfirmar={confirmar} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'reservar' && (
        <ReservarPendenciasModal
          pedido={pedido}
          onConfirmar={reservarPendencias}
          onFechar={fechar}
          onRecarregar={recarregar}
        />
      )}
      {acao === 'entrada' && (
        <RegistrarEntradaModal pedido={pedido} onConfirmar={registrarEntrada} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'cancelar' && (
        <CancelarPedidoModal pedido={pedido} onConfirmar={cancelar} onFechar={fechar} onRecarregar={recarregar} />
      )}
    </div>
  );
}
