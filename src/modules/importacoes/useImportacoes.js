import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', fornecedor: '', status: '', numero: '', chegada_ate: '' };

export function useImportacoes() {
  const [importacoes, setImportacoes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, fornecedor, status, numero, chegada_ate } = filtros;
  const chave = JSON.stringify([pagina, empresa, fornecedor, status, numero, chegada_ate, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await importacoesService.listarImportacoes({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          fornecedor,
          status,
          numero,
          chegada_ate,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setImportacoes(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as importações.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, fornecedor, status, numero, chegada_ate]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      const resposta = await importacoesService.criarImportacao(dados);
      setPagina(1);
      recarregar();
      return resposta;
    },
    [recarregar]
  );

  return {
    importacoes,
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
    criar,
  };
}
