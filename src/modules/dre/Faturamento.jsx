import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarMoeda } from '../../lib/formatar';
import * as dreService from '../../services/dre';
import { PeriodoMensal } from './PeriodoMensal';
import { MAXIMO_MESES_FATURAMENTO, formatarMes, mesAtualEmBrasilia, mesesAntes } from './dreUtils';
import { useConsultaDre } from './useConsultaDre';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Dre.css';

function periodoPadrao() {
  const ate = mesAtualEmBrasilia();
  return { de: mesesAntes(ate, 11), ate };
}

export default function Faturamento() {
  const [periodo, setPeriodo] = useState(periodoPadrao);
  const [empresa, setEmpresa] = useState('');
  const nomeEmpresa = useNomesEmpresas();
  const parametros = { de: periodo.de, ate: periodo.ate, empresa };
  const { dados, carregando, erro, recarregar } = useConsultaDre(
    dreService.obterFaturamento,
    parametros,
    'Erro ao carregar o faturamento.'
  );
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const meses = [...(dados?.meses ?? [])].reverse();
  const maior = Math.max(0, ...meses.map((mes) => mes.consolidado.valor_centavos));
  const total = dados?.consolidado ?? { quantidade: 0, valor_centavos: 0, ticket_medio_centavos: 0 };

  return (
    <div className="dre-container">
      <div className="dre-toolbar">
        <div className="dre-toolbar-titulo">Faturamento</div>
        <div className="dre-toolbar-acoes">
          <PeriodoMensal
            inicial={periodo}
            maximo={MAXIMO_MESES_FATURAMENTO}
            onAplicar={setPeriodo}
            prefixo="faturamento"
          />
          <label className="filter-label" htmlFor="faturamento-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="faturamento-empresa"
            className="filter-input dre-filtro"
            valor={empresa}
            onAlterar={alterarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      </div>

      <span className="dre-texto">
        NFs de venda autorizadas, fora as vendas entre empresas do grupo, pelo mês de emissão. Mostra só as notas já
        importadas; nota complementar soma o valor, mas não conta como nota.
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

      {carregando && !dados ? (
        <div className="dre-status">Carregando faturamento…</div>
      ) : dados && !erro ? (
        <>
          <section className="dre-totais" aria-label="Total do período">
            <div className="dre-total">
              <span className="dre-total-rotulo">Faturamento</span>
              <span className="dre-total-valor">{formatarMoeda(total.valor_centavos)}</span>
            </div>
            <div className="dre-total">
              <span className="dre-total-rotulo">Notas</span>
              <span className="dre-total-valor">{total.quantidade}</span>
            </div>
            <div className="dre-total">
              <span className="dre-total-rotulo">Ticket médio</span>
              <span className="dre-total-valor">{formatarMoeda(total.ticket_medio_centavos)}</span>
            </div>
          </section>

          <div className="datagrid-container dre-tabela-container">
            <table className="datagrid dre-tabela" aria-label="Faturamento por mês">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Notas</th>
                  <th>Valor</th>
                  <th>Ticket médio</th>
                  <th aria-label="Proporção" />
                </tr>
              </thead>
              <tbody>
                {meses.map(({ mes, consolidado }) => {
                  const proporcao = maior > 0 ? Math.round((consolidado.valor_centavos / maior) * 100) : 0;
                  return (
                    <tr key={mes}>
                      <th scope="row">{formatarMes(mes)}</th>
                      <td>{consolidado.quantidade}</td>
                      <td>{formatarMoeda(consolidado.valor_centavos)}</td>
                      <td>{formatarMoeda(consolidado.ticket_medio_centavos)}</td>
                      <td className="dre-barra-celula">
                        <div
                          className="dre-barra"
                          style={{ width: `${proporcao}%` }}
                          role="img"
                          aria-label={`${proporcao}% do maior mês`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="datagrid-container">
            <table className="datagrid dre-tabela" aria-label="Faturamento por empresa">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Notas</th>
                  <th>Valor</th>
                  <th>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {(dados.empresas ?? []).map((item) => (
                  <tr key={item.empresa_id}>
                    <th scope="row">{nomeEmpresa(item.empresa_id)}</th>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.valor_centavos)}</td>
                    <td>{formatarMoeda(item.ticket_medio_centavos)}</td>
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
