import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as contasService from '../../services/contasBancarias';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { nomeDaConta, opcaoDeConta, primeiroDiaDoMes } from './caixaUtils';
import { useMovimentoDiario } from './useMovimentoDiario';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Caixa.css';

const DIAS_MAXIMO = 92;
const carregarContas = (sinal) => contasService.listarTodasContasBancarias({ sinal });

function diasEntre(de, ate) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
}

export function MovimentoDiario() {
  const hoje = hojeEmBrasilia();
  const { itens, filtros, carregando, erro, recarregar, filtrar } = useMovimentoDiario({
    empresa: '',
    conta: '',
    de: primeiroDiaDoMes(hoje),
    ate: hoje,
  });
  const nomeConta = useNomesPorId(
    itens.map((item) => item.conta_bancaria_id),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const [periodo, setPeriodo] = useState({ de: filtros.de, ate: filtros.ate });
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarConta = useCallback((conta) => filtrar({ conta }), [filtrar]);
  const problemaDoPeriodo = (novo) => {
    if (!novo.de || !novo.ate) return null;
    if (novo.ate < novo.de) return 'O fim do período não pode ser antes do início.';
    if (diasEntre(novo.de, novo.ate) > DIAS_MAXIMO) return `O período vai até ${DIAS_MAXIMO} dias.`;
    return null;
  };
  const problema = problemaDoPeriodo(periodo);

  const alterarPeriodo = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!problemaDoPeriodo(novo)) filtrar({ de: novo.de, ate: novo.ate });
  };

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="movimento-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="movimento-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="movimento-conta">
            Conta
          </label>
          <SeletorRemoto
            id="movimento-conta"
            className="filter-select"
            valor={filtros.conta}
            onAlterar={filtrarConta}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            placeholder="Todas"
            textoVazio="Nenhuma conta"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="movimento-de">
            De
          </label>
          <input id="movimento-de" className="filter-input" type="date" value={periodo.de} onChange={alterarPeriodo('de')} />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="movimento-ate">
            Até
          </label>
          <input
            id="movimento-ate"
            className="filter-input"
            type="date"
            value={periodo.ate}
            onChange={alterarPeriodo('ate')}
            aria-invalid={problema ? true : undefined}
          />
        </div>
        {problema && <span className="caixa-form-erro">{problema}</span>}
      </div>
      <span className="caixa-form-ajuda">
        O realizado pelo extrato: uma linha por conta e dia com movimento, com o saldo da conta no fim do dia.
      </span>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && itens.length === 0 ? (
        <div className="caixa-status">Carregando movimento…</div>
      ) : itens.length === 0 ? (
        <div className="caixa-status">Nenhum movimento no período.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Movimento diário">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Conta</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Saldo no fim do dia</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={`${item.data}-${item.conta_bancaria_id}`}>
                  <td>{formatarData(item.data)}</td>
                  <td>{nomeConta(item.conta_bancaria_id)}</td>
                  <td>{formatarMoeda(item.entradas_centavos)}</td>
                  <td>{formatarMoeda(item.saidas_centavos)}</td>
                  <td className={item.saldo_centavos < 0 ? 'caixa-negativo' : undefined}>{formatarMoeda(item.saldo_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
