import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Funis.css';

/**
 * Modal de criação/edição de etapa de um funil.
 * A ordem não é editada aqui: novas etapas entram no fim (backend define)
 * e a reordenação é feita com as setas na lista de etapas.
 * @param {{ etapa?: object|null, onFechar: () => void,
 *           onSalvar: (dados: {nome: string, ativo: boolean}) => Promise<void> }} props
 */
export function EtapaFormModal({ etapa, onFechar, onSalvar }) {
  const [nome, setNome] = useState(etapa?.nome ?? '');
  const [ativo, setAtivo] = useState(etapa?.ativo ?? true);
  const [erro, setErro] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (event) => {
    event.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da etapa.');
      return;
    }

    setErro(null);
    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar({ nome: nome.trim(), ativo });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar a etapa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={etapa ? 'Editar Etapa' : 'Nova Etapa'}
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
            form="etapa-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="etapa-form" className="funis-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="funis-form-erro-api">{erroApi}</div>}

        <div className="funis-form-campo">
          <label className="filter-label" htmlFor="etapa-nome">
            Nome *
          </label>
          <input
            id="etapa-nome"
            className="filter-input"
            type="text"
            placeholder="Ex.: Novo, Proposta, Fechado…"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            autoFocus
            disabled={salvando}
          />
          {erro && <span className="funis-form-erro">{erro}</span>}
        </div>

        {etapa && (
          <label className="funis-form-check" htmlFor="etapa-ativo">
            <input
              id="etapa-ativo"
              type="checkbox"
              checked={ativo}
              onChange={(event) => setAtivo(event.target.checked)}
              disabled={salvando}
            />
            Etapa ativa
          </label>
        )}
      </form>
    </Modal>
  );
}
