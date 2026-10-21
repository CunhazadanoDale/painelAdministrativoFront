import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { centavosParaTexto, formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import { ContaAPagar } from '../importacoes/ParcelasDaImportacao';
import { VALOR_MAXIMO, dataParaCampo, situacaoDaParcela } from './dividasUtils';
import '../../app/components/DataGrid.css';
import './Dividas.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '2px 8px' };

function ContaDaParcela({ parcela, conta, valor }) {
  if (conta) return <ContaAPagar solicitacaoId={conta.solicitacao_id} status={conta.status} />;
  if (parcela.status === 'prevista' && valor > 0) return <span className="dividas-secundario">Prevista</span>;
  return '—';
}

function AlterarParcelaModal({ divida, parcela, onConfirmar, onFechar, onRecarregar }) {
  const [vencimento, setVencimento] = useState(dataParaCampo(parcela.vencimento));
  const [juros, setJuros] = useState(centavosParaTexto(parcela.juros_centavos));

  const jurosEmCentavos = () => (juros.trim() ? paraCentavos(juros) : 0);

  const validar = () => {
    const erros = [];
    if (!vencimento) erros.push('Informe o vencimento.');
    else if (vencimento <= dataParaCampo(divida.data_saldo)) {
      erros.push(`O vencimento tem de ser depois da data do saldo (${formatarData(divida.data_saldo)}).`);
    }
    const valor = jurosEmCentavos();
    if (!Number.isFinite(valor) || valor < 0 || valor > VALOR_MAXIMO) erros.push('Juros inválidos.');
    else if (valor === 0 && parcela.amortizacao_centavos === 0) {
      erros.push('A parcela sem amortização precisa de juros maior que zero.');
    }
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Alterar a parcela ${parcela.numero}`}
      rotuloConfirmar="Salvar parcela"
      validar={validar}
      onConfirmar={() => onConfirmar({ vencimento, juros_centavos: jurosEmCentavos() })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="dividas-texto">
        Só a parcela prevista, ainda sem contas a pagar, muda. O vencimento fica entre o da parcela anterior e o da
        seguinte; a amortização ({formatarMoeda(parcela.amortizacao_centavos)}) só muda por renegociação.
      </p>
      <div className="dividas-form-linha">
        <div className="dividas-form-campo">
          <label className="filter-label" htmlFor="parcela-divida-vencimento">
            Vencimento *
          </label>
          <input
            id="parcela-divida-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
        <div className="dividas-form-campo">
          <label className="filter-label" htmlFor="parcela-divida-juros">
            Juros, encargos e IOF
          </label>
          <input
            id="parcela-divida-juros"
            className="filter-input"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={juros}
            onChange={(evento) => setJuros(evento.target.value)}
          />
        </div>
      </div>
    </AcaoModal>
  );
}

function ReabrirParcelaModal({ parcela, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal
      titulo={`Reabrir a parcela ${parcela.numero}`}
      rotuloConfirmar="Reabrir parcela"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="dividas-texto">
        A parcela atual fica cancelada, guardando as contas a pagar dela, e nasce outra prevista com o mesmo número e
        vencimento, só com o que não foi pago. A nova pode ser alterada e gerada de novo.
      </p>
    </AcaoModal>
  );
}

export function ParcelasDaDivida({ divida, acoes, onRecarregar }) {
  const [aberto, setAberto] = useState(null);
  const parcelas = divida.parcelas ?? [];
  const ativa = divida.status === 'ativa';
  const fechar = () => setAberto(null);

  return (
    <div className="dividas-itens">
      <div className="dividas-painel-cabecalho">
        <span className="dividas-texto">
          Saldo devedor: <strong>{formatarMoeda(divida.saldo_devedor_centavos)}</strong>
        </span>
      </div>
      {parcelas.length === 0 ? (
        <div className="dividas-secundario">Nenhuma parcela.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Parcelas">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Vencimento</th>
                <th>Amortização</th>
                <th>Juros</th>
                <th>Situação</th>
                <th>Conta da amortização</th>
                <th>Conta dos juros</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {parcelas.map((parcela) => {
                const situacao = situacaoDaParcela(parcela.situacao);
                const alteravel = ativa && parcela.status === 'prevista';
                const reabrivel = ativa && parcela.status === 'gerada' && parcela.situacao === 'conta_cancelada';
                return (
                  <tr
                    key={parcela.id}
                    className={parcela.status === 'cancelada' ? 'dividas-parcela-cancelada' : undefined}
                  >
                    <td>{parcela.numero}</td>
                    <td>{formatarData(parcela.vencimento)}</td>
                    <td>{formatarMoeda(parcela.amortizacao_centavos)}</td>
                    <td>{formatarMoeda(parcela.juros_centavos)}</td>
                    <td>
                      <StatusBadge status={situacao.cor} label={situacao.rotulo} />
                    </td>
                    <td>
                      <ContaDaParcela
                        parcela={parcela}
                        conta={parcela.conta_amortizacao}
                        valor={parcela.amortizacao_centavos}
                      />
                    </td>
                    <td>
                      <ContaDaParcela parcela={parcela} conta={parcela.conta_juros} valor={parcela.juros_centavos} />
                    </td>
                    <td>
                      <div className="dividas-acoes-linha">
                        {alteravel && (
                          <button
                            type="button"
                            className="filter-btn filter-btn-secondary"
                            style={BOTAO}
                            onClick={() => setAberto({ tipo: 'alterar', parcela })}
                          >
                            Alterar
                          </button>
                        )}
                        {reabrivel && (
                          <button
                            type="button"
                            className="filter-btn filter-btn-secondary"
                            style={BOTAO}
                            onClick={() => setAberto({ tipo: 'reabrir', parcela })}
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <span className="dividas-form-ajuda">
        Cada parcela gera duas contas a pagar: a amortização (fora da DRE) e os juros (resultado financeiro). As previstas
        viram conta na geração da competência do vencimento.
      </span>

      {aberto?.tipo === 'alterar' && (
        <AlterarParcelaModal
          divida={divida}
          parcela={aberto.parcela}
          onConfirmar={(dados) => acoes.atualizarParcela(aberto.parcela.id, dados)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'reabrir' && (
        <ReabrirParcelaModal
          parcela={aberto.parcela}
          onConfirmar={() => acoes.reabrirParcela(aberto.parcela.id)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
    </div>
  );
}
