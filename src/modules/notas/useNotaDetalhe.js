import { useCallback, useEffect, useState } from 'react';
import * as notasService from '../../services/notasFiscais';

export function useNotaDetalhe(id) {
  const [nota, setNota] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    notasService
      .obterNota(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setNota(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a nota fiscal.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = nota?.versao;

  const ligarProduto = useCallback(
    async (numeroItem, produtoId) => {
      await notasService.ligarItemAoProduto(id, numeroItem, { versao, produto_id: produtoId });
      recarregar();
    },
    [id, versao, recarregar]
  );

  const atualizarVinculo = useCallback(
    async ({ pedido_id, entrega_id }) => {
      await notasService.atualizarVinculoNota(id, { versao, pedido_id, entrega_id });
      recarregar();
    },
    [id, versao, recarregar]
  );

  const sincronizarTitulos = useCallback(async () => {
    const resposta = await notasService.sincronizarTitulosNota(id);
    recarregar();
    return resposta?.dados ?? null;
  }, [id, recarregar]);

  return { nota, carregando, erro, geracao: recarga, recarregar, ligarProduto, atualizarVinculo, sincronizarTitulos };
}
