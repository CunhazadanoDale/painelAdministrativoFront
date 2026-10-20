import React, { useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { AberturaModal } from './AberturaModal';
import { nomeDaContaDoSaldo } from './caixaUtils';
import { useSaldosCaixa } from './useSaldosCaixa';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Caixa.css';

function valorEmData(centavos, data) {
  if (centavos === null || centavos === undefined) return '—';
  return `${formatarMoeda(centavos)} em ${formatarData(data)}`;
}

export function SaldosCaixa() {
  const nomeEmpresa = useNomesEmpresas();
  const { saldos, empresa, carregando, erro, recarregar, filtrar } = useSaldosCaixa();
  const [abrindo, setAbrindo] = useState(null);

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="saldos-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="saldos-empresa"
            className="filter-input"
            valor={empresa}
            onAlterar={filtrar}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        <span className="caixa-form-ajuda">
          Saldo atual = saldo inicial + linhas do extrato depois do corte. A diferença compara com o último saldo do banco
          importado no OFX.
        </span>
      </div>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && saldos.length === 0 ? (
        <div className="caixa-status">Carregando saldos…</div>
      ) : saldos.length === 0 ? (
        <div className="caixa-status">Nenhuma conta bancária nas empresas do seu acesso.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Saldos por conta">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Empresa</th>
                <th>Saldo inicial</th>
                <th>Saldo atual</th>
                <th>Último lançamento</th>
                <th>Saldo do banco</th>
                <th>Diferença</th>
                <th>Pendentes</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((saldo) => {
                const semAbertura = saldo.data_corte === null || saldo.data_corte === undefined;
                return (
                  <tr key={saldo.conta_bancaria_id}>
                    <td>
                      <span className="caixa-celula">
                        {nomeDaContaDoSaldo(saldo)}
                        {!saldo.ativa && <StatusBadge status="neutral" label="Inativa" />}
                      </span>
                    </td>
                    <td>{nomeEmpresa(saldo.empresa_id)}</td>
                    <td>
                      {semAbertura ? (
                        <StatusBadge status="warning" label="Sem saldo inicial" />
                      ) : (
                        valorEmData(saldo.saldo_inicial_centavos, saldo.data_corte)
                      )}
                    </td>
                    <td>{semAbertura ? '—' : <strong>{formatarMoeda(saldo.saldo_atual_centavos)}</strong>}</td>
                    <td>{saldo.ultimo_lancamento_em ? formatarData(saldo.ultimo_lancamento_em) : '—'}</td>
                    <td>{valorEmData(saldo.saldo_banco_centavos, saldo.saldo_banco_em)}</td>
                    <td className={saldo.diferenca_banco_centavos ? 'caixa-negativo' : undefined}>
                      {saldo.diferenca_banco_centavos === null || saldo.diferenca_banco_centavos === undefined
                        ? '—'
                        : formatarMoeda(saldo.diferenca_banco_centavos)}
                    </td>
                    <td>{saldo.lancamentos_pendentes}</td>
                    <td>
                      {saldo.ativa && (
                        <button
                          type="button"
                          className="filter-btn filter-btn-secondary"
                          style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
                          onClick={() => setAbrindo({ id: saldo.conta_bancaria_id, apelido: saldo.apelido })}
                        >
                          {semAbertura ? 'Informar saldo inicial' : 'Alterar saldo inicial'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {abrindo && <AberturaModal conta={abrindo} onSalvo={recarregar} onFechar={() => setAbrindo(null)} />}
    </>
  );
}
