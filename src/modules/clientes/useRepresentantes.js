import { useCallback, useEffect, useState } from 'react';
import * as representantesService from '../../services/representantes';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { busca: '', ativos: '' };

export function useRepresentantes() {
  const [representantes, setRepresentantes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { busca, ativos } = filtros;
  const chave = JSON.stringify([pagina, busca, ativos, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await representantesService.listarRepresentantes({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          busca,
          ativos,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setRepresentantes(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os representantes.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, busca, ativos]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await representantesService.criarRepresentante(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await representantesService.atualizarRepresentante(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (representante) => {
      if (representante.ativo) {
        await representantesService.desativarRepresentante(representante.id);
      } else {
        await representantesService.ativarRepresentante(representante.id);
      }
      recarregar();
    },
    [recarregar]
  );

  return {
    representantes,
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
  };
}
