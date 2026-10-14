import { useCallback, useEffect, useMemo, useState } from 'react';
import * as produtosService from '../../services/produtos';
import * as categoriasService from '../../services/categorias';
import * as arquivosService from '../../services/arquivos';

export const TAMANHO_PAGINA_MOVIMENTOS = 20;

export function useProdutoDetalhe(id) {
  const [produto, setProduto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [paginaMovimentos, setPaginaMovimentos] = useState(1);
  const [temProximaMovimentos, setTemProximaMovimentos] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${paginaMovimentos}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [respostaProduto, listaCategorias, respostaMovimentos] = await Promise.all([
          produtosService.obterProduto(id),
          categoriasService.listarTodasCategorias(),
          produtosService.listarMovimentos(id, {
            pagina: paginaMovimentos,
            tamanho: TAMANHO_PAGINA_MOVIMENTOS + 1,
          }),
        ]);
        const itens = respostaMovimentos?.dados ?? [];

        if (cancelado) return;

        if (itens.length === 0 && paginaMovimentos > 1) {
          setPaginaMovimentos(paginaMovimentos - 1);
          return;
        }

        setProduto(respostaProduto?.dados ?? null);
        setCategorias(listaCategorias);
        setMovimentos(itens.slice(0, TAMANHO_PAGINA_MOVIMENTOS));
        setTemProximaMovimentos(itens.length > TAMANHO_PAGINA_MOVIMENTOS);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o produto.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id, chave, paginaMovimentos, recarga]);

  const categoriaMapa = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  );

  const subcategorias = useMemo(
    () => categorias.filter((categoria) => categoria.categoria_pai_id),
    [categorias]
  );

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnteriorMovimentos = useCallback(
    () => setPaginaMovimentos((valor) => Math.max(1, valor - 1)),
    []
  );
  const irParaProximoMovimento = useCallback(
    () => setPaginaMovimentos((valor) => valor + 1),
    []
  );

  const atualizar = useCallback(
    async (dados) => {
      await produtosService.alterarProduto(id, dados);
      recarregar();
    },
    [id, recarregar]
  );

  const movimentar = useCallback(
    async (dados) => {
      await produtosService.movimentar(id, dados);
      setPaginaMovimentos(1);
      recarregar();
    },
    [id, recarregar]
  );

  const anexarImagem = useCallback(
    async (arquivo, alt) => {
      const enviado = await arquivosService.enviarArquivo(arquivo);
      await produtosService.anexarImagem(id, {
        arquivo_id: enviado.id,
        ordem: produto && produto.imagens ? produto.imagens.length : 0,
        alt,
      });
      recarregar();
    },
    [id, produto, recarregar]
  );

  const removerImagem = useCallback(
    async (imagemId) => {
      await produtosService.removerImagem(id, imagemId);
      recarregar();
    },
    [id, recarregar]
  );

  return {
    produto,
    categorias,
    subcategorias,
    categoriaMapa,
    movimentos,
    temProximaMovimentos,
    paginaMovimentos,
    carregando,
    erro,
    recarregar,
    atualizar,
    irParaAnteriorMovimentos,
    irParaProximoMovimento,
    movimentar,
    anexarImagem,
    removerImagem,
  };
}
