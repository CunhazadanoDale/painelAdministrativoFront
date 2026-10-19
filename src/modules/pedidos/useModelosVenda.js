import { useEffect, useState } from 'react';
import * as pedidosService from '../../services/pedidos';

export function useModelosVenda() {
  const [modelos, setModelos] = useState({});

  useEffect(() => {
    const controle = new AbortController();
    pedidosService
      .listarModelosVenda({ sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setModelos(Object.fromEntries((resposta?.dados ?? []).map((item) => [item.modelo, item])));
      })
      .catch(() => {});
    return () => controle.abort();
  }, []);

  return modelos;
}
