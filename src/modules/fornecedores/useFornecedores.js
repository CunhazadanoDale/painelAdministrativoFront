import { useCallback, useEffect, useState } from 'react';
import * as fornecedoresService from '../../services/fornecedores';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { busca: '', moeda: '', ativo: '' };

export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { busca, moeda, ativo } = filtros;
  const chave = JSON.stringify([pagina, busca, moeda, ativo, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await fornecedoresService.listarFornecedores({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          busca,
          moeda,
          ativo,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setFornecedores(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os fornecedores.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, busca, moeda, ativo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await fornecedoresService.criarFornecedor(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await fornecedoresService.atualizarFornecedor(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (fornecedor) => {
      if (fornecedor.ativo) {
        await fornecedoresService.desativarFornecedor(fornecedor.id, fornecedor.versao);
      } else {
        await fornecedoresService.ativarFornecedor(fornecedor.id, fornecedor.versao);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await fornecedoresService.removerFornecedor(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    fornecedores,
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
