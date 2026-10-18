import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as clientesService from '../../services/clientes';
import * as pedidosService from '../../services/pedidos';
import { statusDoPedido } from './pedidosUtils';
import { useConsulta } from './useConsulta';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Pedidos.css';

const ABAS = [
  { valor: 'pendencias', rotulo: 'Pendências' },
  { valor: 'prazos', rotulo: 'Prazos' },
  { valor: 'cancelamentos', rotulo: 'Cancelamentos' },
];

function textoDoPrazo(dias) {
  if (dias === null || dias === undefined) return '—';
  if (dias === 0) return 'Vence hoje';
  const unidade = Math.abs(dias) === 1 ? 'dia' : 'dias';
  return dias < 0 ? `Vencido há ${-dias} ${unidade}` : `Vence em ${dias} ${unidade}`;
}

function SeletorEmpresaDaConsulta({ id, filtros, filtrar }) {
  const alterar = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  return (
    <>
      <label className="filter-label" htmlFor={id}>
        Empresa
      </label>
      <SeletorEmpresa
        id={id}
        className="filter-input pedidos-filtro"
        valor={filtros.empresa}
        onAlterar={alterar}
        apenasAtivas={false}
        selecionarUnica={false}
        placeholder="Todas"
      />
    </>
  );
}

function ResultadoDaConsulta({ consulta, vazio, cabecalho, linha }) {
  const { itens, pagina, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima } = consulta;

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
  if (carregando) return <div className="pedidos-status">Carregando…</div>;
  if (itens.length === 0) return <div className="pedidos-status">{vazio}</div>;

  return (
    <>
      <div className="datagrid-container">
        <table className="datagrid">
          <thead>
            <tr>
              {cabecalho.map((titulo) => (
                <th key={titulo}>{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>{itens.map(linha)}</tbody>
        </table>
      </div>
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
  );
}

function LinkDoPedido({ id, numero }) {
  return <Link to={`/pedidos/${id}`}>{numero}</Link>;
}

function Pendencias() {
  const consulta = useConsulta(pedidosService.listarPendencias, { empresa: '' });
  const nomeCliente = useNomesPorId(
    consulta.itens.map((item) => item.cliente_id),
    clientesService.obterCliente
  );

  return (
    <>
      <div className="pedidos-toolbar-acoes">
        <SeletorEmpresaDaConsulta id="pendencias-empresa" filtros={consulta.filtros} filtrar={consulta.filtrar} />
      </div>
      <span className="pedidos-form-ajuda">
        Um item por linha, ordenado pelo prazo. “Pode cobrir agora” é o que “Reservar pendências” reservaria hoje.
      </span>
      <ResultadoDaConsulta
        consulta={consulta}
        vazio="Nenhuma pendência de entrega."
        cabecalho={[
          'Pedido',
          'Cliente',
          'Produto',
          'Vendido',
          'Entregue',
          'Restante',
          'Programado',
          'Reservado',
          'Falta cobrir',
          'Disponível',
          'Pode cobrir agora',
          'Prazo',
        ]}
        linha={(item) => (
          <tr key={item.pedido_item_id}>
            <td>
              <LinkDoPedido id={item.pedido_id} numero={item.numero} />
            </td>
            <td>{nomeCliente(item.cliente_id)}</td>
            <td>{item.produto_nome}</td>
            <td>{item.vendido}</td>
            <td>{item.entregue}</td>
            <td>{item.restante}</td>
            <td>{item.programado}</td>
            <td>{item.reservado}</td>
            <td className={item.falta_cobrir > 0 ? 'pedidos-alerta' : undefined}>{item.falta_cobrir}</td>
            <td>{item.disponivel_na_empresa}</td>
            <td>{item.pode_cobrir_agora}</td>
            <td>{item.prazo_limite ? formatarData(item.prazo_limite) : '—'}</td>
          </tr>
        )}
      />
    </>
  );
}

function Prazos() {
  const consulta = useConsulta(pedidosService.listarPrazos, { empresa: '', situacao: '', dias: 30 });
  const [dias, setDias] = useState('30');
  const nomeCliente = useNomesPorId(
    consulta.itens.map((item) => item.cliente_id),
    clientesService.obterCliente
  );

  const numeroDeDias = Number(dias);
  const diasValidos = dias.trim() !== '' && Number.isInteger(numeroDeDias) && numeroDeDias >= 0 && numeroDeDias <= 365;

  const alterarDias = (evento) => {
    const valor = evento.target.value;
    setDias(valor);
    const numero = Number(valor);
    if (valor.trim() !== '' && Number.isInteger(numero) && numero >= 0 && numero <= 365) {
      consulta.filtrar({ dias: numero });
    }
  };

  return (
    <>
      <div className="pedidos-toolbar-acoes">
        <SeletorEmpresaDaConsulta id="prazos-empresa" filtros={consulta.filtros} filtrar={consulta.filtrar} />
        <label className="filter-label" htmlFor="prazos-situacao">
          Situação
        </label>
        <select
          id="prazos-situacao"
          className="filter-input pedidos-filtro"
          value={consulta.filtros.situacao}
          onChange={(evento) => consulta.filtrar({ situacao: evento.target.value })}
        >
          <option value="">Vencidos e a vencer</option>
          <option value="vencido">Vencidos</option>
          <option value="a_vencer">A vencer</option>
        </select>
        <label className="filter-label" htmlFor="prazos-dias">
          Dias à frente
        </label>
        <input
          id="prazos-dias"
          className="filter-input pedidos-itens-numero"
          type="number"
          min="0"
          max="365"
          value={dias}
          onChange={alterarDias}
          aria-invalid={!diasValidos || undefined}
        />
      </div>
      {!diasValidos && <span className="pedidos-form-erro">Use de 0 a 365 dias.</span>}
      <span className="pedidos-form-ajuda">Importação sem entrada paga ainda não tem prazo e não aparece aqui.</span>
      <ResultadoDaConsulta
        consulta={consulta}
        vazio="Nenhum pedido com prazo nesta janela."
        cabecalho={['Pedido', 'Cliente', 'Status', 'Prazo limite', 'Situação', 'Valor']}
        linha={(pedido) => {
          const situacao = statusDoPedido(pedido.status);
          return (
            <tr key={pedido.id}>
              <td>
                <LinkDoPedido id={pedido.id} numero={pedido.numero} />
              </td>
              <td>{nomeCliente(pedido.cliente_id)}</td>
              <td>
                <StatusBadge status={situacao.cor} label={situacao.rotulo} />
              </td>
              <td>{pedido.prazo_limite ? formatarData(pedido.prazo_limite) : '—'}</td>
              <td className={pedido.dias_para_o_prazo < 0 ? 'pedidos-alerta' : undefined}>
                {textoDoPrazo(pedido.dias_para_o_prazo)}
              </td>
              <td>{formatarMoeda(pedido.valor_total_centavos)}</td>
            </tr>
          );
        }}
      />
    </>
  );
}

function Cancelamentos() {
  const consulta = useConsulta(pedidosService.listarCancelamentos, {
    empresa: '',
    comDevolucao: false,
    de: '',
    ate: '',
  });
  const nomeCliente = useNomesPorId(
    consulta.itens.map((item) => item.cliente_id),
    clientesService.obterCliente
  );

  return (
    <>
      <div className="pedidos-toolbar-acoes">
        <SeletorEmpresaDaConsulta id="cancelamentos-empresa" filtros={consulta.filtros} filtrar={consulta.filtrar} />
        <label className="filter-label" htmlFor="cancelamentos-de">
          De
        </label>
        <input
          id="cancelamentos-de"
          className="filter-input pedidos-filtro"
          type="date"
          value={consulta.filtros.de}
          onChange={(evento) => consulta.filtrar({ de: evento.target.value })}
        />
        <label className="filter-label" htmlFor="cancelamentos-ate">
          Até
        </label>
        <input
          id="cancelamentos-ate"
          className="filter-input pedidos-filtro"
          type="date"
          value={consulta.filtros.ate}
          onChange={(evento) => consulta.filtrar({ ate: evento.target.value })}
        />
        <label className="filter-label pedidos-checkbox" htmlFor="cancelamentos-devolucao">
          <input
            id="cancelamentos-devolucao"
            type="checkbox"
            checked={consulta.filtros.comDevolucao}
            onChange={(evento) => consulta.filtrar({ comDevolucao: evento.target.checked })}
          />
          Só com valor a devolver
        </label>
      </div>
      <ResultadoDaConsulta
        consulta={consulta}
        vazio="Nenhum pedido cancelado."
        cabecalho={['Pedido', 'Cliente', 'Cancelado em', 'Motivo', 'Valor', 'Entrada paga', 'A devolver']}
        linha={(pedido) => (
          <tr key={pedido.id}>
            <td>
              <LinkDoPedido id={pedido.id} numero={pedido.numero} />
            </td>
            <td>{nomeCliente(pedido.cliente_id)}</td>
            <td>{formatarData(pedido.atualizado_em)}</td>
            <td className="pedidos-entrega-itens">{pedido.cancelado_motivo || '—'}</td>
            <td>{formatarMoeda(pedido.valor_total_centavos)}</td>
            <td>{pedido.entrada_paga_centavos ? formatarMoeda(pedido.entrada_paga_centavos) : '—'}</td>
            <td>{pedido.valor_a_devolver_centavos ? formatarMoeda(pedido.valor_a_devolver_centavos) : '—'}</td>
          </tr>
        )}
      />
    </>
  );
}

export default function ConsultasPedidos() {
  const [aba, setAba] = useState('pendencias');

  return (
    <div className="pedidos-container">
      <div className="pedidos-toolbar">
        <div className="pedidos-toolbar-titulo">Consultas de pedidos</div>
        <div className="pedidos-abas" role="tablist" aria-label="Consultas de pedidos">
          {ABAS.map((item) => (
            <button
              key={item.valor}
              type="button"
              role="tab"
              id={`aba-${item.valor}`}
              aria-selected={aba === item.valor}
              aria-controls="painel-consulta"
              className={`pedidos-aba ${aba === item.valor ? 'pedidos-aba-ativa' : ''}`}
              onClick={() => setAba(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div id="painel-consulta" role="tabpanel" aria-labelledby={`aba-${aba}`} className="pedidos-consulta">
        {aba === 'pendencias' && <Pendencias />}
        {aba === 'prazos' && <Prazos />}
        {aba === 'cancelamentos' && <Cancelamentos />}
      </div>
    </div>
  );
}
