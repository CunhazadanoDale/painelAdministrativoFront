import { useCallback, useEffect, useRef, useState } from 'react';

const nomePadrao = (item) => item?.nome;

export function useNomesPorId(ids, obter, nomeDe = nomePadrao) {
  const [nomes, setNomes] = useState({});
  const pedidos = useRef(new Set());
  const extrator = useRef(nomeDe);

  useEffect(() => {
    extrator.current = nomeDe;
  }, [nomeDe]);

  const chave = [...new Set((ids || []).filter(Boolean))].sort().join('|');

  useEffect(() => {
    const jaPedidos = pedidos.current;
    const faltando = chave ? chave.split('|').filter((id) => !jaPedidos.has(id)) : [];
    if (faltando.length === 0) return undefined;
    const controle = new AbortController();
    const pendentes = new Set(faltando);
    faltando.forEach((id) => jaPedidos.add(id));

    faltando.forEach((id) => {
      obter(id, { sinal: controle.signal })
        .then((resposta) => {
          if (controle.signal.aborted) return;
          pendentes.delete(id);
          const nome = extrator.current(resposta?.dados);
          if (nome) setNomes((atual) => ({ ...atual, [id]: nome }));
        })
        .catch(() => {
          if (!controle.signal.aborted) pendentes.delete(id);
        });
    });

    return () => {
      controle.abort();
      pendentes.forEach((id) => jaPedidos.delete(id));
    };
  }, [chave, obter]);

  return useCallback((id) => (id && nomes[id]) || '—', [nomes]);
}
