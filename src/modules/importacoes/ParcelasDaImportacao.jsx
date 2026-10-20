import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { centavosParaTexto, formatarData, formatarMoeda } from '../../lib/formatar';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { corStatus, rotuloStatus } from '../solicitacoes/solicitacoesUtils';
import {
  CAMBIO_BRL,
  LIMITES,
  VALOR_MAXIMO,
  cambioParaTexto,
  dataParaCampo,
  erroDoCambio,
  formatarCambio,
  formatarValorMoeda,
  paraCambioMicro,
  paraCentesimos,
  statusDaParcela,
  valorEmReais,
} from './importacoesUtils';
import { Plus } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '2px 8px' };
const CONTA_ENCERRADA = ['cancelado', 'rejeitado'];

export function ContaAPagar({ solicitacaoId, status }) {
  if (!solicitacaoId) return '—';
  return (
    <span className="importacoes-selo">
      <Link to={`/solicitacoes/${solicitacaoId}`}>Ver conta</Link>
      {status && <StatusBadge status={corStatus(status)} label={rotuloStatus(status)} />}
    </span>
  );
}

function ParcelaModal({ importacao, parcela, livre, onConfirmar, onFechar, onRecarregar }) {
  const [descricao, setDescricao] = useState(parcela?.descricao ?? '');
  const [valor, setValor] = useState(parcela ? centavosParaTexto(parcela.valor_moeda_centesimos) : '');
  const [vencimento, setVencimento] = useState(dataParaCampo(parcela?.vencimento_previsto));
  const limite = livre + (parcela?.valor_moeda_centesimos ?? 0);

  const validar = () => {
    const erros = [];
    if (!descricao.trim()) erros.push('Informe a descrição da parcela.');
    else if (descricao.trim().length > LIMITES.descricao_parcela) {
      erros.push(`A descrição tem no máximo ${LIMITES.descricao_parcela} caracteres.`);
    }
    const centesimos = paraCentesimos(valor);
    if (!Number.isFinite(centesimos) || centesimos < 1 || centesimos > VALOR_MAXIMO) {
      erros.push('Informe um valor maior que zero.');
    } else if (centesimos > limite) {
      erros.push(
        `A soma das parcelas não pode passar do valor dos itens (cabe ${formatarValorMoeda(limite, importacao.moeda)}).`
      );
    }
    if (!vencimento) erros.push('Informe o vencimento previsto.');
    return erros;
  };

  return (
    <AcaoModal
      titulo={parcela ? `Alterar parcela "${parcela.descricao}"` : `Nova parcela da importação ${importacao.numero}`}
      rotuloConfirmar={parcela ? 'Salvar parcela' : 'Incluir parcela'}
      validar={validar}
      onConfirmar={() =>
        onConfirmar({
          descricao: descricao.trim(),
          valor_moeda_centesimos: paraCentesimos(valor),
          vencimento_previsto: vencimento,
        })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="importacoes-texto">
        Pagamento ao fornecedor em {importacao.moeda}. A conta a pagar só nasce quando o câmbio for fechado.
      </p>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="parcela-descricao">
          Descrição *
        </label>
        <input
          id="parcela-descricao"
          className="filter-input"
          type="text"
          placeholder="Sinal 30%"
          value={descricao}
          maxLength={LIMITES.descricao_parcela}
          onChange={(evento) => setDescricao(evento.target.value)}
        />
      </div>
      <div className="importacoes-form-linha">
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="parcela-valor">
            Valor em {importacao.moeda} *
          </label>
          <input
            id="parcela-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="parcela-vencimento">
            Vencimento previsto *
          </label>
          <input
            id="parcela-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
      </div>
    </AcaoModal>
  );
}

function FecharCambioModal({ importacao, parcela, onConfirmar, onFechar, onRecarregar }) {
  const real = importacao.moeda === 'BRL';
  const [cambio, setCambio] = useState(real ? cambioParaTexto(CAMBIO_BRL) : '');
  const [vencimento, setVencimento] = useState(dataParaCampo(parcela.vencimento_previsto));
  const [categoria, setCategoria] = useState('');
  const micro = erroDoCambio(cambio, importacao.moeda) ? null : paraCambioMicro(cambio);
  const emReais = micro === null ? null : valorEmReais(parcela.valor_moeda_centesimos, micro);

  const validar = () => {
    const erros = [];
    const erroCambio = erroDoCambio(cambio, importacao.moeda);
    if (erroCambio) erros.push(erroCambio);
    if (!vencimento) erros.push('Informe o vencimento da conta a pagar.');
    if (!categoria) erros.push('Escolha a categoria de despesa.');
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Fechar câmbio da parcela "${parcela.descricao}"`}
      rotuloConfirmar="Fechar câmbio"
      validar={validar}
      onConfirmar={() =>
        onConfirmar({ cambio_micro: paraCambioMicro(cambio), vencimento, categoria_financeira_id: categoria })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="560px"
    >
      <p className="importacoes-texto">
        Grava o câmbio e gera a conta a pagar de {formatarValorMoeda(parcela.valor_moeda_centesimos, importacao.moeda)}{' '}
        em reais para o fornecedor, pendente de aprovação. Depois disso a parcela não muda; para desfazer, cancele ou
        rejeite a conta e reabra a parcela.
      </p>
      <div className="importacoes-form-linha">
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="cambio-taxa">
            Câmbio (R$ por {importacao.moeda}) *
          </label>
          <input
            id="cambio-taxa"
            className="filter-input"
            type="text"
            inputMode="decimal"
            placeholder="5,432100"
            value={cambio}
            disabled={real}
            onChange={(evento) => setCambio(evento.target.value)}
          />
          <span className="importacoes-form-ajuda">Até seis casas depois da vírgula.</span>
        </div>
        <div className="importacoes-form-campo">
          <label className="filter-label" htmlFor="cambio-vencimento">
            Vencimento da conta *
          </label>
          <input
            id="cambio-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
      </div>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="cambio-categoria">
          Categoria de despesa *
        </label>
        <SeletorCategoriaDespesa id="cambio-categoria" valor={categoria} onAlterar={setCategoria} placeholder="Selecione…" />
        <span className="importacoes-form-ajuda">
          Sugerida: compra de mercadoria, fora do resultado (o custo chega à DRE pelos lotes).
        </span>
      </div>
      <div className="importacoes-texto" role="status">
        Valor em reais: <strong>{emReais === null ? '—' : formatarMoeda(emReais)}</strong>
      </div>
    </AcaoModal>
  );
}

function ConfirmacaoModal({ titulo, rotulo, texto, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal titulo={titulo} rotuloConfirmar={rotulo} onConfirmar={onConfirmar} onFechar={onFechar} onRecarregar={onRecarregar}>
      <p className="importacoes-texto">{texto}</p>
    </AcaoModal>
  );
}

export function ParcelasDaImportacao({ importacao, acoes, onRecarregar }) {
  const [aberto, setAberto] = useState(null);
  const parcelas = importacao.parcelas ?? [];
  const ativas = parcelas.filter((parcela) => parcela.status !== 'cancelada');
  const somaAtivas = ativas.reduce((soma, parcela) => soma + parcela.valor_moeda_centesimos, 0);
  const livre = Math.max(0, (importacao.valor_total_moeda_centesimos ?? 0) - somaAtivas);
  const podeEscrever = importacao.status !== 'cancelada';
  const fechar = () => setAberto(null);
  const moeda = importacao.moeda;

  return (
    <div className="importacoes-itens">
      <div className="importacoes-painel-cabecalho">
        <span className="importacoes-texto">
          Parcelas ativas: <strong>{formatarValorMoeda(somaAtivas, moeda)}</strong> de{' '}
          {formatarValorMoeda(importacao.valor_total_moeda_centesimos, moeda)} dos itens
        </span>
        {podeEscrever && (
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ ...BOTAO, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setAberto({ tipo: 'nova' })}
          >
            <Plus size={14} /> Nova parcela
          </button>
        )}
      </div>
      {parcelas.length === 0 ? (
        <div className="importacoes-secundario">Nenhuma parcela lançada.</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor em {moeda}</th>
                <th>Previsto</th>
                <th>Status</th>
                <th>Câmbio</th>
                <th>Valor em reais</th>
                <th>Vencimento</th>
                <th>Conta a pagar</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {parcelas.map((parcela) => {
                const situacao = statusDaParcela(parcela.status);
                const aberta = parcela.status === 'aberta';
                const reabrivel =
                  parcela.status === 'cambio_fechado' && CONTA_ENCERRADA.includes(parcela.status_conta_a_pagar);
                return (
                  <tr key={parcela.id}>
                    <td>{parcela.descricao}</td>
                    <td>{formatarValorMoeda(parcela.valor_moeda_centesimos, moeda)}</td>
                    <td>{formatarData(parcela.vencimento_previsto)}</td>
                    <td>
                      <StatusBadge status={situacao.cor} label={situacao.rotulo} />
                    </td>
                    <td>{formatarCambio(parcela.cambio_micro)}</td>
                    <td>{parcela.valor_centavos === null || parcela.valor_centavos === undefined ? '—' : formatarMoeda(parcela.valor_centavos)}</td>
                    <td>{formatarData(parcela.vencimento)}</td>
                    <td>
                      <ContaAPagar solicitacaoId={parcela.solicitacao_id} status={parcela.status_conta_a_pagar} />
                    </td>
                    <td>
                      {podeEscrever && (
                        <div className="importacoes-acoes-linha">
                          {aberta && (
                            <>
                              <button
                                type="button"
                                className="filter-btn filter-btn-primary"
                                style={BOTAO}
                                onClick={() => setAberto({ tipo: 'cambio', parcela })}
                              >
                                Fechar câmbio
                              </button>
                              <button
                                type="button"
                                className="filter-btn filter-btn-secondary"
                                style={BOTAO}
                                onClick={() => setAberto({ tipo: 'alterar', parcela })}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="filter-btn importacoes-perigo"
                                style={BOTAO}
                                onClick={() => setAberto({ tipo: 'remover', parcela })}
                              >
                                Remover
                              </button>
                            </>
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aberto?.tipo === 'nova' && (
        <ParcelaModal
          importacao={importacao}
          livre={livre}
          onConfirmar={acoes.incluirParcela}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'alterar' && (
        <ParcelaModal
          importacao={importacao}
          parcela={aberto.parcela}
          livre={livre}
          onConfirmar={(dados) => acoes.atualizarParcela(aberto.parcela.id, dados)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'cambio' && (
        <FecharCambioModal
          importacao={importacao}
          parcela={aberto.parcela}
          onConfirmar={(dados) => acoes.fecharCambio(aberto.parcela.id, dados)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'remover' && (
        <ConfirmacaoModal
          titulo={`Remover parcela "${aberto.parcela.descricao}"`}
          rotulo="Remover parcela"
          texto="A parcela aberta ainda não tem conta a pagar e é apagada de vez."
          onConfirmar={() => acoes.removerParcela(aberto.parcela.id)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
      {aberto?.tipo === 'reabrir' && (
        <ConfirmacaoModal
          titulo={`Reabrir parcela "${aberto.parcela.descricao}"`}
          rotulo="Reabrir parcela"
          texto="A parcela atual fica cancelada, guardando a conta a pagar encerrada, e nasce uma parcela aberta igual para fechar o câmbio de novo."
          onConfirmar={() => acoes.reabrirParcela(aberto.parcela.id)}
          onFechar={fechar}
          onRecarregar={onRecarregar}
        />
      )}
    </div>
  );
}
