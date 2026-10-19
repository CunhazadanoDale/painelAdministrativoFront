import { useCallback, useEffect, useState } from 'react';
import * as pedidosService from '../../services/pedidos';

export function useDocumentoProposta(id) {
  const [documento, setDocumento] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    pedidosService
      .obterDocumentoProposta(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setDocumento(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a proposta.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  return { documento, carregando, erro, recarregar };
}
