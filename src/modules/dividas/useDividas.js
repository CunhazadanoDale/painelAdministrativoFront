import { useCallback, useEffect, useState } from 'react';
import * as dividasService from '../../services/dividas';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', fornecedor: '', credor_tipo: '', status: '', quitada: '', vencidas: '' };

export function useDividas() {
  const [dividas, setDividas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, fornecedor, credor_tipo, status, quitada, vencidas } = filtros;
  const chave = JSON.stringify([pagina, empresa, fornecedor, credor_tipo, status, quitada, vencidas, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await dividasService.listarDividas({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          fornecedor,
          credor_tipo,
          status,
          quitada,
          vencidas,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setDividas(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as dívidas.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, fornecedor, credor_tipo, status, quitada, vencidas]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      const resposta = await dividasService.criarDivida(dados);
      setPagina(1);
      recarregar();
      return resposta;
    },
    [recarregar]
  );

  const gerar = useCallback(
    async (dados) => {
      const resposta = await dividasService.gerarContasDividas(dados);
      recarregar();
      return resposta?.dados ?? null;
    },
    [recarregar]
  );

  return {
    dividas,
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
    gerar,
  };
}
