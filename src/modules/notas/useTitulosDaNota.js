import { useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useTitulosDaNota(duplicataIds, geracao) {
  const [estado, setEstado] = useState({ chave: null, titulos: {}, erro: null });
  const chave = JSON.stringify([duplicataIds, geracao]);

  useEffect(() => {
    const ids = JSON.parse(chave)[0];
    if (ids.length === 0) return undefined;
    const controle = new AbortController();
    Promise.all(
      ids.map((id) =>
        titulosService
          .listarTitulos({ origem: 'nota_fiscal_duplicata', origem_id: id, tamanho: 1, sinal: controle.signal })
          .then((resposta) => [id, resposta?.dados?.[0] ?? null])
      )
    )
      .then((pares) => {
        if (!controle.signal.aborted) setEstado({ chave, titulos: Object.fromEntries(pares), erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ chave, titulos: {}, erro: e.message || 'Erro ao carregar os títulos da nota.' });
      });
    return () => controle.abort();
  }, [chave]);

  const atual = estado.chave === chave;
  return {
    titulos: atual ? estado.titulos : {},
    erro: atual ? estado.erro : null,
    carregando: duplicataIds.length > 0 && !atual,
  };
}
