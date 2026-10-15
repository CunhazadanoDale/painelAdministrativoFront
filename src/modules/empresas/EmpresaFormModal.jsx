import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import {
  LIMITE_NOME_FANTASIA,
  LIMITE_RAZAO_SOCIAL,
  REGIMES,
  UFS,
  erroDoCnpj,
  normalizarCnpj,
} from './empresasUtils';
import './Empresas.css';

export function EmpresaFormModal({ empresa, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => ({
    cnpj: empresa?.cnpj_formatado ?? empresa?.cnpj ?? '',
    razao_social: empresa?.razao_social ?? '',
    nome_fantasia: empresa?.nome_fantasia ?? '',
    uf: empresa?.uf ?? '',
    regime_tributario: empresa?.regime_tributario ?? '',
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!empresa) {
      const erroCnpj = erroDoCnpj(form.cnpj);
      if (erroCnpj) novosErros.cnpj = erroCnpj;
    }
    const razaoSocial = form.razao_social.trim();
    if (!razaoSocial) novosErros.razao_social = 'Informe a razão social.';
    else if (razaoSocial.length > LIMITE_RAZAO_SOCIAL)
      novosErros.razao_social = `A razão social tem no máximo ${LIMITE_RAZAO_SOCIAL} caracteres.`;
    const nomeFantasia = form.nome_fantasia.trim();
    if (!nomeFantasia) novosErros.nome_fantasia = 'Informe o nome fantasia.';
    else if (nomeFantasia.length > LIMITE_NOME_FANTASIA)
      novosErros.nome_fantasia = `O nome fantasia tem no máximo ${LIMITE_NOME_FANTASIA} caracteres.`;
    if (!form.uf) novosErros.uf = 'Escolha a UF.';
    if (!form.regime_tributario) novosErros.regime_tributario = 'Escolha o regime tributário.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    const dados = {
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim(),
      uf: form.uf,
      regime_tributario: form.regime_tributario,
    };

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(empresa ? dados : { cnpj: normalizarCnpj(form.cnpj), ...dados });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar a empresa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={empresa ? 'Editar Empresa' : 'Nova Empresa'}
      onFechar={salvando ? () => {} : onFechar}
      largura="520px"
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
            form="empresa-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="empresa-form" className="empresas-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="empresas-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}

        <div className="empresas-form-campo">
          <label className="filter-label" htmlFor="empresa-cnpj">
            CNPJ *
          </label>
          <input
            id="empresa-cnpj"
            className="filter-input"
            type="text"
            value={form.cnpj}
            onChange={alterar('cnpj')}
            placeholder="00.000.000/0000-00"
            autoFocus={!empresa}
            disabled={salvando || !!empresa}
          />
          {empresa ? (
            <span className="empresas-form-ajuda">
              O CNPJ não muda. Para corrigir, desative esta empresa e cadastre outra.
            </span>
          ) : (
            erros.cnpj && <span className="empresas-form-erro">{erros.cnpj}</span>
          )}
        </div>

        <div className="empresas-form-campo">
          <label className="filter-label" htmlFor="empresa-razao-social">
            Razão social *
          </label>
          <input
            id="empresa-razao-social"
            className="filter-input"
            type="text"
            value={form.razao_social}
            onChange={alterar('razao_social')}
            maxLength={LIMITE_RAZAO_SOCIAL}
            autoFocus={!!empresa}
            disabled={salvando}
          />
          {erros.razao_social && <span className="empresas-form-erro">{erros.razao_social}</span>}
        </div>

        <div className="empresas-form-campo">
          <label className="filter-label" htmlFor="empresa-nome-fantasia">
            Nome fantasia *
          </label>
          <input
            id="empresa-nome-fantasia"
            className="filter-input"
            type="text"
            value={form.nome_fantasia}
            onChange={alterar('nome_fantasia')}
            maxLength={LIMITE_NOME_FANTASIA}
            disabled={salvando}
          />
          {erros.nome_fantasia && <span className="empresas-form-erro">{erros.nome_fantasia}</span>}
        </div>

        <div className="empresas-form-linha">
          <div className="empresas-form-campo">
            <label className="filter-label" htmlFor="empresa-uf">
              UF *
            </label>
            <select
              id="empresa-uf"
              className="filter-input"
              value={form.uf}
              onChange={alterar('uf')}
              disabled={salvando}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {erros.uf && <span className="empresas-form-erro">{erros.uf}</span>}
          </div>

          <div className="empresas-form-campo">
            <label className="filter-label" htmlFor="empresa-regime">
              Regime tributário *
            </label>
            <select
              id="empresa-regime"
              className="filter-input"
              value={form.regime_tributario}
              onChange={alterar('regime_tributario')}
              disabled={salvando}
            >
              <option value="">Selecione</option>
              {REGIMES.map((regime) => (
                <option key={regime.valor} value={regime.valor}>
                  {regime.rotulo}
                </option>
              ))}
            </select>
            {erros.regime_tributario && (
              <span className="empresas-form-erro">{erros.regime_tributario}</span>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
