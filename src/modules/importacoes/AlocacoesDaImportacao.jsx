import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { formatarData } from '../../lib/formatar';
import { usePedidosDaImportacao } from './usePedidosDaImportacao';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const EDITAVEIS = ['aberta', 'embarcada', 'desembaracada'];

function mapaDosPedidos(pendencias, semImportacao) {
  const mapa = {};
  pendencias.forEach((linha) => {
    mapa[linha.pedido_item_id] = {
      pedido_id: linha.pedido_id,
      numero: linha.numero,
      prazo_limite: linha.prazo_limite,
      sem_cobertura: null,
    };
  });
  semImportacao.forEach((linha) => {
    mapa[linha.pedido_item_id] = {
      ...mapa[linha.pedido_item_id],
      pedido_id: linha.pedido_id,
      numero: linha.pedido_numero,
      prazo_limite: linha.prazo_limite,
      sem_cobertura: linha.sem_cobertura,
    };
  });
  return mapa;
}

function PedidoDaLinha({ info }) {
  if (!info) return <span className="importacoes-secundario">Pedido fora de atendimento</span>;
  return <Link to={`/pedidos/${info.pedido_id}`}>Pedido {info.numero}</Link>;
}

function linhasDoEditor(importacao, semImportacao) {
  const atuais = importacao.alocacoes ?? [];
  const linhas = [];
  (importacao.itens ?? []).forEach((item) => {
    const vistos = new Set();
    atuais
      .filter((alocacao) => alocacao.importacao_item_id === item.id)
      .forEach((alocacao) => {
        vistos.add(alocacao.pedido_item_id);
        linhas.push({ item, pedido_item_id: alocacao.pedido_item_id, atual: alocacao.quantidade });
      });
    semImportacao
      .filter((linha) => linha.produto_id === item.produto_id && !vistos.has(linha.pedido_item_id))
      .forEach((linha) => linhas.push({ item, pedido_item_id: linha.pedido_item_id, atual: 0 }));
  });
  return linhas;
}

