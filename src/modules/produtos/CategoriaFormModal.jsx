import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Categorias.css';

export function CategoriaFormModal({ categoria, categoriaPai, raizes, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => ({
    nome: categoria?.nome ?? '',
    categoria_pai_id: categoria ? categoria.categoria_pai_id ?? '' : categoriaPai?.id ?? '',
    ordem: categoria?.ordem !== undefined && categoria?.ordem !== null ? String(categoria.ordem) : '0',
    icone: categoria?.icone ?? '',
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome da categoria.';
    if (!Number.isInteger(Number(form.ordem)) || Number(form.ordem) < 0) {
      novosErros.ordem = 'Informe uma ordem inteira e não negativa.';
    }
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
        ordem: Number(form.ordem),
        icone: form.icone.trim(),
        categoria_pai_id: form.categoria_pai_id || null,
      });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar a categoria.');
    } finally {
      setSalvando(false);
    }
  };

  const mostrarSelecaoPai = !categoria && !categoriaPai;

  return (
    <Modal
      aberto
      titulo={categoria ? 'Editar Categoria' : 'Nova Categoria'}
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
            form="categoria-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="categoria-form" className="categorias-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="categorias-form-erro-api">{erroApi}</div>}

        {categoriaPai && (
          <p className="categorias-form-pai">
            Subcategoria de <strong>{categoriaPai.nome}</strong>
          </p>
        )}

        {mostrarSelecaoPai && (
          <div className="categorias-form-campo">
            <label className="filter-label" htmlFor="categoria-pai">
              Categoria pai
            </label>
            <select
              id="categoria-pai"
              className="filter-input"
              value={form.categoria_pai_id}
              onChange={alterar('categoria_pai_id')}
              disabled={salvando}
            >
              <option value="">Nenhuma (categoria raiz)</option>
              {raizes.map((raiz) => (
                <option key={raiz.id} value={raiz.id}>
                  {raiz.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="categorias-form-campo">
          <label className="filter-label" htmlFor="categoria-nome">
            Nome *
          </label>
          <input
            id="categoria-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            autoFocus
            disabled={salvando}
          />
          {erros.nome && <span className="categorias-form-erro">{erros.nome}</span>}
        </div>

        <div className="categorias-form-linha">
          <div className="categorias-form-campo">
            <label className="filter-label" htmlFor="categoria-ordem">
              Ordem
            </label>
            <input
              id="categoria-ordem"
              className="filter-input"
              type="number"
              min="0"
              step="1"
              value={form.ordem}
              onChange={alterar('ordem')}
              disabled={salvando}
            />
            {erros.ordem && <span className="categorias-form-erro">{erros.ordem}</span>}
          </div>

          <div className="categorias-form-campo">
            <label className="filter-label" htmlFor="categoria-icone">
              Ícone
            </label>
            <input
              id="categoria-icone"
              className="filter-input"
              type="text"
              placeholder="Nome do ícone (ex.: hammer)"
              value={form.icone}
              onChange={alterar('icone')}
              disabled={salvando}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
