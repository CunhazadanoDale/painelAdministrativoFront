import { useCallback, useEffect, useState } from 'react';
import * as empresasService from '../../services/empresas';

export const TAMANHO_PAGINA = 20;

export function useEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [situacao, setSituacao] = useState('');
  const [temProxima, setTemProxima] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${pagina}|${situacao}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await empresasService.listarEmpresas({
          pagina,
          tamanho: TAMANHO_PAGINA + 1,
          ativas: situacao,
          sinal: controle.signal,
        });
        const itens = resposta?.dados ?? [];

        if (controle.signal.aborted) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setEmpresas(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as empresas.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, pagina, situacao]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const filtrarSituacao = useCallback((valor) => {
    setSituacao(valor);
    setPagina(1);
  }, []);

  const criar = useCallback(
    async (dados) => {
      await empresasService.criarEmpresa(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await empresasService.atualizarEmpresa(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const alternarSituacao = useCallback(
    async (empresa) => {
      if (empresa.ativa) {
        await empresasService.desativarEmpresa(empresa.id);
      } else {
        await empresasService.ativarEmpresa(empresa.id);
      }
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await empresasService.removerEmpresa(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    empresas,
    pagina,
    situacao,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrarSituacao,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  };
}
