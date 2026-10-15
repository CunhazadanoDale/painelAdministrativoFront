import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Leads.css';

const VAZIO = { nome: '', email: '', telefone: '', origem: '', etapa_id: '' };

export function LeadFormModal({ lead, etapas, onFechar, onSalvar }) {
  const [form, setForm] = useState(() =>
    lead
      ? {
          nome: lead.nome ?? '',
          email: lead.email ?? '',
          telefone: lead.telefone ?? '',
          origem: lead.origem ?? '',
          etapa_id: lead.etapa_id ?? '',
        }
      : { ...VAZIO, etapa_id: etapas[0]?.etapa_id ?? '' }
  );
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do lead.';
    if (!form.etapa_id) novosErros.etapa_id = 'Selecione a etapa.';
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
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        origem: form.origem.trim(),
        etapa_id: form.etapa_id,
      });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o lead.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={lead ? 'Editar Lead' : 'Novo Lead'}
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
            form="lead-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="lead-form" className="lead-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="lead-form-erro-api">{erroApi}</div>}

        <div className="lead-form-campo lead-form-campo-full">
          <label className="filter-label" htmlFor="lead-nome">
            Nome *
          </label>
          <input
            id="lead-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            autoFocus
            disabled={salvando}
          />
          {erros.nome && <span className="lead-form-erro">{erros.nome}</span>}
        </div>

        <div className="lead-form-campo">
          <label className="filter-label" htmlFor="lead-email">
            Email
          </label>
          <input
            id="lead-email"
            className="filter-input"
            type="email"
            value={form.email}
            onChange={alterar('email')}
            disabled={salvando}
          />
        </div>

        <div className="lead-form-campo">
          <label className="filter-label" htmlFor="lead-telefone">
            Telefone
          </label>
          <input
            id="lead-telefone"
            className="filter-input"
            type="tel"
            value={form.telefone}
            onChange={alterar('telefone')}
            disabled={salvando}
          />
        </div>

        <div className="lead-form-campo">
          <label className="filter-label" htmlFor="lead-origem">
            Origem
          </label>
          <input
            id="lead-origem"
            className="filter-input"
            type="text"
            placeholder="Ex.: Site, Indicação…"
            value={form.origem}
            onChange={alterar('origem')}
            disabled={salvando}
          />
        </div>

        <div className="lead-form-campo">
          <label className="filter-label" htmlFor="lead-etapa">
            Etapa *
          </label>
          <select
            id="lead-etapa"
            className="filter-select"
            value={form.etapa_id}
            onChange={alterar('etapa_id')}
            disabled={salvando}
          >
            <option value="">Selecione…</option>
            {etapas.map((etapa) => (
              <option key={etapa.etapa_id} value={etapa.etapa_id}>
                {etapa.nome}
              </option>
            ))}
          </select>
          {erros.etapa_id && <span className="lead-form-erro">{erros.etapa_id}</span>}
        </div>
      </form>
    </Modal>
  );
}
