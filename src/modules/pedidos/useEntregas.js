import { useCallback, useEffect, useState } from 'react';
import * as pedidosService from '../../services/pedidos';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', status: '', previsao_ate: '' };

export function useEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, status, previsao_ate } = filtros;
  const chave = JSON.stringify([pagina, empresa, status, previsao_ate, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await pedidosService.listarEntregas({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          status,
          previsao_ate,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setEntregas(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as entregas.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, status, previsao_ate]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  return {
    entregas,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
  };
}
