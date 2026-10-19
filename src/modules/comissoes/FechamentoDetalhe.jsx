import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Panel } from '../../app/components/Panel';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as categoriasService from '../../services/categoriasFinanceiras';
import * as pedidosService from '../../services/pedidos';
import * as representantesService from '../../services/representantes';
import { formatarPercentual } from '../clientes/clientesUtils';
import { descricaoDoPedido, formatarCompetencia } from './comissoesUtils';
import { ContaAPagar, Valor } from './ContaAPagar';
import { useFechamentoComissao } from './useFechamentoComissao';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Comissoes.css';

export default function FechamentoDetalhe() {
  const { id } = useParams();
  const nomeEmpresa = useNomesEmpresas();
  const { fechamento, carregando, erro, recarregar } = useFechamentoComissao(id);
  const nomeRepresentante = useNomesPorId([fechamento?.representante_id], representantesService.obterRepresentante);
  const nomeCategoria = useNomesPorId(
    [fechamento?.categoria_financeira_id],
    categoriasService.obterCategoriaFinanceira
  );
  const nomePedido = useNomesPorId(
    [...(fechamento?.comissoes ?? []), ...(fechamento?.ajustes ?? [])].map((item) => item.pedido_id),
    pedidosService.obterPedido,
    descricaoDoPedido
  );

  const voltar = (
    <Link className="comissoes-voltar" to="/comissoes">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="comissoes-detalhe">
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

  if (carregando && !fechamento) return <div className="comissoes-status">Carregando fechamento…</div>;
  if (!fechamento) return null;

  const linkPedido = (pedidoId) =>
    pedidoId ? <Link to={`/pedidos/${pedidoId}`}>{nomePedido(pedidoId)}</Link> : '—';

  const dados = [
    ['Empresa', nomeEmpresa(fechamento.empresa_id)],
    ['Representante', nomeRepresentante(fechamento.representante_id)],
    ['Comissões', <Valor key="comissoes" centavos={fechamento.comissoes_centavos} />],
    ['Ajustes', <Valor key="ajustes" centavos={fechamento.ajustes_centavos} />],
    ['Total', <strong key="total">{formatarMoeda(fechamento.total_centavos)}</strong>],
    ['Vencimento', formatarData(fechamento.vencimento)],
    ['Categoria', nomeCategoria(fechamento.categoria_financeira_id)],
    ['Conta a pagar', <ContaAPagar key="conta" fechamento={fechamento} />],
  ];

  return (
    <div className="comissoes-detalhe">
      {voltar}

      <div className="comissoes-toolbar">
        <div className="comissoes-detalhe-titulo">
          <h1 className="comissoes-toolbar-titulo">Fechamento {formatarCompetencia(fechamento.competencia)}</h1>
        </div>
      </div>

      <Panel title="Dados do fechamento">
        <dl className="comissoes-detalhe-lista">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Comissões">
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Comissões do fechamento">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Pedido</th>
                <th>Base</th>
                <th>%</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {(fechamento.comissoes ?? []).map((comissao) => (
                <tr key={comissao.id}>
                  <td>{formatarCompetencia(comissao.competencia)}</td>
                  <td>{linkPedido(comissao.pedido_id)}</td>
                  <td>{formatarMoeda(comissao.base_centavos)}</td>
                  <td>{formatarPercentual(comissao.percentual_bp)}</td>
                  <td>{formatarMoeda(comissao.valor_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Ajustes">
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Ajustes do fechamento">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Pedido</th>
                <th>Valor</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {(fechamento.ajustes ?? []).map((ajuste) => (
                <tr key={ajuste.id}>
                  <td>{formatarCompetencia(ajuste.competencia)}</td>
                  <td>{linkPedido(ajuste.pedido_id)}</td>
                  <td>
                    <Valor centavos={ajuste.valor_centavos} />
                  </td>
                  <td>{ajuste.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
