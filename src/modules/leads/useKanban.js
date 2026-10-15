import { useCallback, useEffect, useMemo, useState } from 'react';
import * as leadsService from '../../services/leads';

export function useKanban({ funis, etapas, ativo }) {
  const [funilId, setFunilId] = useState('');
  const [colunas, setColunas] = useState({});
  const [recarga, setRecarga] = useState(0);
  const [chaveOk, setChaveOk] = useState(null);
  const [falha, setFalha] = useState(null);
  const [erroMovimento, setErroMovimento] = useState(null);

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

    const controle = new AbortController();

    (async () => {
      try {
        const respostas = await Promise.all(
          etapasDoFunil.map((etapa) => leadsService.listarLeadsPorEtapa(etapa.etapa_id, { sinal: controle.signal }))
        );
        if (controle.signal.aborted) return;

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
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o quadro.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [ativo, funilEfetivoId, etapasDoFunil, chave]);

  const selecionarFunil = useCallback((id) => setFunilId(id), []);
  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

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
