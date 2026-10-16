import { useCallback, useEffect, useState } from 'react';
import * as locaisService from '../../services/locais';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', ativos: '' };

export function useLocais() {
  const [locais, setLocais] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, ativos } = filtros;
  const chave = JSON.stringify([pagina, empresa, ativos, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await locaisService.listarLocais({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          ativos,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setLocais(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os locais de estoque.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, ativos]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await locaisService.criarLocal(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const renomear = useCallback(
    async (id, nome) => {
      await locaisService.renomearLocal(id, nome);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (local) => {
      if (local.ativo) {
        await locaisService.desativarLocal(local.id);
      } else {
        await locaisService.ativarLocal(local.id);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await locaisService.removerLocal(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    locais,
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
    excluir,
  };
}
