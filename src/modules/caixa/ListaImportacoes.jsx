import React, { useCallback, useState } from 'react';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import { nomeDaConta } from './caixaUtils';
import { ImportarExtratoModal } from './ImportarExtratoModal';
import { AlertCircle, FileUp } from 'lucide-react';
import './Caixa.css';

const FILTROS = { empresa: '', conta: '' };
const BOTAO_LINHA = { flex: 'none', width: 'auto', padding: '2px 10px' };

export function ListaImportacoes({ administrador }) {
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(caixaService.listarImportacoes, FILTROS);
  const nomeConta = useNomesPorId(
    itens.map((importacao) => importacao.conta_bancaria_id),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const [importando, setImportando] = useState(false);
  const [confirmando, setConfirmando] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const desfazer = async (id) => {
    setErroAcao(null);
    setConfirmando(null);
    try {
      await caixaService.desfazerImportacao(id);
      recarregar();
    } catch (e) {
      setErroAcao(e.message || 'Erro ao desfazer a importação.');
    }
  };

  const colunas = [
    { label: 'Importado em', field: 'criado_em', width: '14%', render: (criadoEm) => formatarDataHora(criadoEm) },
    { label: 'Conta', field: 'conta_bancaria_id', width: '20%', render: (contaId) => nomeConta(contaId) },
    {
      label: 'Período',
      field: 'periodo_inicio',
      width: '18%',
      render: (inicio, importacao) => `${formatarData(inicio)} a ${formatarData(importacao.periodo_fim)}`,
    },
    {
      label: 'Saldo do banco',
      field: 'saldo_banco_centavos',
      width: '18%',
      render: (saldo, importacao) =>
        saldo === null || saldo === undefined ? '—' : `${formatarMoeda(saldo)} em ${formatarData(importacao.saldo_banco_em)}`,
    },
    {
      label: 'Linhas',
      field: 'linhas_novas',
      render: (novas, importacao) =>
        `${novas} novas · ${importacao.linhas_repetidas} repetidas · ${importacao.linhas_ignoradas} ignorada(s)`,
    },
    ...(administrador
      ? [
          {
            label: 'Ações',
            field: 'id',
            width: '170px',
            render: (id) => (
              <span className="caixa-celula">
                <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO_LINHA} onClick={() => setConfirmando(id)}>
                  Desfazer
                </button>
                {confirmando === id && (
                  <button type="button" className="filter-btn caixa-perigo" style={BOTAO_LINHA} onClick={() => desfazer(id)}>
                    Confirmar
                  </button>
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="importacoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="importacoes-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setImportando(true)}
        >
          <FileUp size={14} /> Importar extrato
        </button>
        {administrador && (
          <span className="caixa-form-ajuda">
            Desfazer apaga a importação e as linhas que ela trouxe; só vale para a mais recente da conta e sem linha que já
            passou por conciliação.
          </span>
        )}
      </div>

      {erroAcao && (
        <div className="caixa-form-erro-api" role="alert">
          {erroAcao}
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

      <div className="caixa-conteudo">
        {carregando ? (
          <div className="caixa-status">Carregando importações…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="caixa-status">Nenhum extrato importado.</div>
        )}
      </div>

      {importando && <ImportarExtratoModal onImportado={recarregar} onFechar={() => setImportando(false)} />}
    </>
  );
}
