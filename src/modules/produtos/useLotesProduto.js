import { useCallback, useEffect, useState } from 'react';
import * as produtosService from '../../services/produtos';

export const TAMANHO_PAGINA_LOTES = 10;

export function useLotesProduto(produtoId, geracao) {
  const [lotes, setLotes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [soComSaldo, setSoComSaldo] = useState(true);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([produtoId, geracao, pagina, soComSaldo, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await produtosService.listarLotes(produtoId, {
          pagina,
          tamanho: TAMANHO_PAGINA_LOTES + 1,
          comSaldo: soComSaldo,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setLotes(itens.slice(0, TAMANHO_PAGINA_LOTES));
        setTemProxima(itens.length > TAMANHO_PAGINA_LOTES);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os lotes.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, produtoId, pagina, soComSaldo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const mostrarSoComSaldo = useCallback((valor) => {
    setSoComSaldo(!!valor);
    setPagina(1);
  }, []);

  return {
    lotes,
    pagina,
    soComSaldo,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    mostrarSoComSaldo,
  };
}
