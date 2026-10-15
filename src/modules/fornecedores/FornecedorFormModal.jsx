import React, { useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import * as fornecedoresService from '../../services/fornecedores';
import {
  LIMITES,
  MOEDAS,
  UFS,
  erroDoDocumento,
  erroDoEmail,
  erroDoPais,
  normalizarDocumento,
  normalizarPais,
} from './fornecedoresUtils';
import './Fornecedores.css';

const CONTATOS = ['contato_nome', 'email', 'telefone'];

function formularioDe(fornecedor) {
  return {
    pais: fornecedor?.pais ?? 'BR',
    documento: fornecedor?.documento_formatado ?? fornecedor?.documento ?? '',
    identificacao_estrangeira: fornecedor?.identificacao_estrangeira ?? '',
    nome: fornecedor?.nome ?? '',
    nome_fantasia: fornecedor?.nome_fantasia ?? '',
    moeda_padrao: fornecedor?.moeda_padrao ?? 'BRL',
    uf: fornecedor?.uf ?? '',
    cidade: fornecedor?.cidade ?? '',
    contato_nome: fornecedor?.contato_nome ?? '',
    email: fornecedor?.email ?? '',
    telefone: fornecedor?.telefone ?? '',
    observacoes: fornecedor?.observacoes ?? '',
  };
}

function erroDeTamanho(form, campo, rotulo) {
  const valor = form[campo].trim();
  return valor.length > LIMITES[campo] ? `${rotulo} tem no máximo ${LIMITES[campo]} caracteres.` : null;
}

export function FornecedorFormModal({ fornecedor, onFechar, onSalvar }) {
  const editando = !!fornecedor;
  const [form, setForm] = useState(() => formularioDe(fornecedor));
  const [versao, setVersao] = useState(fornecedor?.versao ?? null);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const fornecedorId = fornecedor?.id ?? null;
  const pais = normalizarPais(form.pais);
  const brasil = pais === 'BR';

  useEffect(() => {
    if (!fornecedorId || recarga === 0) return undefined;
    const controle = new AbortController();

    fornecedoresService
      .obterFornecedor(fornecedorId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar o fornecedor.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });

    return () => {
      controle.abort();
    };
  }, [fornecedorId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!editando) {
      const erroPais = erroDoPais(form.pais);
      if (erroPais) novosErros.pais = erroPais;
      else if (brasil) {
        const erroDocumento = erroDoDocumento(form.documento);
        if (erroDocumento) novosErros.documento = erroDocumento;
      }
    }
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome ou a razão social.';
    const tamanhos = [
      ['nome', 'O nome'],
      ['nome_fantasia', 'O nome fantasia'],
      ['contato_nome', 'O contato'],
      ['telefone', 'O telefone'],
      ['observacoes', 'As observações'],
      ...(brasil ? [['cidade', 'A cidade']] : [['identificacao_estrangeira', 'A identificação']]),
    ];
    tamanhos.forEach(([campo, rotulo]) => {
      const erro = !novosErros[campo] && erroDeTamanho(form, campo, rotulo);
      if (erro) novosErros[campo] = erro;
    });
    const erroEmail = erroDoEmail(form.email) || erroDeTamanho(form, 'email', 'O e-mail');
    if (erroEmail) novosErros.email = erroEmail;
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const montarDados = () => {
    const dados = editando ? {} : { pais };
    if (!editando && brasil) dados.documento = normalizarDocumento(form.documento);
    const identificacao = form.identificacao_estrangeira.trim().toUpperCase();
    if (!brasil && identificacao) dados.identificacao_estrangeira = identificacao;
    dados.nome = form.nome.trim();
    if (form.nome_fantasia.trim()) dados.nome_fantasia = form.nome_fantasia.trim();
    dados.moeda_padrao = form.moeda_padrao;
    if (brasil && form.uf) dados.uf = form.uf;
    if (brasil && form.cidade.trim()) dados.cidade = form.cidade.trim();
    CONTATOS.forEach((campo) => {
      const valor = form[campo].trim();
      if (valor) dados[campo] = valor;
    });
    dados.observacoes = form.observacoes.trim();
    if (editando) dados.versao = versao;
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
        setErroApi(e.message || 'Erro ao salvar o fornecedor.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const campoTexto = (campo, rotulo, { obrigatorio = false, tipo = 'text', desabilitado = false } = {}) => (
    <div className="fornecedores-form-campo">
      <label className="filter-label" htmlFor={`fornecedor-${campo}`}>
        {obrigatorio ? `${rotulo} *` : rotulo}
      </label>
      <input
        id={`fornecedor-${campo}`}
        className="filter-input"
        type={tipo}
        value={form[campo]}
        onChange={alterar(campo)}
        maxLength={LIMITES[campo]}
        disabled={salvando || desabilitado}
      />
      {erros[campo] && <span className="fornecedores-form-erro">{erros[campo]}</span>}
    </div>
  );

  return (
    <Modal
      aberto
      titulo={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      onFechar={salvando ? () => {} : onFechar}
      largura="600px"
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
            form="fornecedor-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="fornecedor-form" className="fornecedores-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="fornecedores-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && (
          <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />
        )}
        {recarregado && (
          <div className="fornecedores-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o formulário e salve de novo para gravar por cima da
            outra alteração.
          </div>
        )}

        <div className="fornecedores-form-linha">
          <div className="fornecedores-form-campo">
            <label className="filter-label" htmlFor="fornecedor-pais">
              País *
            </label>
            <input
              id="fornecedor-pais"
              className="filter-input"
              type="text"
              value={form.pais}
              onChange={alterar('pais')}
              maxLength={2}
              autoFocus={!editando}
              disabled={salvando || editando}
            />
            {erros.pais && <span className="fornecedores-form-erro">{erros.pais}</span>}
          </div>

          {brasil ? (
            <div className="fornecedores-form-campo">
              <label className="filter-label" htmlFor="fornecedor-documento">
                CPF ou CNPJ *
              </label>
              <input
                id="fornecedor-documento"
                className="filter-input"
                type="text"
                value={form.documento}
                onChange={alterar('documento')}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                disabled={salvando || editando}
              />
              {erros.documento && <span className="fornecedores-form-erro">{erros.documento}</span>}
            </div>
          ) : (
            campoTexto('identificacao_estrangeira', 'Identificação estrangeira')
          )}
        </div>
        {editando && (
          <span className="fornecedores-form-ajuda">
            País e documento não mudam. Para corrigir, desative este fornecedor e cadastre outro.
          </span>
        )}

        {campoTexto('nome', 'Nome ou razão social', { obrigatorio: true })}
        {campoTexto('nome_fantasia', 'Nome fantasia')}

        <div className="fornecedores-form-linha">
          <div className="fornecedores-form-campo">
            <label className="filter-label" htmlFor="fornecedor-moeda">
              Moeda padrão
            </label>
            <select
              id="fornecedor-moeda"
              className="filter-input"
              value={form.moeda_padrao}
              onChange={alterar('moeda_padrao')}
              disabled={salvando}
            >
              {MOEDAS.map((moeda) => (
                <option key={moeda} value={moeda}>
                  {moeda}
                </option>
              ))}
            </select>
          </div>

          {brasil && (
            <div className="fornecedores-form-campo">
              <label className="filter-label" htmlFor="fornecedor-uf">
                UF
              </label>
              <select
                id="fornecedor-uf"
                className="filter-input"
                value={form.uf}
                onChange={alterar('uf')}
                disabled={salvando}
              >
                <option value="">Não informada</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {brasil && campoTexto('cidade', 'Cidade')}

        <div className="fornecedores-form-linha">
          {campoTexto('contato_nome', 'Contato')}
          {campoTexto('telefone', 'Telefone')}
        </div>
        {campoTexto('email', 'E-mail', { tipo: 'email' })}

        <div className="fornecedores-form-campo">
          <label className="filter-label" htmlFor="fornecedor-observacoes">
            Observações
          </label>
          <textarea
            id="fornecedor-observacoes"
            className="filter-input fornecedores-form-observacoes"
            value={form.observacoes}
            onChange={alterar('observacoes')}
            maxLength={LIMITES.observacoes}
            rows={3}
            disabled={salvando}
          />
          {erros.observacoes && <span className="fornecedores-form-erro">{erros.observacoes}</span>}
        </div>
      </form>
    </Modal>
  );
}
