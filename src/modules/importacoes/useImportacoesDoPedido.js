import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';

export function useImportacoesDoPedido(pedidoId, geracao) {
  const [linhas, setLinhas] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pedidoId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    importacoesService
      .listarImportacoesDoPedido(pedidoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setLinhas(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as importações do pedido.' });
      });
    return () => controle.abort();
  }, [chave, pedidoId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { linhas, carregando, erro, recarregar };
}
