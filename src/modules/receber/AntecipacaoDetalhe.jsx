import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as contasService from '../../services/contasBancarias';
import * as fornecedoresService from '../../services/fornecedores';
import * as titulosService from '../../services/titulosReceber';
import { numeroDoTitulo, statusDaAntecipacao, statusDoTitulo, textoDaTaxa } from './receberUtils';
import { useAntecipacaoDetalhe } from './useAntecipacaoDetalhe';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Receber.css';

const LIMITE_MOTIVO = 500;
const nomeDaConta = (conta) => (conta ? `${conta.apelido} · ${conta.banco_nome}` : undefined);
const nomeDoTitulo = (titulo) => (titulo ? numeroDoTitulo(titulo) : undefined);

function EstornarAntecipacaoModal({ antecipacao, rotulo, onConfirmar, onFechar, onRecarregar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo do estorno.';
    if (motivo.trim().length > LIMITE_MOTIVO) return `O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`;
    return null;
  };

  return (
    <AcaoModal
      titulo={`Estornar antecipação ${rotulo}`}
      rotuloConfirmar="Estornar"
      validar={validar}
      onConfirmar={() => onConfirmar(motivo.trim())}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="receber-texto">
        Para lançamento errado: os títulos voltam ao status de antes do borderô, e o crédito de{' '}
        {formatarMoeda(antecipacao.valor_liquido_centavos)} deixa de contar. Só é aceito se nenhum título dele foi
        recebido nem recomprado.
      </p>
      <div className="receber-form-campo">
        <label className="filter-label" htmlFor="estornar-antecipacao-motivo">
          Motivo *
        </label>
        <textarea
          id="estornar-antecipacao-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export default function AntecipacaoDetalhe() {
  const { id } = useParams();
  const nomeEmpresa = useNomesEmpresas();
  const { antecipacao, carregando, erro, recarregar, estornar } = useAntecipacaoDetalhe(id);
  const nomeFornecedor = useNomesPorId([antecipacao?.fornecedor_id], fornecedoresService.obterFornecedor);
  const nomeConta = useNomesPorId([antecipacao?.conta_bancaria_id], contasService.obterContaBancaria, nomeDaConta);
  const numeroTitulo = useNomesPorId(
    (antecipacao?.titulos ?? []).map((item) => item.titulo_id),
    titulosService.obterTitulo,
    nomeDoTitulo
  );
  const [estornando, setEstornando] = useState(false);

  const voltar = (
    <Link className="receber-voltar" to="/antecipacoes">
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

  if (carregando && !antecipacao) return <div className="receber-status">Carregando antecipação…</div>;
  if (!antecipacao) return null;

  const situacao = statusDaAntecipacao(antecipacao.status);
  const rotulo = antecipacao.numero || formatarData(antecipacao.operado_em);

  const dados = [
    ['Empresa', nomeEmpresa(antecipacao.empresa_id)],
    ['Fomento', nomeFornecedor(antecipacao.fornecedor_id)],
    ['Operado em', formatarData(antecipacao.operado_em)],
    ['Taxa', textoDaTaxa(antecipacao.taxa_bp)],
    ['Bruto', formatarMoeda(antecipacao.valor_bruto_centavos)],
    ['Líquido', formatarMoeda(antecipacao.valor_liquido_centavos)],
    ['Encargos', formatarMoeda(antecipacao.encargos_centavos)],
    ['Conta do crédito', nomeConta(antecipacao.conta_bancaria_id)],
  ];
  if (antecipacao.status === 'estornada') {
    dados.push(['Estornada em', formatarDataHora(antecipacao.estornado_em)]);
    dados.push(['Motivo do estorno', antecipacao.estorno_motivo || '—']);
  }

  return (
    <div className="receber-detalhe">
      {voltar}

      <div className="receber-toolbar">
        <div className="receber-detalhe-titulo">
          <h1 className="receber-toolbar-titulo">Antecipação {rotulo}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
        </div>
        <div className="receber-toolbar-acoes">
          {antecipacao.status === 'ativa' && (
            <button
              type="button"
              className="filter-btn receber-perigo"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
              onClick={() => setEstornando(true)}
            >
              Estornar borderô
            </button>
          )}
        </div>
      </div>

      <Panel title="Dados do borderô">
        <dl className="receber-detalhe-lista">
          {dados.map(([nome, valor]) => (
            <div key={nome}>
              <dt>{nome}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Títulos">
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Títulos do borderô">
            <thead>
              <tr>
                <th>Título</th>
                <th>Valor antecipado</th>
                <th>Status antes do borderô</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {(antecipacao.titulos ?? []).map((item) => (
                <tr key={item.titulo_id}>
                  <td>
                    <Link to={`/titulos-receber/${item.titulo_id}`}>{numeroTitulo(item.titulo_id)}</Link>
                  </td>
                  <td>{formatarMoeda(item.valor_centavos)}</td>
                  <td>{statusDoTitulo(item.status_anterior).rotulo}</td>
                  <td>
                    {item.vigente ? (
                      <StatusBadge status="info" label="Vigente" />
                    ) : (
                      <StatusBadge status="neutral" label="Fora do borderô" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {estornando && (
        <EstornarAntecipacaoModal
          antecipacao={antecipacao}
          rotulo={rotulo}
          onConfirmar={estornar}
          onFechar={() => setEstornando(false)}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
