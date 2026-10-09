import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Solicitacoes.css';

export function RejeitarModal({ onFechar, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    const texto = motivo.trim();
    if (!texto) {
      setErro('Informe o motivo da rejeição.');
      return;
    }
    if (texto.length > 500) {
      setErro('O motivo aceita no máximo 500 caracteres.');
      return;
    }

    setErro(null);
    setEnviando(true);
    setErroApi(null);
    try {
      await onConfirmar(texto);
      onFechar();
    } catch (e) {
      setErroApi((e && e.message) || 'Erro ao rejeitar a solicitação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Rejeitar solicitação"
      onFechar={enviando ? () => {} : onFechar}
      largura="460px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="rejeitar-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={enviando}
          >
            {enviando ? 'Rejeitando…' : 'Rejeitar'}
          </button>
        </>
      }
    >
      <form id="rejeitar-form" className="solicitacoes-form" onSubmit={enviar} noValidate>
        {erroApi && <div className="solicitacoes-form-erro-api">{erroApi}</div>}
        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="rejeitar-motivo">
            Motivo *
          </label>
          <textarea
            id="rejeitar-motivo"
            className="filter-input solicitacoes-form-textarea"
            rows={4}
            maxLength={500}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            disabled={enviando}
            autoFocus
          />
          {erro && <span className="solicitacoes-form-erro">{erro}</span>}
        </div>
      </form>
    </Modal>
  );
}
