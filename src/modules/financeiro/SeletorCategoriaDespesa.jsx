import React, { useEffect, useState } from 'react';
import * as categoriasService from '../../services/categoriasFinanceiras';
import '../../app/components/SeletorRemoto.css';

function gruposDaNatureza(arvore, natureza) {
  return (arvore || [])
    .filter((raiz) => raiz.natureza === natureza)
    .map((raiz) => ({ ...raiz, subcategorias: (raiz.subcategorias || []).filter((sub) => sub.lancavel) }))
    .filter((raiz) => raiz.subcategorias.length > 0);
}

export function SeletorCategoriaLancavel({
  natureza,
  id,
  valor,
  onAlterar,
  placeholder = 'Sem categoria',
  className = 'filter-input',
  disabled = false,
  invalido = false,
}) {
  const [estado, setEstado] = useState({ grupos: null, erro: null });

  useEffect(() => {
    const controle = new AbortController();
    categoriasService
      .obterArvoreFinanceira({ ativas: true, sinal: controle.signal })
      .then((resposta) => {
        if (!controle.signal.aborted) setEstado({ grupos: gruposDaNatureza(resposta?.dados, natureza), erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ grupos: null, erro: (e && e.message) || 'Erro ao carregar o plano de contas.' });
      });
    return () => controle.abort();
  }, [natureza]);

  const { grupos, erro } = estado;
  const conhecida = (grupos || []).some((grupo) => grupo.subcategorias.some((sub) => sub.id === valor));
  const atualForaDaLista = valor && grupos && !conhecida;

  return (
    <>
      <select
        id={id}
        className={className}
        value={valor || ''}
        onChange={(evento) => onAlterar(evento.target.value)}
        disabled={disabled || !grupos}
        aria-invalid={invalido || undefined}
        aria-busy={!grupos && !erro ? true : undefined}
      >
        <option value="">{grupos ? placeholder : erro ? 'Plano de contas indisponível' : 'Carregando…'}</option>
        {atualForaDaLista && <option value={valor}>Categoria atual (não lançável)</option>}
        {(grupos || []).map((grupo) => (
          <optgroup key={grupo.id} label={grupo.nome}>
            {grupo.subcategorias.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.nome}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {erro && (
        <span className="seletor-remoto-erro" role="alert">
          {erro}
        </span>
      )}
    </>
  );
}

export function SeletorCategoriaDespesa(props) {
  return <SeletorCategoriaLancavel natureza="despesa" {...props} />;
}

export function SeletorCategoriaReceita(props) {
  return <SeletorCategoriaLancavel natureza="receita" {...props} />;
}
