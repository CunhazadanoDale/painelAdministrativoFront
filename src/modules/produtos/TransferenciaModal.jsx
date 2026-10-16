import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { SeletorLocal } from '../../app/components/SeletorLocal';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import * as produtosService from '../../services/produtos';
import './Produtos.css';

const LIMITE_OBSERVACAO = 1000;

export function TransferenciaModal({ produto, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    local_origem_id: '',
    local_destino_id: '',
    quantidade: '',
    documento_ref: '',
    observacao: '',
  });
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const [erroSaldo, setErroSaldo] = useState(null);
  const [recargaSaldo, setRecargaSaldo] = useState(0);
  const [conflito, setConflito] = useState(null);
  const [recarregando, setRecarregando] = useState(false);
  const nomeEmpresa = useNomesEmpresas();
  const produtoId = produto ? produto.id : null;

  useEffect(() => {
    if (!produtoId) return undefined;
    const controle = new AbortController();

    produtosService
      .obterSaldo(produtoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setSaldo((resposta && resposta.dados) || null);
        setErroSaldo(null);
        setConflito(null);
      })
      .catch((e) => {
        if (!controle.signal.aborted) setErroSaldo(e.message || 'Erro ao carregar o saldo do produto.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });

    return () => {
      controle.abort();
    };
  }, [produtoId, recargaSaldo]);

  const recarregarSaldo = () => {
    setRecarregando(true);
    setRecargaSaldo((valor) => valor + 1);
  };

  const origens = ((saldo && saldo.locais) || []).filter((local) => local.disponivel > 0);
  const origem = ((saldo && saldo.locais) || []).find((local) => local.local_id === form.local_origem_id) || null;
  const quantidade = Number(form.quantidade);

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarDestino = useCallback(
    (localId) => setForm((atual) => ({ ...atual, local_destino_id: localId })),
    []
  );

  const validar = () => {
    const novosErros = {};
    if (!form.local_origem_id) novosErros.local_origem_id = 'Selecione o local de origem.';
    if (!form.local_destino_id) novosErros.local_destino_id = 'Selecione o local de destino.';
    else if (form.local_destino_id === form.local_origem_id) {
      novosErros.local_destino_id = 'O destino deve ser diferente da origem.';
    }

    if (!form.quantidade.trim()) {
      novosErros.quantidade = 'Informe a quantidade.';
    } else if (!Number.isInteger(quantidade) || quantidade <= 0) {
      novosErros.quantidade = 'Informe um número inteiro maior que zero.';
    } else if (origem && quantidade > origem.disponivel) {
      novosErros.quantidade = `Quantidade maior que o disponível na origem (${origem.disponivel}).`;
    }

    if (form.observacao.trim().length > LIMITE_OBSERVACAO) {
      novosErros.observacao = `A observação deve ter no máximo ${LIMITE_OBSERVACAO} caracteres.`;
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const dados = {
      local_origem_id: form.local_origem_id,
      local_destino_id: form.local_destino_id,
      quantidade,
      observacao: form.observacao.trim(),
    };
    if (form.documento_ref.trim()) dados.documento_ref = form.documento_ref.trim();

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflito(e.message);
      } else {
        setErroApi(e.message || 'Erro ao registrar a transferência.');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Transferir entre locais"
      onFechar={salvando ? () => {} : onFechar}
      largura="480px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="transferencia-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Transferindo…' : 'Transferir'}
          </button>
        </>
      }
    >
      <form id="transferencia-form" className="produtos-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="produtos-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {erroSaldo && (
          <div className="produtos-form-erro-api" role="alert">
            {erroSaldo}
          </div>
        )}
        {conflito && (
          <AvisoConflito mensagem={conflito} onRecarregar={recarregarSaldo} recarregando={recarregando} />
        )}

        <p className="produtos-movimento-produto">
          {produto?.nome}: a transferência não muda o saldo total e leva o custo e a data de entrada dos lotes da
          origem. Só entre locais da mesma empresa.
        </p>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="transferencia-origem">
            Origem *
          </label>
          <select
            id="transferencia-origem"
            className="filter-input"
            value={form.local_origem_id}
            onChange={alterar('local_origem_id')}
            disabled={salvando || !saldo}
            aria-invalid={!!erros.local_origem_id || undefined}
          >
            <option value="">{saldo ? 'Selecione…' : 'Carregando…'}</option>
            {origens.map((local) => (
              <option key={local.local_id} value={local.local_id}>
                {`${local.local_nome} · ${nomeEmpresa(local.empresa_id)} — disponível ${local.disponivel}`}
              </option>
            ))}
          </select>
          {saldo && origens.length === 0 && (
            <span className="produtos-form-ajuda">Nenhum local do seu acesso tem saldo disponível deste produto.</span>
          )}
          {erros.local_origem_id && <span className="produtos-form-erro">{erros.local_origem_id}</span>}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="transferencia-destino">
            Destino *
          </label>
          {origem ? (
            <SeletorLocal
              id="transferencia-destino"
              className="filter-input"
              empresaId={origem.empresa_id}
              valor={form.local_destino_id}
              onAlterar={alterarDestino}
              selecionarUnica={false}
              disabled={salvando}
              invalido={!!erros.local_destino_id}
            />
          ) : (
            <select id="transferencia-destino" className="filter-input" value="" disabled>
              <option value="">Escolha a origem primeiro</option>
            </select>
          )}
          {erros.local_destino_id && <span className="produtos-form-erro">{erros.local_destino_id}</span>}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="transferencia-quantidade">
            Quantidade *
          </label>
          <input
            id="transferencia-quantidade"
            className="filter-input"
            type="number"
            step="1"
            min="1"
            value={form.quantidade}
            onChange={alterar('quantidade')}
            disabled={salvando}
          />
          {erros.quantidade && <span className="produtos-form-erro">{erros.quantidade}</span>}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="transferencia-documento">
            Documento de referência
          </label>
          <input
            id="transferencia-documento"
            className="filter-input"
            type="text"
            placeholder="Nº do romaneio"
            value={form.documento_ref}
            onChange={alterar('documento_ref')}
            disabled={salvando}
          />
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="transferencia-observacao">
            Observação
          </label>
          <textarea
            id="transferencia-observacao"
            className="filter-input produtos-form-textarea"
            rows={3}
            value={form.observacao}
            onChange={alterar('observacao')}
            maxLength={LIMITE_OBSERVACAO}
            disabled={salvando}
          />
          {erros.observacao && <span className="produtos-form-erro">{erros.observacao}</span>}
        </div>
      </form>
    </Modal>
  );
}
