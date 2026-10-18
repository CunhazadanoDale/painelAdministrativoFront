import { useCallback, useEffect, useState } from 'react';
import * as pedidosService from '../../services/pedidos';

export function useEntregasDoPedido(pedidoId, geracao) {
  const [entregas, setEntregas] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pedidoId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    pedidosService
      .listarEntregasDoPedido(pedidoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setEntregas(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as entregas.' });
      });
    return () => controle.abort();
  }, [chave, pedidoId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { entregas, carregando, erro, recarregar };
}
