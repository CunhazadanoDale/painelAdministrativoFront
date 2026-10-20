import React, { useState } from 'react';
import { formatarMoeda } from '../../lib/formatar';
import { erroDoCambio, formatarCambio, formatarValorMoeda, paraCambioMicro } from './importacoesUtils';
import { useCustoPrevisto } from './useCustoPrevisto';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

export function CustoPrevisto({ importacao, geracao, nomeProduto }) {
  const [texto, setTexto] = useState('');
  const [cambio, setCambio] = useState(null);
  const [erroLocal, setErroLocal] = useState(null);
  const { previsto, carregando, erro } = useCustoPrevisto(importacao.id, cambio, geracao);
  const moeda = importacao.moeda;

  const calcular = (evento) => {
    evento.preventDefault();
    if (!texto.trim()) {
      setErroLocal(null);
      setCambio(null);
      return;
    }
    const erroCambio = erroDoCambio(texto, moeda);
    setErroLocal(erroCambio);
    if (!erroCambio) setCambio(paraCambioMicro(texto));
  };

  const resumo = previsto
    ? [
        ['Itens na moeda', formatarValorMoeda(previsto.valor_moeda_centesimos, moeda)],
        ['Parcelas com câmbio fechado', `${formatarValorMoeda(previsto.parcelas_fechadas_moeda_centesimos, moeda)} = ${formatarMoeda(previsto.parcelas_fechadas_centavos)}`],
        ['Sem câmbio fechado', formatarValorMoeda(previsto.sem_cambio_fechado_moeda_centesimos, moeda)],
        ['Câmbio médio', formatarCambio(previsto.cambio_medio_micro)],
        ['Mercadoria em reais', formatarMoeda(previsto.valor_mercadoria_centavos)],
        ['Custos no rateio', formatarMoeda(previsto.custos_centavos)],
        ['Custos fora do rateio', formatarMoeda(previsto.custos_fora_do_rateio_centavos)],
      ]
    : [];

  return (
    <div className="importacoes-itens">
      <form className="importacoes-busca" onSubmit={calcular}>
        <label className="filter-label" htmlFor="previsto-cambio">
          Câmbio para o que falta fechar
        </label>
        <input
          id="previsto-cambio"
          className="filter-input importacoes-numero"
          type="text"
          inputMode="decimal"
          placeholder="5,500000"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button type="submit" className="filter-btn filter-btn-secondary" style={{ flex: 'none', padding: '4px 10px' }}>
          Calcular
        </button>
      </form>
      <span className="importacoes-form-ajuda">
        Prévia do rateio com as quantidades da importação, sem gravar. O recebimento usa as quantidades recebidas.
      </span>
      {erroLocal && (
        <div className="importacoes-form-erro-api" role="alert">
          {erroLocal}
        </div>
      )}
      {erro ? (
        <div className="importacoes-form-erro-api" role="alert">
          {erro}
        </div>
      ) : carregando && !previsto ? (
        <div className="importacoes-secundario">Calculando…</div>
      ) : previsto ? (
        <>
          <dl className="importacoes-detalhe-lista">
            {resumo.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="datagrid-container">
            <table className="datagrid">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Mercadoria</th>
                  <th>Custos</th>
                  <th>Total</th>
                  <th>Custo unitário</th>
                </tr>
              </thead>
              <tbody>
                {(previsto.itens ?? []).map((item) => (
                  <tr key={item.item_id}>
                    <td>{nomeProduto(item.produto_id)}</td>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.valor_mercadoria_centavos)}</td>
                    <td>{formatarMoeda(item.custos_centavos)}</td>
                    <td>{formatarMoeda(item.custo_total_centavos)}</td>
                    <td>
                      <strong>{formatarMoeda(item.custo_unitario_centavos)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
