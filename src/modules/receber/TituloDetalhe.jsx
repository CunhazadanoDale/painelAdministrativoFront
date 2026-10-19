import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as clientesService from '../../services/clientes';
import * as contasService from '../../services/contasBancarias';
import { formatarCompetencia } from '../solicitacoes/solicitacoesUtils';
import {
  BoletoEnviadoModal,
  CancelarTituloModal,
  EnviarAoBancoModal,
  ProrrogarTituloModal,
  RetirarDoBancoModal,
} from './AcoesDoTitulo';
import { RecebimentoModal, RecebimentosDoTitulo } from './RecebimentosDoTitulo';
import { numeroDoTitulo, rotuloCanal, rotuloEventoTitulo, rotuloOrigemTitulo, statusDoTitulo } from './receberUtils';
import { TituloFormModal } from './TituloFormModal';
import { useTituloDetalhe } from './useTituloDetalhe';
import { useTituloHistorico } from './useTituloHistorico';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import './Receber.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px' };
const nomeDaConta = (conta) => (conta ? `${conta.apelido} · ${conta.banco_nome}` : undefined);

function HistoricoDoTitulo({ tituloId, geracao }) {
  const { eventos, carregando, erro, recarregar } = useTituloHistorico(tituloId, geracao);

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (carregando && eventos.length === 0) return <div className="receber-secundario">Carregando histórico…</div>;
  if (eventos.length === 0) return <div className="receber-secundario">Sem eventos.</div>;

  return (
    <ul className="receber-historico" aria-label="Histórico do título">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <span className="receber-historico-data">{formatarDataHora(evento.criado_em)}</span>
          <span>{rotuloEventoTitulo(evento.evento)}</span>
          {evento.descricao && <span className="receber-secundario">{evento.descricao}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function TituloDetalhe() {
  const { id } = useParams();
  const nomeEmpresa = useNomesEmpresas();
  const {
    titulo,
    carregando,
    erro,
    geracao,
    recarregar,
    atualizar,
    prorrogar,
    enviarAoBanco,
    retirarDoBanco,
    registrarBoleto,
    receber,
    estornarRecebimento,
    cancelar,
  } = useTituloDetalhe(id);
  const nomeCliente = useNomesPorId([titulo?.cliente_id], clientesService.obterCliente);
  const nomeCategoria = useNomesPorId([titulo?.categoria_financeira_id], categoriasService.obterCategoriaFinanceira);
  const nomeConta = useNomesPorId([titulo?.conta_bancaria_id], contasService.obterContaBancaria, nomeDaConta);
  const [acao, setAcao] = useState(null);

  const voltar = (
    <Link className="receber-voltar" to="/titulos-receber">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="receber-detalhe">
        {voltar}
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

  if (carregando && !titulo) return <div className="receber-status">Carregando título…</div>;
  if (!titulo) return null;

  const situacao = statusDoTitulo(titulo.status);
  const aberto = titulo.status === 'carteira' || titulo.status === 'em_banco';
  const semRecebimento = !titulo.recebido_centavos;
  const origemCancelada = !!titulo.origem_cancelada_em;
  const podeReceber = (aberto || titulo.status === 'antecipado') && titulo.saldo_centavos > 0;
  const podeEditar = titulo.origem === 'manual' && titulo.status === 'carteira' && semRecebimento;
  const fechar = () => setAcao(null);

  const dados = [
    ['Empresa', nomeEmpresa(titulo.empresa_id)],
    ['Cliente', <Link key="cliente" to={`/clientes/${titulo.cliente_id}`}>{nomeCliente(titulo.cliente_id)}</Link>],
    [
      'Origem',
      titulo.origem === 'pedido' && titulo.origem_id ? (
        <span key="origem" className="receber-celula">
          {rotuloOrigemTitulo(titulo.origem)} <Link to={`/pedidos/${titulo.origem_id}`}>Ver pedido</Link>
        </span>
      ) : (
        rotuloOrigemTitulo(titulo.origem)
      ),
    ],
    [
      'Vencimento',
      <span key="vencimento" className="receber-celula">
        {formatarData(titulo.vencimento)}
        {titulo.vencido && <StatusBadge status="danger" label="Vencido" />}
      </span>,
    ],
    ['Valor', formatarMoeda(titulo.valor_centavos)],
    ['Recebido', formatarMoeda(titulo.recebido_centavos)],
    ['Saldo', formatarMoeda(titulo.saldo_centavos)],
    ['Categoria', titulo.categoria_financeira_id ? nomeCategoria(titulo.categoria_financeira_id) : '—'],
    ['Competência', formatarCompetencia(titulo.competencia)],
    ['Conta de cobrança', titulo.conta_bancaria_id ? nomeConta(titulo.conta_bancaria_id) : '—'],
    [
      'Último boleto',
      titulo.boleto_enviado_em
        ? `${rotuloCanal(titulo.boleto_canal)} em ${formatarDataHora(titulo.boleto_enviado_em)}`
        : 'Não registrado',
    ],
  ];
  if (titulo.status === 'cancelado') dados.push(['Motivo do cancelamento', titulo.cancelado_motivo || '—']);

  return (
    <div className="receber-detalhe">
      {voltar}

      <div className="receber-toolbar">
        <div className="receber-detalhe-titulo">
          <h1 className="receber-toolbar-titulo">Título {numeroDoTitulo(titulo)}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
        </div>
        <div className="receber-toolbar-acoes">
          {podeReceber && (
            <button type="button" className="filter-btn filter-btn-primary" style={BOTAO} onClick={() => setAcao('receber')}>
              Registrar recebimento
            </button>
          )}
          {podeEditar && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('editar')}>
              Editar
            </button>
          )}
          {aberto && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('prorrogar')}>
              Prorrogar
            </button>
          )}
          {titulo.status === 'carteira' && !origemCancelada && (
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('enviar')}>
              Enviar ao banco
            </button>
          )}
          {titulo.status === 'em_banco' && (
            <>
              <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('boleto')}>
                Registrar boleto enviado
              </button>
              <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('retirar')}>
                Retirar do banco
              </button>
            </>
          )}
          {aberto && semRecebimento && (
            <button type="button" className="filter-btn receber-perigo" style={BOTAO} onClick={() => setAcao('cancelar')}>
              Cancelar título
            </button>
          )}
        </div>
      </div>

      {origemCancelada && (
        <div className="leads-erro" role="status">
          <AlertCircle size={16} />
          <span>
            A origem deste título foi cancelada em {formatarData(titulo.origem_cancelada_em)}. Resolva com estorno,
            recompra ou devolução ao cliente.
          </span>
        </div>
      )}

      <div className="receber-detalhe-paineis">
        <Panel title="Dados do título">
          <dl className="receber-detalhe-lista">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          {titulo.observacao && <p className="receber-detalhe-observacoes">{titulo.observacao}</p>}
        </Panel>

        <Panel title="Histórico">
          <HistoricoDoTitulo tituloId={titulo.id} geracao={geracao} />
        </Panel>
      </div>

      <Panel title="Recebimentos">
        <RecebimentosDoTitulo
          titulo={titulo}
          geracao={geracao}
          onEstornar={estornarRecebimento}
          onRecarregar={recarregar}
        />
      </Panel>

      {acao === 'receber' && (
        <RecebimentoModal titulo={titulo} onConfirmar={receber} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'editar' && (
        <TituloFormModal
          titulo={titulo}
          nomeEmpresa={nomeEmpresa}
          nomeCliente={nomeCliente}
          onFechar={fechar}
          onSalvar={atualizar}
        />
      )}
      {acao === 'prorrogar' && (
        <ProrrogarTituloModal titulo={titulo} onConfirmar={prorrogar} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'enviar' && (
        <EnviarAoBancoModal titulo={titulo} onConfirmar={enviarAoBanco} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'retirar' && (
        <RetirarDoBancoModal titulo={titulo} onConfirmar={retirarDoBanco} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'boleto' && (
        <BoletoEnviadoModal titulo={titulo} onConfirmar={registrarBoleto} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'cancelar' && (
        <CancelarTituloModal titulo={titulo} onConfirmar={cancelar} onFechar={fechar} onRecarregar={recarregar} />
      )}
    </div>
  );
}
