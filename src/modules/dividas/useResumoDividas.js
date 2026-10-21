import { useCallback, useEffect, useState } from 'react';
import * as dividasService from '../../services/dividas';

export function useResumoDividas(empresa) {
  const [resumo, setResumo] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([empresa, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    dividasService
      .obterResumoDividas({ empresa, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setResumo(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o resumo das dívidas.' });
      });
    return () => controle.abort();
  }, [chave, empresa]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { resumo, carregando, erro, recarregar };
}
