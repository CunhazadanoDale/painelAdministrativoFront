import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { formatarMoeda } from '../../lib/formatar';
import * as dreService from '../../services/dre';
import { PeriodoMensal } from './PeriodoMensal';
import {
  ESTRUTURA_DRE,
  MAXIMO_MESES_DRE,
  formatarMes,
  formatarPontosBase,
  itensDasLinhas,
  mesAtualEmBrasilia,
  mesesAntes,
  valorDaLinha,
  valorDoItem,
} from './dreUtils';
import { useConsultaDre } from './useConsultaDre';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Dre.css';

function periodoPadrao() {
  const ate = mesAtualEmBrasilia();
  return { de: mesesAntes(ate, 11), ate };
}

function Valor({ centavos }) {
  return <td className={centavos < 0 ? 'dre-negativo' : undefined}>{formatarMoeda(centavos)}</td>;
}

function textoSemCusto(quantidade) {
  return `${quantidade} ${quantidade === 1 ? 'unidade saiu' : 'unidades saíram'} de lotes sem custo no período; o CMV as conta como zero. Informe o custo dos lotes para corrigir.`;
}

export default function Dre() {
  const [periodo, setPeriodo] = useState(periodoPadrao);
  const [empresa, setEmpresa] = useState('');
  const [abertas, setAbertas] = useState(() => new Set());
  const parametros = { de: periodo.de, ate: periodo.ate, empresa };
  const { dados, carregando, erro, recarregar } = useConsultaDre(
    dreService.obterResumoDre,
    parametros,
    'Erro ao carregar a DRE.'
  );
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const alternar = (chave) =>
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(chave)) nova.delete(chave);
      else nova.add(chave);
      return nova;
    });

  const meses = dados?.meses ?? [];
  const colunas = [...meses.map((mes) => mes.consolidado), dados?.total?.consolidado];
  const semCusto = dados?.total?.consolidado?.quantidade_sem_custo ?? 0;

  const linhasDaTabela = ESTRUTURA_DRE.flatMap((item) => {
    const itens = item.tipo === 'linha' ? itensDasLinhas(colunas, item.chave) : [];
    const aberta = abertas.has(item.chave);
    const classe = item.tipo === 'subtotal' ? 'dre-subtotal' : item.chave === 'fora_dre' ? 'dre-fora' : undefined;
    const principal = (
      <tr key={item.chave} className={classe}>
        <th scope="row">
          {itens.length > 0 ? (
            <button type="button" className="dre-expandir" aria-expanded={aberta} onClick={() => alternar(item.chave)}>
              {aberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {item.rotulo}
            </button>
          ) : (
            item.rotulo
          )}
        </th>
        {colunas.map((demonstrativo, indice) => (
          <Valor key={indice} centavos={valorDaLinha(demonstrativo, item)} />
        ))}
      </tr>
    );
    if (!aberta) return [principal];
    return [
      principal,
      ...itens.map((detalhe) => (
        <tr key={`${item.chave}-${detalhe.id}`} className="dre-item">
          <th scope="row">{detalhe.nome}</th>
          {colunas.map((demonstrativo, indice) => (
            <Valor key={indice} centavos={valorDoItem(demonstrativo, item.chave, detalhe.id)} />
          ))}
        </tr>
      )),
    ];
  });

  return (
    <div className="dre-container">
      <div className="dre-toolbar">
        <div className="dre-toolbar-titulo">DRE</div>
        <div className="dre-toolbar-acoes">
          <PeriodoMensal inicial={periodo} maximo={MAXIMO_MESES_DRE} onAplicar={setPeriodo} prefixo="dre" />
          <label className="filter-label" htmlFor="dre-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="dre-empresa"
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
        Por competência: receita pela emissão da NF de venda, CMV pelos lotes que saíram, despesas pela competência das
        contas a pagar. Clique numa linha para ver as categorias. Fora da DRE (empréstimos, aportes, amortizações) não entra
        no resultado.
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

      {semCusto > 0 && !erro && (
        <div className="dre-aviso" role="status">
          {textoSemCusto(semCusto)}
        </div>
      )}

      {carregando && !dados ? (
        <div className="dre-status">Carregando DRE…</div>
      ) : dados && !erro ? (
        <div className="datagrid-container dre-tabela-container">
          <table className="datagrid dre-tabela" aria-label="DRE">
            <thead>
              <tr>
                <th />
                {meses.map((mes) => (
                  <th key={mes.mes}>{formatarMes(mes.mes)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {linhasDaTabela}
              <tr className="dre-indicador">
                <th scope="row">Margem de contribuição (%)</th>
                {colunas.map((demonstrativo, indice) => (
                  <td key={indice}>{formatarPontosBase(demonstrativo?.indicadores?.margem_contribuicao_bp)}</td>
                ))}
              </tr>
              <tr className="dre-indicador">
                <th scope="row">Ponto de equilíbrio</th>
                {colunas.map((demonstrativo, indice) => {
                  const ponto = demonstrativo?.indicadores?.ponto_equilibrio_centavos;
                  return <td key={indice}>{ponto === null || ponto === undefined ? '—' : formatarMoeda(ponto)}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
