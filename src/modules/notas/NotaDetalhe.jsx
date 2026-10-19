import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as notasService from '../../services/notasFiscais';
import * as produtosService from '../../services/produtos';
import { numeroDoTitulo, statusDoTitulo } from '../receber/receberUtils';
import { LigarProdutoModal, SincronizarTitulosModal } from './AcoesDaNota';
import {
  dataHoraEmBrasilia,
  formatarChave,
  formatarDocumento,
  formatarQuantidade,
  numeroDaNota,
  rotuloEventoNota,
  rotuloFinalidade,
  rotuloNatureza,
  statusDaNota,
} from './notasUtils';
import { useEventosNota } from './useEventosNota';
import { useNotaDetalhe } from './useNotaDetalhe';
import { useTitulosDaNota } from './useTitulosDaNota';
import { AlertCircle, ChevronLeft, Download } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Notas.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 };

function ErroComNovaTentativa({ mensagem, onTentar }) {
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

function EventosDaNota({ notaId, geracao }) {
  const { eventos, carregando, erro, recarregar } = useEventosNota(notaId, geracao);

  if (erro) return <ErroComNovaTentativa mensagem={erro} onTentar={recarregar} />;
  if (carregando && eventos.length === 0) return <div className="notas-secundario">Carregando eventos…</div>;
  if (eventos.length === 0) return <div className="notas-secundario">Nenhum evento registrado.</div>;

  return (
    <ul className="notas-historico" aria-label="Eventos da nota">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <span className="notas-historico-data">{dataHoraEmBrasilia(evento.ocorrido_em)}</span>
          <span>{rotuloEventoNota(evento.tipo)}</span>
          {evento.justificativa && <span className="notas-secundario">{evento.justificativa}</span>}
          <span className="notas-secundario">Protocolo {evento.protocolo}</span>
        </li>
      ))}
    </ul>
  );
}

