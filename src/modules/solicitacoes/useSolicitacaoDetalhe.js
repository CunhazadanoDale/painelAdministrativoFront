import { useCallback, useEffect, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import * as solicitacoesService from '../../services/solicitacoes';
import * as usuariosService from '../../services/usuarios';

export function useSolicitacaoDetalhe(id) {
  const { administrador } = useAutenticacao();

  const [solicitacao, setSolicitacao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [usuarios, setUsuarios] = useState({});
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${id}|${recarga}`;
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    if (!id) return undefined;

    const controle = new AbortController();

    (async () => {
      try {
        const resposta = await solicitacoesService.obterSolicitacao(id, { sinal: controle.signal });
        const dados = resposta ? resposta.dados : null;
        if (!dados) throw new Error('Solicitação não encontrada.');

        const [listaHistorico, listaArquivos] = await Promise.all([
          solicitacoesService.listarHistorico(id, { sinal: controle.signal }),
          solicitacoesService.listarArquivos(id, { sinal: controle.signal }),
        ]);

        const respostaPagamentos = await solicitacoesService.listarPagamentos(id, { sinal: controle.signal });

        let mapaUsuarios = {};
        if (administrador) {
          try {
            const listaUsuarios = await usuariosService.listarTodosUsuarios({ sinal: controle.signal });
            mapaUsuarios = Object.fromEntries(listaUsuarios.map((item) => [item.id, item]));
          } catch {
            mapaUsuarios = {};
          }
        }

        if (controle.signal.aborted) return;
        setSolicitacao(dados);
        setHistorico(listaHistorico);
        setArquivos(listaArquivos);
        setPagamentos(respostaPagamentos?.dados ?? []);
        setUsuarios(mapaUsuarios);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: (e && e.message) || 'Erro ao carregar a solicitação.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [id, administrador, recarga, chave]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const versao = solicitacao?.versao;

  const executar = useCallback(
    async (acao) => {
      await acao();
      recarregar();
    },
    [recarregar]
  );

  const aprovar = useCallback(() => executar(() => solicitacoesService.aprovar(id, versao)), [executar, id, versao]);

  const atualizar = useCallback(
    (dados) => executar(() => solicitacoesService.atualizarSolicitacao(id, dados)),
    [executar, id]
  );

  const classificar = useCallback(
    ({ fornecedor_id, categoria_financeira_id, competencia }) =>
      executar(() =>
        solicitacoesService.classificar(id, { fornecedor_id, categoria_financeira_id, competencia, versao })
      ),
    [executar, id, versao]
  );

  const adiar = useCallback(
    ({ vencimento, motivo }) => executar(() => solicitacoesService.adiar(id, { vencimento, motivo, versao })),
    [executar, id, versao]
  );

  const estornar = useCallback(
    ({ motivo, estornado_em }) => {
      const dados = estornado_em ? { motivo, estornado_em, versao } : { motivo, versao };
      return executar(() => solicitacoesService.estornarPagamento(id, dados));
    },
    [executar, id, versao]
  );

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
    pagamentos,
    pagamento: pagamentos.find((item) => !item.estornado) ?? null,
    usuarios,
    carregando,
    erro,
    aprovar,
    rejeitar,
    cancelar,
    registrarPagamento,
    atualizar,
    classificar,
    adiar,
    estornar,
    recarregar,
  };
}
