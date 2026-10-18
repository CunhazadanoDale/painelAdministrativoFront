import { useCallback, useEffect, useState } from 'react';

export const TAMANHO_PAGINA_CONSULTA = 20;

export function useConsulta(listar, filtrosIniciais) {
  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [temProxima, setTemProxima] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pagina, filtros, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    listar({ ...filtros, pagina, tamanho: TAMANHO_PAGINA_CONSULTA + 1, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        const lista = resposta?.dados ?? [];
        setItens(lista.slice(0, TAMANHO_PAGINA_CONSULTA));
        setTemProxima(lista.length > TAMANHO_PAGINA_CONSULTA);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a consulta.' });
      });
    return () => controle.abort();
  }, [chave, listar, filtros, pagina]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);
  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  return { itens, pagina, filtros, temProxima, carregando, erro, chaveDados, recarregar, irParaAnterior, irParaProxima, filtrar };
}
