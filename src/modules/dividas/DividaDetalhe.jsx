import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as contasService from '../../services/contasBancarias';
import * as fornecedoresService from '../../services/fornecedores';
import { DividaFormModal } from './DividaFormModal';
import { ParcelasDaDivida } from './ParcelasDaDivida';
import {
  LIMITES,
  formatarTaxa,
  nomeDaConta,
  nomeDoFornecedor,
  rotuloAcaoHistorico,
  rotuloCredorTipo,
  statusDaDivida,
} from './dividasUtils';
import { useDividaDetalhe } from './useDividaDetalhe';
import { useDividaHistorico } from './useDividaHistorico';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import './Dividas.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px' };

function ErroComRetentativa({ mensagem, onTentar }) {
  return (
    <div className="leads-erro">
      <AlertCircle size={16} />
      <span>{mensagem}</span>
      <button type="button" onClick={onTentar}>
        Tentar novamente
      </button>
    </div>
  );
}

function HistoricoDaDivida({ dividaId, geracao }) {
  const { eventos, carregando, erro, recarregar } = useDividaHistorico(dividaId, geracao);

  if (erro) return <ErroComRetentativa mensagem={erro} onTentar={recarregar} />;
  if (carregando && eventos.length === 0) return <div className="dividas-secundario">Carregando histórico…</div>;
  if (eventos.length === 0) return <div className="dividas-secundario">Sem eventos.</div>;

  return (
    <ul className="dividas-historico">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <span className="dividas-historico-data">{formatarDataHora(evento.criado_em)}</span>
          <span>{rotuloAcaoHistorico(evento.acao)}</span>
          {evento.detalhe && <span className="dividas-secundario">{evento.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}

function CancelarDividaModal({ divida, onConfirmar, onFechar, onRecarregar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo do cancelamento.';
    if (motivo.trim().length > LIMITES.motivo) return `O motivo tem no máximo ${LIMITES.motivo} caracteres.`;
    return null;
  };

  return (
    <AcaoModal
      titulo={`Cancelar "${divida.descricao}"`}
      rotuloConfirmar="Cancelar dívida"
      validar={validar}
      onConfirmar={() => onConfirmar(motivo.trim())}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="dividas-texto">
        Para cadastro errado: as contas a pagar ainda abertas e as parcelas são canceladas. Dívida com alguma conta paga
        não é cancelada; renegocie o saldo ou estorne o pagamento antes.
      </p>
      <div className="dividas-form-campo">
        <label className="filter-label" htmlFor="cancelar-divida-motivo">
          Motivo *
        </label>
        <textarea
          id="cancelar-divida-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITES.motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export default function DividaDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const nomeEmpresa = useNomesEmpresas();
  const detalhe = useDividaDetalhe(id);
  const { divida, carregando, erro, geracao, recarregar } = detalhe;
  const nomeFornecedor = useNomesPorId([divida?.fornecedor_id], fornecedoresService.obterFornecedor, nomeDoFornecedor);
  const nomeConta = useNomesPorId([divida?.conta_liberacao_id], contasService.obterContaBancaria, nomeDaConta);
  const nomeCategoria = useNomesPorId(
    [divida?.categoria_amortizacao_id, divida?.categoria_juros_id],
    categoriasService.obterCategoriaFinanceira
  );
  const [acao, setAcao] = useState(null);

  const voltar = (
    <Link className="dividas-voltar" to="/dividas">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="dividas-detalhe">
        {voltar}
        <ErroComRetentativa mensagem={erro} onTentar={recarregar} />
      </div>
    );
  }

  if (carregando && !divida) return <div className="dividas-status">Carregando dívida…</div>;
  if (!divida) return null;

  const situacao = statusDaDivida(divida);
  const ativa = divida.status === 'ativa';
  const fechar = () => setAcao(null);

  const renegociar = async (dados) => {
    const resposta = await detalhe.renegociar(dados);
    const novaId = resposta?.dados?.id;
    if (novaId) navegar(`/dividas/${novaId}`);
    else recarregar();
  };

  const dados = [
    ['Empresa devedora', nomeEmpresa(divida.empresa_id)],
    ['Credor', nomeFornecedor(divida.fornecedor_id)],
    ['Tipo de credor', rotuloCredorTipo(divida.credor_tipo)],
    ['Contrato', divida.contrato || '—'],
    ['Valor original', divida.valor_original_centavos ? formatarMoeda(divida.valor_original_centavos) : '—'],
    ['Contratada em', formatarData(divida.contratada_em)],
    ['Taxa', formatarTaxa(divida)],
    ['Saldo na data do saldo', `${formatarMoeda(divida.saldo_inicial_centavos)} em ${formatarData(divida.data_saldo)}`],
    ['Saldo devedor atual', formatarMoeda(divida.saldo_devedor_centavos)],
    [
      'Liberação',
      divida.conta_liberacao_id
        ? `${nomeConta(divida.conta_liberacao_id)} em ${formatarData(divida.liberada_em)}`
        : '—',
    ],
    ['Categoria da amortização', nomeCategoria(divida.categoria_amortizacao_id)],
    ['Categoria dos juros', nomeCategoria(divida.categoria_juros_id)],
  ];
  if (divida.divida_origem_id) {
    dados.push([
      'Renegocia',
      <Link key="origem" to={`/dividas/${divida.divida_origem_id}`}>
        Ver a dívida original
      </Link>,
    ]);
  }
  if (divida.motivo) dados.push([divida.status === 'cancelada' ? 'Motivo do cancelamento' : 'Motivo', divida.motivo]);

  return (
    <div className="dividas-detalhe">
      {voltar}

      <div className="dividas-toolbar">
        <div className="dividas-detalhe-titulo">
          <h1 className="dividas-toolbar-titulo">{divida.descricao}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
        </div>
        {ativa && (
          <div className="dividas-toolbar-acoes">
            <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('editar')}>
              Editar
            </button>
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={BOTAO}
              onClick={() => setAcao('renegociar')}
            >
              Renegociar
            </button>
            <button type="button" className="filter-btn dividas-perigo" style={BOTAO} onClick={() => setAcao('cancelar')}>
              Cancelar dívida
            </button>
          </div>
        )}
      </div>

      <div className="dividas-detalhe-paineis">
        <Panel title="Dados da dívida">
          <section aria-label="Dados da dívida">
            <dl className="dividas-detalhe-lista">
              {dados.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            {divida.observacoes && <p className="dividas-detalhe-observacoes">{divida.observacoes}</p>}
          </section>
        </Panel>

        <Panel title="Histórico">
          <section aria-label="Histórico">
            <HistoricoDaDivida dividaId={divida.id} geracao={geracao} />
          </section>
        </Panel>
      </div>

      <Panel title="Parcelas">
        <ParcelasDaDivida divida={divida} acoes={detalhe} onRecarregar={recarregar} />
      </Panel>

      {acao === 'editar' && (
        <DividaFormModal
          modo="editar"
          divida={divida}
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          onFechar={fechar}
          onSalvar={detalhe.atualizar}
        />
      )}
      {acao === 'renegociar' && (
        <DividaFormModal
          modo="renegociar"
          divida={divida}
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          onFechar={fechar}
          onSalvar={renegociar}
        />
      )}
      {acao === 'cancelar' && (
        <CancelarDividaModal divida={divida} onConfirmar={detalhe.cancelar} onFechar={fechar} onRecarregar={recarregar} />
      )}
    </div>
  );
}
