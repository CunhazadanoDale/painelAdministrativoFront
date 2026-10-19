import { useCallback, useEffect, useState } from 'react';
import * as comissoesService from '../../services/comissoes';

export function useFechamentoComissao(id) {
  const [fechamento, setFechamento] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    comissoesService
      .obterFechamentoComissao(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setFechamento(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o fechamento.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  return { fechamento, carregando, erro, recarregar };
}
