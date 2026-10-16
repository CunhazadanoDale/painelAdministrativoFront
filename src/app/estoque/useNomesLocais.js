import { useCallback, useEffect, useState } from 'react';
import * as locaisService from '../../services/locais';

export function useNomesLocais() {
  const [nomes, setNomes] = useState({});

  useEffect(() => {
    const controle = new AbortController();

    locaisService
      .listarTodosLocais({ sinal: controle.signal })
      .then((locais) => {
        setNomes(Object.fromEntries((locais || []).map((local) => [local.id, local.nome])));
      })
      .catch(() => {});

    return () => controle.abort();
  }, []);

  return useCallback((id) => (id && nomes[id]) || '—', [nomes]);
}
