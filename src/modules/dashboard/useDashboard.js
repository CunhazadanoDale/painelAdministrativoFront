import { useCallback, useEffect, useMemo, useState } from 'react';
import * as leadsService from '../../services/leads';
import * as funisService from '../../services/funis';

const TAMANHO_RECENTES = 8;

/**
 * Hook de dados do Dashboard.
 *
 * Em uma única carga:
 * - funis ativos e as etapas de cada um;
 * - contagem de leads por etapa (alimenta os KPIs e as barras);
 * - últimos leads cadastrados (`GET /leads` já ordena por criação desc).
 *
 * Deriva: total de leads, total por funil, maior funil e etapaMap.
 */
export function useDashboard() {
  const [funis, setFunis] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [contagens, setContagens] = useState({});
  const [recentes, setRecentes] = useState([]);

  const [recarga, setRecarga] = useState(0);
  const [chaveOk, setChaveOk] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = String(recarga);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveOk !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const listaFunis = await funisService.listarTodosFunis({ ativos: true, sinal: controle.signal });

        const respostasEtapas = await Promise.all(
          listaFunis.map((funil) => funisService.listarEtapasDoFunil(funil.funil_id, { sinal: controle.signal }))
        );
        const listaEtapas = respostasEtapas.flatMap(
          (resposta) => resposta?.dados ?? []
        );

        const [respostasContagem, respostaLeads] = await Promise.all([
          Promise.all(
            listaEtapas.map((etapa) => leadsService.contarLeadsPorEtapa(etapa.etapa_id, { sinal: controle.signal }))
          ),
          leadsService.listarLeads({ pagina: 1, tamanho: TAMANHO_RECENTES, sinal: controle.signal }),
        ]);

        if (controle.signal.aborted) return;
        setFunis(listaFunis);
        setEtapas(listaEtapas);
        setContagens(
          Object.fromEntries(
            listaEtapas.map((etapa, indice) => [
              etapa.etapa_id,
              respostasContagem[indice]?.dados?.total ?? 0,
            ])
          )
        );
        setRecentes(respostaLeads?.dados ?? []);
        setChaveOk(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o painel.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave]);

  const etapaMap = useMemo(
    () => Object.fromEntries(etapas.map((etapa) => [etapa.etapa_id, etapa])),
    [etapas]
  );

  /** Total de leads = soma das contagens de todas as etapas dos funis ativos. */
  const totalLeads = useMemo(
    () => Object.values(contagens).reduce((soma, total) => soma + total, 0),
    [contagens]
  );

  /** [{ funil, total, etapas: [{ etapa, total }] }] ordenado por total desc. */
  const funisComContagem = useMemo(() => {
    const linhas = funis.map((funil) => {
      const etapasDoFunil = etapas
        .filter((etapa) => etapa.funil_id === funil.funil_id)
        .sort((a, b) => a.ordem - b.ordem);
      return {
        funil,
        etapas: etapasDoFunil.map((etapa) => ({
          etapa,
          total: contagens[etapa.etapa_id] ?? 0,
        })),
        total: etapasDoFunil.reduce(
          (soma, etapa) => soma + (contagens[etapa.etapa_id] ?? 0),
          0
        ),
      };
    });
    return linhas.sort((a, b) => b.total - a.total);
  }, [funis, etapas, contagens]);

  const maiorFunil = funisComContagem[0] ?? null;

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return {
    // dados
    funis,
    etapas,
    etapaMap,
    contagens,
    recentes,
    totalLeads,
    funisComContagem,
    maiorFunil,
    // estados
    carregando,
    erro,
    // ações
    recarregar,
  };
}
