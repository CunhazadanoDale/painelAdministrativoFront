import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';

export function useCustoPrevisto(importacaoId, cambioMicro, geracao) {
  const [previsto, setPrevisto] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([importacaoId, cambioMicro, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    importacoesService
      .obterCustoPrevisto(importacaoId, { cambio_micro: cambioMicro ?? '', sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setPrevisto(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setPrevisto(null);
        setFalha({ chave, mensagem: e.message || 'Erro ao calcular o custo previsto.' });
      });
    return () => controle.abort();
  }, [chave, importacaoId, cambioMicro]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { previsto: erro ? null : previsto, carregando, erro, recarregar };
}
