import { useCallback, useEffect, useState } from 'react';
import * as clientesService from '../../services/clientes';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { busca: '', tipo: '', uf: '', grupo: '', representante: '', ativo: '' };

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { busca, tipo, uf, grupo, representante, ativo } = filtros;
  const chave = JSON.stringify([pagina, busca, tipo, uf, grupo, representante, ativo, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await clientesService.listarClientes({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          busca,
          tipo,
          uf,
          grupo,
          representante,
          ativo,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setClientes(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os clientes.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, busca, tipo, uf, grupo, representante, ativo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await clientesService.criarCliente(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await clientesService.atualizarCliente(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (cliente) => {
      if (cliente.ativo) {
        await clientesService.desativarCliente(cliente.id);
      } else {
        await clientesService.ativarCliente(cliente.id);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await clientesService.removerCliente(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    clientes,
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
