import { useCallback, useEffect, useState } from 'react';
import * as locaisService from '../../services/locais';

export const TAMANHO_PAGINA_SALDOS = 20;

export function useSaldosDoLocal(localId) {
  const [saldos, setSaldos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [soComSaldo, setSoComSaldo] = useState(true);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([localId, pagina, soComSaldo, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await locaisService.listarSaldosDoLocal(localId, {
          pagina,
          tamanho: TAMANHO_PAGINA_SALDOS + 1,
          comSaldo: soComSaldo,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        setSaldos(itens.slice(0, TAMANHO_PAGINA_SALDOS));
        setTemProxima(itens.length > TAMANHO_PAGINA_SALDOS);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os saldos do local.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, localId, pagina, soComSaldo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const mostrarSoComSaldo = useCallback((valor) => {
    setSoComSaldo(!!valor);
    setPagina(1);
  }, []);

  return {
    saldos,
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
