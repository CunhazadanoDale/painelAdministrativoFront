import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as leadsService from '../../services/leads';
import * as funisService from '../../services/funis';
import { filtrarLeadsPorTexto } from './leadsUtils';

export const TAMANHO_PAGINA = 20;

/**
 * Hook de dados da tela de Leads.
 *
 * Estratégia de listagem:
 * - Sem filtro de etapa: paginação no servidor (busca `q` também) e total
 *   vindo da soma das contagens por funil.
 * - Com filtro de etapa: carrega todos os leads da etapa e pagina/filtra
 *   em cliente (o endpoint da etapa não paginado nem aceita busca).
 *
 * `carregando` e `erro` são derivados da chave da requisição atual
 * (página/busca/etapa/recarga) em vez de setState dentro do effect.
 */
export function useLeads() {
  const [parametros, setParametros] = useSearchParams();
  const q = parametros.get('q') ?? '';

  const [funis, setFunis] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [estruturaOk, setEstruturaOk] = useState(false);

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(null);
  const [temProxima, setTemProxima] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [etapaFiltro, setEtapaFiltro] = useState('');

  const [recarga, setRecarga] = useState(0);
  // Última chave de requisição concluída com sucesso (define o fim do loading).
  const [chaveDados, setChaveDados] = useState(null);
  // Falha da última requisição: { chave, mensagem }.
  const [falha, setFalha] = useState(null);

  const chave = `${pagina}|${q}|${etapaFiltro}|${recarga}`;

  // Falha de estrutura vale para qualquer chave; falha de leads só para a sua chave.
  const erro = falha && (falha.estrutura || falha.chave === chave) ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  // Estrutura: funis ativos e etapas de cada um (recarrega a cada "Tentar novamente").
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const listaFunis = await funisService.listarTodosFunis({ ativos: true });
        const respostasEtapas = await Promise.all(
          listaFunis.map((funil) => funisService.listarEtapasDoFunil(funil.funil_id))
        );
        if (cancelado) return;
        setFunis(listaFunis);
        setEtapas(respostasEtapas.flatMap((resposta) => resposta?.dados ?? []));
        setEstruturaOk(true);
        // Limpa apenas uma falha anterior de estrutura (não mexe na de leads).
        setFalha((atual) => (atual?.estrutura ? null : atual));
      } catch (e) {
        if (cancelado) return;
        setFalha({
          estrutura: true,
          mensagem: e.message || 'Erro ao carregar funis e etapas.',
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [recarga]);

  // Leads: conforme filtro ativo (servidor ou cliente).
  useEffect(() => {
    if (!estruturaOk) return undefined;

    let cancelado = false;

    (async () => {
      try {
        if (etapaFiltro) {
          const resposta = await leadsService.listarLeadsPorEtapa(etapaFiltro);
          const ativos = (resposta?.dados ?? []).filter((lead) => lead.ativo !== false);
          const filtrados = filtrarLeadsPorTexto(ativos, q);
          const totalFiltrado = filtrados.length;
          const inicio = (pagina - 1) * TAMANHO_PAGINA;

          if (pagina > 1 && inicio >= totalFiltrado) {
            if (cancelado) return;
            setPagina(Math.max(1, Math.ceil(totalFiltrado / TAMANHO_PAGINA)));
            return;
          }

          if (cancelado) return;
          setLeads(filtrados.slice(inicio, inicio + TAMANHO_PAGINA));
          setTotal(totalFiltrado);
          setTemProxima(inicio + TAMANHO_PAGINA < totalFiltrado);
        } else {
          // Página + 1 item: se vier mais que a página, existe próxima.
          const resposta = await leadsService.listarLeads({
            pagina,
            tamanho: TAMANHO_PAGINA + 1,
            q,
          });
          const itens = resposta?.dados ?? [];

          if (itens.length === 0 && pagina > 1) {
            if (cancelado) return;
            setPagina(pagina - 1);
            return;
          }

          let totalConhecido = null;
          if (!q) {
            const contagens = await Promise.all(
              funis.map((funil) => leadsService.contarLeadsPorFunil(funil.funil_id))
            );
            totalConhecido = contagens.reduce(
              (soma, respostaContagem) => soma + (respostaContagem?.dados?.total ?? 0),
              0
            );
          }

          if (cancelado) return;
          setLeads(itens.slice(0, TAMANHO_PAGINA));
          setTemProxima(itens.length > TAMANHO_PAGINA);
          setTotal(totalConhecido);
        }

        if (cancelado) return;
        setChaveDados(chave);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar leads.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [estruturaOk, pagina, q, etapaFiltro, funis, recarga, chave]);

  const etapaMap = useMemo(
    () => Object.fromEntries(etapas.map((etapa) => [etapa.etapa_id, etapa])),
    [etapas]
  );

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const definirBusca = useCallback(
    (busca) => {
      const limpo = String(busca ?? '').trim();
      setParametros((atual) => {
        const novos = new URLSearchParams(atual);
        if (limpo) {
          novos.set('q', limpo);
        } else {
          novos.delete('q');
        }
        return novos;
      });
      setPagina(1);
    },
    [setParametros]
  );

  const aplicarFiltros = useCallback(
    ({ q: busca, etapaId }) => {
      definirBusca(busca);
      setEtapaFiltro(etapaId ?? '');
    },
    [definirBusca]
  );

  const limparFiltros = useCallback(() => {
    definirBusca('');
    setEtapaFiltro('');
  }, [definirBusca]);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  /** Cria lead; volta para a página 1 (o mais novo aparece primeiro). */
  const criar = useCallback(
    async (dados) => {
      await leadsService.criarLead(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  /**
   * Atualiza o lead. A mudança de etapa vai por PATCH ao final para que o
   * backend grave a trilha de histórico (o PUT sozinho não grava).
   */
  const atualizar = useCallback(
    async (id, dados, etapaOriginalId) => {
      await leadsService.atualizarLead(id, {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        origem: dados.origem,
        ativo: dados.ativo ?? true,
        etapa_id: etapaOriginalId,
      });
      if (dados.etapa_id && dados.etapa_id !== etapaOriginalId) {
        await leadsService.moverLeadDeEtapa(id, dados.etapa_id);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await leadsService.removerLead(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    // dados
    leads,
    etapas,
    funis,
    etapaMap,
    total,
    temProxima,
    pagina,
    q,
    etapaFiltro,
    // estados
    carregando,
    erro,
    recarga,
    // ações
    aplicarFiltros,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
    recarregar,
  };
}
