import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { AlertCircle, Trash2 } from 'lucide-react';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { centavosParaTexto, formatarTamanho, paraCentavos } from '../../lib/formatar';
import * as arquivosService from '../../services/arquivos';
import * as fornecedoresService from '../../services/fornecedores';
import * as solicitacoesService from '../../services/solicitacoes';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { FORMAS_PAGAMENTO, arquivoPermitido, hojeISO } from './solicitacoesUtils';
import './Solicitacoes.css';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => {
  const documento = fornecedor.documento_formatado || fornecedor.identificacao_estrangeira;
  return { valor: fornecedor.id, rotulo: documento ? `${fornecedor.nome} (${documento})` : fornecedor.nome };
};

function formularioDe(solicitacao) {
  return {
    empresa_id: solicitacao?.empresa_id ?? '',
    valor: solicitacao ? centavosParaTexto(solicitacao.valor_centavos) : '',
    prazo_pagamento: solicitacao ? String(solicitacao.prazo_pagamento).slice(0, 10) : hojeISO(),
    forma_pagamento: solicitacao?.forma_pagamento ?? 'pix',
    observacao: solicitacao?.observacao ?? '',
    fornecedor_id: solicitacao?.fornecedor_id ?? '',
    categoria_financeira_id: solicitacao?.categoria_financeira_id ?? '',
    competencia: solicitacao?.competencia ?? '',
    estimado: !!solicitacao?.estimado,
  };
}

export function SolicitacaoFormModal({ solicitacao, nomeEmpresa, nomeFornecedor, onFechar, onSalvar }) {
  const editando = !!solicitacao;
  const sequencia = useRef(0);
  const [form, setForm] = useState(() => formularioDe(solicitacao));
  const [arquivos, setArquivos] = useState([]);
  const [versao, setVersao] = useState(solicitacao?.versao ?? null);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const solicitacaoId = solicitacao?.id ?? null;
  const prazoGravado = editando ? String(solicitacao.prazo_pagamento).slice(0, 10) : null;

  useEffect(() => {
    if (!solicitacaoId || recarga === 0) return undefined;
    const controle = new AbortController();
    solicitacoesService
      .obterSolicitacao(solicitacaoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a solicitação.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });
    return () => controle.abort();
  }, [solicitacaoId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarEmpresa = useCallback(
    (empresaId) => setForm((atual) => ({ ...atual, empresa_id: empresaId })),
    []
  );

  const alterarCategoria = useCallback(
    (categoriaId) => setForm((atual) => ({ ...atual, categoria_financeira_id: categoriaId })),
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
    if (!editando && !form.empresa_id) {
      novosErros.empresa_id = 'Selecione a empresa da solicitação.';
    }
    const centavos = paraCentavos(form.valor);
    if (!form.valor.trim()) {
      novosErros.valor = 'Informe o valor da solicitação.';
    } else if (!Number.isFinite(centavos) || centavos <= 0) {
      novosErros.valor = 'Valor deve ser maior que zero.';
    }
    const prazoMudou = !editando || form.prazo_pagamento !== prazoGravado;
    if (!form.prazo_pagamento) {
      novosErros.prazo_pagamento = 'Informe o prazo de pagamento.';
    } else if (prazoMudou && form.prazo_pagamento < hojeISO()) {
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

  const montarDados = () => {
    const base = {
      valor_centavos: paraCentavos(form.valor),
      prazo_pagamento: form.prazo_pagamento,
      observacao: form.observacao.trim(),
      forma_pagamento: form.forma_pagamento,
    };
    if (editando) {
      const dados = {
        ...base,
        fornecedor_id: form.fornecedor_id || null,
        categoria_financeira_id: form.categoria_financeira_id || null,
        estimado: form.estimado,
        versao,
      };
      if (form.competencia) dados.competencia = form.competencia;
      return dados;
    }
    const dados = { empresa_id: form.empresa_id, ...base };
    if (form.fornecedor_id) dados.fornecedor_id = form.fornecedor_id;
    if (form.categoria_financeira_id) dados.categoria_financeira_id = form.categoria_financeira_id;
    if (form.competencia) dados.competencia = form.competencia;
    if (form.estimado) dados.estimado = true;
    dados.arquivo_ids = arquivos.filter((item) => item.id).map((item) => item.id);
    return dados;
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
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(montarDados());
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErroApi((e && e.message) || 'Erro ao salvar a solicitação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={editando ? 'Editar Solicitação' : 'Nova Solicitação'}
      onFechar={salvando ? () => {} : onFechar}
      largura="640px"
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
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="solicitacao-form" className="solicitacoes-form" onSubmit={enviar} noValidate>
        {erroApi && <div className="solicitacoes-form-erro-api">{erroApi}</div>}
        {conflito && (
          <div className="solicitacoes-form-campo-full">
            <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />
          </div>
        )}
        {recarregado && (
          <div className="solicitacoes-form-campo-full solicitacoes-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o formulário e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}

        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="solicitacao-empresa">
            Empresa *
          </label>
          {editando ? (
            <span id="solicitacao-empresa">{nomeEmpresa(solicitacao.empresa_id)}</span>
          ) : (
            <SeletorEmpresa
              id="solicitacao-empresa"
              valor={form.empresa_id}
              onAlterar={alterarEmpresa}
              disabled={salvando}
              invalido={!!erros.empresa_id}
            />
          )}
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
          <label className="solicitacoes-form-checkbox" htmlFor="solicitacao-estimado">
            <input
              id="solicitacao-estimado"
              type="checkbox"
              checked={form.estimado}
              onChange={(evento) => setForm((atual) => ({ ...atual, estimado: evento.target.checked }))}
              disabled={salvando}
            />
            Valor estimado
          </label>
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-prazo">
            Prazo de pagamento *
          </label>
          <input
            id="solicitacao-prazo"
            className="filter-input"
            type="date"
            min={editando ? undefined : hojeISO()}
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

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-competencia">
            Competência
          </label>
          <input
            id="solicitacao-competencia"
            className="filter-input"
            type="month"
            value={form.competencia}
            onChange={alterar('competencia')}
            disabled={salvando}
          />
          <span className="solicitacoes-form-ajuda">Vazia: o mês do vencimento.</span>
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-fornecedor">
            Fornecedor
          </label>
          <BuscaRemota
            id="solicitacao-fornecedor"
            nomeBusca="fornecedor"
            valor={form.fornecedor_id}
            rotuloAtual={nomeFornecedor ? nomeFornecedor(form.fornecedor_id) : undefined}
            buscar={buscarFornecedores}
            opcaoDe={opcaoDeFornecedor}
            onEscolher={(fornecedor) =>
              setForm((atual) => ({ ...atual, fornecedor_id: fornecedor ? fornecedor.id : '' }))
            }
            placeholderBusca="Nome ou documento"
            disabled={salvando}
          />
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="solicitacao-categoria">
            Categoria financeira
          </label>
          <SeletorCategoriaDespesa
            id="solicitacao-categoria"
            valor={form.categoria_financeira_id}
            onAlterar={alterarCategoria}
            disabled={salvando}
          />
          <span className="solicitacoes-form-ajuda">Sem categoria, o financeiro classifica antes de pagar.</span>
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

        {editando ? (
          <span className="solicitacoes-form-campo-full solicitacoes-form-ajuda">
            Empresa e anexos não mudam na edição. Depois de aprovada, para corrigir, cancele e crie outra.
          </span>
        ) : (
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
        )}
      </form>
    </Modal>
  );
}
