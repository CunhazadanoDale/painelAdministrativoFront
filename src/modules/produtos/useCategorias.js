import { useCallback, useEffect, useMemo, useState } from 'react';
import * as categoriasService from '../../services/categorias';

export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = String(recarga);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await categoriasService.listarCategorias({ pagina: 1, tamanho: 100 });
        if (cancelado) return;
        setCategorias(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as categorias.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [chave]);

  const raizes = useMemo(
    () =>
      categorias
        .filter((categoria) => !categoria.categoria_pai_id)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [categorias]
  );

  const categoriasMapa = useMemo(
    () => Object.fromEntries(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  );

  const filhasDe = useMemo(() => {
    const mapa = {};
    categorias.forEach((categoria) => {
      if (!categoria.categoria_pai_id) return;
      if (!mapa[categoria.categoria_pai_id]) mapa[categoria.categoria_pai_id] = [];
      mapa[categoria.categoria_pai_id].push(categoria);
    });
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    );
    return mapa;
  }, [categorias]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const criar = useCallback(
    async (dados) => {
      await categoriasService.criarCategoria(dados);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await categoriasService.alterarCategoria(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarAtivo = useCallback(
    async (categoria) => {
      if (categoria.ativo) {
        await categoriasService.desativarCategoria(categoria.id);
      } else {
        await categoriasService.ativarCategoria(categoria.id);
      }
      recarregar();
    },
    [recarregar]
  );

  return {
    categorias,
    raizes,
    categoriasMapa,
    filhasDe,
    carregando,
    erro,
    chaveDados,
    recarregar,
    criar,
    atualizar,
    alternarAtivo,
  };
}
