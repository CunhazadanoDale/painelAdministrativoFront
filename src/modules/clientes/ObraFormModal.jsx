import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { UFS, erroDoCep, erroDoCnpj, formatarCep, normalizarCep, normalizarCnpj } from './clientesUtils';
import './Clientes.css';

const LIMITES = { nome: 160, logradouro: 200, numero: 20, complemento: 120, bairro: 120, cidade: 120 };

function formularioDe(obra) {
  return {
    nome: obra?.nome ?? '',
    cnpj: obra?.cnpj_formatado ?? obra?.cnpj ?? '',
    logradouro: obra?.logradouro ?? '',
    numero: obra?.numero ?? '',
    complemento: obra?.complemento ?? '',
    bairro: obra?.bairro ?? '',
    cidade: obra?.cidade ?? '',
    uf: obra?.uf ?? '',
    cep: obra?.cep ? formatarCep(obra.cep) : '',
  };
}

function textoOuNulo(texto) {
  const valor = texto.trim();
  return valor || null;
}

export function ObraFormModal({ obra, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => formularioDe(obra));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome da obra.';
    if (!form.logradouro.trim()) novosErros.logradouro = 'Informe o logradouro.';
    if (!form.cidade.trim()) novosErros.cidade = 'Informe a cidade.';
    if (!form.uf) novosErros.uf = 'Selecione a UF.';
    if (form.cnpj.trim()) {
      const erroCnpj = erroDoCnpj(form.cnpj);
      if (erroCnpj) novosErros.cnpj = erroCnpj;
    }
    const erroCep = erroDoCep(form.cep);
    if (erroCep) novosErros.cep = erroCep;
    Object.entries(LIMITES).forEach(([campo, limite]) => {
      if (!novosErros[campo] && form[campo].trim().length > limite) {
        novosErros[campo] = `No máximo ${limite} caracteres.`;
      }
    });
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const dados = {
      nome: form.nome.trim(),
      cnpj: normalizarCnpj(form.cnpj) || null,
      logradouro: form.logradouro.trim(),
      numero: textoOuNulo(form.numero),
      complemento: textoOuNulo(form.complemento),
      bairro: textoOuNulo(form.bairro),
      cidade: form.cidade.trim(),
      uf: form.uf,
      cep: normalizarCep(form.cep) || null,
    };

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(dados);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar a obra.');
    } finally {
      setSalvando(false);
    }
  };

  const campoTexto = (campo, rotulo, { obrigatorio = false, placeholder } = {}) => (
    <div className="clientes-form-campo">
      <label className="filter-label" htmlFor={`obra-${campo}`}>
        {obrigatorio ? `${rotulo} *` : rotulo}
      </label>
      <input
        id={`obra-${campo}`}
        className="filter-input"
        type="text"
        placeholder={placeholder}
        value={form[campo]}
        onChange={alterar(campo)}
        maxLength={LIMITES[campo]}
        disabled={salvando}
        aria-invalid={!!erros[campo] || undefined}
      />
      {erros[campo] && <span className="clientes-form-erro">{erros[campo]}</span>}
    </div>
  );

  return (
    <Modal
      aberto
      titulo={obra ? 'Editar Obra' : 'Nova Obra'}
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
            form="obra-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="obra-form" className="clientes-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="clientes-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}

        <div className="clientes-form-linha">
          {campoTexto('nome', 'Nome da obra', { obrigatorio: true, placeholder: 'Ex.: Residencial Mar Azul' })}
          {campoTexto('cnpj', 'CNPJ', { placeholder: 'CNPJ da SPE, opcional' })}
        </div>
        {campoTexto('logradouro', 'Logradouro', { obrigatorio: true })}
        <div className="clientes-form-linha">
          {campoTexto('numero', 'Número')}
          {campoTexto('complemento', 'Complemento')}
        </div>
        <div className="clientes-form-linha">
          {campoTexto('bairro', 'Bairro')}
          {campoTexto('cep', 'CEP', { placeholder: '00000-000' })}
        </div>
        <div className="clientes-form-linha">
          {campoTexto('cidade', 'Cidade', { obrigatorio: true })}
          <div className="clientes-form-campo">
            <label className="filter-label" htmlFor="obra-uf">
              UF *
            </label>
            <select
              id="obra-uf"
              className="filter-input"
              value={form.uf}
              onChange={alterar('uf')}
              disabled={salvando}
              aria-invalid={!!erros.uf || undefined}
            >
              <option value="">Selecione…</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {erros.uf && <span className="clientes-form-erro">{erros.uf}</span>}
          </div>
        </div>
      </form>
    </Modal>
  );
}
