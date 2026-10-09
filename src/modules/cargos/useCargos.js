import { useCallback, useEffect, useState } from 'react';
import * as cargosService from '../../services/cargos';

export const TAMANHO_PAGINA = 20;

export function useCargos() {
  const [cargos, setCargos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${pagina}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await cargosService.listarCargos({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
        });
        const itens = resposta?.dados ?? [];

        if (itens.length === 0 && pagina > 1) {
          if (cancelado) return;
          setPagina(pagina - 1);
          return;
        }

        if (cancelado) return;
        setCargos(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os cargos.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [chave, pagina, recarga]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const criar = useCallback(
    async (dados) => {
      await cargosService.criarCargo({
        nome: dados.nome,
        descricao: dados.descricao,
        administrador: dados.administrador,
        financeiro: dados.financeiro,
      });
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await cargosService.atualizarCargo(id, {
        nome: dados.nome,
        descricao: dados.descricao,
        administrador: dados.administrador,
        financeiro: dados.financeiro,
        ativo: dados.ativo ?? true,
      });
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await cargosService.removerCargo(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    cargos,
    pagina,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
  };
}
