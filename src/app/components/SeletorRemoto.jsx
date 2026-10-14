import React, { useEffect, useMemo, useState } from 'react';
import './SeletorRemoto.css';

export function SeletorRemoto({
  id,
  valor,
  onAlterar,
  carregar,
  opcaoDe,
  textoVazio,
  textoErro = 'Erro ao carregar as opções.',
  placeholder = 'Selecione…',
  className = 'filter-select',
  disabled = false,
  invalido = false,
}) {
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState({ fonte: null, recarga: -1, itens: null, erro: null });

  useEffect(() => {
    const controle = new AbortController();

    carregar(controle.signal)
      .then((itens) => {
        setEstado({ fonte: carregar, recarga, itens: itens || [], erro: null });
      })
      .catch((e) => {
        if (e && e.name === 'AbortError') return;
        setEstado({ fonte: carregar, recarga, itens: null, erro: (e && e.message) || textoErro });
      });

    return () => controle.abort();
  }, [carregar, recarga, textoErro]);

  const atual = estado.fonte === carregar && estado.recarga === recarga;
  const itens = atual ? estado.itens : null;
  const erro = atual ? estado.erro : null;

  const opcoes = useMemo(
    () =>
      (itens || [])
        .map(opcaoDe)
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
    [itens, opcaoDe]
  );

  useEffect(() => {
    if (!itens) return;
    const existe = opcoes.some((opcao) => opcao.valor === valor);
    if (valor && !existe) {
      onAlterar('');
    } else if (!valor && opcoes.length === 1) {
      onAlterar(opcoes[0].valor);
    }
  }, [itens, opcoes, valor, onAlterar]);

  if (erro) {
    return (
      <div className="seletor-remoto-erro" role="alert">
        <span>{erro}</span>
        <button
          type="button"
          className="seletor-remoto-tentar"
          onClick={() => setRecarga((anterior) => anterior + 1)}
          disabled={disabled}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!itens) {
    return (
      <select id={id} className={className} value="" disabled aria-busy="true">
        <option value="">Carregando…</option>
      </select>
    );
  }

  if (opcoes.length === 0) {
    return (
      <select id={id} className={className} value="" disabled>
        <option value="">{textoVazio}</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      className={className}
      value={opcoes.some((opcao) => opcao.valor === valor) ? valor : ''}
      onChange={(event) => onAlterar(event.target.value)}
      disabled={disabled}
      aria-invalid={invalido || undefined}
    >
      <option value="">{placeholder}</option>
      {opcoes.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.rotulo}
        </option>
      ))}
    </select>
  );
}
