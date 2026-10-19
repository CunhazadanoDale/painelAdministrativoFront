import { useCallback, useEffect, useState } from 'react';
import * as recorrentesService from '../../services/despesasRecorrentes';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', ativa: '' };

export function useDespesasRecorrentes() {
  const [despesas, setDespesas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, ativa } = filtros;
  const chave = JSON.stringify([pagina, empresa, ativa, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await recorrentesService.listarDespesasRecorrentes({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          ativa,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setDespesas(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as despesas recorrentes.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, ativa]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await recorrentesService.criarDespesaRecorrente(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await recorrentesService.atualizarDespesaRecorrente(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (despesa) => {
      if (despesa.ativa) {
        await recorrentesService.desativarDespesaRecorrente(despesa.id, despesa.versao);
      } else {
        await recorrentesService.ativarDespesaRecorrente(despesa.id, despesa.versao);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await recorrentesService.removerDespesaRecorrente(id);
      recarregar();
    },
    [recarregar]
  );

  const gerar = useCallback(
    async (dados) => {
      const resposta = await recorrentesService.gerarCompetencia(dados);
      recarregar();
      return resposta?.dados ?? null;
    },
    [recarregar]
  );

  return {
    gerar,
    despesas,
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
    atualizar,
    alternarSituacao,
    excluir,
  };
}
