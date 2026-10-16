import { useCallback, useEffect, useState } from 'react';
import * as produtosService from '../../services/produtos';

export function useSaldoProduto(id, geracao) {
  const [saldo, setSaldo] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, geracao, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    produtosService
      .obterSaldo(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setSaldo(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o saldo do produto.' });
      });

    return () => {
      controle.abort();
    };
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { saldo, carregando, erro, recarregar };
}