function AlocacoesModal({ importacao, mapa, semImportacao, nomeProduto, onConfirmar, onFechar, onRecarregar }) {
  const linhas = linhasDoEditor(importacao, semImportacao);
  const [quantidades, setQuantidades] = useState(() =>
    Object.fromEntries(linhas.map((linha) => [linha.pedido_item_id, linha.atual ? String(linha.atual) : '']))
  );

  const numero = (texto) => (String(texto ?? '').trim() ? Number(texto) : 0);

  const validar = () => {
    const erros = [];
    const porItem = {};
    linhas.forEach((linha) => {
      const quantidade = numero(quantidades[linha.pedido_item_id]);
      const pedido = mapa[linha.pedido_item_id];
      const rotulo = pedido ? `Pedido ${pedido.numero}` : 'Item de pedido';
      if (!Number.isInteger(quantidade) || quantidade < 0) {
        erros.push(`${rotulo}: quantidade inteira, zero para tirar.`);
        return;
      }
      const limite = pedido && pedido.sem_cobertura !== null ? pedido.sem_cobertura + linha.atual : null;
      if (limite !== null && quantidade > limite) erros.push(`${rotulo}: passa do que falta cobrir (${limite}).`);
      porItem[linha.item.id] = (porItem[linha.item.id] ?? 0) + quantidade;
    });
    (importacao.itens ?? []).forEach((item) => {
      if ((porItem[item.id] ?? 0) > item.quantidade) {
        erros.push(`${nomeProduto(item.produto_id)}: as alocações passam da quantidade do item (${item.quantidade}).`);
      }
    });
    return erros;
  };

  const confirmar = () =>
    onConfirmar(
      linhas
        .map((linha) => ({
          importacao_item_id: linha.item.id,
          pedido_item_id: linha.pedido_item_id,
          quantidade: numero(quantidades[linha.pedido_item_id]),
        }))
        .filter((alocacao) => alocacao.quantidade > 0)
    );

  return (
    <AcaoModal
      titulo={`Alocar pedidos à importação ${importacao.numero}`}
      rotuloConfirmar="Salvar alocações"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="820px"
    >
      <p className="importacoes-texto">
        Itens de pedidos de importação da mesma empresa e produto com falta a cobrir. No recebimento, o alocado vira
        reserva do pedido; o que sobrar fica livre no estoque.
      </p>
      {linhas.length === 0 ? (
        <div className="importacoes-secundario">Nenhum pedido de importação desta empresa precisa destes produtos.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Pedido</th>
                <th>Prazo limite</th>
                <th>Falta cobrir</th>
                <th>Alocar</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => {
                const pedido = mapa[linha.pedido_item_id];
                return (
                  <tr key={linha.pedido_item_id}>
                    <td>{nomeProduto(linha.item.produto_id)}</td>
                    <td>
                      <PedidoDaLinha info={pedido} />
                    </td>
                    <td>{pedido?.prazo_limite ? formatarData(pedido.prazo_limite) : '—'}</td>
                    <td>{pedido && pedido.sem_cobertura !== null ? pedido.sem_cobertura + linha.atual : '—'}</td>
                    <td>
                      <input
                        className="filter-input importacoes-numero"
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Alocar ${nomeProduto(linha.item.produto_id)} ao pedido ${pedido?.numero ?? '?'}`}
                        value={quantidades[linha.pedido_item_id] ?? ''}
                        onChange={(evento) =>
                          setQuantidades((atual) => ({ ...atual, [linha.pedido_item_id]: evento.target.value }))
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AcaoModal>
  );
}

export function AlocacoesDaImportacao({ importacao, geracao, podeAlocar, nomeProduto, onDefinir, onRecarregar }) {
  const [editando, setEditando] = useState(false);
  const { pendencias, semImportacao, carregando, erro, recarregar } = usePedidosDaImportacao(importacao.empresa_id, geracao);
  const mapa = mapaDosPedidos(pendencias, semImportacao);
  const alocacoes = importacao.alocacoes ?? [];
  const itemPorId = Object.fromEntries((importacao.itens ?? []).map((item) => [item.id, item]));
  const recebida = importacao.status === 'recebida';
  const editavel = podeAlocar && EDITAVEIS.includes(importacao.status);

  return (
    <div className="importacoes-itens">
      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}
      {editavel && (
        <div className="importacoes-painel-cabecalho">
          <span className="importacoes-texto">Pedidos de venda atendidos por esta importação.</span>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', width: 'auto', padding: '2px 8px' }}
            onClick={() => setEditando(true)}
            disabled={carregando || !!erro}
          >
            Alocar pedidos
          </button>
        </div>
      )}
      {alocacoes.length === 0 ? (
        <div className="importacoes-secundario">Nenhum pedido alocado.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Pedido</th>
                <th>Prazo limite</th>
                <th>Alocado</th>
                {recebida && <th>Reservado</th>}
              </tr>
            </thead>
            <tbody>
              {alocacoes.map((alocacao) => {
                const pedido = mapa[alocacao.pedido_item_id];
                const item = itemPorId[alocacao.importacao_item_id];
                return (
                  <tr key={`${alocacao.importacao_item_id}|${alocacao.pedido_item_id}`}>
                    <td>{item ? nomeProduto(item.produto_id) : '—'}</td>
                    <td>{carregando && !pedido ? '…' : <PedidoDaLinha info={pedido} />}</td>
                    <td>{pedido?.prazo_limite ? formatarData(pedido.prazo_limite) : '—'}</td>
                    <td>{alocacao.quantidade}</td>
                    {recebida && (
                      <td className={(alocacao.reservada ?? 0) < alocacao.quantidade ? 'importacoes-alerta' : undefined}>
                        {alocacao.reservada ?? 0}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <AlocacoesModal
          importacao={importacao}
          mapa={mapa}
          semImportacao={semImportacao}
          nomeProduto={nomeProduto}
          onConfirmar={onDefinir}
          onFechar={() => setEditando(false)}
          onRecarregar={onRecarregar}
        />
      )}
    </div>
  );
}
