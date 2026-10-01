import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Funis.css';

/**
 * Modal de criação/edição de funil. Montado pelo pai apenas quando aberto,
 * então o estado nasce já preenchido (sem reset em effect).
 * @param {{ funil?: object|null, onFechar: () => void,
 *           onSalvar: (dados: {nome: string, ativo: boolean}) => Promise<void> }} props
 */
export function FunilFormModal({ funil, onFechar, onSalvar }) {
  const [nome, setNome] = useState(funil?.nome ?? '');
  const [ativo, setAtivo] = useState(funil?.ativo ?? true);
  const [erro, setErro] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (event) => {
    event.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do funil.');
      return;
    }

    setErro(null);
    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar({ nome: nome.trim(), ativo });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o funil.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={funil ? 'Editar Funil' : 'Novo Funil'}
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
            form="funil-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="funil-form" className="funis-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="funis-form-erro-api">{erroApi}</div>}

        <div className="funis-form-campo">
          <label className="filter-label" htmlFor="funil-nome">
            Nome *
          </label>
          <input
            id="funil-nome"
            className="filter-input"
            type="text"
            placeholder="Ex.: Vendas, Obras…"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            autoFocus
            disabled={salvando}
          />
          {erro && <span className="funis-form-erro">{erro}</span>}
        </div>

        {funil && (
          <label className="funis-form-check" htmlFor="funil-ativo">
            <input
              id="funil-ativo"
              type="checkbox"
              checked={ativo}
              onChange={(event) => setAtivo(event.target.checked)}
              disabled={salvando}
            />
            Funil ativo
          </label>
        )}
      </form>
    </Modal>
  );
}
