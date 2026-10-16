import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import './Locais.css';

const LIMITE_NOME = 120;

export function LocalFormModal({ local, nomeEmpresa, onFechar, onSalvar }) {
  const editando = !!local;
  const [empresaId, setEmpresaId] = useState('');
  const [nome, setNome] = useState(local?.nome ?? '');
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const validar = () => {
    const novosErros = {};
    if (!editando && !empresaId) novosErros.empresa_id = 'Selecione a empresa.';
    const texto = nome.trim();
    if (!texto) novosErros.nome = 'Informe o nome.';
    else if (texto.length > LIMITE_NOME) novosErros.nome = `O nome tem no máximo ${LIMITE_NOME} caracteres.`;
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(editando ? nome.trim() : { empresa_id: empresaId, nome: nome.trim() });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o local.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={editando ? 'Renomear Local' : 'Novo Local de Estoque'}
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
            form="local-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="local-form" className="locais-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="locais-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}

        {editando ? (
          <div className="locais-form-campo">
            <span className="filter-label">Empresa</span>
            <span>{nomeEmpresa(local.empresa_id)}</span>
            <span className="locais-form-ajuda">A empresa do local não muda: o saldo e os lotes são dela.</span>
          </div>
        ) : (
          <div className="locais-form-campo">
            <label className="filter-label" htmlFor="local-empresa">
              Empresa *
            </label>
            <SeletorEmpresa
              id="local-empresa"
              className="filter-input"
              valor={empresaId}
              onAlterar={setEmpresaId}
              disabled={salvando}
              invalido={!!erros.empresa_id}
            />
            {erros.empresa_id && <span className="locais-form-erro">{erros.empresa_id}</span>}
          </div>
        )}

        <div className="locais-form-campo">
          <label className="filter-label" htmlFor="local-nome">
            Nome *
          </label>
          <input
            id="local-nome"
            className="filter-input"
            type="text"
            placeholder="Ex.: Galpão Cabedelo"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={LIMITE_NOME}
            autoFocus={editando}
            disabled={salvando}
            aria-invalid={!!erros.nome || undefined}
          />
          {erros.nome && <span className="locais-form-erro">{erros.nome}</span>}
        </div>
      </form>
    </Modal>
  );
}
