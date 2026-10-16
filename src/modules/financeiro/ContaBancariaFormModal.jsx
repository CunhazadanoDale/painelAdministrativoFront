import React, { useCallback, useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import * as contasService from '../../services/contasBancarias';
import {
  LIMITE_APELIDO,
  TIPOS_CONTA,
  erroDaAgencia,
  erroDaConta,
  erroDoDigitoDaAgencia,
  erroDoDigitoDaConta,
  normalizarDigito,
  normalizarNumero,
  rotuloDoBanco,
  rotuloDoTipo,
} from './contasBancariasUtils';
import { SeletorBanco } from './SeletorBanco';
import './Financeiro.css';

const FORM_INICIAL = {
  empresa_id: '',
  banco: '',
  tipo: 'corrente',
  agencia: '',
  agencia_digito: '',
  conta: '',
  conta_digito: '',
};

export function ContaBancariaFormModal({ conta, nomeEmpresa, onFechar, onSalvar }) {
  const editando = !!conta;
  const [form, setForm] = useState(FORM_INICIAL);
  const [apelido, setApelido] = useState(conta?.apelido ?? '');
  const [versao, setVersao] = useState(conta?.versao ?? null);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const contaId = conta?.id ?? null;

  useEffect(() => {
    if (!contaId || recarga === 0) return undefined;
    const controle = new AbortController();

    contasService
      .obterContaBancaria(contaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a conta bancária.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });

    return () => {
      controle.abort();
    };
  }, [contaId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterarEmpresa = useCallback((valor) => setForm((atual) => ({ ...atual, empresa_id: valor })), []);
  const alterarBanco = useCallback((valor) => setForm((atual) => ({ ...atual, banco: valor })), []);

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!editando) {
      if (!form.empresa_id) novosErros.empresa_id = 'Selecione a empresa.';
      if (!form.banco) novosErros.banco = 'Selecione o banco.';
      const verificacoes = [
        ['agencia', erroDaAgencia],
        ['agencia_digito', erroDoDigitoDaAgencia],
        ['conta', erroDaConta],
        ['conta_digito', erroDoDigitoDaConta],
      ];
      verificacoes.forEach(([campo, verificar]) => {
        const erro = verificar(form[campo]);
        if (erro) novosErros[campo] = erro;
      });
    }
    const texto = apelido.trim();
    if (!texto) novosErros.apelido = 'Informe o apelido.';
    else if (texto.length > LIMITE_APELIDO) novosErros.apelido = `O apelido tem no máximo ${LIMITE_APELIDO} caracteres.`;
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const montarDados = () => {
    if (editando) return { apelido: apelido.trim(), versao };
    const dados = {
      empresa_id: form.empresa_id,
      banco: form.banco,
      tipo: form.tipo,
      agencia: normalizarNumero(form.agencia),
      conta: normalizarNumero(form.conta),
      apelido: apelido.trim(),
    };
    const agenciaDigito = normalizarDigito(form.agencia_digito);
    const contaDigito = normalizarDigito(form.conta_digito);
    if (agenciaDigito) dados.agencia_digito = agenciaDigito;
    if (contaDigito) dados.conta_digito = contaDigito;
    return dados;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(montarDados());
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflito(e.message);
      } else {
        setErroApi(e.message || 'Erro ao salvar a conta bancária.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const campoTexto = (campo, rotulo, { obrigatorio = false, maximo, modo } = {}) => (
    <div className="financeiro-form-campo">
      <label className="filter-label" htmlFor={`conta-${campo}`}>
        {obrigatorio ? `${rotulo} *` : rotulo}
      </label>
      <input
        id={`conta-${campo}`}
        className="filter-input"
        type="text"
        inputMode={modo}
        value={form[campo]}
        onChange={alterar(campo)}
        maxLength={maximo}
        disabled={salvando}
        aria-invalid={!!erros[campo] || undefined}
      />
      {erros[campo] && <span className="financeiro-form-erro">{erros[campo]}</span>}
    </div>
  );

  return (
    <Modal
      aberto
      titulo={editando ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
      onFechar={salvando ? () => {} : onFechar}
      largura="560px"
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
            form="conta-bancaria-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="conta-bancaria-form" className="financeiro-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="financeiro-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && (
          <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />
        )}
        {recarregado && (
          <div className="financeiro-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o apelido e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}

        {editando ? (
          <>
            <dl className="financeiro-resumo">
              <dt>Empresa</dt>
              <dd>{nomeEmpresa(conta.empresa_id)}</dd>
              <dt>Banco</dt>
              <dd>{rotuloDoBanco({ codigo: conta.banco, nome: conta.banco_nome })}</dd>
              <dt>Tipo</dt>
              <dd>{rotuloDoTipo(conta.tipo)}</dd>
              <dt>Agência e conta</dt>
              <dd>
                {conta.agencia_formatada} / {conta.conta_formatada}
              </dd>
            </dl>
            <span className="financeiro-form-ajuda">
              Só o apelido muda. Para corrigir banco, tipo, agência ou conta, desative esta conta e cadastre outra.
            </span>
          </>
        ) : (
          <>
            <div className="financeiro-form-campo">
              <label className="filter-label" htmlFor="conta-empresa">
                Empresa *
              </label>
              <SeletorEmpresa
                id="conta-empresa"
                className="filter-input"
                valor={form.empresa_id}
                onAlterar={alterarEmpresa}
                disabled={salvando}
                invalido={!!erros.empresa_id}
              />
              {erros.empresa_id && <span className="financeiro-form-erro">{erros.empresa_id}</span>}
            </div>

            <div className="financeiro-form-linha">
              <div className="financeiro-form-campo">
                <label className="filter-label" htmlFor="conta-banco">
                  Banco *
                </label>
                <SeletorBanco
                  id="conta-banco"
                  className="filter-input"
                  valor={form.banco}
                  onAlterar={alterarBanco}
                  disabled={salvando}
                  invalido={!!erros.banco}
                />
                {erros.banco && <span className="financeiro-form-erro">{erros.banco}</span>}
              </div>
              <div className="financeiro-form-campo">
                <label className="filter-label" htmlFor="conta-tipo">
                  Tipo *
                </label>
                <select
                  id="conta-tipo"
                  className="filter-input"
                  value={form.tipo}
                  onChange={alterar('tipo')}
                  disabled={salvando}
                >
                  {TIPOS_CONTA.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="financeiro-form-linha financeiro-form-linha-numero">
              {campoTexto('agencia', 'Agência', { obrigatorio: true, maximo: 5, modo: 'numeric' })}
              {campoTexto('agencia_digito', 'Dígito da agência', { maximo: 1 })}
            </div>
            <div className="financeiro-form-linha financeiro-form-linha-numero">
              {campoTexto('conta', 'Conta', { obrigatorio: true, maximo: 24, modo: 'numeric' })}
              {campoTexto('conta_digito', 'Dígito da conta', { maximo: 2 })}
            </div>
            <span className="financeiro-form-ajuda">
              Agência e conta só com números; o dígito vai no campo ao lado. Banco, tipo, agência e conta não mudam
              depois de gravados.
            </span>
          </>
        )}

        <div className="financeiro-form-campo">
          <label className="filter-label" htmlFor="conta-apelido">
            Apelido *
          </label>
          <input
            id="conta-apelido"
            className="filter-input"
            type="text"
            value={apelido}
            onChange={(event) => setApelido(event.target.value)}
            maxLength={LIMITE_APELIDO}
            autoFocus={editando}
            disabled={salvando}
            aria-invalid={!!erros.apelido || undefined}
          />
          {erros.apelido && <span className="financeiro-form-erro">{erros.apelido}</span>}
        </div>
      </form>
    </Modal>
  );
}
