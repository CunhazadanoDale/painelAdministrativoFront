import { useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useTitulosAntecipaveis(empresaId) {
  const [estado, setEstado] = useState({ empresa: null, titulos: [], erro: null });

  useEffect(() => {
    if (!empresaId) return undefined;
    const controle = new AbortController();
    titulosService
      .listarTitulosAntecipaveis({ empresa: empresaId, sinal: controle.signal })
      .then((titulos) => {
        if (!controle.signal.aborted) setEstado({ empresa: empresaId, titulos, erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ empresa: empresaId, titulos: [], erro: e.message || 'Erro ao carregar os títulos.' });
      });
    return () => controle.abort();
  }, [empresaId]);

  const atual = estado.empresa === empresaId;
  return {
    titulos: atual ? estado.titulos : [],
    erro: atual ? estado.erro : null,
    carregando: !!empresaId && !atual,
  };
}
