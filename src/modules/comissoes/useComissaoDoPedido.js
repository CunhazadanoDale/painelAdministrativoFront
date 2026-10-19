import { useCallback, useEffect, useState } from 'react';
import * as comissoesService from '../../services/comissoes';

export function useComissaoDoPedido(pedidoId, geracao) {
  const [comissao, setComissao] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pedidoId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    comissoesService
      .obterComissaoDoPedido(pedidoId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setComissao(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a comissão do pedido.' });
      });
    return () => controle.abort();
  }, [chave, pedidoId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = comissao?.definido ? comissao.versao : null;

  const definir = useCallback(
    async (percentualBp) => {
      await comissoesService.definirComissaoDoPedido(pedidoId, { percentual_bp: percentualBp, versao });
      recarregar();
    },
    [pedidoId, versao, recarregar]
  );

  return { comissao, carregando, erro, recarregar, definir };
}
