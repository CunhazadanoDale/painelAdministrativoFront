import React, { useCallback, useEffect, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { mesAnterior, mesAtualEmBrasilia } from '../comissoes/comissoesUtils';
import { opcaoDeConta } from './caixaUtils';
import { MovimentosSemLinha } from './MovimentosSemLinha';
import '../../app/components/DataGrid.css';
import './Caixa.css';

const carregarContas = (sinal) => contasService.listarTodasContasBancarias({ ativa: true, sinal });

function usePrevia(conta, competencia) {
  const [estado, setEstado] = useState({ chave: null, previa: null, erro: null });
  const chave = conta && competencia ? `${conta}|${competencia}` : null;

  useEffect(() => {
    if (!chave) return undefined;
    const [contaId, mes] = chave.split('|');
    const controle = new AbortController();
    caixaService
      .obterPreviaFechamento({ conta: contaId, competencia: mes, sinal: controle.signal })
      .then((resposta) => {
        if (!controle.signal.aborted) setEstado({ chave, previa: resposta?.dados ?? null, erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ chave, previa: null, erro: e.message || 'Erro ao carregar a prévia.' });
      });
    return () => controle.abort();
  }, [chave]);

  const atual = chave && estado.chave === chave;
  return { previa: atual ? estado.previa : null, erro: atual ? estado.erro : null, carregando: !!chave && !atual };
}

function impedimentos(previa) {
  const lista = [];
  if (!previa.mes_encerrado) lista.push('O mês ainda não terminou.');
  if (previa.lancamentos_pendentes > 0) lista.push(`${previa.lancamentos_pendentes} lançamento(s) pendente(s) de conciliação no mês.`);
  if (previa.conciliacoes_invalidadas > 0) {
    lista.push(`${previa.conciliacoes_invalidadas} conciliação(ões) invalidada(s) por estorno; desfaça antes de fechar.`);
  }
  if (previa.saldo_banco_centavos !== null && previa.saldo_banco_centavos !== previa.saldo_final_centavos) {
    const diferenca = Math.abs(previa.saldo_banco_centavos - previa.saldo_final_centavos);
    lista.push(`Saldo calculado diferente do saldo do banco: diferença de ${formatarMoeda(diferenca)}.`);
  }
  return lista;
}

export function FecharMesModal({ onFechado, onFechar }) {
  const [conta, setConta] = useState('');
  const [competencia, setCompetencia] = useState(mesAnterior(mesAtualEmBrasilia()));
  const [saldoBanco, setSaldoBanco] = useState('');
  const alterarConta = useCallback((valor) => setConta(valor), []);
  const { previa, erro, carregando } = usePrevia(conta, competencia);
  const problemas = previa ? impedimentos(previa) : [];
  const pedeSaldoBanco = previa && previa.saldo_banco_centavos === null;

  const validar = () => {
    if (!conta) return 'Escolha a conta.';
    if (!competencia) return 'Informe a competência.';
    if (!previa) return erro || 'Aguarde a prévia do fechamento.';
    if (problemas.length > 0) return 'Resolva as pendências antes de fechar.';
    if (pedeSaldoBanco) {
      const centavos = paraCentavos(saldoBanco);
      if (!saldoBanco.trim() || !Number.isFinite(centavos)) return 'Informe o saldo do banco no fim do mês.';
    }
    return null;
  };

  const fechar = async () => {
    await caixaService.fecharMes({
      conta_bancaria_id: conta,
      competencia,
      saldo_banco_centavos: pedeSaldoBanco ? paraCentavos(saldoBanco) : null,
    });
    onFechado();
  };

  return (
    <AcaoModal
      titulo="Fechar mês da conta"
      rotuloConfirmar="Fechar o mês"
      validar={validar}
      onConfirmar={fechar}
      onFechar={onFechar}
      onRecarregar={onFechado}
      largura="760px"
    >
      <p className="caixa-texto">
        Fecha o mês em sequência, depois de tudo conciliado ou classificado e com o saldo calculado igual ao do banco.
        Pagamentos e recebimentos sem linha no extrato não impedem, mas ficam como divergência.
      </p>
      <div className="caixa-form-linha">
        <div className="caixa-form-campo">
          <label className="filter-label" htmlFor="fechar-mes-conta">
            Conta *
          </label>
          <SeletorRemoto
            id="fechar-mes-conta"
            className="filter-select"
            valor={conta}
            onAlterar={alterarConta}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            textoVazio="Nenhuma conta ativa"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
        <div className="caixa-form-campo">
          <label className="filter-label" htmlFor="fechar-mes-competencia">
            Competência *
          </label>
          <input
            id="fechar-mes-competencia"
            className="filter-input"
            type="month"
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
          />
        </div>
      </div>

      {carregando && <span className="caixa-secundario">Carregando a prévia…</span>}
      {erro && <span className="caixa-form-erro">{erro}</span>}
      {previa && (
        <>
          <div className="datagrid-container">
            <table className="datagrid" aria-label="Prévia do fechamento">
              <thead>
                <tr>
                  <th>Saldo inicial</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Saldo final</th>
                  <th>Saldo do banco</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatarMoeda(previa.saldo_inicial_centavos)}</td>
                  <td>{formatarMoeda(previa.entradas_centavos)}</td>
                  <td>{formatarMoeda(previa.saidas_centavos)}</td>
                  <td>{formatarMoeda(previa.saldo_final_centavos)}</td>
                  <td>{previa.saldo_banco_centavos === null ? 'Sem saldo do banco no último dia' : formatarMoeda(previa.saldo_banco_centavos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {problemas.length > 0 ? (
            <ul className="caixa-falhas">
              {problemas.map((problema) => (
                <li key={problema}>{problema}</li>
              ))}
            </ul>
          ) : (
            !pedeSaldoBanco && <span className="caixa-positivo">Pode fechar.</span>
          )}
          {pedeSaldoBanco && (
            <div className="caixa-form-campo">
              <label className="filter-label" htmlFor="fechar-mes-saldo-banco">
                Saldo do banco no fim do mês *
              </label>
              <input
                id="fechar-mes-saldo-banco"
                className="filter-input"
                type="text"
                inputMode="decimal"
                value={saldoBanco}
                onChange={(evento) => setSaldoBanco(evento.target.value)}
              />
              <span className="caixa-form-ajuda">Nenhum OFX trouxe o saldo do último dia; informe o do extrato do banco.</span>
            </div>
          )}
          {(previa.movimentos_sem_linha ?? []).length > 0 && (
            <>
              <span className="filter-label">Movimentos do sistema sem linha no extrato (divergência)</span>
              <MovimentosSemLinha movimentos={previa.movimentos_sem_linha} />
            </>
          )}
        </>
      )}
    </AcaoModal>
  );
}
