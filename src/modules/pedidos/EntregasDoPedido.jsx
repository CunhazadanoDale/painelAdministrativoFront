import React, { useState } from 'react';
import { SeletorLocal } from '../../app/components/SeletorLocal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesLocais } from '../../app/estoque/useNomesLocais';
import { formatarData, paraCentavos } from '../../lib/formatar';
import * as pedidosService from '../../services/pedidos';
import { AcaoPedidoModal } from './AcaoPedidoModal';
import { STATUS_ENTREGA, dataParaCampo, hojeEmBrasilia, textoDoFrete } from './pedidosUtils';
import { useEntregasDoPedido } from './useEntregasDoPedido';
import { AlertCircle, Plus } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Pedidos.css';

const ABERTOS = ['confirmado', 'parcialmente_entregue'];

function programavelPorItem(pedido, entregas) {
  const programado = {};
  entregas
    .filter((entrega) => entrega.status === 'pendente')
    .forEach((entrega) =>
      entrega.itens.forEach((item) => {
        programado[item.pedido_item_id] = (programado[item.pedido_item_id] ?? 0) + item.quantidade;
      })
    );
  return (pedido.itens ?? [])
    .map((item) => ({ ...item, programavel: item.restante - (programado[item.id] ?? 0) }))
    .filter((item) => item.programavel > 0);
}

