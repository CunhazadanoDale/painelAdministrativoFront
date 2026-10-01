import { useCallback, useEffect, useMemo, useState } from 'react';
import * as leadsService from '../../services/leads';

/**
 * Hook de dados do quadro Kanban da tela de Leads.
 *
 * Recebe funis/etapas já carregados pelo useLeads e, para o funil
 * selecionado, carrega os leads de cada etapa (GET /etapas/{id}/leads,
 * sem paginação). O movimento entre colunas é otimista no estado local e
 * confirmado com PATCH /leads/{id}/etapa (grava a trilha de histórico);
 * se a API falhar, o quadro é recarregado para restaurar o estado real.
 *
 * @param {{ funis: object[], etapas: object[], ativo: boolean }} opcoes
 *   `ativo` evita buscar o quadro enquanto a visão Kanban não está exibida.
 */
export function useKanban({ funis, etapas, ativo }) {
  const [funilId, setFunilId] = useState('');
  const [colunas, setColunas] = useState({});
  const [recarga, setRecarga] = useState(0);
  const [chaveOk, setChaveOk] = useState(null);
  const [falha, setFalha] = useState(null);
  const [erroMovimento, setErroMovimento] = useState(null);

  // Funil efetivo: mantém a escolha do usuário, com fallback para o primeiro
  // (evita setState dentro de effect só para "selecionar o primeiro").
  const funilEfetivoId = useMemo(() => {
    if (funilId && funis.some((funil) => funil.funil_id === funilId)) return funilId;
    return funis[0]?.funil_id ?? '';
  }, [funis, funilId]);

  const etapasDoFunil = useMemo(
    () =>
      etapas
        .filter((etapa) => etapa.funil_id === funilEfetivoId)
        .sort((a, b) => a.ordem - b.ordem),
    [etapas, funilEfetivoId]
  );

  const chave = `${funilEfetivoId}|${recarga}`;
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveOk !== chave;

  useEffect(() => {
    if (!ativo || !funilEfetivoId) return undefined;

    let cancelado = false;

    (async () => {
      try {
        const respostas = await Promise.all(
          etapasDoFunil.map((etapa) => leadsService.listarLeadsPorEtapa(etapa.etapa_id))
        );
        if (cancelado) return;

        const proximas = {};
        etapasDoFunil.forEach((etapa, indice) => {
          proximas[etapa.etapa_id] = (respostas[indice]?.dados ?? []).filter(
            (lead) => lead.ativo !== false
          );
        });

        setColunas(proximas);
        setChaveOk(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o quadro.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [ativo, funilEfetivoId, etapasDoFunil, chave]);

  const selecionarFunil = useCallback((id) => setFunilId(id), []);
  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  /** Move um lead de coluna (otimista; faz rollback recarregando em erro). */
  const mover = useCallback(async (lead, destinoEtapaId) => {
    const origemEtapaId = lead.etapa_id;
    if (!origemEtapaId || origemEtapaId === destinoEtapaId) return;

    setErroMovimento(null);
    setColunas((atual) => {
      const proximas = { ...atual };
      proximas[origemEtapaId] = (proximas[origemEtapaId] ?? []).filter(
        (item) => item.id !== lead.id
      );
      proximas[destinoEtapaId] = [
        { ...lead, etapa_id: destinoEtapaId },
        ...(proximas[destinoEtapaId] ?? []),
      ];
      return proximas;
    });

    try {
      await leadsService.moverLeadDeEtapa(lead.id, destinoEtapaId);
    } catch (e) {
      setErroMovimento(e.message || 'Erro ao mover o lead.');
      setRecarga((valor) => valor + 1);
    }
  }, []);

  const limparErroMovimento = useCallback(() => setErroMovimento(null), []);

  return {
    funilId: funilEfetivoId,
    etapas: etapasDoFunil,
    colunas,
    carregando,
    erro,
    erroMovimento,
    selecionarFunil,
    recarregar,
    mover,
    limparErroMovimento,
  };
}
