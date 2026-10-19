import { useCallback, useEffect, useState } from 'react';
import * as pedidosService from '../../services/pedidos';

export function usePedidoDetalhe(id) {
  const [pedido, setPedido] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    pedidosService
      .obterPedido(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setPedido(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o pedido.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = pedido?.versao;

  const executar = useCallback(
    async (acao) => {
      await acao();
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback((dados) => executar(() => pedidosService.atualizarPedido(id, dados)), [executar, id]);
  const confirmar = useCallback(() => executar(() => pedidosService.confirmarPedido(id, versao)), [executar, id, versao]);
  const reservarPendencias = useCallback(
    () => executar(() => pedidosService.reservarPendencias(id, versao)),
    [executar, id, versao]
  );
  const registrarEntrada = useCallback(
    ({ pago_em, valor_centavos }) =>
      executar(() => pedidosService.registrarEntrada(id, { versao, pago_em, valor_centavos })),
    [executar, id, versao]
  );
  const gerarTituloEntrada = useCallback(
    ({ vencimento, conta_bancaria_id }) =>
      executar(() => pedidosService.gerarTituloEntrada(id, { vencimento, conta_bancaria_id })),
    [executar, id]
  );
  const cancelar = useCallback(
    ({ motivo, valor_a_devolver_centavos }) =>
      executar(() => pedidosService.cancelarPedido(id, { versao, motivo, valor_a_devolver_centavos })),
    [executar, id, versao]
  );

  return {
    pedido,
    carregando,
    erro,
    geracao: recarga,
    recarregar,
    atualizar,
    confirmar,
    reservarPendencias,
    registrarEntrada,
    gerarTituloEntrada,
    cancelar,
  };
}
