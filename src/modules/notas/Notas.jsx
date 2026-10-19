import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarMoeda } from '../../lib/formatar';
import { ImportarXmlModal } from './ImportarXmlModal';
import { NATUREZAS, STATUS_NOTA, dataEmBrasilia, numeroDaNota, rotuloNatureza, statusDaNota } from './notasUtils';
import { useNotas } from './useNotas';
import { AlertCircle, ChevronLeft, ChevronRight, FileUp, Filter, Search } from 'lucide-react';
import './Notas.css';

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 };

function FiltrosNotas({ filtros, filtrar, limparFiltros }) {
  const [emissao, setEmissao] = useState({ de: filtros.emitida_de, ate: filtros.emitida_ate });
  const [chave, setChave] = useState(filtros.chave);
  const intervaloInvalido = emissao.de && emissao.ate && emissao.ate < emissao.de;

  const alterarEmissao = (campo) => (evento) => {
    const novo = { ...emissao, [campo]: evento.target.value };
    setEmissao(novo);
    if (!(novo.de && novo.ate && novo.ate < novo.de)) filtrar({ emitida_de: novo.de, emitida_ate: novo.ate });
  };

  const aplicarChave = () => {
    if (chave.trim() !== filtros.chave) filtrar({ chave: chave.trim() });
  };

  const limpar = () => {
    setEmissao({ de: '', ate: '' });
    setChave('');
    limparFiltros();
  };

  return (
    <div className="notas-filtros-extras">
      <div className="notas-filtro-campo">
        <label className="filter-label" htmlFor="notas-emitida-de">
          Emitida de
        </label>
        <input
          id="notas-emitida-de"
          className="filter-input"
          type="date"
          value={emissao.de}
          onChange={alterarEmissao('de')}
        />
      </div>
      <div className="notas-filtro-campo">
        <label className="filter-label" htmlFor="notas-emitida-ate">
          Emitida até
        </label>
        <input
          id="notas-emitida-ate"
          className="filter-input"
          type="date"
          value={emissao.ate}
          onChange={alterarEmissao('ate')}
          aria-invalid={intervaloInvalido || undefined}
        />
      </div>
      <div className="notas-filtro-campo notas-filtro-chave">
        <label className="filter-label" htmlFor="notas-chave">
          Chave de acesso
        </label>
        <input
          id="notas-chave"
          className="filter-input"
          type="search"
          inputMode="numeric"
          maxLength={60}
          value={chave}
          onChange={(evento) => setChave(evento.target.value)}
          onBlur={aplicarChave}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') aplicarChave();
          }}
        />
      </div>
      <button
        type="button"
        className="filter-btn filter-btn-secondary"
        style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
        onClick={limpar}
      >
        Limpar filtros
      </button>
      {intervaloInvalido && <span className="notas-form-erro">A data final não pode ser antes da inicial.</span>}
    </div>
  );
}

