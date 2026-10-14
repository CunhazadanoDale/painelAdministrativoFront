import React, { useCallback, useRef, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { AlertCircle, Trash2 } from 'lucide-react';
import { formatarTamanho, paraCentavos } from '../../lib/formatar';
import * as arquivosService from '../../services/arquivos';
import { FORMAS_PAGAMENTO, arquivoPermitido, hojeISO } from './solicitacoesUtils';
import './Solicitacoes.css';

const FORM_VAZIO = {
  empresa_id: '',
  valor: '',
  prazo_pagamento: '',
  forma_pagamento: 'pix',
  observacao: '',
};

export function SolicitacaoFormModal({ onFechar, onSalvar }) {
  const sequencia = useRef(0);
  const [form, setForm] = useState({ ...FORM_VAZIO, prazo_pagamento: hojeISO() });
  const [arquivos, setArquivos] = useState([]);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarEmpresa = useCallback(
    (empresaId) => setForm((atual) => ({ ...atual, empresa_id: empresaId })),
    []
  );

  const alterarArquivo = (chave, mudanca) =>
    setArquivos((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, ...mudanca } : item))
    );

  const selecionarArquivos = async (event) => {
    const selecionados = Array.from(event.target.files || []);
    event.target.value = '';

    for (const arquivo of selecionados) {
      sequencia.current += 1;
      const chave = `arquivo-${sequencia.current}`;
      const entrada = {
        chave,
        id: null,
        nome: arquivo.name,
        tamanho: arquivo.size,
        progresso: 0,
        erro: null,
      };
      setArquivos((atual) => [...atual, entrada]);

      const problema = arquivoPermitido(arquivo);
      if (problema) {
        alterarArquivo(chave, { erro: problema });
        continue;
      }

      try {
        const enviado = await arquivosService.enviarArquivo(arquivo, {
          aoProgresso: (progresso) => alterarArquivo(chave, { progresso }),
        });
        alterarArquivo(chave, {
          id: enviado ? enviado.id : null,
          progresso: 100,
          tamanho: enviado && enviado.tamanho ? enviado.tamanho : arquivo.size,
          erro: enviado && enviado.id ? null : 'Falha ao registrar o arquivo enviado.',
        });
      } catch (e) {
        alterarArquivo(chave, { erro: (e && e.message) || 'Erro ao enviar o arquivo.' });
      }
    }
  };

  const removerItem = async (item) => {
    setErroApi(null);
    if (item.id) {
      try {
        await arquivosService.removerArquivo(item.id);
      } catch (e) {
        setErroApi((e && e.message) || 'Erro ao remover o arquivo.');
        return;
      }
    }
    setArquivos((atual) => atual.filter((entry) => entry.chave !== item.chave));
  };

  const validar = () => {
    const novosErros = {};
    if (!form.empresa_id) {
      novosErros.empresa_id = 'Selecione a empresa da solicitação.';
    }
    const centavos = paraCentavos(form.valor);
    if (!form.valor.trim()) {
      novosErros.valor = 'Informe o valor da solicitação.';
    } else if (!Number.isFinite(centavos) || centavos <= 0) {
      novosErros.valor = 'Valor deve ser maior que zero.';
    }
    if (!form.prazo_pagamento) {
      novosErros.prazo_pagamento = 'Informe o prazo de pagamento.';
    } else if (form.prazo_pagamento < hojeISO()) {
      novosErros.prazo_pagamento = 'O prazo não pode ser anterior a hoje.';
    }
    if (!form.observacao.trim()) {
      novosErros.observacao = 'Informe a observação.';
    } else if (form.observacao.trim().length > 1000) {
      novosErros.observacao = 'A observação aceita no máximo 1000 caracteres.';
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const enviar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    if (arquivos.some((item) => !item.id && !item.erro)) {
      setErroApi('Aguarde a conclusão do envio dos arquivos.');
      return;
    }

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar({
        empresa_id: form.empresa_id,
        valor_centavos: paraCentavos(form.valor),
        prazo_pagamento: form.prazo_pagamento,
        observacao: form.observacao.trim(),
        forma_pagamento: form.forma_pagamento,
        arquivo_ids: arquivos.filter((item) => item.id).map((item) => item.id),
      });
      onFechar();
    } catch (e) {
      setErroApi((e && e.message) || 'Erro ao salvar a solicitação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Nova Solicitação"
      onFechar={salvando ? () => {} : onFechar}
      largura="560px"
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
            form="solicitacao-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="solicitacao-form" className="solicitacoes-form" onSubmit={enviar} noValidate>
        {erroApi && <div className="solicitacoes-form-erro-api">{erroApi}</div>}

        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="solicitacao-empresa">
            Empresa *
          </label>
          <SeletorEmpresa
            id="solicitacao-empresa"
            valor={form.empresa_id}
            onAlterar={alterarEmpresa}
            disabled={salvando}
            invalido={!!erros.empresa_id}
          />
          {erros.empresa_id && <span className="solicitacoes-form-erro">{erros.empresa_id}</span>}
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-valor">
            Valor *
          </label>
          <input
            id="solicitacao-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 1.500,00"
            value={form.valor}
            onChange={alterar('valor')}
            disabled={salvando}
            autoFocus
          />
          {erros.valor && <span className="solicitacoes-form-erro">{erros.valor}</span>}
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-prazo">
            Prazo de pagamento *
          </label>
          <input
            id="solicitacao-prazo"
            className="filter-input"
            type="date"
            min={hojeISO()}
            value={form.prazo_pagamento}
            onChange={alterar('prazo_pagamento')}
            disabled={salvando}
          />
          {erros.prazo_pagamento && (
            <span className="solicitacoes-form-erro">{erros.prazo_pagamento}</span>
          )}
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-forma">
            Forma de pagamento *
          </label>
          <select
            id="solicitacao-forma"
            className="filter-select"
            value={form.forma_pagamento}
            onChange={alterar('forma_pagamento')}
            disabled={salvando}
          >
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma.valor} value={forma.valor}>
                {forma.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="solicitacao-observacao">
            Observação *
          </label>
          <textarea
            id="solicitacao-observacao"
            className="filter-input solicitacoes-form-textarea"
            rows={3}
            maxLength={1000}
            value={form.observacao}
            onChange={alterar('observacao')}
            disabled={salvando}
          />
          {erros.observacao && (
            <span className="solicitacoes-form-erro">{erros.observacao}</span>
          )}
        </div>

        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="solicitacao-arquivos">
            Anexos (PDF, PNG, JPEG ou WEBP — até 10MB)
          </label>
          <input
            id="solicitacao-arquivos"
            className="filter-input"
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={selecionarArquivos}
            disabled={salvando}
          />

          {arquivos.length > 0 && (
            <ul className="solicitacoes-arquivos">
              {arquivos.map((item) => (
                <li key={item.chave} className="solicitacoes-arquivo-item">
                  <div className="solicitacoes-arquivo-info">
                    <span className="solicitacoes-arquivo-nome" title={item.nome}>
                      {item.nome}
                    </span>
                    <span className="solicitacoes-arquivo-meta">
                      {formatarTamanho(item.tamanho)}
                      {!item.erro && item.progresso < 100 ? ` — ${item.progresso}%` : ''}
                    </span>
                  </div>
                  {!item.erro && item.progresso < 100 && (
                    <div className="solicitacoes-progresso">
                      <div
                        className="solicitacoes-progresso-barra"
                        style={{ width: `${item.progresso}%` }}
                      />
                    </div>
                  )}
                  {item.erro && (
                    <span className="solicitacoes-arquivo-erro">
                      <AlertCircle size={12} /> {item.erro}
                    </span>
                  )}
                  <button
                    type="button"
                    className="leads-acao-btn leads-acao-perigo"
                    title="Remover anexo"
                    disabled={salvando || (!item.id && !item.erro)}
                    onClick={() => removerItem(item)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  );
}
