import { useCallback, useEffect, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import * as solicitacoesService from '../../services/solicitacoes';
import * as usuariosService from '../../services/usuarios';

export function useSolicitacaoDetalhe(id) {
  const { administrador } = useAutenticacao();

  const [solicitacao, setSolicitacao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [pagamento, setPagamento] = useState(null);
  const [usuarios, setUsuarios] = useState({});
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${id}|${recarga}`;
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    if (!id) return undefined;

    let cancelado = false;

    (async () => {
      try {
        const resposta = await solicitacoesService.obterSolicitacao(id);
        const dados = resposta ? resposta.dados : null;
        if (!dados) throw new Error('Solicitação não encontrada.');

        const [respostaHistorico, respostaArquivos] = await Promise.all([
          solicitacoesService.listarHistorico(id),
          solicitacoesService.listarArquivos(id),
        ]);

        let dadosPagamento = null;
        try {
          const respostaPagamento = await solicitacoesService.obterPagamento(id);
          dadosPagamento = respostaPagamento ? respostaPagamento.dados : null;
        } catch (e) {
          if (!e || e.status !== 404) throw e;
        }

        let mapaUsuarios = {};
        if (administrador) {
          try {
            const respostaUsuarios = await usuariosService.listarUsuarios({ pagina: 1, tamanho: 100 });
            mapaUsuarios = Object.fromEntries(
              (respostaUsuarios ? respostaUsuarios.dados : []).map((item) => [item.id, item])
            );
          } catch {
            mapaUsuarios = {};
          }
        }

        if (cancelado) return;
        setSolicitacao(dados);
        setHistorico(respostaHistorico ? respostaHistorico.dados ?? [] : []);
        setArquivos(respostaArquivos ? respostaArquivos.dados ?? [] : []);
        setPagamento(dadosPagamento);
        setUsuarios(mapaUsuarios);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: (e && e.message) || 'Erro ao carregar a solicitação.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id, administrador, recarga, chave]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const aprovar = useCallback(async () => {
    await solicitacoesService.aprovar(id);
    recarregar();
  }, [id, recarregar]);

  const rejeitar = useCallback(
    async (motivo) => {
      await solicitacoesService.rejeitar(id, motivo);
      recarregar();
    },
    [id, recarregar]
  );

  const cancelar = useCallback(async () => {
    await solicitacoesService.cancelar(id);
    recarregar();
  }, [id, recarregar]);

  const registrarPagamento = useCallback(
    async (dados) => {
      await solicitacoesService.registrarPagamento(id, dados);
      recarregar();
    },
    [id, recarregar]
  );

  return {
    solicitacao,
    historico,
    arquivos,
    pagamento,
    usuarios,
    carregando,
    erro,
    aprovar,
    rejeitar,
    cancelar,
    registrarPagamento,
    recarregar,
  };
}
