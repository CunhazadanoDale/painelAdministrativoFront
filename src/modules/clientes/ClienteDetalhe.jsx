import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { ClienteFormModal } from './ClienteFormModal';
import { enderecoDaObra, formatarCep, rotuloTipoCliente } from './clientesUtils';
import { ObraFormModal } from './ObraFormModal';
import { useCadastrosCliente } from './useCadastrosCliente';
import { useClienteDetalhe } from './useClienteDetalhe';
import { useObrasCliente } from './useObrasCliente';
import { AlertCircle, ChevronLeft, ChevronRight, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Clientes.css';

const BOTAO = { flex: 'none', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 };

function ObrasDoCliente({ cliente, comercial }) {
  const {
    obras,
    pagina,
    soAtivas,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    mostrarSoAtivas,
    criar,
    atualizar,
    alternarSituacao,
  } = useObrasCliente(cliente.id, 0);
  const [obraModal, setObraModal] = useState(undefined);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const trocarSituacao = async (obra) => {
    setErroAcao(null);
    setAlternando(obra.id);
    try {
      await alternarSituacao(obra);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação da obra.');
    } finally {
      setAlternando(null);
    }
  };

  return (
    <div className="clientes-saldos">
      <div className="clientes-detalhe-filtro">
        <label className="filter-label clientes-checkbox" htmlFor="obras-so-ativas">
          <input
            id="obras-so-ativas"
            type="checkbox"
            checked={soAtivas}
            onChange={(evento) => mostrarSoAtivas(evento.target.checked)}
          />
          Só obras ativas
        </label>
        {comercial && (
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ ...BOTAO, width: 'auto' }}
            onClick={() => setObraModal(null)}
            disabled={!cliente.ativo}
          >
            <Plus size={14} /> Nova obra
          </button>
        )}
      </div>
      {comercial && !cliente.ativo && (
        <span className="clientes-form-ajuda">Cliente inativo não recebe obra nova.</span>
      )}

      {erroAcao && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando ? (
        <div className="clientes-status">Carregando obras…</div>
      ) : obras.length === 0 ? (
        <div className="clientes-status">{soAtivas ? 'Nenhuma obra ativa.' : 'Nenhuma obra cadastrada.'}</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Obra</th>
                <th>CNPJ</th>
                <th>Endereço</th>
                <th>Cidade</th>
                <th>CEP</th>
                <th>Situação</th>
                {comercial && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => (
                <tr key={obra.id}>
                  <td>{obra.nome}</td>
                  <td>{obra.cnpj_formatado || obra.cnpj || '—'}</td>
                  <td>{enderecoDaObra(obra)}</td>
                  <td>{`${obra.cidade}/${obra.uf}`}</td>
                  <td>{obra.cep ? formatarCep(obra.cep) : '—'}</td>
                  <td>
                    <StatusBadge status={obra.ativo ? 'success' : 'danger'} label={obra.ativo ? 'Ativa' : 'Inativa'} />
                  </td>
                  {comercial && (
                    <td>
                      <div className="leads-acoes">
                        <button
                          type="button"
                          className="leads-acao-btn"
                          title="Editar obra"
                          aria-label="Editar obra"
                          onClick={() => setObraModal(obra)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="leads-acao-btn"
                          title={obra.ativo ? 'Desativar obra' : 'Ativar obra'}
                          aria-label={obra.ativo ? 'Desativar obra' : 'Ativar obra'}
                          onClick={() => trocarSituacao(obra)}
                          disabled={alternando === obra.id}
                        >
                          {obra.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!erro && (temProxima || pagina > 1) && (
        <div className="clientes-paginacao">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 10px' }}
            title="Página anterior das obras"
            onClick={irParaAnterior}
            disabled={pagina <= 1}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="clientes-paginacao-texto">Página {pagina}</span>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 10px' }}
            title="Próxima página das obras"
            onClick={irParaProxima}
            disabled={!temProxima}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {obraModal !== undefined && (
        <ObraFormModal
          key={obraModal?.id ?? 'nova-obra'}
          obra={obraModal}
          onFechar={() => setObraModal(undefined)}
          onSalvar={(dados) => (obraModal ? atualizar(obraModal.id, dados) : criar(dados))}
        />
      )}
    </div>
  );
}

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { comercial } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const { grupos, representantes, nomeGrupo, nomeRepresentante } = useCadastrosCliente(comercial);
  const { cliente, carregando, erro, recarregar, atualizar, alternarSituacao } = useClienteDetalhe(id);

  const [editando, setEditando] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(false);

  const trocarSituacao = async () => {
    setErroAcao(null);
    setAlternando(true);
    try {
      await alternarSituacao();
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do cliente.');
    } finally {
      setAlternando(false);
    }
  };

  const voltar = (
    <Link className="clientes-voltar" to="/clientes">
      <ChevronLeft size={16} /> Voltar
    </Link>
  );

  if (erro) {
    return (
      <div className="clientes-detalhe">
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

  if (carregando && !cliente) {
    return <div className="clientes-status">Carregando cliente…</div>;
  }

  if (!cliente) return null;

  const regras = [
    cliente.exige_numero_pedido_na_nf && 'Exige número do pedido na NF',
    cliente.proibe_antecipacao && 'Proíbe antecipação dos títulos',
  ].filter(Boolean);

  const dados = [
    ['Documento', cliente.documento_formatado || cliente.documento],
    ['Tipo', rotuloTipoCliente(cliente.tipo)],
    ['Cidade', `${cliente.cidade}/${cliente.uf}`],
    ['Grupo', nomeGrupo(cliente.grupo_id)],
    ['Representante', nomeRepresentante(cliente.representante_id)],
    ['Empresa de relacionamento', cliente.empresa_relacionamento_id ? nomeEmpresa(cliente.empresa_relacionamento_id) : '—'],
    ['E-mail para NF', cliente.email_nf || '—'],
    ['Telefone', cliente.telefone || '—'],
  ];

  return (
    <div className="clientes-detalhe">
      {voltar}

      <div className="clientes-toolbar">
        <div className="clientes-detalhe-titulo">
          <span className="clientes-toolbar-titulo">{cliente.nome}</span>
          {cliente.nome_fantasia && <span className="clientes-secundario">{cliente.nome_fantasia}</span>}
          <StatusBadge status={cliente.ativo ? 'success' : 'danger'} label={cliente.ativo ? 'Ativo' : 'Inativo'} />
        </div>
        {comercial && (
          <div className="clientes-toolbar-acoes">
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={BOTAO}
              onClick={() => setEditando(true)}
              aria-label="Editar cliente"
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={BOTAO}
              onClick={trocarSituacao}
              disabled={alternando}
              aria-label={cliente.ativo ? 'Desativar cliente' : 'Ativar cliente'}
            >
              {cliente.ativo ? <PowerOff size={14} /> : <Power size={14} />}
              {cliente.ativo ? 'Desativar' : 'Ativar'}
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

      <div className="clientes-detalhe-paineis">
        <Panel title="Dados do cliente">
          <dl className="clientes-detalhe-lista">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          {cliente.lead_id && (
            <Link className="clientes-detalhe-lead" to={`/leads/${cliente.lead_id}`}>
              Ver o lead de origem
            </Link>
          )}
        </Panel>

        <Panel title="Regras comerciais">
          {regras.length === 0 ? (
            <span className="clientes-secundario">Nenhuma regra comercial.</span>
          ) : (
            <ul className="clientes-detalhe-regras">
              {regras.map((regra) => (
                <li key={regra}>{regra}</li>
              ))}
            </ul>
          )}
          {cliente.observacoes && <p className="clientes-detalhe-observacoes">{cliente.observacoes}</p>}
        </Panel>
      </div>

      <Panel title="Obras e endereços de entrega">
        <ObrasDoCliente cliente={cliente} comercial={comercial} />
      </Panel>

      {editando && (
        <ClienteFormModal
          cliente={cliente}
          grupos={grupos}
          representantes={representantes}
          onFechar={() => setEditando(false)}
          onSalvar={atualizar}
        />
      )}
    </div>
  );
}
