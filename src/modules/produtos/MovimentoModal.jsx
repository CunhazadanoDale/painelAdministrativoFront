import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { TIPOS_MOVIMENTO, aceitaQuantidadeNegativa } from './produtosUtils';
import './Produtos.css';

export function MovimentoModal({ produto, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    tipo: 'entrada',
    quantidade: '',
    documento_ref: '',
    observacao: '',
  });
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const quantidadeNegativa = aceitaQuantidadeNegativa(form.tipo);
  const saldoAtual = produto ? produto.saldo : 0;

  const validar = () => {
    const novosErros = {};

    const quantidade = Number(form.quantidade);
    if (!form.quantidade.trim()) {
      novosErros.quantidade = 'Informe a quantidade.';
    } else if (!Number.isInteger(quantidade) || quantidade === 0) {
      novosErros.quantidade = 'Informe um valor inteiro diferente de zero.';
    } else if (!quantidadeNegativa && quantidade < 0) {
      novosErros.quantidade = 'Informe uma quantidade positiva para este tipo.';
    } else if ((form.tipo === 'saida' || form.tipo === 'perda') && quantidade > saldoAtual) {
      novosErros.quantidade = `Quantidade maior que o saldo atual (${saldoAtual}).`;
    }

    if (form.observacao.trim().length > 1000) {
      novosErros.observacao = 'A observação deve ter no máximo 1000 caracteres.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar({
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        documento_ref: form.documento_ref.trim() || null,
        observacao: form.observacao.trim(),
      });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao registrar a movimentação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Movimentar estoque"
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
            form="movimento-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="movimento-form" className="produtos-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="produtos-form-erro-api">{erroApi}</div>}

        <p className="produtos-movimento-produto">
          {produto?.nome} — saldo atual: <strong>{saldoAtual}</strong>
        </p>

        <div className="produtos-form-linha">
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="movimento-tipo">
              Tipo *
            </label>
            <select
              id="movimento-tipo"
              className="filter-input"
              value={form.tipo}
              onChange={alterar('tipo')}
              disabled={salvando}
            >
              {TIPOS_MOVIMENTO.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="movimento-quantidade">
              Quantidade *
            </label>
            <input
              id="movimento-quantidade"
              className="filter-input"
              type="number"
              step="1"
              placeholder={quantidadeNegativa ? 'Ex.: -2 ou 3' : 'Ex.: 3'}
              value={form.quantidade}
              onChange={alterar('quantidade')}
              autoFocus
              disabled={salvando}
            />
            {erros.quantidade && <span className="produtos-form-erro">{erros.quantidade}</span>}
          </div>
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="movimento-documento">
            Documento de referência
          </label>
          <input
            id="movimento-documento"
            className="filter-input"
            type="text"
            placeholder="Nº da nota ou pedido"
            value={form.documento_ref}
            onChange={alterar('documento_ref')}
            disabled={salvando}
          />
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="movimento-observacao">
            Observação
          </label>
          <textarea
            id="movimento-observacao"
            className="filter-input produtos-form-textarea"
            rows={3}
            value={form.observacao}
            onChange={alterar('observacao')}
            disabled={salvando}
          />
          {erros.observacao && <span className="produtos-form-erro">{erros.observacao}</span>}
        </div>
      </form>
    </Modal>
  );
}
