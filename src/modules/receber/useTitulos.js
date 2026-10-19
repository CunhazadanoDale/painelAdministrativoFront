import { useCallback, useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export const TAMANHO_PAGINA = 20;

export const FILTROS_TITULOS = {
  empresa: '',
  cliente: '',
  status: '',
  origem: '',
  vencimento_de: '',
  vencimento_ate: '',
  vencidos: false,
  origemCancelada: false,
};

export function useTitulos() {
  const [titulos, setTitulos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_TITULOS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pagina, filtros, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await titulosService.listarTitulos({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          ...filtros,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setTitulos(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os títulos.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, filtros]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_TITULOS);
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await titulosService.criarTitulo(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await titulosService.atualizarTitulo(id, dados);
      recarregar();
    },
    [recarregar]
  );

  return {
    titulos,
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
    limparFiltros,
    criar,
    atualizar,
  };
}
