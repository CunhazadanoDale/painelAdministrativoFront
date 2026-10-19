import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import * as solicitacoesService from '../../services/solicitacoes';
import { ESCOPOS, TAMANHO_PAGINA } from './solicitacoesUtils';

export const FILTROS_CONTA_A_PAGAR = {
  fornecedor: '',
  categoria: '',
  competencia: '',
  origem: '',
  vencimento_de: '',
  vencimento_ate: '',
  vencidas: false,
};

export function useSolicitacoes() {
  const { permissoes, administrador } = useAutenticacao();

  const [itens, setItens] = useState([]);
  const [temProxima, setTemProxima] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [escopo, setEscopo] = useState('minhas');
  const [status, setStatus] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_CONTA_A_PAGAR);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const escopos = useMemo(
    () =>
      ESCOPOS.filter((item) => {
        if (item.valor === 'aprovacao') return permissoes.aprovacao;
        if (item.valor === 'financeiro') return permissoes.financeiro;
        if (item.valor === 'todas') return administrador;
        return true;
      }),
    [permissoes, administrador]
  );

  const escopoAtivo = escopos.some((item) => item.valor === escopo) ? escopo : 'minhas';
  const chave = JSON.stringify([pagina, escopoAtivo, status, empresa, filtros, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await solicitacoesService.listarSolicitacoes({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          escopo: escopoAtivo,
          status,
          empresa,
          ...filtros,
          sinal: controle.signal,
        });
        const daPagina = (resposta && resposta.dados) || [];

        if (daPagina.length === 0 && pagina > 1) {
          if (controle.signal.aborted) return;
          setPagina(pagina - 1);
          return;
        }

        if (controle.signal.aborted) return;
        setItens(daPagina.slice(0, TAMANHO_PAGINA));
        setTemProxima(daPagina.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: (e && e.message) || 'Erro ao carregar as solicitações.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [pagina, escopoAtivo, status, empresa, filtros, chave]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const trocarEscopo = useCallback((valor) => {
    setEscopo(valor);
    setStatus('');
    setPagina(1);
  }, []);

  const trocarStatus = useCallback((valor) => {
    setStatus(valor);
    setPagina(1);
  }, []);

  const trocarEmpresa = useCallback((valor) => {
    setEmpresa(valor);
    setPagina(1);
  }, []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_CONTA_A_PAGAR);
    setPagina(1);
  }, []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const criar = useCallback(
    async (dados) => {
      await solicitacoesService.criarSolicitacao(dados);
      setEscopo('minhas');
      setStatus('');
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  return {
    itens,
    escopos,
    escopo: escopoAtivo,
    status,
    empresa,
    filtros,
    pagina,
    temProxima,
    carregando,
    erro,
    trocarEscopo,
    trocarStatus,
    trocarEmpresa,
    filtrar,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    recarregar,
  };
}
