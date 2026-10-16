import { useCallback, useEffect, useState } from 'react';
import * as clientesService from '../../services/clientes';

export function useClienteDetalhe(id) {
  const [cliente, setCliente] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    clientesService
      .obterCliente(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setCliente(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o cliente.' });
      });

    return () => {
      controle.abort();
    };
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const atualizar = useCallback(
    async (dados) => {
      await clientesService.atualizarCliente(id, dados);
      recarregar();
    },
    [id, recarregar]
  );

  const alternarSituacao = useCallback(async () => {
    if (cliente?.ativo) {
      await clientesService.desativarCliente(id);
    } else {
      await clientesService.ativarCliente(id);
    }
    recarregar();
  }, [cliente, id, recarregar]);

  return { cliente, carregando, erro, geracao: recarga, recarregar, atualizar, alternarSituacao };
}
