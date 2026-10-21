import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '../../app/components/Panel';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData } from '../../lib/formatar';
import * as produtosService from '../../services/produtos';
import { statusDaImportacao } from './importacoesUtils';
import { useAlertasImportacao } from './useAlertasImportacao';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

const FOLGA_PADRAO = '10';

function Importacao({ linha }) {
  const situacao = statusDaImportacao(linha.importacao_status);
  return (
    <span className="importacoes-selo">
      <Link to={`/importacoes/${linha.importacao_id}`}>Importação {linha.importacao_numero}</Link>
      <StatusBadge status={situacao.cor} label={situacao.rotulo} />
    </span>
  );
}

function Pedido({ linha }) {
  return <Link to={`/pedidos/${linha.pedido_id}`}>Pedido {linha.pedido_numero}</Link>;
}

function Tabela({ cabecalho, linhas, vazio, renderizar }) {
  if (linhas.length === 0) return <div className="importacoes-secundario">{vazio}</div>;
  return (
    <div className="datagrid-container">
      <table className="datagrid">
        <thead>
          <tr>
            {cabecalho.map((titulo) => (
              <th key={titulo}>{titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>{linhas.map(renderizar)}</tbody>
      </table>
    </div>
  );
}

export default function AlertasImportacao() {
  const nomeEmpresa = useNomesEmpresas();
  const [empresa, setEmpresa] = useState('');
  const [textoFolga, setTextoFolga] = useState(FOLGA_PADRAO);
  const [folga, setFolga] = useState(FOLGA_PADRAO);
  const [erroFolga, setErroFolga] = useState(null);
  const { alertas, carregando, erro, recarregar } = useAlertasImportacao(empresa, folga);
  const { prazo_em_risco: emRisco, sem_previsao: semPrevisao, sem_importacao: semImportacao } = alertas;
  const nomeProduto = useNomesPorId(
    [...emRisco, ...semPrevisao, ...semImportacao].map((linha) => linha.produto_id),
    produtosService.obterProduto
  );
  const filtrarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const aplicarFolga = (evento) => {
    evento.preventDefault();
    const dias = Number(textoFolga);
    if (!textoFolga.trim() || !Number.isInteger(dias) || dias < 0 || dias > 90) {
      setErroFolga('A folga vai de 0 a 90 dias.');
      return;
    }
    setErroFolga(null);
    setFolga(String(dias));
  };

  return (
    <div className="importacoes-detalhe">
      <div className="importacoes-toolbar">
        <div className="importacoes-toolbar-titulo">Alertas de importação</div>
        <div className="importacoes-toolbar-acoes">
          <label className="filter-label" htmlFor="alertas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="alertas-empresa"
            className="filter-input importacoes-filtro"
            valor={empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <form className="importacoes-busca" onSubmit={aplicarFolga} noValidate>
            <label className="filter-label" htmlFor="alertas-folga">
              Folga (dias)
            </label>
            <input
              id="alertas-folga"
              className="filter-input importacoes-filtro"
              type="number"
              min="0"
              max="90"
              value={textoFolga}
              onChange={(evento) => setTextoFolga(evento.target.value)}
            />
            <button type="submit" className="filter-btn filter-btn-secondary" style={{ flex: 'none', padding: '4px 10px' }}>
              Aplicar
            </button>
          </form>
        </div>
      </div>
      <p className="importacoes-texto">
        Prazo em risco: a chegada mais {alertas.folga_dias ?? folga} dias de folga (desembaraço e frete) passa do
        prazo-limite do pedido, contado da entrada paga (120 dias por padrão). Pedido sem entrada paga ainda não tem
        prazo.
      </p>
      {erroFolga && (
        <div className="importacoes-form-erro-api" role="alert">
          {erroFolga}
        </div>
      )}
      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}
      {carregando ? (
        <div className="importacoes-status">Carregando alertas…</div>
      ) : erro ? null : (
        <>
          <Panel title={`Prazo em risco (${emRisco.length})`}>
            <Tabela
              cabecalho={['Pedido', 'Empresa', 'Produto', 'Quantidade', 'Prazo limite', 'Importação', 'Chegada', 'Com folga', 'Atraso']}
              linhas={emRisco}
              vazio="Nenhum pedido alocado com prazo em risco."
              renderizar={(linha) => (
                <tr key={`${linha.importacao_id}|${linha.pedido_item_id}`}>
                  <td>
                    <Pedido linha={linha} />
                  </td>
                  <td>{nomeEmpresa(linha.empresa_id)}</td>
                  <td>{nomeProduto(linha.produto_id)}</td>
                  <td>{linha.quantidade}</td>
                  <td>{formatarData(linha.prazo_limite)}</td>
                  <td>
                    <Importacao linha={linha} />
                  </td>
                  <td>
                    {linha.chegada_em
                      ? `${formatarData(linha.chegada_em)} (chegou)`
                      : `${formatarData(linha.chegada_prevista)} (prevista)`}
                  </td>
                  <td>{formatarData(linha.chegada_com_folga)}</td>
                  <td className="importacoes-alerta">
                    {linha.dias_de_atraso} {linha.dias_de_atraso === 1 ? 'dia' : 'dias'}
                  </td>
                </tr>
              )}
            />
          </Panel>
          <Panel title={`Alocações sem previsão de chegada (${semPrevisao.length})`}>
            <Tabela
              cabecalho={['Pedido', 'Empresa', 'Produto', 'Quantidade', 'Prazo limite', 'Importação']}
              linhas={semPrevisao}
              vazio="Toda alocação tem chegada prevista."
              renderizar={(linha) => (
                <tr key={`${linha.importacao_id}|${linha.pedido_item_id}`}>
                  <td>
                    <Pedido linha={linha} />
                  </td>
                  <td>{nomeEmpresa(linha.empresa_id)}</td>
                  <td>{nomeProduto(linha.produto_id)}</td>
                  <td>{linha.quantidade}</td>
                  <td>{linha.prazo_limite ? formatarData(linha.prazo_limite) : 'Sem prazo'}</td>
                  <td>
                    <Importacao linha={linha} />
                  </td>
                </tr>
              )}
            />
          </Panel>
          <Panel title={`Pedidos de importação sem cobertura (${semImportacao.length})`}>
            <Tabela
              cabecalho={['Pedido', 'Empresa', 'Produto', 'Prazo limite', 'Restante', 'Reservado', 'Alocado', 'Sem cobertura']}
              linhas={semImportacao}
              vazio="Todo pedido de importação está coberto por reserva ou importação."
              renderizar={(linha) => (
                <tr key={linha.pedido_item_id}>
                  <td>
                    <Pedido linha={linha} />
                  </td>
                  <td>{nomeEmpresa(linha.empresa_id)}</td>
                  <td>{nomeProduto(linha.produto_id)}</td>
                  <td>{linha.prazo_limite ? formatarData(linha.prazo_limite) : 'Sem prazo'}</td>
                  <td>{linha.restante}</td>
                  <td>{linha.reservado}</td>
                  <td>{linha.alocado}</td>
                  <td className="importacoes-alerta">{linha.sem_cobertura}</td>
                </tr>
              )}
            />
          </Panel>
        </>
      )}
    </div>
  );
}
