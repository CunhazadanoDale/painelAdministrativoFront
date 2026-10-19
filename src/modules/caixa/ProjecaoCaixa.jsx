import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { somarDias } from './caixaUtils';
import { useProjecaoCaixa } from './useProjecaoCaixa';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Caixa.css';

const HORIZONTE_PADRAO = 30;
const HORIZONTE_MAXIMO = 90;

function Valor({ centavos }) {
  return <span className={centavos < 0 ? 'caixa-negativo' : undefined}>{formatarMoeda(centavos)}</span>;
}

function ComExtra({ centavos, extra, rotuloExtra }) {
  return (
    <span className="caixa-empilhado">
      {centavos ? formatarMoeda(centavos) : '—'}
      {extra > 0 && <span className="caixa-secundario">{`${formatarMoeda(extra)} ${rotuloExtra}`}</span>}
    </span>
  );
}

export function ProjecaoCaixa() {
  const hoje = hojeEmBrasilia();
  const maximo = somarDias(hoje, HORIZONTE_MAXIMO);
  const { projecao, filtros, carregando, erro, recarregar, filtrar } = useProjecaoCaixa({
    empresa: '',
    ate: somarDias(hoje, HORIZONTE_PADRAO),
  });
  const [ate, setAte] = useState(filtros.ate);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const ateInvalido = !ate || ate < hoje || ate > maximo;

  const alterarAte = (evento) => {
    const valor = evento.target.value;
    setAte(valor);
    if (valor && valor >= hoje && valor <= maximo) filtrar({ ate: valor });
  };

  const partida = projecao?.saldo_de_partida;

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="projecao-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="projecao-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Consolidado (todas)"
          />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="projecao-ate">
            Até
          </label>
          <input
            id="projecao-ate"
            className="filter-input"
            type="date"
            min={hoje}
            max={maximo}
            value={ate}
            onChange={alterarAte}
            aria-invalid={ateInvalido || undefined}
          />
        </div>
        {ateInvalido && <span className="caixa-form-erro">{`A projeção vai no máximo até ${formatarData(maximo)}.`}</span>}
      </div>
      <span className="caixa-form-ajuda">
        Parte do saldo das contas pelo extrato mais o que está em trânsito (pago ou recebido no sistema e ainda sem linha
        no extrato). Entradas: títulos em carteira e em banco pelo vencimento. Saídas: contas a pagar pendentes e
        aprovadas pelo prazo. Recorrentes: despesas fixas ainda não geradas. Vencidos entram em hoje.
      </span>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && !projecao ? (
        <div className="caixa-status">Carregando projeção…</div>
      ) : projecao ? (
        <>
          <section className="caixa-totais" aria-label="Saldo de partida">
            <div className="caixa-total">
              <span className="caixa-secundario">Saldo de partida</span>
              <strong>{formatarMoeda(partida.total_centavos)}</strong>
              <span className="caixa-secundario">
                {`Extrato ${formatarMoeda(partida.extrato_centavos)} · em trânsito ${formatarMoeda(partida.em_transito_centavos)}`}
              </span>
            </div>
            <div className="caixa-total">
              <span className="caixa-secundario">{`Saldo em ${formatarData(projecao.ate)}`}</span>
              <strong>
                <Valor centavos={projecao.saldo_final_centavos} />
              </strong>
              <span className="caixa-secundario">{`${partida.contas_consideradas} conta(s) consideradas`}</span>
            </div>
          </section>
          {partida.contas_sem_saldo_inicial > 0 && (
            <span className="caixa-form-erro">
              {`${partida.contas_sem_saldo_inicial} conta(s) sem saldo inicial ficaram de fora; informe o saldo inicial na aba Saldos.`}
            </span>
          )}
          <div className="datagrid-container">
            <table className="datagrid" aria-label="Projeção diária">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Recorrentes</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {projecao.dias.map((dia) => (
                  <tr key={dia.data}>
                    <td>{formatarData(dia.data)}</td>
                    <td>
                      <ComExtra centavos={dia.entradas_centavos} extra={dia.entradas_vencidas_centavos} rotuloExtra="vencidas" />
                    </td>
                    <td>
                      <span className="caixa-empilhado">
                        {dia.saidas_centavos ? formatarMoeda(dia.saidas_centavos) : '—'}
                        {dia.saidas_estimadas_centavos > 0 && (
                          <span className="caixa-secundario">{`${formatarMoeda(dia.saidas_estimadas_centavos)} estimadas`}</span>
                        )}
                        {dia.saidas_vencidas_centavos > 0 && (
                          <span className="caixa-secundario">{`${formatarMoeda(dia.saidas_vencidas_centavos)} vencidas`}</span>
                        )}
                      </span>
                    </td>
                    <td>{dia.recorrentes_centavos ? formatarMoeda(dia.recorrentes_centavos) : '—'}</td>
                    <td>
                      <Valor centavos={dia.saldo_centavos} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
