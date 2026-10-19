import React, { useCallback, useState } from 'react';
import { centavosParaTexto, formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import * as contasService from '../../services/contasBancarias';
import { entradaSugerida, hojeEmBrasilia } from './pedidosUtils';

const LIMITE_MOTIVO = 1000;

export function ConfirmarPedidoModal({ pedido, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal
      titulo={`Confirmar pedido ${pedido.numero}`}
      rotuloConfirmar="Confirmar pedido"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      {pedido.vencida && (
        <div className="pedidos-form-erro-api" role="alert">
          A proposta venceu em {formatarData(pedido.validade)} e não pode ser confirmada. Edite a proposta para renovar a
          validade.
        </div>
      )}
      <p className="pedidos-texto">
        Confirmar reserva o disponível de cada item nos locais ativos da empresa, começando pelo local com mais
        disponível. O que faltar fica a cobrir. Depois de confirmado, os itens não mudam mais; o pedido só pode ser
        cancelado.
      </p>
    </AcaoModal>
  );
}

export function ReservarPendenciasModal({ pedido, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal
      titulo={`Reservar pendências do pedido ${pedido.numero}`}
      rotuloConfirmar="Reservar"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="pedidos-texto">
        Reserva o que estiver disponível agora nos locais da empresa para os itens que ainda faltam cobrir.
      </p>
    </AcaoModal>
  );
}

export function RegistrarEntradaModal({ pedido, onConfirmar, onFechar, onRecarregar }) {
  const [pagoEm, setPagoEm] = useState(hojeEmBrasilia());
  const [valor, setValor] = useState(centavosParaTexto(entradaSugerida(pedido)));

  const validar = () => {
    if (!pagoEm) return 'Informe a data do pagamento.';
    if (pagoEm > hojeEmBrasilia()) return 'A data do pagamento não pode estar no futuro.';
    const centavos = paraCentavos(valor);
    if (!Number.isFinite(centavos) || centavos < 1 || centavos > pedido.valor_total_centavos) {
      return `O valor vai de R$ 0,01 até o total do pedido (${formatarMoeda(pedido.valor_total_centavos)}).`;
    }
    return null;
  };

  return (
    <AcaoModal
      titulo={`Registrar entrada do pedido ${pedido.numero}`}
      rotuloConfirmar="Registrar"
      validar={validar}
      onConfirmar={() => onConfirmar({ pago_em: pagoEm, valor_centavos: paraCentavos(valor) })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="pedidos-texto">
        O prazo de entrega de {pedido.condicao?.prazo_entrega_dias ?? 120} dias passa a contar desta data. A entrada só
        é registrada uma vez.
      </p>
      <div className="pedidos-form-linha">
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrada-pago-em">
            Pago em *
          </label>
          <input
            id="entrada-pago-em"
            className="filter-input"
            type="date"
            max={hojeEmBrasilia()}
            value={pagoEm}
            onChange={(evento) => setPagoEm(evento.target.value)}
          />
        </div>
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="entrada-valor">
            Valor pago *
          </label>
          <input
            id="entrada-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </div>
      </div>
    </AcaoModal>
  );
}

export function CancelarPedidoModal({ pedido, onConfirmar, onFechar, onRecarregar }) {
  const entrada = pedido.entrada_paga_centavos ?? 0;
  const [motivo, setMotivo] = useState('');
  const [valor, setValor] = useState(entrada ? centavosParaTexto(entrada) : '');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo do cancelamento.';
    if (motivo.trim().length > LIMITE_MOTIVO) return `O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`;
    if (entrada) {
      const centavos = valor.trim() ? paraCentavos(valor) : 0;
      if (!Number.isFinite(centavos) || centavos < 0 || centavos > entrada) {
        return `O valor a devolver vai de zero até a entrada paga (${formatarMoeda(entrada)}).`;
      }
    }
    return null;
  };

  const confirmar = () =>
    onConfirmar({
      motivo: motivo.trim(),
      valor_a_devolver_centavos: entrada ? (valor.trim() ? paraCentavos(valor) : 0) : null,
    });

  return (
    <AcaoModal
      titulo={`Cancelar pedido ${pedido.numero}`}
      rotuloConfirmar="Cancelar o pedido"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="pedidos-texto">
        Cancelar libera as reservas e cancela as entregas ainda pendentes. Entrega em trânsito impede o cancelamento até
        ser concluída.
      </p>
      <div className="pedidos-form-campo">
        <label className="filter-label" htmlFor="cancelar-motivo">
          Motivo *
        </label>
        <textarea
          id="cancelar-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITE_MOTIVO}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
      {entrada > 0 && (
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="cancelar-devolver">
            Valor a devolver
          </label>
          <input
            id="cancelar-devolver"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
          />
          <span className="pedidos-form-ajuda">
            Fica registrado no pedido; a conta a pagar da devolução é lançada pelo financeiro.
          </span>
        </div>
      )}
    </AcaoModal>
  );
}

const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });

export function GerarTituloEntradaModal({ pedido, onConfirmar, onFechar, onRecarregar }) {
  const [vencimento, setVencimento] = useState(hojeEmBrasilia());
  const [contaId, setContaId] = useState('');
  const empresaId = pedido.empresa_id;
  const carregarContas = useCallback(
    (sinal) => contasService.listarTodasContasBancarias({ empresa: empresaId, ativa: true, sinal }),
    [empresaId]
  );

  return (
    <AcaoModal
      titulo={`Título de entrada do pedido ${pedido.numero}`}
      rotuloConfirmar="Gerar título"
      validar={() => (vencimento ? null : 'Informe o vencimento.')}
      onConfirmar={() => onConfirmar({ vencimento, conta_bancaria_id: contaId || null })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="pedidos-texto">
        Gera o título a receber da entrada de {formatarMoeda(entradaSugerida(pedido))}, número PED-{pedido.numero}. Quando
        o título for recebido por inteiro, a entrada fica registrada no pedido.
      </p>
      <div className="pedidos-form-linha">
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="titulo-entrada-vencimento">
            Vencimento *
          </label>
          <input
            id="titulo-entrada-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
        <div className="pedidos-form-campo">
          <label className="filter-label" htmlFor="titulo-entrada-conta">
            Conta de cobrança
          </label>
          <SeletorRemoto
            id="titulo-entrada-conta"
            className="filter-select"
            valor={contaId}
            onAlterar={setContaId}
            carregar={carregarContas}
            opcaoDe={opcaoDeConta}
            placeholder="Sem conta (fica em carteira)"
            textoVazio="Nenhuma conta ativa nesta empresa"
            textoErro="Erro ao carregar as contas bancárias."
            selecionarUnica={false}
          />
        </div>
      </div>
    </AcaoModal>
  );
}