export default function Notas() {
  const { financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const {
    notas,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
    limparFiltros,
  } = useNotas();
  const [termo, setTermo] = useState('');
  const [importando, setImportando] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const filtrando = Object.values(filtros).some(Boolean);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ numero: termo.trim() });
  };

  const limparTudo = () => {
    setTermo('');
    limparFiltros();
  };

  const colunas = [
    {
      label: 'Nota',
      field: 'numero',
      width: '9%',
      render: (_, nota) => <Link to={`/notas-fiscais/${nota.id}`}>{numeroDaNota(nota)}</Link>,
    },
    { label: 'Emitida em', field: 'emitida_em', width: '10%', render: (emitidaEm) => dataEmBrasilia(emitidaEm) },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Destinatário',
      field: 'destinatario_nome',
      width: '25%',
      render: (nome, nota) => (
        <span className="notas-celula">
          {nome}
          {nota.entre_empresas && <StatusBadge status="info" label="Entre empresas" />}
        </span>
      ),
    },
    { label: 'Natureza', field: 'natureza', width: '11%', render: (natureza) => rotuloNatureza(natureza) },
    { label: 'Valor', field: 'valor_total_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Status',
      field: 'status',
      width: '11%',
      render: (status) => {
        const situacao = statusDaNota(status);
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    {
      label: 'Pedido',
      field: 'pedido_id',
      width: '10%',
      render: (pedidoId) => (pedidoId ? <Link to={`/pedidos/${pedidoId}`}>Ver pedido</Link> : '—'),
    },
  ];

  return (
    <div className="notas-container">
      <div className="notas-toolbar">
        <div className="notas-toolbar-titulo">Notas fiscais</div>
        <div className="notas-toolbar-acoes">
          <form className="notas-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              inputMode="numeric"
              className="filter-input"
              aria-label="Buscar pelo número"
              placeholder="Número"
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
          <label className="filter-label" htmlFor="notas-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="notas-empresa"
            className="filter-input notas-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="notas-natureza">
            Natureza
          </label>
          <select
            id="notas-natureza"
            className="filter-input notas-filtro"
            value={filtros.natureza}
            onChange={(evento) => filtrar({ natureza: evento.target.value })}
          >
            <option value="">Todas</option>
            {NATUREZAS.map((natureza) => (
              <option key={natureza.valor} value={natureza.valor}>
                {natureza.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="notas-status">
            Status
          </label>
          <select
            id="notas-status"
            className="filter-input notas-filtro"
            value={filtros.status}
            onChange={(evento) => filtrar({ status: evento.target.value })}
          >
            <option value="">Todos</option>
            {STATUS_NOTA.map((status) => (
              <option key={status.valor} value={status.valor}>
                {status.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="notas-entre-empresas">
            Entre empresas
          </label>
          <select
            id="notas-entre-empresas"
            className="filter-input notas-filtro"
            value={filtros.entreEmpresas}
            onChange={(evento) => filtrar({ entreEmpresas: evento.target.value })}
          >
            <option value="">Todas</option>
            <option value="true">Só entre empresas</option>
            <option value="false">Sem as entre empresas</option>
          </select>
          <label className="notas-checkbox" htmlFor="notas-sem-pedido">
            <input
              id="notas-sem-pedido"
              type="checkbox"
              checked={filtros.semPedido}
              onChange={(evento) => filtrar({ semPedido: evento.target.checked })}
            />
            Sem pedido
          </label>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={BOTAO}
            aria-expanded={filtrosAbertos}
            onClick={() => setFiltrosAbertos((atual) => !atual)}
          >
            <Filter size={14} /> Mais filtros
          </button>
          {financeiro && (
            <>
              <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setImportando('evento')}>
                <FileUp size={14} /> Importar evento
              </button>
              <button type="button" className="filter-btn filter-btn-primary" style={BOTAO} onClick={() => setImportando('nota')}>
                <FileUp size={16} /> Importar NF-e
              </button>
            </>
          )}
        </div>
      </div>

      {filtrosAbertos && <FiltrosNotas filtros={filtros} filtrar={filtrar} limparFiltros={limparTudo} />}

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="notas-conteudo">
        {carregando ? (
          <div className="notas-status">Carregando notas fiscais…</div>
        ) : notas.length > 0 ? (
          <>
            <DataGrid key={chaveDados ?? 'notas'} columns={colunas} data={notas} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="notas-paginacao">
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Página anterior"
                  onClick={irParaAnterior}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="notas-paginacao-texto">Página {pagina}</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  title="Próxima página"
                  onClick={irParaProxima}
                  disabled={!temProxima}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        ) : erro ? null : (
          <div className="notas-status">
            {filtrando ? 'Nenhuma nota fiscal encontrada com estes filtros.' : 'Nenhuma nota fiscal nas empresas do seu acesso.'}
          </div>
        )}
      </div>

      {importando && (
        <ImportarXmlModal tipo={importando} onFechar={() => setImportando(null)} onImportado={recarregar} />
      )}
    </div>
  );
}
