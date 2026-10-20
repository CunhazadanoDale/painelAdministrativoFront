import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesLocais } from '../../app/estoque/useNomesLocais';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import * as produtosService from '../../services/produtos';
import { CancelarImportacaoModal, DesembaracarModal, EmbarcarModal } from './AcoesDaImportacao';
import { CustoPrevisto } from './CustoPrevisto';
import { CustosDaImportacao } from './CustosDaImportacao';
import { ParcelasDaImportacao } from './ParcelasDaImportacao';
import { ImportacaoFormModal } from './ImportacaoFormModal';
import {
  formatarCambio,
  formatarValorMoeda,
  nomeDoFornecedor,
  rotuloAcaoHistorico,
  statusDaImportacao,
} from './importacoesUtils';
import { useImportacaoDetalhe } from './useImportacaoDetalhe';
import { useImportacaoHistorico } from './useImportacaoHistorico';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px' };
const EDITAVEIS = ['aberta', 'embarcada'];
const CANCELAVEIS = ['aberta', 'embarcada', 'desembaracada'];

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

function HistoricoDaImportacao({ importacaoId, geracao }) {
  const { eventos, carregando, erro, recarregar } = useImportacaoHistorico(importacaoId, geracao);

  if (erro) return <ErroComRetentativa mensagem={erro} onTentar={recarregar} />;
  if (carregando && eventos.length === 0) return <div className="importacoes-secundario">Carregando histórico…</div>;
  if (eventos.length === 0) return <div className="importacoes-secundario">Sem eventos.</div>;

  return (
    <ul className="importacoes-historico">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <span className="importacoes-historico-data">{formatarDataHora(evento.criado_em)}</span>
          <span>{rotuloAcaoHistorico(evento.acao)}</span>
          {evento.detalhe && <span className="importacoes-secundario">{evento.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}

function ItensDaImportacao({ importacao, financeiro, nomeProduto }) {
  const recebida = importacao.status === 'recebida';
  return (
    <>
      <div className="datagrid-container">
        <table className="datagrid">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              {financeiro && <th>Valor na moeda</th>}
              {recebida && <th>Recebida</th>}
              {recebida && financeiro && <th>Custo unitário</th>}
            </tr>
          </thead>
          <tbody>
            {(importacao.itens ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/produtos/${item.produto_id}`}>{nomeProduto(item.produto_id)}</Link>
                </td>
                <td>{item.quantidade}</td>
                {financeiro && <td>{formatarValorMoeda(item.valor_moeda_centesimos, importacao.moeda)}</td>}
                {recebida && (
                  <td className={item.quantidade_recebida < item.quantidade ? 'importacoes-alerta' : undefined}>
                    {item.quantidade_recebida ?? '—'}
                  </td>
                )}
                {recebida && financeiro && (
                  <td>{item.custo_unitario_centavos === null ? '—' : formatarMoeda(item.custo_unitario_centavos)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {financeiro && (
        <div className="importacoes-itens-total">
          Total: <strong>{formatarValorMoeda(importacao.valor_total_moeda_centesimos, importacao.moeda)}</strong>
        </div>
      )}
    </>
  );
}

function datasDa(importacao) {
  return [
    ['Embarque previsto', importacao.embarque_previsto],
    ['Embarcada em', importacao.embarcada_em],
    ['Chegada prevista', importacao.chegada_prevista],
    ['Chegou em', importacao.chegada_em],
    ['Desembaraçada em', importacao.desembaracada_em],
    ['Recebida em', importacao.recebida_em],
  ]
    .filter(([, data]) => data)
    .map(([rotulo, data]) => [rotulo, formatarData(data)]);
}

export default function ImportacaoDetalhe() {
  const { id } = useParams();
  const { financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const nomeLocal = useNomesLocais();
  const detalhe = useImportacaoDetalhe(id);
  const { importacao, carregando, erro, geracao, recarregar, atualizar, embarcar, desembaracar, cancelar } = detalhe;
  const nomeFornecedor = useNomesPorId(
    [importacao?.fornecedor_id, ...(importacao?.custos ?? []).map((custo) => custo.fornecedor_id)],
    fornecedoresService.obterFornecedor,
    nomeDoFornecedor
  );
  const nomeProduto = useNomesPorId(
    (importacao?.itens ?? []).map((item) => item.produto_id),
    produtosService.obterProduto
  );
  const [acao, setAcao] = useState(null);

  const voltar = (
    <Link className="importacoes-voltar" to="/importacoes">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="importacoes-detalhe">
        {voltar}
        <ErroComRetentativa mensagem={erro} onTentar={recarregar} />
      </div>
    );
  }

  if (carregando && !importacao) return <div className="importacoes-status">Carregando importação…</div>;
  if (!importacao) return null;

  const situacao = statusDaImportacao(importacao.status);
  const fechar = () => setAcao(null);
  const { status } = importacao;

  const dados = [
    ['Empresa importadora', nomeEmpresa(importacao.empresa_id)],
    ['Fornecedor', nomeFornecedor(importacao.fornecedor_id)],
    ['Moeda', importacao.moeda],
    ['Referência', importacao.referencia || '—'],
    ...datasDa(importacao),
    ['Documento de embarque', importacao.documento_embarque || '—'],
    ['DI / DUIMP', importacao.declaracao || '—'],
  ];
  if (importacao.local_recebimento_id) dados.push(['Local do recebimento', nomeLocal(importacao.local_recebimento_id)]);
  if (financeiro && importacao.cambio_micro) dados.push(['Câmbio do recebimento', formatarCambio(importacao.cambio_micro)]);
  if (status === 'cancelada') dados.push(['Motivo do cancelamento', importacao.cancelada_motivo || '—']);

  return (
    <div className="importacoes-detalhe">
      {voltar}

      <div className="importacoes-toolbar">
        <div className="importacoes-detalhe-titulo">
          <h1 className="importacoes-toolbar-titulo">Importação {importacao.numero}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
        </div>
        {financeiro && (
          <div className="importacoes-toolbar-acoes">
            {EDITAVEIS.includes(status) && (
              <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAcao('editar')}>
                Editar
              </button>
            )}
            {status === 'aberta' && (
              <button type="button" className="filter-btn filter-btn-primary" style={BOTAO} onClick={() => setAcao('embarcar')}>
                Embarcar
              </button>
            )}
            {status === 'embarcada' && (
              <button
                type="button"
                className="filter-btn filter-btn-primary"
                style={BOTAO}
                onClick={() => setAcao('desembaracar')}
              >
                Desembaraçar
              </button>
            )}
            {CANCELAVEIS.includes(status) && (
              <button type="button" className="filter-btn importacoes-perigo" style={BOTAO} onClick={() => setAcao('cancelar')}>
                Cancelar importação
              </button>
            )}
          </div>
        )}
      </div>

      <div className="importacoes-detalhe-paineis">
        <Panel title="Dados da importação">
          <dl className="importacoes-detalhe-lista">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          {importacao.observacoes && <p className="importacoes-detalhe-observacoes">{importacao.observacoes}</p>}
        </Panel>

        <Panel title="Histórico">
          <HistoricoDaImportacao importacaoId={importacao.id} geracao={geracao} />
        </Panel>
      </div>

      <Panel title="Itens">
        <ItensDaImportacao importacao={importacao} financeiro={financeiro} nomeProduto={nomeProduto} />
      </Panel>

      {financeiro && (
        <>
          <Panel title="Parcelas ao fornecedor">
            <ParcelasDaImportacao importacao={importacao} acoes={detalhe} onRecarregar={recarregar} />
          </Panel>
          <Panel title="Custos de nacionalização">
            <CustosDaImportacao
              importacao={importacao}
              acoes={detalhe}
              nomeFornecedor={nomeFornecedor}
              onRecarregar={recarregar}
            />
          </Panel>
          {CANCELAVEIS.includes(status) && (
            <Panel title="Custo previsto">
              <CustoPrevisto importacao={importacao} geracao={geracao} nomeProduto={nomeProduto} />
            </Panel>
          )}
        </>
      )}

      {acao === 'editar' && (
        <ImportacaoFormModal
          importacao={importacao}
          nomeEmpresa={nomeEmpresa}
          nomeFornecedor={nomeFornecedor}
          nomeProduto={nomeProduto}
          onFechar={fechar}
          onSalvar={atualizar}
        />
      )}
      {acao === 'embarcar' && (
        <EmbarcarModal importacao={importacao} onConfirmar={embarcar} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'desembaracar' && (
        <DesembaracarModal importacao={importacao} onConfirmar={desembaracar} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'cancelar' && (
        <CancelarImportacaoModal importacao={importacao} onConfirmar={cancelar} onFechar={fechar} onRecarregar={recarregar} />
      )}
    </div>
  );
}
