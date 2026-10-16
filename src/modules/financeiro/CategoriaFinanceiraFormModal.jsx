import React, { useEffect, useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import * as categoriasService from '../../services/categoriasFinanceiras';
import {
  LIMITES,
  NATUREZAS,
  erroDoCodigo,
  lerOrdem,
  linhasDaNatureza,
  rotuloDaLinha,
  rotuloDaNatureza,
} from './planoContasUtils';
import './Financeiro.css';

function formularioDe(categoria) {
  return {
    nome: categoria?.nome ?? '',
    natureza: '',
    linha_dre: '',
    codigo: categoria?.codigo ?? '',
    ordem: String(categoria?.ordem ?? 0),
  };
}

function tituloDe(categoria, pai) {
  if (categoria) return 'Editar Categoria';
  return pai ? 'Nova Subcategoria' : 'Nova Categoria';
}

export function CategoriaFinanceiraFormModal({ categoria, pai, onFechar, onSalvar }) {
  const editando = !!categoria;
  const raizNova = !editando && !pai;
  const classificacao = categoria ?? pai;
  const [form, setForm] = useState(() => formularioDe(categoria));
  const [versao, setVersao] = useState(categoria?.versao ?? null);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const [recarregado, setRecarregado] = useState(false);

  const categoriaId = categoria?.id ?? null;
  const linhas = linhasDaNatureza(form.natureza);

  useEffect(() => {
    if (!categoriaId || recarga === 0) return undefined;
    const controle = new AbortController();

    categoriasService
      .obterCategoriaFinanceira(categoriaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setVersao(resposta?.dados?.versao ?? null);
        setConflito(null);
        setRecarregado(true);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setConflito(null);
        setErroApi(e.message || 'Erro ao recarregar a categoria.');
      })
      .finally(() => {
        if (!controle.signal.aborted) setRecarregando(false);
      });

    return () => {
      controle.abort();
    };
  }, [categoriaId, recarga]);

  const recarregar = () => {
    setRecarregando(true);
    setRecarga((valor) => valor + 1);
  };

  const alterar = (campo) => (event) => setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const alterarNatureza = (event) => {
    const natureza = event.target.value;
    setForm((atual) => ({
      ...atual,
      natureza,
      linha_dre: linhasDaNatureza(natureza).some((linha) => linha.valor === atual.linha_dre) ? atual.linha_dre : '',
    }));
  };

  const validar = () => {
    const novosErros = {};
    const nome = form.nome.trim();
    if (!nome) novosErros.nome = 'Informe o nome.';
    else if (nome.length > LIMITES.nome) novosErros.nome = `O nome tem no máximo ${LIMITES.nome} caracteres.`;
    if (raizNova) {
      if (!form.natureza) novosErros.natureza = 'Selecione a natureza.';
      if (!form.linha_dre) novosErros.linha_dre = 'Selecione a linha da DRE.';
    }
    const erroCodigo = erroDoCodigo(form.codigo);
    if (erroCodigo) novosErros.codigo = erroCodigo;
    if (lerOrdem(form.ordem) === null) novosErros.ordem = 'A ordem é um número inteiro a partir de 0.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const montarDados = () => {
    const codigo = form.codigo.trim();
    const ordem = lerOrdem(form.ordem);
    if (editando) return { nome: form.nome.trim(), codigo: codigo || null, ordem, versao };
    const dados = { nome: form.nome.trim() };
    if (pai) dados.categoria_pai_id = pai.id;
    else {
      dados.natureza = form.natureza;
      dados.linha_dre = form.linha_dre;
    }
    if (codigo) dados.codigo = codigo;
    dados.ordem = ordem;
    return dados;
  };

  const salvar = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    setConflito(null);
    setRecarregado(false);
    try {
      await onSalvar(montarDados());
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflito(e.message);
      } else {
        setErroApi(e.message || 'Erro ao salvar a categoria.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const erroDe = (campo) => erros[campo] && <span className="financeiro-form-erro">{erros[campo]}</span>;

  return (
    <Modal
      aberto
      titulo={tituloDe(categoria, pai)}
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
            form="categoria-financeira-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || recarregando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="categoria-financeira-form" className="financeiro-form" onSubmit={salvar} noValidate>
        {erroApi && (
          <div className="financeiro-form-erro-api" role="alert">
            {erroApi}
          </div>
        )}
        {conflito && (
          <AvisoConflito mensagem={conflito} onRecarregar={recarregar} recarregando={recarregando} />
        )}
        {recarregado && (
          <div className="financeiro-form-ajuda" role="status">
            Dados recarregados (versão {versao}). Confira o formulário e salve de novo para gravar por cima da outra
            alteração.
          </div>
        )}

        {classificacao && (
          <>
            <dl className="financeiro-resumo">
              {pai && (
                <>
                  <dt>Categoria pai</dt>
                  <dd>{pai.nome}</dd>
                </>
              )}
              <dt>Natureza</dt>
              <dd>{rotuloDaNatureza(classificacao.natureza)}</dd>
              <dt>Linha da DRE</dt>
              <dd>{rotuloDaLinha(classificacao.linha_dre)}</dd>
            </dl>
            <span className="financeiro-form-ajuda">
              {editando
                ? 'Natureza, linha da DRE e categoria pai não mudam. Para corrigir, desative esta categoria e cadastre outra.'
                : 'A subcategoria herda a natureza e a linha da DRE da categoria pai e é onde os lançamentos são classificados.'}
            </span>
          </>
        )}

        <div className="financeiro-form-campo">
          <label className="filter-label" htmlFor="categoria-nome">
            Nome *
          </label>
          <input
            id="categoria-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            maxLength={LIMITES.nome}
            autoFocus
            disabled={salvando}
            aria-invalid={!!erros.nome || undefined}
          />
          {erroDe('nome')}
        </div>

        {raizNova && (
          <div className="financeiro-form-linha">
            <div className="financeiro-form-campo">
              <label className="filter-label" htmlFor="categoria-natureza">
                Natureza *
              </label>
              <select
                id="categoria-natureza"
                className="filter-input"
                value={form.natureza}
                onChange={alterarNatureza}
                disabled={salvando}
                aria-invalid={!!erros.natureza || undefined}
              >
                <option value="">Selecione…</option>
                {NATUREZAS.map((natureza) => (
                  <option key={natureza.valor} value={natureza.valor}>
                    {natureza.rotulo}
                  </option>
                ))}
              </select>
              {erroDe('natureza')}
            </div>
            <div className="financeiro-form-campo">
              <label className="filter-label" htmlFor="categoria-linha">
                Linha da DRE *
              </label>
              <select
                id="categoria-linha"
                className="filter-input"
                value={form.linha_dre}
                onChange={alterar('linha_dre')}
                disabled={salvando || !form.natureza}
                aria-invalid={!!erros.linha_dre || undefined}
              >
                <option value="">Selecione…</option>
                {linhas.map((linha) => (
                  <option key={linha.valor} value={linha.valor}>
                    {linha.rotulo}
                  </option>
                ))}
              </select>
              {erroDe('linha_dre')}
            </div>
          </div>
        )}
        {raizNova && form.linha_dre === 'compra_mercadoria' && (
          <span className="financeiro-form-ajuda">
            Compra de mercadoria fica fora do resultado: o custo entra na DRE pelo estoque, não pelo pagamento.
          </span>
        )}

        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="categoria-codigo">
              Código
            </label>
            <input
              id="categoria-codigo"
              className="filter-input"
              type="text"
              placeholder="Ex.: 4.1.03"
              value={form.codigo}
              onChange={alterar('codigo')}
              maxLength={LIMITES.codigo}
              disabled={salvando}
              aria-invalid={!!erros.codigo || undefined}
            />
            {erroDe('codigo')}
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="categoria-ordem">
              Ordem
            </label>
            <input
              id="categoria-ordem"
              className="filter-input"
              type="text"
              inputMode="numeric"
              value={form.ordem}
              onChange={alterar('ordem')}
              disabled={salvando}
              aria-invalid={!!erros.ordem || undefined}
            />
            {erroDe('ordem')}
          </div>
        </div>
      </form>
    </Modal>
  );
}
