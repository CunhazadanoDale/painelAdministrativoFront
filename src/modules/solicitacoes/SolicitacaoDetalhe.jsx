import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import {
  AlertCircle,
  Ban,
  Check,
  ChevronLeft,
  CalendarClock,
  CreditCard,
  Download,
  Pencil,
  Tags,
  Undo2,
  XCircle,
} from 'lucide-react';
import { baixarArquivo } from '../../services/arquivos';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as fornecedoresService from '../../services/fornecedores';
import { AdiarModal, ClassificarModal, EstornoModal } from './AcoesDaSolicitacao';
import { SolicitacaoFormModal } from './SolicitacaoFormModal';
import { formatarData, formatarDataHora, formatarMoeda, formatarTamanho } from '../../lib/formatar';
import { useSolicitacaoDetalhe } from './useSolicitacaoDetalhe';
import { PagamentoModal } from './PagamentoModal';
import { RejeitarModal } from './RejeitarModal';
import {
  corStatus,
  formatarCompetencia,
  rotuloEvento,
  rotuloFormaPagamento,
  rotuloOrigem,
  rotuloStatus,
} from './solicitacoesUtils';

const apelidoDaConta = (conta) => conta?.apelido;
import './Solicitacoes.css';

export default function SolicitacaoDetalhe() {
  const { id } = useParams();
  const { usuario, administrador, financeiro, permissoes } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    solicitacao,
    historico,
    arquivos,
    pagamentos,
    pagamento,
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
  } = useSolicitacaoDetalhe(id);
  const nomeFornecedor = useNomesPorId([solicitacao?.fornecedor_id], fornecedoresService.obterFornecedor);
  const nomeCategoria = useNomesPorId(
    [solicitacao?.categoria_financeira_id],
    categoriasService.obterCategoriaFinanceira
  );
  const nomeConta = useNomesPorId(
    pagamentos.map((item) => item.conta_bancaria_id),
    contasService.obterContaBancaria,
    apelidoDaConta
  );
  const [modal, setModal] = useState(null);

  const [erroAcao, setErroAcao] = useState(null);
  const [erroCancelamento, setErroCancelamento] = useState(null);
  const [acao, setAcao] = useState(null);
  const [rejeitarAberto, setRejeitarAberto] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [cancelarAberto, setCancelarAberto] = useState(false);

  const executar = async (nome, acaoExecutar) => {
    setErroAcao(null);
    setAcao(nome);
    try {
      await acaoExecutar();
    } catch (e) {
      setErroAcao((e && e.message) || 'Erro na operação.');
    } finally {
      setAcao(null);
    }
  };

  const executarModal = async (nome, acaoExecutar) => {
    setErroAcao(null);
    setAcao(nome);
    try {
      await acaoExecutar();
    } finally {
      setAcao(null);
    }
  };

  const abrirCancelamento = () => {
    setErroCancelamento(null);
    setCancelarAberto(true);
  };

  const confirmarCancelamento = async () => {
    setErroCancelamento(null);
    try {
      await executarModal('cancelar', () => cancelar());
      setCancelarAberto(false);
    } catch (e) {
      setErroCancelamento((e && e.message) || 'Erro ao cancelar a solicitação.');
    }
  };

  if (carregando) {
    return <div className="solicitacoes-status solicitacoes-status-detalhe">Carregando solicitação…</div>;
  }

  if (erro) {
    return (
      <div className="solicitacoes-detalhe-coluna">
        <Link className="solicitacoes-voltar" to="/solicitacoes">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!solicitacao) return null;

  const ehSolicitante = !!usuario && solicitacao.solicitante_id === usuario.id;
  const pendente = solicitacao.status === 'pendente_aprovacao';
  const podeRejeitar = pendente && (permissoes.aprovacao || administrador);
  const podeAprovar = podeRejeitar && !ehSolicitante;
  const podeCancelar =
    (pendente || solicitacao.status === 'aprovado') && (administrador || ehSolicitante);
  const ehFinanceiro = financeiro || permissoes.financeiro || administrador;
  const aprovada = solicitacao.status === 'aprovado';
  const podePagar = aprovada && ehFinanceiro;
  const semCategoria = !solicitacao.categoria_financeira_id;
  const podeEditar = pendente && (administrador || ehSolicitante);
  const podeClassificar = aprovada && ehFinanceiro;
  const podeAdiar = aprovada && ehFinanceiro;
  const podeEstornar = solicitacao.status === 'pago' && ehFinanceiro && !!pagamento;
  const temAcao = podeRejeitar || podeCancelar || podePagar || podeEditar || podeEstornar;
  const fecharModal = () => setModal(null);

  const nomeSolicitante = usuarios[solicitacao.solicitante_id]
    ? usuarios[solicitacao.solicitante_id].nome
    : '—';

  const dados = [
    { rotulo: 'Empresa', valor: nomeEmpresa(solicitacao.empresa_id) },
    { rotulo: 'Valor', valor: formatarMoeda(solicitacao.valor_centavos) },
    { rotulo: 'Prazo', valor: formatarData(solicitacao.prazo_pagamento) },
    { rotulo: 'Forma', valor: rotuloFormaPagamento(solicitacao.forma_pagamento) },
    { rotulo: 'Fornecedor', valor: nomeFornecedor(solicitacao.fornecedor_id) },
    {
      rotulo: 'Categoria',
      valor: solicitacao.categoria_financeira_id ? nomeCategoria(solicitacao.categoria_financeira_id) : 'Sem categoria',
    },
    { rotulo: 'Competência', valor: formatarCompetencia(solicitacao.competencia) },
    { rotulo: 'Origem', valor: rotuloOrigem(solicitacao.origem) },
    { rotulo: 'Solicitante', valor: nomeSolicitante },
    { rotulo: 'Criada em', valor: formatarDataHora(solicitacao.criado_em) },
    solicitacao.aprovado_em
      ? { rotulo: 'Aprovada em', valor: formatarDataHora(solicitacao.aprovado_em) }
      : null,
    solicitacao.rejeitado_em
      ? { rotulo: 'Rejeitada em', valor: formatarDataHora(solicitacao.rejeitado_em) }
      : null,
    solicitacao.cancelado_em
      ? { rotulo: 'Cancelada em', valor: formatarDataHora(solicitacao.cancelado_em) }
      : null,
  ].filter(Boolean);

  return (
    <div className="solicitacoes-detalhe">
      <div className="solicitacoes-detalhe-topo">
        <Link className="solicitacoes-voltar" to="/solicitacoes">
          <ChevronLeft size={16} /> Voltar
        </Link>
        <div className="solicitacoes-detalhe-titulo">
          <span className="solicitacoes-detalhe-valor">
            {formatarMoeda(solicitacao.valor_centavos)}
          </span>
          <StatusBadge
            status={corStatus(solicitacao.status)}
            label={rotuloStatus(solicitacao.status)}
          />
          {solicitacao.estimado && <StatusBadge status="neutral" label="Estimado" />}
          {solicitacao.vencida && <StatusBadge status="danger" label="Vencida" />}
        </div>
      </div>

      {erroAcao && (
        <div className="leads-erro solicitacoes-detalhe-full">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
        </div>
      )}

      <section className="solicitacoes-painel">
        <header className="solicitacoes-painel-cabecalho">
          <h2>Dados da solicitação</h2>
        </header>
        <dl className="solicitacoes-dados">
          {dados.map((item) => (
            <div className="solicitacoes-dado" key={item.rotulo}>
              <dt>{item.rotulo}</dt>
              <dd>{item.valor}</dd>
            </div>
          ))}
          <div className="solicitacoes-dado solicitacoes-dado-full">
            <dt>Observação</dt>
            <dd>{solicitacao.observacao}</dd>
          </div>
          {solicitacao.motivo_rejeicao && (
            <div className="solicitacoes-dado solicitacoes-dado-full">
              <dt>Motivo da rejeição</dt>
              <dd>{solicitacao.motivo_rejeicao}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="solicitacoes-painel">
        <header className="solicitacoes-painel-cabecalho">
          <h2>Ações</h2>
        </header>
        <div className="solicitacoes-acoes">
          {!temAcao && (
            <span className="solicitacoes-acoes-vazio">
              Nenhuma ação disponível para o seu perfil.
            </span>
          )}
          {podeAprovar && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              disabled={!!acao}
              onClick={() => executar('aprovar', () => aprovar())}
            >
              <Check size={14} /> {acao === 'aprovar' ? 'Aprovando…' : 'Aprovar'}
            </button>
          )}
          {podeRejeitar && (
            <button
              type="button"
              className="filter-btn solicitacoes-acao-perigo"
              disabled={!!acao}
              onClick={() => setRejeitarAberto(true)}
            >
              <XCircle size={14} /> Rejeitar
            </button>
          )}
          {podeEditar && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              disabled={!!acao}
              onClick={() => setModal('editar')}
            >
              <Pencil size={14} /> Editar
            </button>
          )}
          {podeClassificar && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              disabled={!!acao}
              onClick={() => setModal('classificar')}
            >
              <Tags size={14} /> Classificar
            </button>
          )}
          {podeAdiar && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              disabled={!!acao}
              onClick={() => setModal('adiar')}
            >
              <CalendarClock size={14} /> Adiar
            </button>
          )}
          {podePagar && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              disabled={!!acao || semCategoria}
              onClick={() => setPagamentoAberto(true)}
            >
              <CreditCard size={14} /> Registrar pagamento
            </button>
          )}
          {podePagar && semCategoria && (
            <span className="solicitacoes-form-ajuda">Classifique antes de pagar.</span>
          )}
          {podeEstornar && (
            <button
              type="button"
              className="filter-btn solicitacoes-acao-perigo"
              disabled={!!acao}
              onClick={() => setModal('estornar')}
            >
              <Undo2 size={14} /> Estornar pagamento
            </button>
          )}
          {podeCancelar && (
            <button
              type="button"
              className="filter-btn solicitacoes-acao-perigo"
              disabled={!!acao}
              onClick={abrirCancelamento}
            >
              <Ban size={14} /> Cancelar
            </button>
          )}
        </div>
      </section>

      <section className="solicitacoes-painel">
        <header className="solicitacoes-painel-cabecalho">
          <h2>Anexos</h2>
        </header>
        {arquivos.length === 0 ? (
          <div className="solicitacoes-painel-vazio">Nenhum anexo.</div>
        ) : (
          <ul className="solicitacoes-lista">
            {arquivos.map((arquivo) => (
              <li key={arquivo.id} className="solicitacoes-lista-item">
                <div className="solicitacoes-lista-info">
                  <span className="solicitacoes-lista-nome" title={arquivo.nome}>
                    {arquivo.nome}
                  </span>
                  <span className="solicitacoes-lista-meta">{formatarTamanho(arquivo.tamanho)}</span>
                </div>
                <button
                  type="button"
                  className="leads-acao-btn"
                  title="Baixar"
                  disabled={acao === 'baixar'}
                  onClick={() => executar('baixar', () => baixarArquivo(arquivo.id, arquivo.nome))}
                >
                  <Download size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="solicitacoes-painel">
        <header className="solicitacoes-painel-cabecalho">
          <h2>Pagamentos</h2>
        </header>
        {pagamentos.length === 0 ? (
          <div className="solicitacoes-painel-vazio">Nenhum pagamento registrado.</div>
        ) : (
          <ul className="solicitacoes-lista">
            {pagamentos.map((item) => {
              const arquivoComprovante = item.comprovante_arquivo_id
                ? arquivos.find((arquivo) => arquivo.id === item.comprovante_arquivo_id)
                : null;
              return (
                <li key={item.id} className="solicitacoes-lista-item">
                  <div className="solicitacoes-lista-info">
                    <span className="solicitacoes-lista-nome">
                      {formatarMoeda(item.valor_centavos)} em {formatarDataHora(item.pago_em)}
                      {item.conta_bancaria_id ? ` · ${nomeConta(item.conta_bancaria_id)}` : ''}
                    </span>
                    {item.estorno && (
                      <span className="solicitacoes-lista-meta">
                        Estornado em {formatarDataHora(item.estorno.estornado_em)}: {item.estorno.motivo}
                      </span>
                    )}
                  </div>
                  <StatusBadge
                    status={item.estornado ? 'danger' : 'success'}
                    label={item.estornado ? 'Estornado' : 'Vigente'}
                  />
                  {arquivoComprovante && (
                    <button
                      type="button"
                      className="leads-acao-btn"
                      title="Baixar comprovante"
                      disabled={acao === 'baixar'}
                      onClick={() =>
                        executar('baixar', () => baixarArquivo(arquivoComprovante.id, arquivoComprovante.nome))
                      }
                    >
                      <Download size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="solicitacoes-painel solicitacoes-detalhe-full">
        <header className="solicitacoes-painel-cabecalho">
          <h2>Histórico</h2>
        </header>
        {historico.length === 0 ? (
          <div className="solicitacoes-painel-vazio">Nenhum registro no histórico.</div>
        ) : (
          <ol className="solicitacoes-historico">
            {historico.map((registro) => (
              <li key={registro.id} className="solicitacoes-historico-item">
                <span className="solicitacoes-historico-data">
                  {formatarDataHora(registro.criado_em)}
                </span>
                <span className="solicitacoes-historico-descricao">
                  <strong>{rotuloEvento(registro.evento)}</strong>
                  {registro.descricao ? ` — ${registro.descricao}` : ''}
                </span>
                <StatusBadge
                  status={corStatus(registro.para_status)}
                  label={rotuloStatus(registro.para_status)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {rejeitarAberto && (
        <RejeitarModal
          onFechar={() => setRejeitarAberto(false)}
          onConfirmar={(motivo) => executarModal('rejeitar', () => rejeitar(motivo))}
        />
      )}

      {pagamentoAberto && (
        <PagamentoModal
          solicitacao={solicitacao}
          onFechar={() => setPagamentoAberto(false)}
          onConfirmar={(dados) => executarModal('pagamento', () => registrarPagamento(dados))}
        />
      )}

      {modal === 'editar' && (
        <SolicitacaoFormModal
          solicitacao={solicitacao}
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          onFechar={fecharModal}
          onSalvar={atualizar}
        />
      )}
      {modal === 'classificar' && (
        <ClassificarModal
          solicitacao={solicitacao}
          nomeFornecedor={nomeFornecedor}
          onConfirmar={classificar}
          onFechar={fecharModal}
          onRecarregar={recarregar}
        />
      )}
      {modal === 'adiar' && (
        <AdiarModal solicitacao={solicitacao} onConfirmar={adiar} onFechar={fecharModal} onRecarregar={recarregar} />
      )}
      {modal === 'estornar' && (
        <EstornoModal pagamento={pagamento} onConfirmar={estornar} onFechar={fecharModal} onRecarregar={recarregar} />
      )}

      <Modal
        aberto={cancelarAberto}
        titulo="Cancelar solicitação"
        onFechar={acao ? () => {} : () => setCancelarAberto(false)}
        largura="420px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setCancelarAberto(false)}
              disabled={!!acao}
            >
              Voltar
            </button>
            <button
              type="button"
              className="filter-btn solicitacoes-acao-perigo"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={confirmarCancelamento}
              disabled={!!acao}
            >
              {acao === 'cancelar' ? 'Cancelando…' : 'Cancelar solicitação'}
            </button>
          </>
        }
      >
        <p>
          Tem certeza que deseja cancelar a solicitação de{' '}
          <strong>{formatarMoeda(solicitacao.valor_centavos)}</strong>? Esta ação não pode ser
          desfeita.
        </p>
        {erroCancelamento && (
          <div className="solicitacoes-form-erro-api">{erroCancelamento}</div>
        )}
      </Modal>
    </div>
  );
}
