import { useCallback, useEffect, useState } from 'react';
import * as antecipacoesService from '../../services/antecipacoes';

export function useAntecipacaoDetalhe(id) {
  const [antecipacao, setAntecipacao] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    antecipacoesService
      .obterAntecipacao(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setAntecipacao(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a antecipação.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = antecipacao?.versao;

  const estornar = useCallback(
    async (motivo) => {
      await antecipacoesService.estornarAntecipacao(id, { motivo, versao });
      recarregar();
    },
    [id, versao, recarregar]
  );

  return { antecipacao, carregando, erro, recarregar, estornar };
}
