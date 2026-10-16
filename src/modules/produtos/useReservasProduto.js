import { useCallback, useEffect, useState } from 'react';
import * as produtosService from '../../services/produtos';

export const TAMANHO_PAGINA_RESERVAS = 10;

export function useReservasProduto(produtoId, geracao) {
  const [reservas, setReservas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState('ativa');
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([produtoId, geracao, pagina, status, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await produtosService.listarReservas(produtoId, {
          pagina,
          tamanho: TAMANHO_PAGINA_RESERVAS + 1,
          status,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setReservas(itens.slice(0, TAMANHO_PAGINA_RESERVAS));
        setTemProxima(itens.length > TAMANHO_PAGINA_RESERVAS);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as reservas.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, produtoId, pagina, status]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrarStatus = useCallback((valor) => {
    setStatus(valor);
    setPagina(1);
  }, []);

  return {
    reservas,
    pagina,
    status,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrarStatus,
  };
}
