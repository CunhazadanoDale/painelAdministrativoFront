import React, { useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import * as produtosService from '../../services/produtos';
import './Produtos.css';

const LIMITE_OBSERVACAO = 1000;

export function ReservaModal({ produto, onFechar, onSalvar }) {
  const [form, setForm] = useState({ local_id: '', quantidade: '', observacao: '' });
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

  const locais = ((saldo && saldo.locais) || []).filter((local) => local.disponivel > 0);
  const local = ((saldo && saldo.locais) || []).find((item) => item.local_id === form.local_id) || null;
  const quantidade = Number(form.quantidade);

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!form.local_id) novosErros.local_id = 'Selecione o local.';
    if (!form.quantidade.trim()) {
      novosErros.quantidade = 'Informe a quantidade.';
    } else if (!Number.isInteger(quantidade) || quantidade <= 0) {
      novosErros.quantidade = 'Informe um número inteiro maior que zero.';
    } else if (local && quantidade > local.disponivel) {
      novosErros.quantidade = `Quantidade maior que o disponível no local (${local.disponivel}).`;
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

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    try {
      await onSalvar({ local_id: form.local_id, quantidade, observacao: form.observacao.trim() });
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflito(e.message);
      } else {
        setErroApi(e.message || 'Erro ao registrar a reserva.');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Nova reserva"
      onFechar={salvando ? () => {} : onFechar}
      largura="460px"
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
            form="reserva-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Reservando…' : 'Reservar'}
          </button>
        </>
      }
    >
      <form id="reserva-form" className="produtos-form" onSubmit={salvar} noValidate>
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
          {produto?.nome}: a reserva separa a quantidade do disponível do local sem tirar do estoque.
        </p>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="reserva-local">
            Local *
          </label>
          <select
            id="reserva-local"
            className="filter-input"
            value={form.local_id}
            onChange={alterar('local_id')}
            disabled={salvando || !saldo}
            aria-invalid={!!erros.local_id || undefined}
          >
            <option value="">{saldo ? 'Selecione…' : 'Carregando…'}</option>
            {locais.map((item) => (
              <option key={item.local_id} value={item.local_id}>
                {`${item.local_nome} · ${nomeEmpresa(item.empresa_id)} — disponível ${item.disponivel}`}
              </option>
            ))}
          </select>
          {saldo && locais.length === 0 && (
            <span className="produtos-form-ajuda">Nenhum local do seu acesso tem saldo disponível deste produto.</span>
          )}
          {erros.local_id && <span className="produtos-form-erro">{erros.local_id}</span>}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="reserva-quantidade">
            Quantidade *
          </label>
          <input
            id="reserva-quantidade"
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
          <label className="filter-label" htmlFor="reserva-observacao">
            Observação
          </label>
          <textarea
            id="reserva-observacao"
            className="filter-input produtos-form-textarea"
            rows={3}
            placeholder="Para quem e por quê"
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
