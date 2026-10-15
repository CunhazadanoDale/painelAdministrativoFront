import { useCallback, useEffect, useMemo, useState } from 'react';
import * as funisService from '../../services/funis';
import * as leadsService from '../../services/leads';

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

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const lista = await funisService.listarTodosFunis({ ativos: false, sinal: controle.signal });
        if (controle.signal.aborted) return;
        setFunis(lista);
        setChaveFunisOk(chaveFunis);
        setFalhaFunis(null);
        setFunilSelecionadoId((atual) =>
          lista.some((funil) => funil.funil_id === atual)
            ? atual
            : lista[0]?.funil_id || ''
        );
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalhaFunis(e.message || 'Erro ao carregar os funis.');
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chaveFunis]);

  useEffect(() => {
    if (!funilSelecionadoId) return undefined;

    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await funisService.listarEtapasDoFunil(funilSelecionadoId, { sinal: controle.signal });
        const lista = resposta?.dados ?? [];
        const respostasContagem = await Promise.all(
          lista.map((etapa) => leadsService.contarLeadsPorEtapa(etapa.etapa_id, { sinal: controle.signal }))
        );
        if (controle.signal.aborted) return;
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
        if (controle.signal.aborted) return;
        setFalhaEtapas({
          chave: chaveEtapas,
          mensagem: e.message || 'Erro ao carregar as etapas.',
        });
      }
    })();

    return () => {
      controle.abort();
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
    funis,
    funilSelecionado,
    funilSelecionadoId,
    etapas: etapasOrdenadas,
    contagens,
    carregandoFunis,
    carregandoEtapas,
    erroFunis,
    erroEtapas,
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
