import React, { useCallback, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { formatarData, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as contasService from '../../services/contasBancarias';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { hojeEmBrasilia } from '../pedidos/pedidosUtils';
import { CANAIS_BOLETO, agoraEmBrasilia, instanteDeBrasilia, numeroDoTitulo } from './receberUtils';

const LIMITE_MOTIVO_PRORROGACAO = 500;
const LIMITE_MOTIVO_CANCELAMENTO = 1000;
const LIMITE_MOTIVO_RECOMPRA = 500;

const opcaoDeConta = (conta) => ({ valor: conta.id, rotulo: `${conta.apelido} · ${conta.banco_nome}` });

export function ProrrogarTituloModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const [vencimento, setVencimento] = useState('');
  const [motivo, setMotivo] = useState('');
  const hoje = hojeEmBrasilia();
  const minimo = titulo.vencimento >= hoje ? titulo.vencimento : hoje;

  const validar = () => {
    if (!vencimento) return 'Informe o novo vencimento.';
    if (vencimento <= titulo.vencimento) return `O novo vencimento precisa ser depois de ${formatarData(titulo.vencimento)}.`;
    if (vencimento < hoje) return 'O novo vencimento não pode ser antes de hoje.';
    if (!motivo.trim()) return 'Informe o motivo da prorrogação.';
    if (motivo.trim().length > LIMITE_MOTIVO_PRORROGACAO) {
      return `O motivo tem no máximo ${LIMITE_MOTIVO_PRORROGACAO} caracteres.`;
    }
    return null;
  };

  return (
    <AcaoModal
      titulo={`Prorrogar título ${numeroDoTitulo(titulo)}`}
      rotuloConfirmar="Prorrogar"
      validar={validar}
      onConfirmar={() => onConfirmar({ vencimento, motivo: motivo.trim() })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">
        Vencimento atual: {formatarData(titulo.vencimento)}. A competência não muda.
      </p>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="prorrogar-vencimento">
          Novo vencimento *
        </label>
        <input
          id="prorrogar-vencimento"
          className="filter-input"
          type="date"
          min={minimo}
          value={vencimento}
          onChange={(evento) => setVencimento(evento.target.value)}
        />
      </div>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="prorrogar-motivo">
          Motivo *
        </label>
        <textarea
          id="prorrogar-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITE_MOTIVO_PRORROGACAO}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function EnviarAoBancoModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const [contaId, setContaId] = useState('');
  const empresaId = titulo.empresa_id;
  const carregarContas = useCallback(
    (sinal) => contasService.listarTodasContasBancarias({ empresa: empresaId, ativa: true, sinal }),
    [empresaId]
  );

  return (
    <AcaoModal
      titulo={`Enviar título ${numeroDoTitulo(titulo)} ao banco`}
      rotuloConfirmar="Enviar"
      validar={() => (contaId ? null : 'Escolha a conta de cobrança.')}
      onConfirmar={() => onConfirmar(contaId)}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">O título passa a ser cobrado pelo banco da conta escolhida.</p>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="enviar-conta">
          Conta de cobrança *
        </label>
        <SeletorRemoto
          id="enviar-conta"
          className="filter-select"
          valor={contaId}
          onAlterar={setContaId}
          carregar={carregarContas}
          opcaoDe={opcaoDeConta}
          textoVazio="Nenhuma conta ativa nesta empresa"
          textoErro="Erro ao carregar as contas bancárias."
          selecionarUnica={false}
        />
      </div>
    </AcaoModal>
  );
}

export function RetirarDoBancoModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  return (
    <AcaoModal
      titulo={`Retirar título ${numeroDoTitulo(titulo)} do banco`}
      rotuloConfirmar="Retirar"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">
        O título volta para a carteira e perde a conta de cobrança. Lembre de pedir a baixa do boleto no banco.
      </p>
    </AcaoModal>
  );
}

export function BoletoEnviadoModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const [canal, setCanal] = useState('email');
  const [enviadoEm, setEnviadoEm] = useState(agoraEmBrasilia);

  const validar = () => {
    if (!enviadoEm) return 'Informe quando o boleto foi enviado.';
    if (enviadoEm > agoraEmBrasilia()) return 'O envio não pode estar no futuro.';
    return null;
  };

  return (
    <AcaoModal
      titulo={`Boleto do título ${numeroDoTitulo(titulo)}`}
      rotuloConfirmar="Registrar"
      validar={validar}
      onConfirmar={() => onConfirmar({ canal, enviado_em: instanteDeBrasilia(enviadoEm) })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">Registra o último envio do boleto ao cliente; o status não muda.</p>
      <div className="receber-form-linha">
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="boleto-canal">
            Canal *
          </label>
          <select
            id="boleto-canal"
            className="filter-select"
            value={canal}
            onChange={(evento) => setCanal(evento.target.value)}
          >
            {CANAIS_BOLETO.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="boleto-enviado-em">
            Enviado em *
          </label>
          <input
            id="boleto-enviado-em"
            className="filter-input"
            type="datetime-local"
            value={enviadoEm}
            onChange={(evento) => setEnviadoEm(evento.target.value)}
          />
        </div>
      </div>
    </AcaoModal>
  );
}

export function CancelarTituloModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo do cancelamento.';
    if (motivo.trim().length > LIMITE_MOTIVO_CANCELAMENTO) {
      return `O motivo tem no máximo ${LIMITE_MOTIVO_CANCELAMENTO} caracteres.`;
    }
    return null;
  };

  return (
    <AcaoModal
      titulo={`Cancelar título ${numeroDoTitulo(titulo)}`}
      rotuloConfirmar="Cancelar o título"
      validar={validar}
      onConfirmar={() => onConfirmar(motivo.trim())}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">
        O título cancelado sai das cobranças e não volta. Título com recebimento precisa do estorno antes.
      </p>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="cancelar-titulo-motivo">
          Motivo *
        </label>
        <textarea
          id="cancelar-titulo-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITE_MOTIVO_CANCELAMENTO}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function RecompraModal({ titulo, onConfirmar, onFechar, onRecarregar }) {
  const hoje = hojeEmBrasilia();
  const [recompradoEm, setRecompradoEm] = useState(hoje);
  const [encargos, setEncargos] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [categoria, setCategoria] = useState('');
  const [motivo, setMotivo] = useState('');
  const centavosEncargos = encargos.trim() ? paraCentavos(encargos) : 0;
  const encargosValidos = Number.isFinite(centavosEncargos) && centavosEncargos >= 0;

  const validar = () => {
    const erros = [];
    if (!recompradoEm) erros.push('Informe a data da recompra.');
    else if (recompradoEm > hoje) erros.push('A data da recompra não pode estar no futuro.');
    if (!encargosValidos) erros.push('Os encargos não podem ser negativos.');
    if (!vencimento) erros.push('Informe o vencimento da conta a pagar.');
    if (!categoria) erros.push('Escolha a categoria de despesa da conta a pagar.');
    if (!motivo.trim()) erros.push('Informe o motivo da recompra.');
    else if (motivo.trim().length > LIMITE_MOTIVO_RECOMPRA) {
      erros.push(`O motivo tem no máximo ${LIMITE_MOTIVO_RECOMPRA} caracteres.`);
    }
    return erros;
  };

  const confirmar = () =>
    onConfirmar({
      recomprado_em: recompradoEm,
      encargos_centavos: centavosEncargos,
      vencimento,
      categoria_financeira_id: categoria,
      motivo: motivo.trim(),
    });

  return (
    <AcaoModal
      titulo={`Recomprar título ${numeroDoTitulo(titulo)}`}
      rotuloConfirmar="Recomprar"
      validar={validar}
      onConfirmar={confirmar}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="560px"
    >
      <p className="receber-texto">
        O título sai do borderô e volta para a carteira, e a empresa cobra o cliente de novo. Nasce a conta a pagar ao
        fomento de{' '}
        <strong>{formatarMoeda(titulo.saldo_centavos + (encargosValidos ? centavosEncargos : 0))}</strong> (saldo mais
        encargos), aguardando aprovação.
      </p>
      <div className="receber-form-linha">
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recompra-data">
            Recomprado em *
          </label>
          <input
            id="recompra-data"
            className="filter-input"
            type="date"
            max={hoje}
            value={recompradoEm}
            onChange={(evento) => setRecompradoEm(evento.target.value)}
          />
        </div>
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recompra-encargos">
            Encargos
          </label>
          <input
            id="recompra-encargos"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={encargos}
            onChange={(evento) => setEncargos(evento.target.value)}
          />
        </div>
      </div>
      <div className="receber-form-linha">
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recompra-vencimento">
            Vencimento da conta a pagar *
          </label>
          <input
            id="recompra-vencimento"
            className="filter-input"
            type="date"
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
          />
        </div>
        <div className="receber-form-campo">
          <label className="filter-label" htmlFor="recompra-categoria">
            Categoria da conta a pagar *
          </label>
          <SeletorCategoriaDespesa
            id="recompra-categoria"
            valor={categoria}
            onAlterar={setCategoria}
            placeholder="Selecione…"
          />
        </div>
      </div>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="recompra-motivo">
          Motivo *
        </label>
        <textarea
          id="recompra-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITE_MOTIVO_RECOMPRA}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}
