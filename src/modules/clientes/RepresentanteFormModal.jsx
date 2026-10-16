import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import {
  erroDoDocumento,
  erroDoEmail,
  erroDoPercentual,
  normalizarDocumento,
  paraPontosBase,
  pontosBaseParaTexto,
} from './clientesUtils';
import './Clientes.css';

const LIMITES = { nome: 160, email: 255, telefone: 40 };

function formularioDe(representante) {
  return {
    nome: representante?.nome ?? '',
    documento: representante?.documento_formatado ?? representante?.documento ?? '',
    usuario_id: representante?.usuario_id ?? '',
    email: representante?.email ?? '',
    telefone: representante?.telefone ?? '',
    comissao_pronta_entrega: pontosBaseParaTexto(representante?.comissao_pronta_entrega_bp ?? 0),
    comissao_importacao: pontosBaseParaTexto(representante?.comissao_importacao_bp ?? 0),
  };
}

function textoOuNulo(texto) {
  const valor = texto.trim();
  return valor || null;
}

export function RepresentanteFormModal({ representante, usuarios, erroUsuarios, onFechar, onSalvar }) {
  const editando = !!representante;
  const [form, setForm] = useState(() => formularioDe(representante));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const perdeVinculo = editando && !!representante.usuario_id && !form.usuario_id;

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    const nome = form.nome.trim();
    if (!nome) novosErros.nome = 'Informe o nome.';
    else if (nome.length > LIMITES.nome) novosErros.nome = `O nome tem no máximo ${LIMITES.nome} caracteres.`;
    if (form.documento.trim()) {
      const erroDocumento = erroDoDocumento(form.documento);
      if (erroDocumento) novosErros.documento = erroDocumento;
    }
    const erroEmail = erroDoEmail(form.email);
    if (erroEmail) novosErros.email = erroEmail;
    if (form.telefone.trim().length > LIMITES.telefone) {
      novosErros.telefone = `O telefone tem no máximo ${LIMITES.telefone} caracteres.`;
    }
    ['comissao_pronta_entrega', 'comissao_importacao'].forEach((campo) => {
      const erro = erroDoPercentual(form[campo]);
      if (erro) novosErros[campo] = erro;
    });
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const documento = normalizarDocumento(form.documento);
    const dados = {
      nome: form.nome.trim(),
      documento: documento || null,
      usuario_id: form.usuario_id || null,
      email: textoOuNulo(form.email),
      telefone: textoOuNulo(form.telefone),
      comissao_pronta_entrega_bp: paraPontosBase(form.comissao_pronta_entrega),
      comissao_importacao_bp: paraPontosBase(form.comissao_importacao),
    };

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o representante.');
    } finally {
      setSalvando(false);
    }
  };

  const campoTexto = (campo, rotulo, { obrigatorio = false, tipo = 'text', maximo, placeholder } = {}) => (
    <div className="clientes-form-campo">
      <label className="filter-label" htmlFor={`representante-${campo}`}>
        {obrigatorio ? `${rotulo} *` : rotulo}
      </label>
      <input
        id={`representante-${campo}`}
        className="filter-input"
        type={tipo}
        inputMode={campo.startsWith('comissao') ? 'decimal' : undefined}
        placeholder={placeholder}
        value={form[campo]}
        onChange={alterar(campo)}
        maxLength={maximo}
        disabled={salvando}
        aria-invalid={!!erros[campo] || undefined}
      />
      {erros[campo] && <span className="clientes-form-erro">{erros[campo]}</span>}
    </div>
  );

  return (
    <Modal
      aberto
      titulo={editando ? 'Editar Representante' : 'Novo Representante'}
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
            form="representante-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="representante-form" className="clientes-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="clientes-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}

        {campoTexto('nome', 'Nome', { obrigatorio: true, maximo: LIMITES.nome })}

        <div className="clientes-form-linha">
          {campoTexto('documento', 'Documento', { placeholder: 'CPF ou CNPJ, opcional' })}
          <div className="clientes-form-campo">
            <label className="filter-label" htmlFor="representante-usuario">
              Usuário com login
            </label>
            <select
              id="representante-usuario"
              className="filter-input"
              value={form.usuario_id}
              onChange={alterar('usuario_id')}
              disabled={salvando || (!usuarios && !erroUsuarios)}
            >
              <option value="">{usuarios || erroUsuarios ? 'Sem login' : 'Carregando…'}</option>
              {(usuarios || []).map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nome} (${usuario.email})`}
                </option>
              ))}
            </select>
            {erroUsuarios && <span className="clientes-form-erro">{erroUsuarios}</span>}
          </div>
        </div>
        <span className="clientes-form-ajuda">
          {perdeVinculo
            ? 'Sem login, o vínculo é desfeito: esse usuário, se for comercial, passa a ver todos os clientes.'
            : 'Com login, o representante vê só os clientes em que ele é o representante.'}
        </span>

        <div className="clientes-form-linha">
          {campoTexto('email', 'E-mail', { tipo: 'email', maximo: LIMITES.email })}
          {campoTexto('telefone', 'Telefone', { maximo: LIMITES.telefone })}
        </div>

        <div className="clientes-form-linha">
          {campoTexto('comissao_pronta_entrega', 'Comissão pronta entrega (%)', { placeholder: 'Ex.: 3 ou 2,5' })}
          {campoTexto('comissao_importacao', 'Comissão importação (%)', { placeholder: 'Ex.: 1,5' })}
        </div>
      </form>
    </Modal>
  );
}
