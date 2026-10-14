import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorLocal } from '../../app/components/SeletorLocal';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { paraCentavos } from '../../lib/formatar';
import * as produtosService from '../../services/produtos';
import {
  TIPOS_MOVIMENTO,
  aceitaQuantidadeNegativa,
  consomeSaldo,
  custoNoMovimento,
} from './produtosUtils';
import './Produtos.css';

export function MovimentoModal({ produto, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    tipo: 'entrada',
    local_id: '',
    quantidade: '',
    custo: '',
    documento_ref: '',
    observacao: '',
  });
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const nomeEmpresa = useNomesEmpresas();
  const produtoId = produto ? produto.id : null;

  useEffect(() => {
    if (!produtoId) return undefined;
    let cancelado = false;

    produtosService
      .obterSaldo(produtoId)
      .then((resposta) => {
        if (!cancelado) setSaldo((resposta && resposta.dados) || null);
      })
      .catch(() => {
        if (!cancelado) setSaldo(null);
      });

    return () => {
      cancelado = true;
    };
  }, [produtoId]);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarLocal = useCallback(
    (localId) => setForm((atual) => ({ ...atual, local_id: localId })),
    []
  );

  const quantidade = Number(form.quantidade);
  const quantidadeNegativa = aceitaQuantidadeNegativa(form.tipo);
  const consome = consomeSaldo(form.tipo, quantidade);
  const custo = custoNoMovimento(form.tipo, quantidade);
  const implantacao = form.tipo === 'implantacao';
  const aceitaLocalInativo = form.tipo === 'saida' || form.tipo === 'perda';

  const saldoDoLocal =
    saldo && form.local_id
      ? (saldo.locais || []).find((item) => item.local_id === form.local_id) || {
          quantidade: 0,
          disponivel: 0,
        }
      : null;

  const validar = () => {
    const novosErros = {};

    if (!form.local_id) {
      novosErros.local_id = 'Selecione o local do estoque.';
    }

    if (!form.quantidade.trim()) {
      novosErros.quantidade = 'Informe a quantidade.';
    } else if (!Number.isInteger(quantidade) || quantidade === 0) {
      novosErros.quantidade = 'Informe um valor inteiro diferente de zero.';
    } else if (!quantidadeNegativa && quantidade < 0) {
      novosErros.quantidade = 'Informe uma quantidade positiva para este tipo.';
    } else if (consome && saldoDoLocal && Math.abs(quantidade) > saldoDoLocal.disponivel) {
      novosErros.quantidade = `Quantidade maior que o disponível no local (${saldoDoLocal.disponivel}).`;
    } else if (implantacao && saldo && quantidade > saldo.nao_alocado) {
      novosErros.quantidade = `Quantidade maior que o saldo não alocado (${saldo.nao_alocado}).`;
    }

    if (custo !== 'proibido') {
      const centavos = paraCentavos(form.custo);
      if (!form.custo.trim()) {
        if (custo === 'obrigatorio') novosErros.custo = 'Informe o custo unitário da entrada.';
      } else if (!Number.isFinite(centavos) || centavos < 0) {
        novosErros.custo = 'Informe um custo válido, zero ou maior.';
      }
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

    const dados = {
      local_id: form.local_id,
      tipo: form.tipo,
      quantidade,
      documento_ref: form.documento_ref.trim() || null,
      observacao: form.observacao.trim(),
    };
    if (custo !== 'proibido' && form.custo.trim()) {
      dados.custo_unitario_centavos = paraCentavos(form.custo);
    }

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(dados);
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
          {produto?.nome} — saldo total: <strong>{saldo ? saldo.saldo : produto?.saldo}</strong>
        </p>
        {saldoDoLocal && (
          <p className="produtos-movimento-produto">
            {`Disponível neste local: ${saldoDoLocal.disponivel}`}
          </p>
        )}
        {implantacao && saldo && (
          <p className="produtos-movimento-produto">{`Não alocado: ${saldo.nao_alocado}`}</p>
        )}

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
          <label className="filter-label" htmlFor="movimento-local">
            Local *
          </label>
          <SeletorLocal
            id="movimento-local"
            className="filter-input"
            valor={form.local_id}
            onAlterar={alterarLocal}
            apenasAtivos={!aceitaLocalInativo}
            nomeEmpresa={nomeEmpresa}
            disabled={salvando}
            invalido={!!erros.local_id}
          />
          {erros.local_id && <span className="produtos-form-erro">{erros.local_id}</span>}
        </div>

        {custo !== 'proibido' && (
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="movimento-custo">
              {custo === 'obrigatorio' ? 'Custo unitário *' : 'Custo unitário (opcional)'}
            </label>
            <input
              id="movimento-custo"
              className="filter-input"
              type="text"
              inputMode="decimal"
              placeholder={custo === 'obrigatorio' ? 'Ex.: 25,90' : 'Vazio = custo desconhecido'}
              value={form.custo}
              onChange={alterar('custo')}
              disabled={salvando}
            />
            {erros.custo && <span className="produtos-form-erro">{erros.custo}</span>}
          </div>
        )}

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
