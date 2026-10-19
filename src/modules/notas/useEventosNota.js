import { useCallback, useEffect, useState } from 'react';
import * as notasService from '../../services/notasFiscais';

export function useEventosNota(notaId, geracao) {
  const [eventos, setEventos] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([notaId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    notasService
      .listarEventosNota(notaId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setEventos(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os eventos.' });
      });
    return () => controle.abort();
  }, [chave, notaId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { eventos, carregando, erro, recarregar };
}
