import { useCallback, useEffect, useState } from 'react';
import * as empresasService from '../../services/empresas';

export function useNomesEmpresas() {
  const [nomes, setNomes] = useState({});

  useEffect(() => {
    const controle = new AbortController();

    empresasService
      .listarTodasEmpresas({ sinal: controle.signal })
      .then((empresas) => {
        setNomes(
          Object.fromEntries((empresas || []).map((empresa) => [empresa.id, empresa.nome_fantasia]))
        );
      })
      .catch(() => {});

    return () => controle.abort();
  }, []);

  return useCallback((id) => (id && nomes[id]) || '—', [nomes]);
}