function ProgramarEntregaModal({ pedido, itens, nomeProduto, onFechar, onAlterou }) {
  const [frete, setFrete] = useState({ tipo: 'cif', valor: '', transportadora: '', previsao: '' });
  const [linhas, setLinhas] = useState(() =>
    Object.fromEntries(itens.map((item) => [item.id, { quantidade: '', local_id: '' }]))
  );

  const alterarLinha = (itemId, mudancas) =>
    setLinhas((atual) => ({ ...atual, [itemId]: { ...atual[itemId], ...mudancas } }));

  const escolhidos = () => itens.filter((item) => linhas[item.id].quantidade.trim());

  const validar = () => {
    const erros = [];
    const lista = escolhidos();
    if (lista.length === 0) erros.push('Informe a quantidade de pelo menos um item.');
    lista.forEach((item) => {
      const nome = nomeProduto(item.produto_id);
      const quantidade = Number(linhas[item.id].quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) erros.push(`${nome}: quantidade inteira maior que zero.`);
      else if (quantidade > item.programavel) erros.push(`${nome}: no máximo ${item.programavel}.`);
      if (!linhas[item.id].local_id) erros.push(`${nome}: escolha o local de saída.`);
    });
    if (frete.tipo === 'cif' && !frete.valor.trim()) erros.push('Informe o valor do frete CIF.');
    if (frete.valor.trim()) {
      const centavos = paraCentavos(frete.valor);
      if (!Number.isFinite(centavos) || centavos < 0) erros.push('Valor do frete inválido.');
    }
    return erros;
  };

  const confirmar = async () => {
    await pedidosService.criarEntrega(pedido.id, {
      transportadora: frete.transportadora.trim() || null,
      frete_tipo: frete.tipo,
      frete_centavos: frete.valor.trim() ? paraCentavos(frete.valor) : null,
      previsao: frete.previsao || null,
      itens: escolhidos().map((item) => ({
        pedido_item_id: item.id,
        local_id: linhas[item.id].local_id,
        quantidade: Number(linhas[item.id].quantidade),
      })),
    });
    onAlterou();
  };

  return (
    <AcaoPedidoModal
      titulo={`Programar entrega do pedido ${pedido.numero}`}
      rotuloConfirmar="Programar"
      largura="760px"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onAlterou}
    >
      <p className="pedidos-texto">
        Programar não mexe no estoque: a baixa acontece quando a entrega sai. Só locais da empresa do pedido.
      </p>
      <div className="pedidos-form-linha">
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrega-frete-tipo">
            Frete *
          </label>
          <select
            id="entrega-frete-tipo"
            className="filter-input"
            value={frete.tipo}
            onChange={(evento) => setFrete((atual) => ({ ...atual, tipo: evento.target.value }))}
          >
            <option value="cif">CIF (por nossa conta)</option>
            <option value="fob">FOB (por conta do cliente)</option>
          </select>
        </div>
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrega-frete-valor">
            Valor do frete
          </label>
          <input
            id="entrega-frete-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            placeholder={frete.tipo === 'cif' ? 'Obrigatório no CIF' : 'Opcional no FOB'}
            value={frete.valor}
            onChange={(evento) => setFrete((atual) => ({ ...atual, valor: evento.target.value }))}
          />
        </div>
      </div>
      <div className="pedidos-form-linha">
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrega-transportadora">
            Transportadora
          </label>
          <input
            id="entrega-transportadora"
            className="filter-input"
            type="text"
            maxLength={160}
            value={frete.transportadora}
            onChange={(evento) => setFrete((atual) => ({ ...atual, transportadora: evento.target.value }))}
          />
        </div>
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrega-previsao">
            Previsão
          </label>
          <input
            id="entrega-previsao"
            className="filter-input"
            type="date"
            value={frete.previsao}
            onChange={(evento) => setFrete((atual) => ({ ...atual, previsao: evento.target.value }))}
          />
        </div>
      </div>
      <div className="datagrid-container">
        <table className="datagrid">
          <thead>
            <tr>
              <th>Produto</th>
              <th>A programar</th>
              <th>Quantidade</th>
              <th>Local de saída</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const nome = nomeProduto(item.produto_id);
              return (
                <tr key={item.id}>
                  <td>{nome}</td>
                  <td>{`até ${item.programavel}`}</td>
                  <td>
                    <input
                      className="filter-input pedidos-itens-numero"
                      type="number"
                      min="1"
                      max={item.programavel}
                      step="1"
                      aria-label={`Quantidade de ${nome}`}
                      value={linhas[item.id].quantidade}
                      onChange={(evento) => alterarLinha(item.id, { quantidade: evento.target.value })}
                    />
                  </td>
                  <td>
                    <label className="pedidos-oculto" htmlFor={`entrega-local-${item.id}`}>
                      {`Local de ${nome}`}
                    </label>
                    <SeletorLocal
                      id={`entrega-local-${item.id}`}
                      className="filter-input"
                      empresaId={pedido.empresa_id}
                      apenasAtivos={false}
                      selecionarUnica={false}
                      valor={linhas[item.id].local_id}
                      onAlterar={(localId) => alterarLinha(item.id, { local_id: localId })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AcaoPedidoModal>
  );
}

function SaidaModal({ entrega, onFechar, onAlterou }) {
  const [data, setData] = useState(hojeEmBrasilia());

  const validar = () => {
    if (!data) return 'Informe a data da saída.';
    if (data > hojeEmBrasilia()) return 'A data da saída não pode estar no futuro.';
    return null;
  };

  return (
    <AcaoPedidoModal
      titulo="Dar saída na entrega"
      rotuloConfirmar="Dar saída"
      validar={validar}
      onConfirmar={async () => {
        await pedidosService.marcarSaida(entrega.id, { versao: entrega.versao, saiu_em: data });
        onAlterou();
      }}
      onFechar={onFechar}
      onRecarregar={onAlterou}
    >
      <p className="pedidos-texto">
        A saída baixa o estoque de cada item no local escolhido, consumindo a reserva do pedido. Sem disponível no local,
        a saída é recusada.
      </p>
      <div className="pedidos-form-campo">
        <label className="filter-label" htmlFor="saida-data">
          Saiu em *
        </label>
        <input
          id="saida-data"
          className="filter-input"
          type="date"
          max={hojeEmBrasilia()}
          value={data}
          onChange={(evento) => setData(evento.target.value)}
        />
      </div>
    </AcaoPedidoModal>
  );
}

function EntregueModal({ entrega, onFechar, onAlterou }) {
  const [data, setData] = useState(hojeEmBrasilia());
  const saiuEm = dataParaCampo(entrega.saiu_em);

  const validar = () => {
    if (!data) return 'Informe a data da entrega.';
    if (data > hojeEmBrasilia()) return 'A data da entrega não pode estar no futuro.';
    if (saiuEm && data < saiuEm) return `A entrega não pode ser antes da saída (${formatarData(entrega.saiu_em)}).`;
    return null;
  };

  return (
    <AcaoPedidoModal
      titulo="Marcar entrega como entregue"
      rotuloConfirmar="Marcar entregue"
      validar={validar}
      onConfirmar={async () => {
        await pedidosService.marcarEntregue(entrega.id, { versao: entrega.versao, entregue_em: data });
        onAlterou();
      }}
      onFechar={onFechar}
      onRecarregar={onAlterou}
    >
      <div className="pedidos-form-campo">
        <label className="filter-label" htmlFor="entregue-data">
          Entregue em *
        </label>
        <input
          id="entregue-data"
          className="filter-input"
          type="date"
          min={saiuEm || undefined}
          max={hojeEmBrasilia()}
          value={data}
          onChange={(evento) => setData(evento.target.value)}
        />
      </div>
    </AcaoPedidoModal>
  );
}

function CancelarEntregaModal({ entrega, onFechar, onAlterou }) {
  return (
    <AcaoPedidoModal
      titulo="Cancelar entrega"
      rotuloConfirmar="Cancelar a entrega"
      onConfirmar={async () => {
        await pedidosService.cancelarEntrega(entrega.id, entrega.versao);
        onAlterou();
      }}
      onFechar={onFechar}
      onRecarregar={onAlterou}
    >
      <p className="pedidos-texto">A entrega pendente é cancelada sem mexer no estoque; os itens voltam a poder ser programados.</p>
    </AcaoPedidoModal>
  );
}

export function EntregasDoPedido({ pedido, comercial, geracao, nomeProduto, onAlterou }) {
  const nomeLocal = useNomesLocais();
  const { entregas, carregando, erro, recarregar } = useEntregasDoPedido(pedido.id, geracao);
  const [acao, setAcao] = useState(null);

  const programaveis = programavelPorItem(pedido, entregas);
  const podeProgramar = comercial && ABERTOS.includes(pedido.status) && programaveis.length > 0;
  const fechar = () => setAcao(null);

  return (
    <div className="pedidos-entregas">
      {podeProgramar && (
        <div className="pedidos-itens-cabecalho">
          <span />
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setAcao({ tipo: 'programar' })}
          >
            <Plus size={14} /> Programar entrega
          </button>
        </div>
      )}

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && entregas.length === 0 ? (
        <div className="pedidos-secundario">Carregando entregas…</div>
      ) : entregas.length === 0 ? (
        <div className="pedidos-secundario">Nenhuma entrega programada.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Status</th>
                <th>Itens</th>
                <th>Transportadora</th>
                <th>Frete</th>
                <th>Previsão</th>
                <th>Andamento</th>
                {comercial && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {entregas.map((entrega) => {
                const situacao = STATUS_ENTREGA[entrega.status] ?? { rotulo: entrega.status, cor: 'neutral' };
                return (
                  <tr key={entrega.id}>
                    <td>
                      <StatusBadge status={situacao.cor} label={situacao.rotulo} />
                    </td>
                    <td>
                      <ul className="pedidos-entrega-itens">
                        {entrega.itens.map((item) => (
                          <li key={item.pedido_item_id}>
                            {`${item.quantidade} × ${nomeProduto(
                              (pedido.itens ?? []).find((itemPedido) => itemPedido.id === item.pedido_item_id)?.produto_id
                            )} · ${nomeLocal(item.local_id)}`}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{entrega.transportadora || '—'}</td>
                    <td>{textoDoFrete(entrega)}</td>
                    <td>{entrega.previsao ? formatarData(entrega.previsao) : '—'}</td>
                    <td>
                      {entrega.entregue_em
                        ? `Entregue em ${formatarData(entrega.entregue_em)}`
                        : entrega.saiu_em
                          ? `Saiu em ${formatarData(entrega.saiu_em)}`
                          : '—'}
                    </td>
                    {comercial && (
                      <td>
                        <div className="pedidos-entrega-acoes">
                          {entrega.status === 'pendente' && (
                            <>
                              <button
                                type="button"
                                className="filter-btn filter-btn-secondary"
                                style={{ flex: 'none', width: 'auto', padding: '2px 8px' }}
                                onClick={() => setAcao({ tipo: 'saida', entrega })}
                              >
                                Dar saída
                              </button>
                              <button
                                type="button"
                                className="filter-btn filter-btn-secondary"
                                style={{ flex: 'none', width: 'auto', padding: '2px 8px' }}
                                onClick={() => setAcao({ tipo: 'cancelar', entrega })}
                              >
                                Cancelar entrega
                              </button>
                            </>
                          )}
                          {entrega.status === 'saiu' && (
                            <button
                              type="button"
                              className="filter-btn filter-btn-secondary"
                              style={{ flex: 'none', width: 'auto', padding: '2px 8px' }}
                              onClick={() => setAcao({ tipo: 'entregue', entrega })}
                            >
                              Marcar entregue
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {acao?.tipo === 'programar' && (
        <ProgramarEntregaModal
          pedido={pedido}
          itens={programaveis}
          nomeProduto={nomeProduto}
          onFechar={fechar}
          onAlterou={onAlterou}
        />
      )}
      {acao?.tipo === 'saida' && <SaidaModal entrega={acao.entrega} onFechar={fechar} onAlterou={onAlterou} />}
      {acao?.tipo === 'entregue' && <EntregueModal entrega={acao.entrega} onFechar={fechar} onAlterou={onAlterou} />}
      {acao?.tipo === 'cancelar' && (
        <CancelarEntregaModal entrega={acao.entrega} onFechar={fechar} onAlterou={onAlterou} />
      )}
    </div>
  );
}
