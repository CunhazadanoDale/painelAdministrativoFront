import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as precosService from '../../services/tabelaPrecos';
import { Paginacao } from '../notas/Paginacao';
import { MODELOS } from '../pedidos/pedidosUtils';
import { useConsulta } from '../pedidos/useConsulta';
import { HistoricoPrecosModal } from './HistoricoPrecosModal';
import { ImportacaoPrecosModal } from './ImportacaoPrecosModal';
import { LancarPrecoModal } from './LancarPrecoModal';
import { AlertCircle, Plus, Search, Upload } from 'lucide-react';
import './Precos.css';

const FILTROS = { modelo: 'pronta_entrega', data: '', busca: '' };
const BOTAO_LINHA = { flex: 'none', width: 'auto', padding: '2px 10px' };

function origemDoPreco(item) {
  if (item.origem === 'tabela') return `Tabela desde ${formatarData(item.vigente_de)}`;
  if (item.origem === 'produto') return 'Preço do produto';
  return <StatusBadge status="warning" label="Sem preço" />;
}

export default function TabelaPrecos() {
  const { administrador } = useAutenticacao();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(precosService.listarPrecosVigentes, FILTROS);
  const [termo, setTermo] = useState('');
  const [historico, setHistorico] = useState(null);
  const [lancando, setLancando] = useState(null);
  const [importando, setImportando] = useState(false);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ busca: termo.trim() });
  };

  const produtoDe = (item) => ({ id: item.produto_id, nome: item.produto_nome });
  const linhas = itens.map((item) => ({ ...item, id: item.produto_id }));

  const colunas = [
    { label: 'Código', field: 'produto_codigo', width: '12%', render: (codigo) => codigo || '—' },
    { label: 'Produto', field: 'produto_nome' },
    { label: 'Unidade', field: 'unidade_medida', width: '9%' },
    {
      label: 'Preço do dia',
      field: 'preco_centavos',
      width: '13%',
      render: (preco) => (preco === null || preco === undefined ? '—' : formatarMoeda(preco)),
    },
    { label: 'Origem', field: 'origem', width: '18%', render: (_, item) => origemDoPreco(item) },
    {
      label: 'Ações',
      field: 'id',
      width: administrador ? '200px' : '110px',
      render: (_, item) => (
        <span className="precos-celula">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={BOTAO_LINHA}
            onClick={() => setHistorico(produtoDe(item))}
          >
            Histórico
          </button>
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={BOTAO_LINHA}
              onClick={() => setLancando({ produto: produtoDe(item) })}
            >
              Novo preço
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="precos-container">
      <div className="precos-toolbar">
        <h1 className="precos-toolbar-titulo">Tabela de preços</h1>
        <div className="precos-toolbar-acoes">
          <form className="precos-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              className="filter-input"
              aria-label="Buscar produto"
              placeholder="Nome ou código"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
            />
            <button
              type="submit"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '4px 10px' }}
              title="Buscar"
              aria-label="Buscar"
            >
              <Search size={14} />
            </button>
          </form>
          <label className="filter-label" htmlFor="precos-modelo">
            Modelo
          </label>
          <select
            id="precos-modelo"
            className="filter-input precos-filtro"
            value={filtros.modelo}
            onChange={(evento) => filtrar({ modelo: evento.target.value })}
          >
            {MODELOS.map((modelo) => (
              <option key={modelo.valor} value={modelo.valor}>
                {modelo.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="precos-data">
            Preço em
          </label>
          <input
            id="precos-data"
            className="filter-input precos-filtro"
            type="date"
            value={filtros.data}
            onChange={(evento) => filtrar({ data: evento.target.value })}
          />
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setImportando(true)}
            >
              <Upload size={16} /> Importar CSV
            </button>
          )}
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setLancando({ produto: null })}
            >
              <Plus size={16} /> Lançar preço
            </button>
          )}
        </div>
      </div>

      <span className="precos-form-ajuda">
        A tabela sugere o preço do pedido pelo modelo de venda; sem preço na tabela, vale o preço do cadastro do produto.
        A vitrine pública continua com o preço do cadastro. Sem data, mostra o preço de hoje.
      </span>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="precos-conteudo">
        {carregando ? (
          <div className="precos-status">Carregando preços…</div>
        ) : linhas.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={linhas} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="precos-status">Nenhum produto encontrado.</div>
        )}
      </div>

      {historico && (
        <HistoricoPrecosModal
          produto={historico}
          modelo={filtros.modelo}
          administrador={administrador}
          onAlterou={recarregar}
          onFechar={() => setHistorico(null)}
        />
      )}
      {importando && <ImportacaoPrecosModal onFechar={() => setImportando(false)} onImportado={recarregar} />}
      {lancando && (
        <LancarPrecoModal
          produto={lancando.produto}
          modeloInicial={filtros.modelo}
          onLancado={recarregar}
          onFechar={() => setLancando(null)}
        />
      )}
    </div>
  );
}
