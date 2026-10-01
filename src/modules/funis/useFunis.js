import { useCallback, useEffect, useMemo, useState } from 'react';
import * as funisService from '../../services/funis';
import * as leadsService from '../../services/leads';

/**
 * Hook de dados da tela de Funis (funis + etapas aninhadas).
 *
 * Estratégia:
 * - Carrega a lista de funis (ativos e inativos) e mantém o funil selecionado;
 * - Ao selecionar um funil, carrega as etapas ordenadas e a contagem de
 *   leads de cada etapa (usada no badge e para bloquear exclusões que a
 *   FK do banco rejeitaria: lead -> etapa é RESTRICT);
 * - Reordenação usa PUT /funils/{id}/etapas/ordem com os ids na nova ordem.
 *
 * `carregando`/`erro` são derivados da chave da requisição atual
 * (padrão adotado em useLeads para evitar setState síncrono no effect).
 */
export function useFunis() {
  const [funis, setFunis] = useState([]);
  const [funilSelecionadoId, setFunilSelecionadoId] = useState('');
  const [etapas, setEtapas] = useState([]);
  const [contagens, setContagens] = useState({});

  const [recargaFunis, setRecargaFunis] = useState(0);
  const [recargaEtapas, setRecargaEtapas] = useState(0);
  const [chaveFunisOk, setChaveFunisOk] = useState(null);
  const [chaveEtapasOk, setChaveEtapasOk] = useState(null);
  const [falhaFunis, setFalhaFunis] = useState(null);
  const [falhaEtapas, setFalhaEtapas] = useState(null);

  const chaveFunis = String(recargaFunis);
  const chaveEtapas = funilSelecionadoId ? `${funilSelecionadoId}|${recargaEtapas}` : '';

  const erroFunis = falhaFunis;
  const erroEtapas =
    falhaEtapas && falhaEtapas.chave === chaveEtapas ? falhaEtapas.mensagem : null;
  const carregandoFunis = !erroFunis && chaveFunisOk !== chaveFunis;
  const carregandoEtapas =
    !!funilSelecionadoId && !erroEtapas && chaveEtapasOk !== chaveEtapas;

  // Funis: lista geral (inclusive inativos, para permitir reeditar).
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await funisService.listarFunis({
          pagina: 1,
          tamanho: 100,
          ativos: false,
        });
        const lista = resposta?.dados ?? [];
        if (cancelado) return;
        setFunis(lista);
        setChaveFunisOk(chaveFunis);
        setFalhaFunis(null);
        // Mantém a seleção atual; se ela não existir mais, pega a primeira.
        setFunilSelecionadoId((atual) =>
          lista.some((funil) => funil.funil_id === atual)
            ? atual
            : lista[0]?.funil_id || ''
        );
      } catch (e) {
        if (cancelado) return;
        setFalhaFunis(e.message || 'Erro ao carregar os funis.');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [chaveFunis]);

  // Etapas do funil selecionado + contagem de leads por etapa.
  useEffect(() => {
    if (!funilSelecionadoId) return undefined;

    let cancelado = false;

    (async () => {
      try {
        const resposta = await funisService.listarEtapasDoFunil(funilSelecionadoId);
        const lista = resposta?.dados ?? [];
        const respostasContagem = await Promise.all(
          lista.map((etapa) => leadsService.contarLeadsPorEtapa(etapa.etapa_id))
        );
        if (cancelado) return;
        setEtapas(lista);
        setContagens(
          Object.fromEntries(
            lista.map((etapa, indice) => [
              etapa.etapa_id,
              respostasContagem[indice]?.dados?.total ?? 0,
            ])
          )
        );
        setChaveEtapasOk(chaveEtapas);
        setFalhaEtapas(null);
      } catch (e) {
        if (cancelado) return;
        setFalhaEtapas({
          chave: chaveEtapas,
          mensagem: e.message || 'Erro ao carregar as etapas.',
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [funilSelecionadoId, chaveEtapas]);

  const etapasOrdenadas = useMemo(
    () => [...etapas].sort((a, b) => a.ordem - b.ordem),
    [etapas]
  );

  const funilSelecionado = useMemo(
    () => funis.find((funil) => funil.funil_id === funilSelecionadoId) ?? null,
    [funis, funilSelecionadoId]
  );

  const selecionarFunil = useCallback((id) => setFunilSelecionadoId(id), []);
  const recarregarFunis = useCallback(() => setRecargaFunis((valor) => valor + 1), []);
  const recarregarEtapas = useCallback(() => setRecargaEtapas((valor) => valor + 1), []);

  /** Cria o funil e o seleciona; mantém a lista local sem refetch. */
  const criarNovoFunil = useCallback(async ({ nome }) => {
    const resposta = await funisService.criarFunil({ nome });
    const criado = resposta?.dados;
    if (criado) {
      setFunis((atual) => [...atual, criado]);
      setFunilSelecionadoId(criado.funil_id);
    }
    return criado;
  }, []);

  const salvarFunil = useCallback(async (funil, { nome, ativo }) => {
    await funisService.atualizarFunil(funil.funil_id, { nome, ativo });
    setFunis((atual) =>
      atual.map((item) =>
        item.funil_id === funil.funil_id ? { ...item, nome, ativo } : item
      )
    );
  }, []);

  /**
   * Exclui o funil. Antes verifica a contagem de leads nas etapas:
   * o banco tem FK lead -> etapa (RESTRICT), então um funil com leads
   * jamais poderá ser removido — melhor avisar em linguagem humana.
   */
  const excluirFunil = useCallback(
    async (funil) => {
      const respostaEtapas = await funisService.listarEtapasDoFunil(funil.funil_id);
      const etapasDoFunil = respostaEtapas?.dados ?? [];
      const respostasContagem = await Promise.all(
        etapasDoFunil.map((etapa) => leadsService.contarLeadsPorEtapa(etapa.etapa_id))
      );
      const total = respostasContagem.reduce(
        (soma, resposta) => soma + (resposta?.dados?.total ?? 0),
        0
      );
      if (total > 0) {
        throw new Error(
          `O funil possui ${total} lead(s). Exclua ou mova os leads antes de remover o funil.`
        );
      }

      await funisService.removerFunil(funil.funil_id);
      setFunis((atual) => atual.filter((item) => item.funil_id !== funil.funil_id));
      setFunilSelecionadoId((atual) => (atual === funil.funil_id ? '' : atual));
    },
    []
  );

  /** Cria etapa no funil selecionado (ordem 0 => backend anexa no fim). */
  const criarNovaEtapa = useCallback(
    async ({ nome }) => {
      await funisService.criarEtapa({
        nome,
        ordem: 0,
        funil_id: funilSelecionadoId,
      });
      recarregarEtapas();
    },
    [funilSelecionadoId, recarregarEtapas]
  );

  const salvarEtapa = useCallback(
    async (etapa, { nome, ativo }) => {
      await funisService.atualizarEtapa(etapa.etapa_id, {
        nome,
        ordem: etapa.ordem,
        funil_id: etapa.funil_id,
        ativo,
      });
      recarregarEtapas();
    },
    [recarregarEtapas]
  );

  /** Exclui a etapa; bloqueia se houver leads vinculados (FK RESTRICT). */
  const excluirEtapa = useCallback(
    async (etapa) => {
      const total = contagens[etapa.etapa_id] ?? 0;
      if (total > 0) {
        throw new Error(
          `A etapa possui ${total} lead(s). Mova ou exclua os leads antes de remover a etapa.`
        );
      }
      await funisService.removerEtapa(etapa.etapa_id);
      recarregarEtapas();
    },
    [contagens, recarregarEtapas]
  );

  /** Sobe/desce uma etapa reordenando a lista enviada ao backend. */
  const moverEtapa = useCallback(
    async (etapa, direcao) => {
      const ordenadas = [...etapasOrdenadas];
      const indice = ordenadas.findIndex((item) => item.etapa_id === etapa.etapa_id);
      const destino = indice + direcao;
      if (indice < 0 || destino < 0 || destino >= ordenadas.length) return;

      [ordenadas[indice], ordenadas[destino]] = [ordenadas[destino], ordenadas[indice]];

      const resposta = await funisService.reordenarEtapas(
        funilSelecionadoId,
        ordenadas.map((item) => item.etapa_id)
      );
      const lista = resposta?.dados ?? ordenadas;
      setEtapas(lista.map((item, posicao) => ({ ...item, ordem: posicao + 1 })));
      setChaveEtapasOk(chaveEtapas);
    },
    [etapasOrdenadas, funilSelecionadoId, chaveEtapas]
  );

  return {
    // dados
    funis,
    funilSelecionado,
    funilSelecionadoId,
    etapas: etapasOrdenadas,
    contagens,
    // estados
    carregandoFunis,
    carregandoEtapas,
    erroFunis,
    erroEtapas,
    // ações
    selecionarFunil,
    criarNovoFunil,
    salvarFunil,
    excluirFunil,
    criarNovaEtapa,
    salvarEtapa,
    excluirEtapa,
    moverEtapa,
    recarregarFunis,
    recarregarEtapas,
  };
}
