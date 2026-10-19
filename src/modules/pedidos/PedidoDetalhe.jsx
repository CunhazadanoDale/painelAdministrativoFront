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
  GerarTituloEntradaModal,
  RegistrarEntradaModal,
  ReservarPendenciasModal,
} from './AcoesDoPedido';
import {
  descricaoDaCondicao,
  rotuloAcaoHistorico,
  rotuloModelo,
  statusDoPedido,
} from './pedidosUtils';
import { EntregasDoPedido } from './EntregasDoPedido';
import { PropostaFormModal } from './PropostaFormModal';
import { usePedidoDetalhe } from './usePedidoDetalhe';
import { usePedidoHistorico } from './usePedidoHistorico';
import { useTituloDeEntrada } from './useTituloDeEntrada';
import { numeroDoTitulo, statusDoTitulo } from '../receber/receberUtils';
import { ComissaoDoPedido } from '../comissoes/ComissaoDoPedido';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Pedidos.css';

const ABERTOS = ['confirmado', 'parcialmente_entregue'];

function textoDoFreteEstimado(pedido) {
  const tipo = pedido.frete_tipo.toUpperCase();
  return pedido.frete_estimado_centavos ? `${tipo}, estimado em ${formatarMoeda(pedido.frete_estimado_centavos)}` : tipo;
}

function textoDoDescontoDoItem(item) {
  const desconto = item.desconto_unitario_centavos;
  if (!desconto) return '—';
  return desconto > 0 ? formatarMoeda(desconto) : `${formatarMoeda(-desconto)} acima`;
}
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
    gerarTituloEntrada,
    cancelar,
  } = usePedidoDetalhe(id);
  const nomeCliente = useNomesPorId([pedido?.cliente_id], clientesService.obterCliente);
  const nomeObra = useNomesPorId([pedido?.obra_id], clientesService.obterObra);
  const nomeProduto = useNomesPorId(
    (pedido?.itens ?? []).map((item) => item.produto_id),
    produtosService.obterProduto
  );
  const [acao, setAcao] = useState(null);
  const consultaEntrada = !!financeiro && pedido?.modelo === 'importacao';
  const tituloEntrada = useTituloDeEntrada(id, consultaEntrada, geracao);

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
  const podeGerarTitulo =
    podeEntrada && !tituloEntrada.titulo && !tituloEntrada.carregando && !tituloEntrada.erro;

  const dados = [
    ...(proposta
      ? [
          ['Identificação', `Proposta ${pedido.numero}-R${pedido.revisao ?? 1}`],
          [
            'Validade',
            <span key="validade" className="pedidos-titulo-entrada">
              {formatarData(pedido.validade)}
              {pedido.vencida && <StatusBadge status="danger" label="Vencida" />}
            </span>,
          ],
        ]
      : []),
    ['Empresa', nomeEmpresa(pedido.empresa_id)],
    ['Cliente', <Link key="cliente" to={`/clientes/${pedido.cliente_id}`}>{nomeCliente(pedido.cliente_id)}</Link>],
    ['Obra', pedido.obra_id ? nomeObra(pedido.obra_id) : '—'],
    ['Representante', nomeRepresentante(pedido.representante_id)],
    ['Modelo', rotuloModelo(pedido.modelo)],
    ['Condição', descricaoDaCondicao(pedido.condicao)],
    ...(pedido.frete_tipo ? [['Frete estimado', textoDoFreteEstimado(pedido)]] : []),
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
  if (consultaEntrada) {
    const situacaoTitulo = tituloEntrada.titulo ? statusDoTitulo(tituloEntrada.titulo.status) : null;
    dados.push([
      'Título de entrada',
      tituloEntrada.erro ? (
        tituloEntrada.erro
      ) : tituloEntrada.carregando ? (
        'Consultando…'
      ) : tituloEntrada.titulo ? (
        <span key="titulo-entrada" className="pedidos-titulo-entrada">
          <Link to={`/titulos-receber/${tituloEntrada.titulo.id}`}>{numeroDoTitulo(tituloEntrada.titulo)}</Link>
          <StatusBadge status={situacaoTitulo.cor} label={situacaoTitulo.rotulo} />
        </span>
      ) : (
        'Não gerado'
      ),
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
          <Link className="filter-btn filter-btn-secondary pedidos-link-botao" style={BOTAO} to={`/pedidos/${pedido.id}/proposta`}>
            {proposta ? 'Imprimir proposta' : 'Imprimir pedido'}
          </Link>
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
          {podeGerarTitulo && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('titulo-entrada')}>
              Gerar título de entrada
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

      {(comercial || financeiro) && pedido.representante_id && (
        <Panel title="Comissão do representante">
          <ComissaoDoPedido pedido={pedido} comercial={comercial} geracao={geracao} />
        </Panel>
      )}

      <Panel title="Itens">
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Tabela</th>
                <th>Desconto</th>
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
                  <td>{item.preco_tabela_centavos ? formatarMoeda(item.preco_tabela_centavos) : '—'}</td>
                  <td>{textoDoDescontoDoItem(item)}</td>
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

      <Panel title="Entregas">
        <EntregasDoPedido
          pedido={pedido}
          comercial={comercial}
          geracao={geracao}
          nomeProduto={nomeProduto}
          onAlterou={recarregar}
        />
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
      {acao === 'titulo-entrada' && (
        <GerarTituloEntradaModal
          pedido={pedido}
          onConfirmar={gerarTituloEntrada}
          onFechar={fechar}
          onRecarregar={recarregar}
        />
      )}
      {acao === 'cancelar' && (
        <CancelarPedidoModal pedido={pedido} onConfirmar={cancelar} onFechar={fechar} onRecarregar={recarregar} />
      )}
    </div>
  );
}
