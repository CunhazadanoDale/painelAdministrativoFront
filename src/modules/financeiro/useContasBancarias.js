import { useCallback, useEffect, useState } from 'react';
import * as contasService from '../../services/contasBancarias';

export const TAMANHO_PAGINA = 20;

const FILTROS_INICIAIS = { empresa: '', banco: '', tipo: '', ativa: '' };

export function useContasBancarias() {
  const [contas, setContas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const { empresa, banco, tipo, ativa } = filtros;
  const chave = JSON.stringify([pagina, empresa, banco, tipo, ativa, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await contasService.listarContasBancarias({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          empresa,
          banco,
          tipo,
          ativa,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setContas(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as contas bancárias.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, empresa, banco, tipo, ativa]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrar = useCallback((mudancas) => {
    setFiltros((atual) => ({ ...atual, ...mudancas }));
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await contasService.criarContaBancaria(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await contasService.atualizarContaBancaria(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (conta) => {
      if (conta.ativa) {
        await contasService.desativarContaBancaria(conta.id, conta.versao);
      } else {
        await contasService.ativarContaBancaria(conta.id, conta.versao);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await contasService.removerContaBancaria(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    contas,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  };
}
