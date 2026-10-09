import React, { useMemo, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { centavosParaTexto, paraCentavos } from '../../lib/formatar';
import { UNIDADES_MEDIDA, ehEstoqueMinimoValido, ehPesoValido } from './produtosUtils';
import './Produtos.css';

export function ProdutoFormModal({ produto, subcategorias, categoriaMapa, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => ({
    categoria_id: produto?.categoria_id ?? '',
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    codigo: produto?.codigo ?? '',
    unidade_medida: produto?.unidade_medida ?? 'un',
    preco: produto?.preco_centavos !== null && produto?.preco_centavos !== undefined
      ? centavosParaTexto(produto.preco_centavos)
      : '',
    preco_promocional:
      produto?.preco_promocional_centavos !== null && produto?.preco_promocional_centavos !== undefined
        ? centavosParaTexto(produto.preco_promocional_centavos)
        : '',
    estoque_minimo:
      produto?.estoque_minimo !== null && produto?.estoque_minimo !== undefined
        ? String(produto.estoque_minimo)
        : '',
    peso_kg: produto?.peso_kg !== null && produto?.peso_kg !== undefined ? String(produto.peso_kg) : '',
    destaque: produto?.destaque ?? false,
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.value }));

  const marcar = (campo) => (event) =>
    setForm((atual) => ({ ...atual, [campo]: event.target.checked }));

  const rotuloSubcategoria = useMemo(() => {
    return (categoria) => {
      const pai = categoriaMapa[categoria.categoria_pai_id];
      return pai ? `${pai.nome} › ${categoria.nome}` : categoria.nome;
    };
  }, [categoriaMapa]);

  const validar = () => {
    const novosErros = {};

    if (!form.categoria_id) novosErros.categoria_id = 'Selecione a categoria do produto.';
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do produto.';

    const preco = form.preco.trim() ? paraCentavos(form.preco) : null;
    if (form.preco.trim() && !Number.isFinite(preco)) {
      novosErros.preco = 'Informe um preço válido.';
    }

    const promocional = form.preco_promocional.trim()
      ? paraCentavos(form.preco_promocional)
      : null;
    if (form.preco_promocional.trim() && !Number.isFinite(promocional)) {
      novosErros.preco_promocional = 'Informe um preço promocional válido.';
    } else if (promocional !== null && preco === null) {
      novosErros.preco_promocional = 'Informe o preço cheio para usar preço promocional.';
    } else if (promocional !== null && preco !== null && promocional >= preco) {
      novosErros.preco_promocional = 'O preço promocional deve ser menor que o preço cheio.';
    }

    if (!ehEstoqueMinimoValido(form.estoque_minimo).valido) {
      novosErros.estoque_minimo = 'Informe um estoque mínimo inteiro e não negativo.';
    }

    if (!ehPesoValido(form.peso_kg).valido) {
      novosErros.peso_kg = 'Informe um peso válido e não negativo.';
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
        categoria_id: form.categoria_id,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        codigo: form.codigo.trim() || null,
        unidade_medida: form.unidade_medida,
        preco_centavos: form.preco.trim() ? paraCentavos(form.preco) : null,
        preco_promocional_centavos: form.preco_promocional.trim()
          ? paraCentavos(form.preco_promocional)
          : null,
        estoque_minimo: ehEstoqueMinimoValido(form.estoque_minimo).valor,
        peso_kg: ehPesoValido(form.peso_kg).valor,
        destaque: form.destaque,
      });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o produto.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={produto ? 'Editar Produto' : 'Novo Produto'}
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
            form="produto-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="produto-form" className="produtos-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="produtos-form-erro-api">{erroApi}</div>}

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="produto-categoria">
            Categoria *
          </label>
          <select
            id="produto-categoria"
            className="filter-input"
            value={form.categoria_id}
            onChange={alterar('categoria_id')}
            disabled={salvando}
          >
            <option value="">Selecione…</option>
            {subcategorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {rotuloSubcategoria(categoria)}
              </option>
            ))}
          </select>
          {erros.categoria_id && <span className="produtos-form-erro">{erros.categoria_id}</span>}
          {subcategorias.length === 0 && (
            <span className="produtos-form-ajuda">
              Nenhuma subcategoria cadastrada. Cadastre categorias antes de criar produtos.
            </span>
          )}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="produto-nome">
            Nome *
          </label>
          <input
            id="produto-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            autoFocus
            disabled={salvando}
          />
          {erros.nome && <span className="produtos-form-erro">{erros.nome}</span>}
        </div>

        <div className="produtos-form-campo">
          <label className="filter-label" htmlFor="produto-descricao">
            Descrição
          </label>
          <textarea
            id="produto-descricao"
            className="filter-input produtos-form-textarea"
            rows={3}
            value={form.descricao}
            onChange={alterar('descricao')}
            disabled={salvando}
          />
        </div>

        <div className="produtos-form-linha">
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-codigo">
              Código
            </label>
            <input
              id="produto-codigo"
              className="filter-input"
              type="text"
              value={form.codigo}
              onChange={alterar('codigo')}
              disabled={salvando}
            />
          </div>

          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-unidade">
              Unidade de medida *
            </label>
            <select
              id="produto-unidade"
              className="filter-input"
              value={form.unidade_medida}
              onChange={alterar('unidade_medida')}
              disabled={salvando}
            >
              {UNIDADES_MEDIDA.map((unidade) => (
                <option key={unidade.valor} value={unidade.valor}>
                  {unidade.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="produtos-form-linha">
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-preco">
              Preço
            </label>
            <input
              id="produto-preco"
              className="filter-input"
              type="text"
              placeholder="Vazio = sob consulta"
              value={form.preco}
              onChange={alterar('preco')}
              disabled={salvando}
            />
            {erros.preco && <span className="produtos-form-erro">{erros.preco}</span>}
          </div>

          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-preco-promocional">
              Preço promocional
            </label>
            <input
              id="produto-preco-promocional"
              className="filter-input"
              type="text"
              value={form.preco_promocional}
              onChange={alterar('preco_promocional')}
              disabled={salvando}
            />
            {erros.preco_promocional && (
              <span className="produtos-form-erro">{erros.preco_promocional}</span>
            )}
          </div>
        </div>

        <div className="produtos-form-linha">
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-estoque-minimo">
              Estoque mínimo
            </label>
            <input
              id="produto-estoque-minimo"
              className="filter-input"
              type="number"
              min="0"
              step="1"
              value={form.estoque_minimo}
              onChange={alterar('estoque_minimo')}
              disabled={salvando}
            />
            {erros.estoque_minimo && (
              <span className="produtos-form-erro">{erros.estoque_minimo}</span>
            )}
          </div>

          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="produto-peso">
              Peso (kg)
            </label>
            <input
              id="produto-peso"
              className="filter-input"
              type="text"
              value={form.peso_kg}
              onChange={alterar('peso_kg')}
              disabled={salvando}
            />
            {erros.peso_kg && <span className="produtos-form-erro">{erros.peso_kg}</span>}
          </div>
        </div>

        <div className="produtos-form-checks">
          <label className="produtos-form-check" htmlFor="produto-destaque">
            <input
              id="produto-destaque"
              type="checkbox"
              checked={form.destaque}
              onChange={marcar('destaque')}
              disabled={salvando}
            />
            Destaque
          </label>
        </div>
      </form>
    </Modal>
  );
}
