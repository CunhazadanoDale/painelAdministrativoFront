import { useCallback, useEffect, useState } from 'react';
import * as categoriasService from '../../services/categoriasFinanceiras';

export function usePlanoContas() {
  const [raizes, setRaizes] = useState([]);
  const [soAtivas, setSoAtivas] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([soAtivas, recarga]);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await categoriasService.obterArvoreFinanceira({
          ativas: soAtivas,
          sinal: controle.signal,
        });

        if (controle.signal.aborted) return;

        setRaizes(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o plano de contas.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, soAtivas]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const mostrarSoAtivas = useCallback((valor) => setSoAtivas(!!valor), []);

  const criar = useCallback(
    async (dados) => {
      await categoriasService.criarCategoriaFinanceira(dados);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await categoriasService.atualizarCategoriaFinanceira(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (categoria) => {
      if (categoria.ativa) {
        await categoriasService.desativarCategoriaFinanceira(categoria.id, categoria.versao);
      } else {
        await categoriasService.ativarCategoriaFinanceira(categoria.id, categoria.versao);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await categoriasService.removerCategoriaFinanceira(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    raizes,
    soAtivas,
    carregando,
    erro,
    recarregar,
    mostrarSoAtivas,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  };
}
