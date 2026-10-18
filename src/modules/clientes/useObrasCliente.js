import { useCallback, useEffect, useState } from 'react';
import * as clientesService from '../../services/clientes';

export const TAMANHO_PAGINA_OBRAS = 10;

export function useObrasCliente(clienteId, geracao) {
  const [obras, setObras] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [soAtivas, setSoAtivas] = useState(false);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([clienteId, geracao, pagina, soAtivas, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await clientesService.listarObras(clienteId, {
          pagina,
          tamanho: TAMANHO_PAGINA_OBRAS + 1,
          ativas: soAtivas ? 'true' : '',
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setObras(itens.slice(0, TAMANHO_PAGINA_OBRAS));
        setTemProxima(itens.length > TAMANHO_PAGINA_OBRAS);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as obras.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, clienteId, pagina, soAtivas]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const mostrarSoAtivas = useCallback((valor) => {
    setSoAtivas(!!valor);
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await clientesService.criarObra(clienteId, dados);
      recarregar();
    },
    [clienteId, recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await clientesService.atualizarObra(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (obra) => {
      if (obra.ativo) {
        await clientesService.desativarObra(obra.id);
      } else {
        await clientesService.ativarObra(obra.id);
      }
      recarregar();
    },
    [recarregar]
  );

  return {
    obras,
    pagina,
    soAtivas,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    mostrarSoAtivas,
    criar,
    atualizar,
    alternarSituacao,
  };
}
