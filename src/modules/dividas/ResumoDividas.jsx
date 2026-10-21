import React, { useCallback, useState } from 'react';
import { Panel } from '../../app/components/Panel';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { rotuloCredorTipo } from './dividasUtils';
import { useResumoDividas } from './useResumoDividas';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Dividas.css';

const FAIXAS = [
  ['vencido', 'Vencido'],
  ['a_vencer_30_dias', 'Próximos 30 dias'],
  ['a_vencer_90_dias', 'Próximos 90 dias'],
  ['a_vencer_365_dias', 'Próximos 365 dias'],
  ['a_vencer', 'A vencer (total)'],
];

function textoDividas(quantidade) {
  return `${quantidade} ${quantidade === 1 ? 'dívida' : 'dívidas'} em aberto`;
}

function TabelaDeSaldo({ titulo, rotuloColuna, linhas }) {
  return (
    <div className="datagrid-container">
      <table className="datagrid" aria-label={titulo}>
        <thead>
          <tr>
            <th>{rotuloColuna}</th>
            <th>Saldo devedor</th>
            <th>Dívidas</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ chave, rotulo, saldo, dividas }) => (
            <tr key={chave}>
              <td>{rotulo}</td>
              <td>{formatarMoeda(saldo)}</td>
              <td>{dividas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResumoDividas() {
  const [empresa, setEmpresa] = useState('');
  const nomeEmpresa = useNomesEmpresas();
  const { resumo, carregando, erro, recarregar } = useResumoDividas(empresa);
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  return (
    <div className="dividas-container">
      <div className="dividas-toolbar">
        <div className="dividas-toolbar-titulo">Resumo de Dívidas</div>
        <div className="dividas-toolbar-acoes">
          <label className="filter-label" htmlFor="resumo-dividas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="resumo-dividas-empresa"
            className="filter-input dividas-filtro"
            valor={empresa}
            onAlterar={alterarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      </div>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && !resumo ? (
        <div className="dividas-status">Carregando resumo…</div>
      ) : resumo && !erro ? (
        <>
          <span className="dividas-texto">
            Posição em {formatarData(resumo.hoje)}, só das dívidas ativas. O saldo devedor é o principal em aberto; os juros
            aparecem nas faixas de vencimento. Vencido é o que vence antes de hoje pelo cronograma da dívida.
          </span>

          <section className="dividas-totais" aria-label="Saldo devedor">
            <div className="dividas-total">
              <span className="dividas-total-rotulo">Saldo devedor</span>
              <span className="dividas-total-valor">{formatarMoeda(resumo.saldo_devedor_centavos)}</span>
              <span className="dividas-secundario">{textoDividas(resumo.dividas)}</span>
            </div>
            <div className="dividas-total">
              <span className="dividas-total-rotulo">Vencido</span>
              <span className="dividas-total-valor dividas-vencido">
                {formatarMoeda(resumo.vencido.amortizacao_centavos + resumo.vencido.juros_centavos)}
              </span>
              <span className="dividas-secundario">amortização e juros</span>
            </div>
          </section>

          <Panel title="Vencido e a vencer">
            <div className="datagrid-container">
              <table className="datagrid" aria-label="Vencido e a vencer">
                <thead>
                  <tr>
                    <th>Faixa</th>
                    <th>Amortização</th>
                    <th>Juros</th>
                    <th>Total</th>
                    <th>Parcelas</th>
                  </tr>
                </thead>
                <tbody>
                  {FAIXAS.map(([campo, rotulo]) => {
                    const faixa = resumo[campo];
                    return (
                      <tr key={campo}>
                        <td>{rotulo}</td>
                        <td>{formatarMoeda(faixa.amortizacao_centavos)}</td>
                        <td>{formatarMoeda(faixa.juros_centavos)}</td>
                        <td>{formatarMoeda(faixa.amortizacao_centavos + faixa.juros_centavos)}</td>
                        <td>{faixa.parcelas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="dividas-detalhe-paineis">
            <Panel title="Por tipo de credor">
              <TabelaDeSaldo
                titulo="Saldo por tipo de credor"
                rotuloColuna="Tipo de credor"
                linhas={resumo.por_credor.map((item) => ({
                  chave: item.credor_tipo,
                  rotulo: rotuloCredorTipo(item.credor_tipo),
                  saldo: item.saldo_devedor_centavos,
                  dividas: item.dividas,
                }))}
              />
            </Panel>
            <Panel title="Por empresa">
              {resumo.por_empresa.length === 0 ? (
                <div className="dividas-secundario">Nenhuma empresa com dívida em aberto.</div>
              ) : (
                <TabelaDeSaldo
                  titulo="Saldo por empresa"
                  rotuloColuna="Empresa"
                  linhas={resumo.por_empresa.map((item) => ({
                    chave: item.empresa_id,
                    rotulo: nomeEmpresa(item.empresa_id),
                    saldo: item.saldo_devedor_centavos,
                    dividas: item.dividas,
                  }))}
                />
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
