import { useCallback, useEffect, useMemo, useState } from 'react';
import * as leadsService from '../../services/leads';
import * as funisService from '../../services/funis';

export const TAMANHO_HISTORICO = 20;

/**
 * Hook de dados da tela de detalhe do lead (`/leads/:id`).
 *
 * Carrega:
 * - o lead (GET /leads/{id}); 404 vira "Lead não encontrado";
 * - a estrutura (funis + etapas, inclusive de funis inativos) para
 *   resolver os nomes das etapas do histórico;
 * - as movimentações (GET /leads/{id}/historico) em páginas "página+1",
 *   já que o envelope não traz `total` — anexando as páginas seguintes.
 *
 * A edição segue o mesmo combinado da lista: PUT e, se a etapa mudou,
 * PATCH /etapa ao final para a trilha de histórico ser gravada.
 */
export function useLeadDetalhe(leadId) {
  const [lead, setLead] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [estruturaOk, setEstruturaOk] = useState(false);

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveLeadOk, setChaveLeadOk] = useState(null);
  const [chaveHistOk, setChaveHistOk] = useState(null);
  const [falhaLead, setFalhaLead] = useState(null);
  const [falhaEstrutura, setFalhaEstrutura] = useState(null);
  const [falhaHist, setFalhaHist] = useState(null);

  const chaveLead = `${leadId}|${recarga}`;
  const chaveHist = `${leadId}|${pagina}|${recarga}`;

  const erroLead = falhaLead;
  const erroEstrutura = falhaEstrutura;
  const erroHistorico =
    falhaHist && falhaHist.chave === chaveHist ? falhaHist.mensagem : null;

  const carregandoLead = !erroLead && chaveLeadOk !== chaveLead;
  const carregandoEstrutura = !erroEstrutura && !estruturaOk;
  const carregandoHistorico = !erroHistorico && chaveHistOk !== chaveHist;

  // Estrutura: todos os funis (inclusive inativos) e as etapas de cada um.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const listaFunis = await funisService.listarTodosFunis({ ativos: false });
        const respostasEtapas = await Promise.all(
          listaFunis.map((funil) => funisService.listarEtapasDoFunil(funil.funil_id))
        );
        if (cancelado) return;
        setEtapas(respostasEtapas.flatMap((resposta) => resposta?.dados ?? []));
        setEstruturaOk(true);
        setFalhaEstrutura(null);
      } catch (e) {
        if (cancelado) return;
        setFalhaEstrutura(e.message || 'Erro ao carregar as etapas.');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [recarga]);

  // Lead.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await leadsService.obterLead(leadId);
        if (cancelado) return;
        const obtido = resposta?.dados ?? null;
        setLead(obtido);
        setChaveLeadOk(chaveLead);
        setFalhaLead(obtido ? null : 'Lead não encontrado.');
      } catch (e) {
        if (cancelado) return;
        setFalhaLead(
          e.status === 404
            ? 'Lead não encontrado. Ele pode ter sido excluído.'
            : e.message || 'Erro ao carregar o lead.'
        );
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [leadId, chaveLead]);

  // Histórico de movimentações (página 1 substitui; demais anexam).
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const resposta = await leadsService.listarHistoricoDoLead(leadId, {
          pagina,
          tamanho: TAMANHO_HISTORICO + 1,
        });
        const itens = resposta?.dados ?? [];
        if (cancelado) return;

        const paginaCompleta = itens.slice(0, TAMANHO_HISTORICO);
        setMovimentacoes((atual) => {
          if (pagina === 1) return paginaCompleta;
          const conhecidos = new Set(atual.map((mov) => mov.id));
          return [...atual, ...paginaCompleta.filter((mov) => !conhecidos.has(mov.id))];
        });
        setTemProxima(itens.length > TAMANHO_HISTORICO);
        setChaveHistOk(chaveHist);
        setFalhaHist(null);
      } catch (e) {
        if (cancelado) return;
        setFalhaHist({
          chave: chaveHist,
          mensagem: e.message || 'Erro ao carregar as movimentações.',
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [leadId, pagina, recarga, chaveHist]);

  const etapaMap = useMemo(
    () => Object.fromEntries(etapas.map((etapa) => [etapa.etapa_id, etapa])),
    [etapas]
  );

  /**
   * Etapas sugeridas no modal de edição: as do funil da etapa atual do lead
   * (evita listar etapas de funis que não têm nada a ver com ele).
   */
  const etapasEditaveis = useMemo(() => {
    const etapaAtual = etapas.find((etapa) => etapa.etapa_id === lead?.etapa_id);
    if (!etapaAtual) return etapas;
    return etapas.filter((etapa) => etapa.funil_id === etapaAtual.funil_id);
  }, [etapas, lead]);

  const recarregar = useCallback(() => {
    setPagina(1);
    setRecarga((valor) => valor + 1);
  }, []);

  const carregarMais = useCallback(() => setPagina((valor) => valor + 1), []);

  /** PUT + PATCH de etapa (para gravar histórico), depois recarrega tudo. */
  const atualizar = useCallback(
    async (dados) => {
      await leadsService.atualizarLead(leadId, {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        origem: dados.origem,
        ativo: lead?.ativo ?? true,
        etapa_id: lead?.etapa_id ?? dados.etapa_id,
      });
      if (dados.etapa_id && dados.etapa_id !== lead?.etapa_id) {
        await leadsService.moverLeadDeEtapa(leadId, dados.etapa_id);
      }
      recarregar();
    },
    [leadId, lead, recarregar]
  );

  return {
    // dados
    lead,
    etapaMap,
    etapasEditaveis,
    movimentacoes,
    temProxima,
    // estados
    carregando: carregandoLead || carregandoEstrutura,
    carregandoHistorico,
    erroLead,
    erroEstrutura,
    erroHistorico,
    // ações
    atualizar,
    carregarMais,
    recarregar,
  };
}
