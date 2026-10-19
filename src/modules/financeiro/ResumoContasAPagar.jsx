import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { useResumoContasAPagar } from './useResumoContasAPagar';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Financeiro.css';

function fimDaSemana(segunda) {
  const data = new Date(`${String(segunda).slice(0, 10)}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 6);
  return data.toISOString();
}

function textoDaSemana(segunda) {
  const inicio = formatarData(segunda).slice(0, 5);
  return `${inicio} a ${formatarData(fimDaSemana(segunda))}`;
}

function textoDaColuna(coluna) {
  if (!coluna || !coluna.quantidade) return '—';
  return `${formatarMoeda(coluna.valor_centavos)} (${coluna.quantidade})`;
}

function quantidadeEmTexto(quantidade) {
  return `${quantidade} ${quantidade === 1 ? 'conta' : 'contas'}`;
}

function Total({ rotulo, coluna, alerta }) {
  return (
    <div className={`financeiro-total ${alerta ? 'financeiro-total-alerta' : ''}`}>
      <span className="financeiro-total-rotulo">{rotulo}</span>
      <strong>{formatarMoeda(coluna?.valor_centavos ?? 0)}</strong>
      <span className="financeiro-total-quantidade">{quantidadeEmTexto(coluna?.quantidade ?? 0)}</span>
    </div>
  );
}

export default function ResumoContasAPagar() {
  const nomeEmpresa = useNomesEmpresas();
  const { resumo, filtros, carregando, erro, recarregar, filtrar } = useResumoContasAPagar();
  const [periodo, setPeriodo] = useState({ de: '', ate: '' });
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const periodoInvalido = periodo.de && periodo.ate && periodo.ate < periodo.de;

  const alterarPeriodo = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ de: novo.de, ate: novo.ate });
  };

  const semanas = resumo?.semanas ?? [];
  const atrasadas = resumo?.atrasadas ?? [];

  return (
    <div className="financeiro-container">
      <div className="financeiro-toolbar">
        <div className="financeiro-toolbar-titulo">Resumo de Contas a Pagar</div>
        <div className="financeiro-toolbar-acoes">
          <label className="filter-label" htmlFor="resumo-de">
            De
          </label>
          <input
            id="resumo-de"
            className="filter-input financeiro-filtro"
            type="date"
            value={periodo.de}
            onChange={alterarPeriodo('de')}
          />
          <label className="filter-label" htmlFor="resumo-ate">
            Até
          </label>
          <input
            id="resumo-ate"
            className="filter-input financeiro-filtro"
            type="date"
            value={periodo.ate}
            onChange={alterarPeriodo('ate')}
            aria-invalid={periodoInvalido || undefined}
          />
          <label className="filter-label" htmlFor="resumo-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="resumo-empresa"
            className="filter-input financeiro-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      </div>

      {periodoInvalido && <span className="financeiro-form-erro">O fim não pode ser antes do início.</span>}
      <span className="financeiro-form-ajuda">
        Só as contas em aberto, pelo vencimento: previsto é o que ainda aguarda aprovação, a pagar é o aprovado e vencido
        junta as duas já vencidas. Sem datas, mostra 8 semanas a partir desta segunda-feira.
      </span>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && !resumo ? (
        <div className="financeiro-status">Carregando resumo…</div>
      ) : resumo ? (
        <>
          <section className="financeiro-totais" aria-label="Totais do período">
            <Total rotulo="Previsto" coluna={resumo.totais?.previsto} />
            <Total rotulo="A pagar" coluna={resumo.totais?.a_pagar} />
            <Total rotulo="Vencido" coluna={resumo.totais?.vencido} alerta />
            <div className="financeiro-total">
              <span className="financeiro-total-rotulo">Estimado</span>
              <strong>{formatarMoeda(resumo.totais?.estimado_centavos ?? 0)}</strong>
              <span className="financeiro-total-quantidade">valor previsto, ainda não confirmado</span>
            </div>
          </section>
          <span className="financeiro-form-ajuda">
            {`Período de ${formatarData(resumo.de)} a ${formatarData(resumo.ate)}.`}
          </span>

          {semanas.length === 0 && atrasadas.length === 0 ? (
            <div className="financeiro-status">Nenhuma conta a pagar em aberto no período.</div>
          ) : (
            <>
              {semanas.length > 0 && (
                <div className="datagrid-container">
                  <table className="datagrid">
                    <thead>
                      <tr>
                        <th>Semana</th>
                        <th>Empresa</th>
                        <th>Previsto</th>
                        <th>A pagar</th>
                        <th>Vencido</th>
                        <th>Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semanas.map((linha) => (
                        <tr key={`${linha.semana}-${linha.empresa_id}`}>
                          <td>{textoDaSemana(linha.semana)}</td>
                          <td>{nomeEmpresa(linha.empresa_id)}</td>
                          <td>{textoDaColuna(linha.previsto)}</td>
                          <td>{textoDaColuna(linha.a_pagar)}</td>
                          <td className={linha.vencido?.quantidade ? 'financeiro-alerta' : undefined}>
                            {textoDaColuna(linha.vencido)}
                          </td>
                          <td>{linha.estimado_centavos ? formatarMoeda(linha.estimado_centavos) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {atrasadas.length > 0 && (
                <section className="financeiro-atrasadas" aria-label="Vencidas antes do período">
                  <h2 className="financeiro-atrasadas-titulo">Vencidas antes do período</h2>
                  <ul>
                    {atrasadas.map((item) => (
                      <li key={item.empresa_id}>
                        <span>{nomeEmpresa(item.empresa_id)}</span>
                        <span className="financeiro-alerta">{textoDaColuna(item.vencido)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
