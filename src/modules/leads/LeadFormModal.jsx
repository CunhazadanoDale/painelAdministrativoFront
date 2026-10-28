import React, { useMemo, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Leads.css';

function etapasDoFunil(etapas, funilId, etapaAtualId) {
  return etapas
    .filter((etapa) => etapa.funil_id === funilId && (etapa.ativo !== false || etapa.etapa_id === etapaAtualId))
    .sort((a, b) => a.ordem - b.ordem);
}

function funilDoLead(lead, etapas) {
  return etapas.find((etapa) => etapa.etapa_id === lead.etapa_id)?.funil_id ?? '';
}

export function LeadFormModal({ lead, funis, etapas, funilInicialId, onFechar, onSalvar }) {
  const [funilId, setFunilId] = useState(() => {
    if (lead) return funilDoLead(lead, etapas);
    if (funilInicialId && funis.some((funil) => funil.funil_id === funilInicialId)) return funilInicialId;
    return funis[0]?.funil_id ?? '';
  });
  const [form, setForm] = useState(() =>
    lead
      ? {
          nome: lead.nome ?? '',
          email: lead.email ?? '',
          telefone: lead.telefone ?? '',
          origem: lead.origem ?? '',
          etapa_id: lead.etapa_id ?? '',
        }
      : { nome: '', email: '', telefone: '', origem: '', etapa_id: etapasDoFunil(etapas, funilId)[0]?.etapa_id ?? '' }
  );
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const etapasVisiveis = useMemo(
    () => etapasDoFunil(etapas, funilId, lead?.etapa_id),
    [etapas, funilId, lead?.etapa_id]
  );
  const funilAtual = funis.find((funil) => funil.funil_id === funilId);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const escolherEtapa = (etapaId) => {
    setForm((atual) => ({ ...atual, etapa_id: etapaId }));
    setErros((atual) => ({ ...atual, etapa_id: undefined }));
  };

  const trocarFunil = (event) => {
    const novoFunilId = event.target.value;
    setFunilId(novoFunilId);
    escolherEtapa(etapasDoFunil(etapas, novoFunilId, lead?.etapa_id)[0]?.etapa_id ?? '');
  };

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

  const total = etapasVisiveis.length;
  const passoLargura = total > 1 ? 45 / (total - 1) : 0;

  return (
    <Modal
      aberto
      titulo={lead ? 'Editar Lead' : 'Novo Lead'}
      onFechar={salvando ? () => {} : onFechar}
      largura="860px"
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
      <form id="lead-form" className="lead-form-layout" onSubmit={salvar} noValidate>
        {erroApi && <div className="lead-form-erro-api">{erroApi}</div>}

        <div className="lead-form">
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

          <div className="lead-form-campo lead-form-campo-full">
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
        </div>

        <section className="lead-funil" aria-labelledby="lead-funil-titulo">
          <div className="lead-funil-topo">
            <span id="lead-funil-titulo" className="filter-label">
              Etapa no funil *
            </span>
            {funis.length > 1 ? (
              <select
                className="filter-select lead-funil-select"
                aria-label="Funil"
                value={funilId}
                onChange={trocarFunil}
                disabled={salvando}
              >
                {funis.map((funil) => (
                  <option key={funil.funil_id} value={funil.funil_id}>
                    {funil.nome}
                  </option>
                ))}
              </select>
            ) : (
              funilAtual && <span className="lead-funil-nome">{funilAtual.nome}</span>
            )}
          </div>

          {total === 0 ? (
            <p className="lead-funil-vazio">Este funil não tem etapas ativas.</p>
          ) : (
            <div className="lead-funil-etapas" role="radiogroup" aria-labelledby="lead-funil-titulo">
              {etapasVisiveis.map((etapa, indice) => {
                const selecionada = etapa.etapa_id === form.etapa_id;
                return (
                  <button
                    key={etapa.etapa_id}
                    type="button"
                    role="radio"
                    aria-checked={selecionada}
                    className={`lead-funil-etapa${selecionada ? ' lead-funil-etapa-selecionada' : ''}`}
                    style={{ width: `${100 - indice * passoLargura}%` }}
                    onClick={() => escolherEtapa(etapa.etapa_id)}
                    disabled={salvando}
                  >
                    <span className="lead-funil-etapa-ordem">{indice + 1}</span>
                    <span className="lead-funil-etapa-nome">{etapa.nome}</span>
                  </button>
                );
              })}
            </div>
          )}

          {erros.etapa_id && <span className="lead-form-erro">{erros.etapa_id}</span>}
        </section>
      </form>
    </Modal>
  );
}
