import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Cargos.css';

export function CargoFormModal({ cargo, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => ({
    nome: cargo?.nome ?? '',
    descricao: cargo?.descricao ?? '',
    administrador: cargo?.administrador ?? false,
    financeiro: cargo?.financeiro ?? false,
    ativo: cargo?.ativo ?? true,
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const marcar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.checked }));

  const validar = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do cargo.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar({
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        administrador: form.administrador,
        financeiro: form.financeiro,
        ativo: form.ativo,
      });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o cargo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={cargo ? 'Editar Cargo' : 'Novo Cargo'}
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
            form="cargo-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="cargo-form" className="cargos-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="cargos-form-erro-api">{erroApi}</div>}

        <div className="cargos-form-campo">
          <label className="filter-label" htmlFor="cargo-nome">
            Nome *
          </label>
          <input
            id="cargo-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            autoFocus
            disabled={salvando}
          />
          {erros.nome && <span className="cargos-form-erro">{erros.nome}</span>}
        </div>

        <div className="cargos-form-campo">
          <label className="filter-label" htmlFor="cargo-descricao">
            Descrição
          </label>
          <textarea
            id="cargo-descricao"
            className="filter-input cargos-form-textarea"
            rows={3}
            value={form.descricao}
            onChange={alterar('descricao')}
            disabled={salvando}
          />
        </div>

        <div className="cargos-form-checks">
          <label className="cargos-form-check" htmlFor="cargo-administrador">
            <input
              id="cargo-administrador"
              type="checkbox"
              checked={form.administrador}
              onChange={marcar('administrador')}
              disabled={salvando}
            />
            Administrador
          </label>

          <label className="cargos-form-check" htmlFor="cargo-financeiro">
            <input
              id="cargo-financeiro"
              type="checkbox"
              checked={form.financeiro}
              onChange={marcar('financeiro')}
              disabled={salvando}
            />
            Financeiro
          </label>

          {cargo && (
            <label className="cargos-form-check" htmlFor="cargo-ativo">
              <input
                id="cargo-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={marcar('ativo')}
                disabled={salvando}
              />
              Ativo
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}
