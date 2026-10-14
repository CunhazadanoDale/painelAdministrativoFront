import { useCallback, useEffect, useMemo, useState } from 'react';
import * as produtosService from '../../services/produtos';
import * as categoriasService from '../../services/categorias';

export const TAMANHO_PAGINA = 20;

export const FILTROS_PADRAO = {
  busca: '',
  categoria_id: '',
  ativo: '',
  destaque: '',
  estoque_baixo: '',
};

export function useProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [temProxima, setTemProxima] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [recarga, setRecarga] = useState(0);
  const [recargaAuxiliar, setRecargaAuxiliar] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);
  const [erroCategorias, setErroCategorias] = useState(null);
  const [erroResumo, setErroResumo] = useState(null);

  const chave = `${pagina}|${filtros.busca}|${filtros.categoria_id}|${filtros.ativo}|${filtros.destaque}|${filtros.estoque_baixo}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const lista = await categoriasService.listarTodasCategorias();
        if (cancelado) return;
        setCategorias(lista);
        setErroCategorias(null);
      } catch (e) {
        if (cancelado) return;
        setErroCategorias(e.message || 'Erro ao carregar as categorias.');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [recargaAuxiliar]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await produtosService.obterResumo();
        if (cancelado) return;
        setResumo(resposta?.dados ?? null);
        setErroResumo(null);
      } catch (e) {
        if (cancelado) return;
        setErroResumo(e.message || 'Erro ao carregar o resumo do estoque.');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [recarga, recargaAuxiliar]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await produtosService.listarProdutos({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          ...filtros,
        });

        if (cancelado) return;

        const itens = Array.isArray(resposta?.dados) ? resposta.dados : [];

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setProdutos(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setProdutos([]);
        setTemProxima(false);
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os produtos.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [chave, pagina, filtros]);

  const subcategorias = useMemo(
    () => categorias.filter((categoria) => categoria.categoria_pai_id),
    [categorias]
  );

  const categoriaMapa = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  );

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const recarregarAuxiliares = useCallback(() => setRecargaAuxiliar((valor) => valor + 1), []);

  const aplicarFiltros = useCallback((novosFiltros) => {
    setFiltros({ ...FILTROS_PADRAO, ...novosFiltros });
    setPagina(1);
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_PADRAO);
    setPagina(1);
  }, []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const criar = useCallback(
    async (dados) => {
      const resposta = await produtosService.criarProduto(dados);
      setPagina(1);
      recarregar();
      return resposta ? resposta.dados : null;
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await produtosService.alterarProduto(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarAtivo = useCallback(
    async (produto) => {
      if (produto.ativo) {
        await produtosService.desativarProduto(produto.id);
      } else {
        await produtosService.ativarProduto(produto.id);
      }
      recarregar();
    },
    [recarregar]
  );

  const alternarDestaque = useCallback(
    async (produto) => {
      await produtosService.alternarDestaque(produto.id, !produto.destaque);
      recarregar();
    },
    [recarregar]
  );

  return {
    produtos,
    categorias,
    subcategorias,
    categoriaMapa,
    resumo,
    temProxima,
    pagina,
    filtros,
    carregando,
    erro,
    chaveDados,
    erroCategorias,
    erroResumo,
    recarregar,
    recarregarAuxiliares,
    aplicarFiltros,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    alternarAtivo,
    alternarDestaque,
  };
}
