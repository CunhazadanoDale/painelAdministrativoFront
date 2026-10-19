import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { useDocumentoProposta } from './useDocumentoProposta';
import { AlertCircle, ChevronLeft, Printer } from 'lucide-react';
import './PropostaImpressao.css';

function textoDoDesconto(item) {
  const desconto = item.desconto_unitario_centavos;
  if (!desconto) return '—';
  return desconto > 0 ? formatarMoeda(desconto) : `${formatarMoeda(-desconto)} acima`;
}

function Contato({ pessoa }) {
  const partes = [pessoa?.telefone, pessoa?.email].filter(Boolean);
  return partes.length ? <span>{partes.join(' · ')}</span> : null;
}

export default function PropostaImpressao() {
  const { id } = useParams();
  const { documento, carregando, erro, recarregar } = useDocumentoProposta(id);

  const acoes = (
    <div className="proposta-acoes">
      <Link className="proposta-voltar" to={`/pedidos/${id}`}>
        <ChevronLeft size={16} /> Voltar ao pedido
      </Link>
      {documento && (
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{ flex: 'none', width: 'auto', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => window.print()}
        >
          <Printer size={16} /> Imprimir / salvar PDF
        </button>
      )}
    </div>
  );

  if (erro) {
    return (
      <div className="proposta-pagina">
        {acoes}
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

  if (carregando && !documento) return <div className="proposta-pagina">Carregando proposta…</div>;
  if (!documento) return null;

  const { empresa = {}, cliente = {}, obra, representante } = documento;
  const itens = documento.itens ?? [];
  const condicoes = documento.condicoes ?? [];

  return (
    <div className="proposta-pagina">
      {acoes}
      {documento.vencida && (
        <div className="proposta-aviso" role="alert">
          Proposta vencida em {formatarData(documento.validade)}: renove a validade no pedido antes de enviar ao cliente.
        </div>
      )}

      <article className="proposta-documento">
        <header className="proposta-cabecalho">
          <div>
            <strong className="proposta-empresa">{empresa.razao_social}</strong>
            <span>
              {empresa.nome_fantasia} · CNPJ {empresa.cnpj} · {empresa.uf}
            </span>
          </div>
          <div className="proposta-identificacao">
            <h1>{documento.identificacao}</h1>
            <span>Emitida em {formatarData(documento.emitido_em)}</span>
          </div>
        </header>

        <section className="proposta-partes">
          <div>
            <h2>Cliente</h2>
            <strong>{cliente.nome}</strong>
            <span>{cliente.documento}</span>
            <span>
              {cliente.cidade}/{cliente.uf}
            </span>
            <Contato pessoa={cliente} />
          </div>
          {obra && (
            <div>
              <h2>Entrega</h2>
              <strong>{obra.nome}</strong>
              <span>{obra.endereco}</span>
            </div>
          )}
          {representante && (
            <div>
              <h2>Representante</h2>
              <strong>{representante.nome}</strong>
              <Contato pessoa={representante} />
            </div>
          )}
          {documento.numero_pedido_cliente && (
            <div>
              <h2>Pedido do cliente</h2>
              <strong>{documento.numero_pedido_cliente}</strong>
            </div>
          )}
        </section>

        <table className="proposta-itens">
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Unid.</th>
              <th>Qtd.</th>
              <th>Tabela</th>
              <th>Desconto</th>
              <th>Preço</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.item_id}>
                <td>{item.codigo || '—'}</td>
                <td>{item.nome}</td>
                <td>{item.unidade_medida}</td>
                <td>{item.quantidade}</td>
                <td>{item.preco_tabela_centavos ? formatarMoeda(item.preco_tabela_centavos) : '—'}</td>
                <td>{textoDoDesconto(item)}</td>
                <td>{formatarMoeda(item.preco_unitario_centavos)}</td>
                <td>{formatarMoeda(item.subtotal_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="proposta-totais">
          {documento.desconto_centavos > 0 && (
            <span>{`Desconto sobre a tabela: ${formatarMoeda(documento.desconto_centavos)}`}</span>
          )}
          <strong>Total: {formatarMoeda(documento.total_centavos)}</strong>
        </div>

        <section className="proposta-condicoes">
          <h2>Condições</h2>
          <ul>
            {condicoes.map((condicao) => (
              <li key={condicao}>{condicao}</li>
            ))}
          </ul>
          {documento.observacoes && (
            <>
              <h2>Observações</h2>
              <p>{documento.observacoes}</p>
            </>
          )}
        </section>

        <footer className="proposta-assinaturas">
          <div>
            <span className="proposta-linha" />
            <span>{empresa.nome_fantasia || empresa.razao_social}</span>
          </div>
          <div>
            <span className="proposta-linha" />
            <span>De acordo do cliente</span>
          </div>
        </footer>
      </article>
    </div>
  );
}
