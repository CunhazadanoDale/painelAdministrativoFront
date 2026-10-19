import React, { useEffect, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { centavosParaTexto, paraCentavos } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { ultimoDiaDoMesAnterior } from './caixaUtils';
import './Caixa.css';

export function AberturaModal({ conta, onSalvo, onFechar }) {
  const [estado, setEstado] = useState({ carregada: false, abertura: null, erro: null });
  const [dataCorte, setDataCorte] = useState('');
  const [saldo, setSaldo] = useState('');
  const contaId = conta.id;

  useEffect(() => {
    const controle = new AbortController();
    caixaService
      .obterAbertura(contaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        const abertura = resposta?.dados ?? null;
        setEstado({ carregada: true, abertura, erro: null });
        setDataCorte(abertura?.data_corte ?? ultimoDiaDoMesAnterior());
        setSaldo(abertura ? centavosParaTexto(abertura.saldo_centavos) : '');
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        if (e.status === 404) {
          setEstado({ carregada: true, abertura: null, erro: null });
          setDataCorte(ultimoDiaDoMesAnterior());
        } else {
          setEstado({ carregada: true, abertura: null, erro: e.message || 'Erro ao carregar o saldo inicial.' });
        }
      });
    return () => controle.abort();
  }, [contaId]);

  const { carregada, abertura, erro } = estado;

  const validar = () => {
    if (!carregada) return 'Aguarde o carregamento do saldo inicial.';
    if (erro) return erro;
    const erros = [];
    if (!dataCorte) erros.push('Informe a data de corte.');
    else if (dataCorte >= hojeEmBrasilia()) erros.push('A data de corte precisa ser antes de hoje.');
    const centavos = paraCentavos(saldo);
    if (!saldo.trim() || !Number.isFinite(centavos)) erros.push('Informe o saldo no fim do dia de corte.');
    return erros;
  };

  const salvar = async () => {
    await caixaService.definirAbertura(contaId, {
      data_corte: dataCorte,
      saldo_centavos: paraCentavos(saldo),
      versao: abertura?.versao ?? null,
    });
    onSalvo();
  };

  return (
    <AcaoModal
      titulo={`Saldo inicial — ${conta.apelido}`}
      rotuloConfirmar="Salvar"
      validar={validar}
      onConfirmar={salvar}
      onFechar={onFechar}
      onRecarregar={onSalvo}
    >
      {!carregada ? (
        <span className="caixa-secundario">Carregando…</span>
      ) : erro ? (
        <span className="caixa-form-erro">{erro}</span>
      ) : (
        <>
          <p className="caixa-texto">
            O saldo do extrato parte daqui: é o saldo no fim do dia de corte, e o extrato vale do dia seguinte em diante.
            Linhas até o corte são ignoradas na importação. Use negativo para cheque especial.
            {abertura ? ' Depois do primeiro fechamento o saldo inicial não muda mais.' : ''}
          </p>
          <div className="caixa-form-linha">
            <div className="caixa-form-campo">
              <label className="filter-label" htmlFor="abertura-data-corte">
                Data de corte *
              </label>
              <input
                id="abertura-data-corte"
                className="filter-input"
                type="date"
                value={dataCorte}
                onChange={(evento) => setDataCorte(evento.target.value)}
              />
            </div>
            <div className="caixa-form-campo">
              <label className="filter-label" htmlFor="abertura-saldo">
                Saldo no fim do dia *
              </label>
              <input
                id="abertura-saldo"
                className="filter-input"
                type="text"
                inputMode="decimal"
                value={saldo}
                onChange={(evento) => setSaldo(evento.target.value)}
              />
            </div>
          </div>
        </>
      )}
    </AcaoModal>
  );
}
