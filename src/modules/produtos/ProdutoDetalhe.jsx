import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { Panel } from '../../app/components/Panel';
import { ImagemArquivo } from '../../app/components/ImagemArquivo';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { obterUrlBase } from '../../lib/api';
import { formatarDataHora, formatarMoeda, formatarTamanho } from '../../lib/formatar';
import { ProdutoFormModal } from './ProdutoFormModal';
import { MovimentoModal } from './MovimentoModal';
import { useProdutoDetalhe } from './useProdutoDetalhe';
import { LIMITE_ARQUIVO, imagemPermitida, rotuloTipoMovimento, rotuloUnidade } from './produtosUtils';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  PackagePlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import './Produtos.css';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const { administrador } = useAutenticacao();
  const {
    produto,
    subcategorias,
    categoriaMapa,
    movimentos,
    temProximaMovimentos,
    paginaMovimentos,
    carregando,
    erro,
    recarregar,
    atualizar,
    irParaAnteriorMovimentos,
    irParaProximoMovimento,
    movimentar,
    anexarImagem,
    removerImagem,
  } = useProdutoDetalhe(id);

  const arquivoInputRef = useRef(null);
  const [produtoModal, setProdutoModal] = useState(false);
  const [movimentoAberto, setMovimentoAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);
  const [erroImagem, setErroImagem] = useState(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const executarAcao = async (acaoExecutar) => {
    setErroAcao(null);
    try {
      await acaoExecutar();
    } catch (e) {
      setErroAcao(e.message || 'Erro na operação.');
    }
  };

  const enviarImagem = async (evento) => {
    const arquivo = evento.target.files && evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;

    setErroImagem(null);
    if (!imagemPermitida(arquivo)) {
      setErroImagem(
        `Envie uma imagem PNG, JPEG ou WEBP com no máximo ${formatarTamanho(LIMITE_ARQUIVO)}.`
      );
      return;
    }

    setEnviandoImagem(true);
    try {
      const alt = arquivo.name.replace(/\.[^.]+$/, '').slice(0, 160);
      await anexarImagem(arquivo, alt);
    } catch (e) {
      setErroImagem(e.message || 'Erro ao enviar a imagem.');
    } finally {
      setEnviandoImagem(false);
    }
  };

  const linhasDetalhe = produto
    ? [
        { rotulo: 'Nome', valor: produto.nome },
        { rotulo: 'Código', valor: produto.codigo || '—' },
        {
          rotulo: 'Categoria',
          valor: categoriaMapa[produto.categoria_id]
            ? categoriaMapa[produto.categoria_id].nome
            : '—',
        },
        { rotulo: 'Unidade de medida', valor: rotuloUnidade(produto.unidade_medida) },
        {
          rotulo: 'Preço',
          valor:
            produto.preco_centavos === null || produto.preco_centavos === undefined
              ? 'Sob consulta'
              : formatarMoeda(produto.preco_centavos),
        },
        {
          rotulo: 'Preço promocional',
          valor:
            produto.preco_promocional_centavos === null ||
            produto.preco_promocional_centavos === undefined
              ? '—'
              : formatarMoeda(produto.preco_promocional_centavos),
        },
        { rotulo: 'Peso', valor: produto.peso_kg !== null && produto.peso_kg !== undefined ? `${produto.peso_kg} kg` : '—' },
        { rotulo: 'Criado em', valor: formatarDataHora(produto.criado_em) },
        { rotulo: 'Atualizado em', valor: formatarDataHora(produto.atualizado_em) },
      ]
    : [];

  const colunasMovimentos = [
    { label: 'Data', field: 'criado_em', width: '16%', render: (valor) => formatarDataHora(valor) },
    {
      label: 'Tipo',
      field: 'tipo',
      width: '12%',
      render: (tipo) => rotuloTipoMovimento(tipo),
    },
    { label: 'Quantidade', field: 'quantidade', width: '12%' },
    { label: 'Saldo após', field: 'saldo_apos', width: '12%' },
    {
      label: 'Documento',
      field: 'documento_ref',
      width: '14%',
      render: (valor) => valor || '—',
    },
    {
      label: 'Observação',
      field: 'observacao',
      width: '34%',
      render: (valor) => <span className="produtos-observacao-celula">{valor || '—'}</span>,
    },
  ];

  if (carregando) {
    return <div className="produtos-status produtos-status-detalhe">Carregando produto…</div>;
  }

  if (erro) {
    return (
      <div className="produtos-detalhe-coluna">
        <Link className="produtos-voltar" to="/produtos">
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

  if (!produto) return null;

  return (
    <div className="produtos-detalhe-coluna">
      <Link className="produtos-voltar" to="/produtos">
        <ChevronLeft size={16} /> Voltar
      </Link>

      <div className="produtos-detalhe-toolbar">
        <div className="produtos-detalhe-titulo">
          <span>{produto.nome}</span>
          <span className="produtos-detalhe-situacao">
            <StatusBadge
              status={produto.ativo ? 'success' : 'danger'}
              label={produto.ativo ? 'Ativo' : 'Inativo'}
            />
            {produto.destaque && <StatusBadge status="info" label="Destaque" />}
            {produto.estoque_baixo && <StatusBadge status="warning" label="Estoque baixo" />}
          </span>
        </div>
        {administrador && (
          <div className="produtos-detalhe-acoes">
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{
                flex: 'none',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => setProdutoModal(true)}
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{
                flex: 'none',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => setMovimentoAberto(true)}
            >
              <PackagePlus size={14} /> Movimentar
            </button>
          </div>
        )}
      </div>

      {erroAcao && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      <div className="produtos-detalhe-paineis">
        <Panel title="Dados do produto">
          <dl className="produtos-detalhe-lista">
            {linhasDetalhe.map((linha) => (
              <div key={linha.rotulo} className="produtos-detalhe-item">
                <dt>{linha.rotulo}</dt>
                <dd>{linha.valor}</dd>
              </div>
            ))}
          </dl>
          {produto.descricao && (
            <div className="produtos-detalhe-descricao">
              <span className="produtos-detalhe-descricao-rotulo">Descrição</span>
              <p>{produto.descricao}</p>
            </div>
          )}
        </Panel>

        <Panel title="Estoque">
          <div className="produtos-estoque-painel">
            <div className="produtos-estoque-saldo">
              <span className="produtos-estoque-saldo-rotulo">Saldo atual</span>
              <span className="produtos-estoque-saldo-valor">{produto.saldo}</span>
            </div>
            <div className="produtos-estoque-minimo">
              <span>
                Estoque mínimo:{' '}
                <strong>
                  {produto.estoque_minimo !== null && produto.estoque_minimo !== undefined
                    ? produto.estoque_minimo
                    : '—'}
                </strong>
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Imagens">
          {erroImagem && (
            <div className="leads-erro produtos-erro-acao">
              <AlertCircle size={16} />
              <span>{erroImagem}</span>
              <button type="button" onClick={() => setErroImagem(null)}>
                Fechar
              </button>
            </div>
          )}
          <div className="produtos-imagens">
            {(produto.imagens || []).length === 0 && (
              <div className="produtos-imagens-vazio">Nenhuma imagem anexada.</div>
            )}
            {(produto.imagens || []).map((imagem) => (
              <div key={imagem.id} className="produtos-imagens-item">
                {administrador ? (
                  <ImagemArquivo arquivoId={imagem.arquivo_id} alt={imagem.alt || produto.nome} />
                ) : (
                  <img
                    src={`${obterUrlBase()}/api/v1/publico/imagens/${imagem.id}`}
                    alt={imagem.alt || produto.nome}
                  />
                )}
                {administrador && (
                  <button
                    type="button"
                    className="leads-acao-btn leads-acao-perigo produtos-imagens-remover"
                    title="Remover imagem"
                    onClick={() => executarAcao(() => removerImagem(imagem.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {administrador && (
            <div className="produtos-imagens-enviar">
              <input
                ref={arquivoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={enviarImagem}
                disabled={enviandoImagem}
              />
              <button
                type="button"
                className="filter-btn filter-btn-secondary"
                style={{
                  flex: 'none',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => arquivoInputRef.current && arquivoInputRef.current.click()}
                disabled={enviandoImagem}
              >
                <ImagePlus size={14} />
                {enviandoImagem ? 'Enviando…' : 'Adicionar imagem'}
              </button>
            </div>
          )}
        </Panel>

        <Panel title="Movimentações">
          {movimentos.length === 0 ? (
            <div className="produtos-imagens-vazio">Nenhuma movimentação registrada.</div>
          ) : (
            <>
              <DataGrid columns={colunasMovimentos} data={movimentos} selectable={false} />
              {(movimentos.length > 0 || paginaMovimentos > 1) && (
                <div className="produtos-paginacao produtos-movimentos-paginacao">
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    onClick={irParaAnteriorMovimentos}
                    disabled={paginaMovimentos <= 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="produtos-paginacao-texto">Página {paginaMovimentos}</span>
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    onClick={irParaProximoMovimento}
                    disabled={!temProximaMovimentos}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      {produtoModal && (
        <ProdutoFormModal
          produto={produto}
          subcategorias={subcategorias}
          categoriaMapa={categoriaMapa}
          onFechar={() => setProdutoModal(false)}
          onSalvar={atualizar}
        />
      )}

      {movimentoAberto && (
        <MovimentoModal
          produto={produto}
          onFechar={() => setMovimentoAberto(false)}
          onSalvar={movimentar}
        />
      )}
    </div>
  );
}
