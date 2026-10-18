import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Clientes.css';

const LIMITE_NOME = 120;

export function GrupoFormModal({ grupo, onFechar, onSalvar }) {
  const [nome, setNome] = useState(grupo?.nome ?? '');
  const [erro, setErro] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (event) => {
    event.preventDefault();
    const texto = nome.trim();
    if (!texto) {
      setErro('Informe o nome.');
      return;
    }
    if (texto.length > LIMITE_NOME) {
      setErro(`O nome tem no máximo ${LIMITE_NOME} caracteres.`);
      return;
    }
    setErro(null);
    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(texto);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o grupo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={grupo ? 'Renomear Grupo' : 'Novo Grupo de Clientes'}
      onFechar={salvando ? () => {} : onFechar}
      largura="440px"
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
            form="grupo-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="grupo-form" className="clientes-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="clientes-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        <div className="clientes-form-campo">
          <label className="filter-label" htmlFor="grupo-nome">
            Nome *
          </label>
          <input
            id="grupo-nome"
            className="filter-input"
            type="text"
            placeholder="Ex.: Grupo Águia"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={LIMITE_NOME}
            autoFocus
            disabled={salvando}
            aria-invalid={!!erro || undefined}
          />
          {erro && <span className="clientes-form-erro">{erro}</span>}
          <span className="clientes-form-ajuda">
            Grupo econômico ou construtora que reúne vários CNPJs, como as SPEs de uma obra.
          </span>
        </div>
      </form>
    </Modal>
  );
}
