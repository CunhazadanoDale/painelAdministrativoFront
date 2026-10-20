import React, { useCallback, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { SeletorCategoriaLancavel } from '../financeiro/SeletorCategoriaDespesa';
import { opcaoDeConta } from './caixaUtils';
import './Caixa.css';

const LIMITE_DESCRICAO = 255;
const LIMITE_MOTIVO = 500;

function CampoDescricao({ id, valor, onAlterar }) {
  return (
    <div className="caixa-form-campo">
      <label className="filter-label" htmlFor={id}>
        Descrição
      </label>
      <input
        id={id}
        className="filter-input"
        type="text"
        maxLength={LIMITE_DESCRICAO}
        value={valor}
        onChange={(evento) => onAlterar(evento.target.value)}
      />
    </div>
  );
}

export function ClassificarModal({ lancamento, onFeito, onFechar }) {
  const credito = lancamento.valor_centavos > 0;
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState(lancamento.descricao ?? '');

  const classificar = async () => {
    await caixaService.classificarLancamento(lancamento.id, {
      categoria_financeira_id: categoria,
      descricao: descricao.trim(),
    });
    onFeito();
  };

  return (
    <AcaoModal
      titulo={`Classificar lançamento de ${formatarData(lancamento.data)}`}
      rotuloConfirmar="Classificar"
      validar={() => (categoria ? null : 'Escolha a categoria.')}
      onConfirmar={classificar}
      onFechar={onFechar}
      onRecarregar={onFeito}
    >
      <p className="caixa-texto">
        Para a linha sem par no sistema ({credito ? 'rendimento, juros recebidos' : 'tarifa, IOF, juros'}):{' '}
        {lancamento.descricao} · <strong>{formatarMoeda(lancamento.valor_centavos)}</strong>. Vira um lançamento de
        caixa já conciliado, na competência do mês da linha.
      </p>
      <div className="caixa-form-campo">
        <label className="filter-label" htmlFor="classificar-categoria">
          Categoria *
        </label>
        <SeletorCategoriaLancavel
          natureza={credito ? 'receita' : 'despesa'}
          id="classificar-categoria"
          valor={categoria}
          onAlterar={setCategoria}
          placeholder="Selecione…"
        />
      </div>
      <CampoDescricao id="classificar-descricao" valor={descricao} onAlterar={setDescricao} />
    </AcaoModal>
  );
}

export function TransferenciaModal({ lancamento, onFeito, onFechar }) {
  const debito = lancamento.valor_centavos < 0;
  const [contaId, setContaId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState(lancamento.descricao ?? '');
  const contaDaLinha = lancamento.conta_bancaria_id;
  const carregarContas = useCallback(
    (sinal) =>
      contasService
        .listarTodasContasBancarias({ ativa: true, sinal })
        .then((contas) => (contas ?? []).filter((conta) => conta.id !== contaDaLinha)),
    [contaDaLinha]
  );
  const alterarConta = useCallback((valor) => setContaId(valor), []);
  const rotuloConta = debito ? 'Conta de destino *' : 'Conta de origem *';

  const validar = () => {
    const erros = [];
    if (!contaId) erros.push('Escolha a outra conta.');
    if (!categoria) erros.push('Escolha a categoria.');
    return erros;
  };

  const transferir = async () => {
    await caixaService.transferirLancamento(lancamento.id, {
      conta_contraparte_id: contaId,
      categoria_financeira_id: categoria,
      descricao: descricao.trim(),
    });
    onFeito();
  };

  return (
    <AcaoModal
      titulo={`Transferência entre contas — ${formatarData(lancamento.data)}`}
      rotuloConfirmar="Registrar transferência"
      validar={validar}
      onConfirmar={transferir}
      onFechar={onFechar}
      onRecarregar={onFeito}
    >
      <p className="caixa-texto">
        {formatarMoeda(Math.abs(lancamento.valor_centavos))}{' '}
        {debito ? 'sai desta conta e entra na conta de destino' : 'entra nesta conta, vindo da conta de origem'}. A outra
        ponta fica pendente até a linha dela chegar no extrato. Entre empresas do grupo, fica marcada sem título nem conta
        a pagar.
      </p>
      <div className="caixa-form-campo">
        <label className="filter-label" htmlFor="transferencia-conta">
          {rotuloConta}
        </label>
        <SeletorRemoto
          id="transferencia-conta"
          className="filter-select"
          valor={contaId}
          onAlterar={alterarConta}
          carregar={carregarContas}
          opcaoDe={opcaoDeConta}
          textoVazio="Nenhuma outra conta ativa"
          textoErro="Erro ao carregar as contas bancárias."
          selecionarUnica={false}
        />
      </div>
      <div className="caixa-form-campo">
        <label className="filter-label" htmlFor="transferencia-categoria">
          Categoria *
        </label>
        <SeletorCategoriaLancavel
          natureza="transferencia"
          id="transferencia-categoria"
          valor={categoria}
          onAlterar={setCategoria}
          placeholder="Selecione…"
        />
      </div>
      <CampoDescricao id="transferencia-descricao" valor={descricao} onAlterar={setDescricao} />
    </AcaoModal>
  );
}

export function DesfazerConciliacaoModal({ lancamento, onFeito, onFechar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo.';
    if (motivo.trim().length > LIMITE_MOTIVO) return `O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`;
    return null;
  };

  const desfazer = async () => {
    await caixaService.desfazerConciliacao(lancamento.conciliacao_id, motivo.trim());
    onFeito();
  };

  return (
    <AcaoModal
      titulo={`Desfazer conciliação de ${formatarData(lancamento.data)}`}
      rotuloConfirmar="Desfazer"
      validar={validar}
      onConfirmar={desfazer}
      onFechar={onFechar}
      onRecarregar={onFeito}
    >
      <p className="caixa-texto">
        A linha e os movimentos voltam a pendentes; a conciliação fica guardada como desfeita. Classificação e
        transferência criadas por ela são estornadas.
      </p>
      <div className="caixa-form-campo">
        <label className="filter-label" htmlFor="desfazer-conciliacao-motivo">
          Motivo *
        </label>
        <textarea
          id="desfazer-conciliacao-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}
