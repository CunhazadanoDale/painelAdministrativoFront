import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorLocal } from '../../app/components/SeletorLocal';
import { formatarData } from '../../lib/formatar';
import {
  dataParaCampo,
  erroDoCambio,
  formatarValorMoeda,
  hojeEmBrasilia,
  paraCambioMicro,
} from './importacoesUtils';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const CONTA_ENCERRADA = ['cancelado', 'rejeitado'];

function semCambioFechado(importacao) {
  const fechadas = (importacao.parcelas ?? [])
    .filter((parcela) => parcela.status === 'cambio_fechado')
    .reduce((soma, parcela) => soma + parcela.valor_moeda_centesimos, 0);
  return Math.max(0, (importacao.valor_total_moeda_centesimos ?? 0) - fechadas);
}

function contasQueBloqueiam(importacao) {
  const parcelas = (importacao.parcelas ?? []).filter(
    (parcela) => parcela.status === 'cambio_fechado' && CONTA_ENCERRADA.includes(parcela.status_conta_a_pagar)
  );
  const custos = (importacao.custos ?? []).filter(
    (custo) => !custo.cancelado && custo.compoe_custo && CONTA_ENCERRADA.includes(custo.status_conta_a_pagar)
  );
  return [...parcelas.map((parcela) => `parcela "${parcela.descricao}"`), ...custos.map((custo) => `custo "${custo.descricao}"`)];
}

export function ReceberImportacaoModal({ importacao, nomeProduto, onConfirmar, onFechar, onRecarregar }) {
  const hoje = hojeEmBrasilia();
  const real = importacao.moeda === 'BRL';
  const faltaCambio = real ? 0 : semCambioFechado(importacao);
  const desembaracadaEm = dataParaCampo(importacao.desembaracada_em);
  const bloqueios = contasQueBloqueiam(importacao);
  const [recebidaEm, setRecebidaEm] = useState(hoje);
  const [localId, setLocalId] = useState('');
  const [cambio, setCambio] = useState('');
  const [recebidas, setRecebidas] = useState(() =>
    Object.fromEntries((importacao.itens ?? []).map((item) => [item.id, String(item.quantidade)]))
  );

  const validar = () => {
    const erros = [];
    if (!recebidaEm) erros.push('Informe a data do recebimento.');
    else if (recebidaEm > hoje) erros.push('O recebimento não pode estar no futuro.');
    else if (desembaracadaEm && recebidaEm < desembaracadaEm) {
      erros.push(`O recebimento não pode ser antes do desembaraço (${formatarData(importacao.desembaracada_em)}).`);
    }
    if (!localId) erros.push('Escolha o local de estoque.');
    if (faltaCambio > 0 || cambio.trim()) {
      const erroCambio = erroDoCambio(cambio, importacao.moeda);
      if (erroCambio) erros.push(erroCambio);
    }
    let total = 0;
    (importacao.itens ?? []).forEach((item) => {
      const texto = String(recebidas[item.id] ?? '').trim();
      const quantidade = Number(texto);
      if (!texto || !Number.isInteger(quantidade) || quantidade < 0 || quantidade > item.quantidade) {
        erros.push(`${nomeProduto(item.produto_id)}: recebida de 0 a ${item.quantidade}.`);
      } else {
        total += quantidade;
      }
    });
    if (erros.length === 0 && total === 0) erros.push('Nada foi recebido: cancele a importação em vez de receber.');
    return erros;
  };

  const confirmar = () =>
    onConfirmar({
      recebida_em: recebidaEm,
      local_id: localId,
      cambio_micro: cambio.trim() ? paraCambioMicro(cambio) : null,
      itens: (importacao.itens ?? []).map((item) => ({
        item_id: item.id,
        quantidade_recebida: Number(recebidas[item.id]),
      })),
    });

  return (
    <AcaoModal
      titulo={`Receber importação ${importacao.numero}`}
      rotuloConfirmar="Receber no estoque"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="720px"
    >
      <p className="importacoes-texto">
        Dá entrada de cada item no local com o custo unitário rateado (cria o lote) e reserva para os pedidos alocados,
        tudo de uma vez. O recebimento é único: depois dele só entram custos posteriores.
      </p>
      {bloqueios.length > 0 && (
        <div className="importacoes-form-erro-api" role="alert">
          Conta a pagar cancelada ou rejeitada bloqueia o recebimento: {bloqueios.join(', ')}. Reabra a parcela ou cancele
          o custo antes.
        </div>
      )}
      <div className="importacoes-form-linha">
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="receber-data">
            Recebida em *
          </label>
          <input
            id="receber-data"
            className="filter-input"
            type="date"
            max={hoje}
            value={recebidaEm}
            onChange={(evento) => setRecebidaEm(evento.target.value)}
          />
        </div>
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="receber-local">
            Local de estoque *
          </label>
          <SeletorLocal
            id="receber-local"
            className="filter-input"
            empresaId={importacao.empresa_id}
            valor={localId}
            onAlterar={setLocalId}
          />
        </div>
        {!real && (
          <div className="importacoes-form-campo">
            <label className="filter-label" htmlFor="receber-cambio">
              Câmbio do que falta fechar{faltaCambio > 0 ? ' *' : ''}
            </label>
            <input
              id="receber-cambio"
              className="filter-input"
              type="text"
              inputMode="decimal"
              placeholder="5,500000"
              value={cambio}
              onChange={(evento) => setCambio(evento.target.value)}
            />
            <span className="importacoes-form-ajuda">
              {faltaCambio > 0
                ? `${formatarValorMoeda(faltaCambio, importacao.moeda)} ainda sem câmbio fechado.`
                : 'Todas as parcelas cobrem os itens com câmbio fechado.'}
            </span>
          </div>
        )}
      </div>
      <div className="datagrid-container">
        <table className="datagrid">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Recebida</th>
            </tr>
          </thead>
          <tbody>
            {(importacao.itens ?? []).map((item) => (
              <tr key={item.id}>
                <td>{nomeProduto(item.produto_id)}</td>
                <td>{item.quantidade}</td>
                <td>
                  <input
                    className="filter-input importacoes-numero"
                    type="number"
                    min="0"
                    max={item.quantidade}
                    step="1"
                    aria-label={`Recebida de ${nomeProduto(item.produto_id)}`}
                    value={recebidas[item.id] ?? ''}
                    onChange={(evento) => setRecebidas((atual) => ({ ...atual, [item.id]: evento.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="importacoes-form-ajuda">
        Falta e avaria: informe menos que a quantidade. A falta encarece a unidade; item com zero não entra no estoque.
      </span>
    </AcaoModal>
  );
}