function DuplicatasDaNota({ nota, geracao }) {
  const duplicatas = nota.duplicatas ?? [];
  const { titulos, carregando, erro } = useTitulosDaNota(
    duplicatas.map((duplicata) => duplicata.id),
    geracao
  );

  if (duplicatas.length === 0) return <div className="notas-secundario">A nota não tem duplicatas.</div>;

  const tituloDe = (duplicata) => {
    if (carregando) return '…';
    const titulo = titulos[duplicata.id];
    if (!titulo) return 'Sem título';
    const situacao = statusDoTitulo(titulo.status);
    return (
      <span className="notas-celula">
        <Link to={`/titulos-receber/${titulo.id}`}>{numeroDoTitulo(titulo)}</Link>
        <StatusBadge status={situacao.cor} label={situacao.rotulo} />
      </span>
    );
  };

  return (
    <>
      {erro && <span className="notas-form-erro">{erro}</span>}
      <div className="datagrid-container">
        <table className="datagrid" aria-label="Duplicatas da nota">
          <thead>
            <tr>
              <th>Número</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Título a receber</th>
            </tr>
          </thead>
          <tbody>
            {duplicatas.map((duplicata) => (
              <tr key={duplicata.id}>
                <td>{duplicata.numero}</td>
                <td>{formatarData(duplicata.vencimento)}</td>
                <td>{formatarMoeda(duplicata.valor_centavos)}</td>
                <td>{tituloDe(duplicata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function NotaDetalhe() {
  const { id } = useParams();
  const { financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const { nota, carregando, erro, geracao, recarregar, ligarProduto, sincronizarTitulos } = useNotaDetalhe(id);
  const nomeProduto = useNomesPorId(
    (nota?.itens ?? []).map((item) => item.produto_id),
    produtosService.obterProduto
  );
  const [acao, setAcao] = useState(null);
  const [resumoTitulos, setResumoTitulos] = useState(null);
  const [erroXml, setErroXml] = useState(null);

  const voltar = (
    <Link className="notas-voltar" to="/notas-fiscais">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="notas-detalhe">
        {voltar}
        <ErroComNovaTentativa mensagem={erro} onTentar={recarregar} />
      </div>
    );
  }

  if (carregando && !nota) return <div className="notas-status">Carregando nota fiscal…</div>;
  if (!nota) return null;

  const situacao = statusDaNota(nota.status);
  const autorizada = nota.status === 'autorizada';
  const geraTitulos = nota.natureza === 'venda' && !nota.entre_empresas;
  const podeSincronizar = financeiro && ((autorizada && geraTitulos) || nota.status === 'cancelada');
  const numero = numeroDaNota(nota);
  const fechar = () => setAcao(null);

  const baixarXml = async () => {
    setErroXml(null);
    try {
      await notasService.baixarXmlNota(nota.id, `NF-e ${numero}.xml`);
    } catch (e) {
      setErroXml(e.message || 'Erro ao baixar o XML.');
    }
  };

  const destinatario = nota.entre_empresas ? (
    nomeEmpresa(nota.empresa_destinataria_id)
  ) : (
    <Link key="cliente" to={`/clientes/${nota.cliente_id}`}>
      {nota.destinatario_nome}
    </Link>
  );

  const dados = [
    ['Emitente', nomeEmpresa(nota.empresa_id)],
    ['Destinatário', destinatario],
    ['Documento do destinatário', formatarDocumento(nota.destinatario_documento)],
    ['Natureza', `${rotuloNatureza(nota.natureza)} · ${nota.natureza_operacao}`],
    ['Finalidade', rotuloFinalidade(nota.finalidade)],
    ['CFOP predominante', nota.cfop_predominante],
    ['Emitida em', dataHoraEmBrasilia(nota.emitida_em)],
    ['Autorizada em', `${dataHoraEmBrasilia(nota.autorizada_em)} · protocolo ${nota.protocolo}`],
    ['Chave de acesso', <span key="chave" className="notas-chave">{formatarChave(nota.chave)}</span>],
    ['Valor dos produtos', formatarMoeda(nota.valor_produtos_centavos)],
    ['Frete', formatarMoeda(nota.valor_frete_centavos)],
    ['Desconto', formatarMoeda(nota.valor_desconto_centavos)],
    ['Valor total', <strong key="total">{formatarMoeda(nota.valor_total_centavos)}</strong>],
    ['Pedido do cliente', nota.numero_pedido_cliente || '—'],
    ['Pedido', nota.pedido_id ? <Link key="pedido" to={`/pedidos/${nota.pedido_id}`}>Ver pedido</Link> : '—'],
  ];

  return (
    <div className="notas-detalhe">
      {voltar}

      <div className="notas-toolbar">
        <div className="notas-detalhe-titulo">
          <h1 className="notas-toolbar-titulo">NF-e {numero}</h1>
          <StatusBadge status={situacao.cor} label={situacao.rotulo} />
          {nota.entre_empresas && <StatusBadge status="info" label="Entre empresas" />}
        </div>
        <div className="notas-toolbar-acoes">
          <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={baixarXml}>
            <Download size={14} /> Baixar XML
          </button>
          {podeSincronizar && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={BOTAO}
              onClick={() => setAcao('sincronizar')}
            >
              Sincronizar títulos
            </button>
          )}
        </div>
      </div>

      {erroXml && (
        <div className="notas-form-erro-api" role="alert">
          {erroXml}
        </div>
      )}
      {resumoTitulos && (
        <div className="notas-form-ajuda" role="status">
          {resumoTitulos}
        </div>
      )}
      {nota.entre_empresas && (
        <span className="notas-form-ajuda">
          Nota entre empresas do grupo: pela regra provisória, não gera título, conta a pagar nem movimento de estoque.
        </span>
      )}

      <div className="notas-detalhe-paineis">
        <Panel title="Dados da nota">
          <dl className="notas-detalhe-lista">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Eventos">
          <EventosDaNota notaId={nota.id} geracao={geracao} />
        </Panel>
      </div>

      <Panel title="Itens">
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Itens da nota">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Produto</th>
                <th>NCM</th>
                <th>CFOP</th>
                <th>Unid.</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Desconto</th>
              </tr>
            </thead>
            <tbody>
              {(nota.itens ?? []).map((item) => (
                <tr key={item.numero_item}>
                  <td>{item.numero_item}</td>
                  <td>{item.codigo}</td>
                  <td>{item.descricao}</td>
                  <td>
                    {item.produto_id ? (
                      <Link to={`/produtos/${item.produto_id}`}>{nomeProduto(item.produto_id)}</Link>
                    ) : (
                      <span className="notas-celula">
                        <StatusBadge status="warning" label="Sem produto" />
                        {financeiro && autorizada && (
                          <button
                            type="button"
                            className="filter-btn filter-btn-secondary"
                            style={{ flex: 'none', width: 'auto', padding: '2px 8px' }}
                            onClick={() => setAcao({ tipo: 'ligar', item })}
                          >
                            Ligar produto
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td>{item.ncm}</td>
                  <td>{item.cfop}</td>
                  <td>{item.unidade}</td>
                  <td>{formatarQuantidade(item.quantidade)}</td>
                  <td>{formatarMoeda(item.valor_centavos)}</td>
                  <td>{item.desconto_centavos ? formatarMoeda(item.desconto_centavos) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Duplicatas">
        <DuplicatasDaNota nota={nota} geracao={geracao} />
      </Panel>

      {acao?.tipo === 'ligar' && (
        <LigarProdutoModal item={acao.item} onConfirmar={ligarProduto} onFechar={fechar} onRecarregar={recarregar} />
      )}
      {acao === 'sincronizar' && (
        <SincronizarTitulosModal
          nota={nota}
          onConfirmar={sincronizarTitulos}
          onConcluido={setResumoTitulos}
          onFechar={fechar}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
