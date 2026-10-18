import { useCallback, useEffect, useState } from 'react';
import * as gruposService from '../../services/clienteGrupos';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { busca: '', ativos: '' };

export function useGruposClientes() {
  const [grupos, setGrupos] = useState([]);
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
        const resposta = await gruposService.listarGrupos({
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

        setGrupos(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os grupos de clientes.' });
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
    async (nome) => {
      await gruposService.criarGrupo(nome);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const renomear = useCallback(
    async (id, nome) => {
      await gruposService.renomearGrupo(id, nome);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (grupo) => {
      if (grupo.ativo) {
        await gruposService.desativarGrupo(grupo.id);
      } else {
        await gruposService.ativarGrupo(grupo.id);
      }
      recarregar();
    },
    [recarregar]
  );

  return {
    grupos,
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
    renomear,
    alternarSituacao,
  };
}
