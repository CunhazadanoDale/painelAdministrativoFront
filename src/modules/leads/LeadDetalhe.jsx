import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../../app/components/StatusBadge';
import { LeadFormModal } from './LeadFormModal';
import { useLeadDetalhe } from './useLeadDetalhe';
import { corDaEtapa, formatarDataHora } from './leadsUtils';
import { AlertCircle, ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import './Leads.css';
import './LeadDetalhe.css';

export default function LeadDetalhe() {
  const { id } = useParams();

  const {
    lead,
    etapaMap,
    etapasEditaveis,
    movimentacoes,
    temProxima,
    carregando,
    carregandoHistorico,
    erroLead,
    erroEstrutura,
    erroHistorico,
    atualizar,
    carregarMais,
    recarregar,
  } = useLeadDetalhe(id);

  const [modalAberto, setModalAberto] = useState(false);

  const movimentacoesOrdenadas = useMemo(
    () =>
      [...movimentacoes].sort(
        (a, b) => new Date(b.movido_em).getTime() - new Date(a.movido_em).getTime()
      ),
    [movimentacoes]
  );

  const nomeDaEtapa = (etapaId) => etapaMap[etapaId]?.nome ?? 'Etapa não encontrada';

  if (erroLead) {
    return (
      <div className="lead-detalhe-container">
        <div className="lead-detalhe-topo">
          <Link to="/leads" className="filter-btn filter-btn-secondary lead-detalhe-voltar">
            <ArrowLeft size={14} /> Voltar
          </Link>
          <div className="lead-detalhe-titulo">Lead</div>
        </div>
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroLead}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (carregando || !lead) {
    return (
      <div className="lead-detalhe-container">
        <div className="lead-detalhe-topo">
          <Link to="/leads" className="filter-btn filter-btn-secondary lead-detalhe-voltar">
            <ArrowLeft size={14} /> Voltar
          </Link>
          <div className="lead-detalhe-titulo">Carregando…</div>
        </div>
        <div className="lead-detalhe-status">Carregando lead…</div>
      </div>
    );
  }

  const etapaAtual = etapaMap[lead.etapa_id];

  return (
    <div className="lead-detalhe-container">
      <div className="lead-detalhe-topo">
        <Link to="/leads" className="filter-btn filter-btn-secondary lead-detalhe-voltar">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <div className="lead-detalhe-titulo">{lead.nome}</div>
        <div className="lead-detalhe-acoes">
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{
              flex: 'none',
              width: 'auto',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => setModalAberto(true)}
          >
            <Pencil size={14} /> Editar
          </button>
        </div>
      </div>

      {erroEstrutura && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroEstrutura}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="lead-detalhe-colunas">
        <section className="lead-detalhe-painel">
          <header className="lead-detalhe-painel-cabecalho">
            <h2>Dados do lead</h2>
            <span
              className={`lead-detalhe-situacao ${
                lead.ativo ? 'lead-detalhe-ativo' : 'lead-detalhe-inativo'
              }`}
            >
              {lead.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </header>

          <dl className="lead-detalhe-campos">
            <div className="lead-detalhe-campo">
              <dt>Etapa atual</dt>
              <dd>
                {etapaAtual ? (
                  <StatusBadge
                    status={corDaEtapa(etapaAtual)}
                    label={etapaAtual.nome}
                  />
                ) : (
                  <StatusBadge status="neutral" label="—" />
                )}
              </dd>
            </div>
            <div className="lead-detalhe-campo">
              <dt>Email</dt>
              <dd>{lead.email || '—'}</dd>
            </div>
            <div className="lead-detalhe-campo">
              <dt>Telefone</dt>
              <dd>{lead.telefone || '—'}</dd>
            </div>
            <div className="lead-detalhe-campo">
              <dt>Origem</dt>
              <dd>{lead.origem || '—'}</dd>
            </div>
            <div className="lead-detalhe-campo">
              <dt>Criado em</dt>
              <dd>{formatarDataHora(lead.criado_em)}</dd>
            </div>
            <div className="lead-detalhe-campo">
              <dt>Atualizado em</dt>
              <dd>{formatarDataHora(lead.atualizado_em)}</dd>
            </div>
          </dl>
        </section>

        <section className="lead-detalhe-painel">
          <header className="lead-detalhe-painel-cabecalho">
            <h2>Movimentações</h2>
            {!carregandoHistorico && !erroHistorico && (
              <span className="lead-detalhe-contagem">
                {movimentacoesOrdenadas.length}
              </span>
            )}
          </header>

          <div className="lead-detalhe-historico">
            {erroHistorico ? (
              <div className="leads-erro">
                <AlertCircle size={16} />
                <span>{erroHistorico}</span>
                <button type="button" onClick={recarregar}>
                  Tentar novamente
                </button>
              </div>
            ) : carregandoHistorico ? (
              <div className="lead-detalhe-status">Carregando movimentações…</div>
            ) : movimentacoesOrdenadas.length === 0 ? (
              <div className="lead-detalhe-status">
                Nenhuma movimentação registrada ainda — o lead não mudou de etapa.
              </div>
            ) : (
              <ol className="lead-hist-linha">
                {movimentacoesOrdenadas.map((mov) => (
                  <li className="lead-hist-item" key={mov.id}>
                    <span className="lead-hist-ponto" aria-hidden="true" />
                    <div className="lead-hist-conteudo">
                      <span className="lead-hist-hora">
                        {formatarDataHora(mov.movido_em)}
                      </span>
                      <div className="lead-hist-movimento">
                        <StatusBadge
                          status={corDaEtapa(etapaMap[mov.etapa_anterior_id])}
                          label={nomeDaEtapa(mov.etapa_anterior_id)}
                        />
                        <ArrowRight size={14} className="lead-hist-seta" />
                        <StatusBadge
                          status={corDaEtapa(etapaMap[mov.etapa_atual_id])}
                          label={nomeDaEtapa(mov.etapa_atual_id)}
                        />
                      </div>
                    </div>
                  </li>
                ))}

                {!temProxima && (
                  <li className="lead-hist-item lead-hist-criacao">
                    <span className="lead-hist-ponto" aria-hidden="true" />
                    <div className="lead-hist-conteudo">
                      <span className="lead-hist-hora">
                        {formatarDataHora(lead.criado_em)}
                      </span>
                      <div className="lead-hist-criacao-texto">
                        Lead cadastrado{lead.etapa_id
                          ? ` na etapa “${nomeDaEtapa(lead.etapa_id)}”`
                          : ''}
                      </div>
                    </div>
                  </li>
                )}
              </ol>
            )}

            {!erroHistorico && temProxima && (
              <button
                type="button"
                className="filter-btn filter-btn-secondary lead-detalhe-mais"
                onClick={carregarMais}
                disabled={carregandoHistorico}
              >
                {carregandoHistorico ? 'Carregando…' : 'Carregar movimentações anteriores'}
              </button>
            )}
          </div>
        </section>
      </div>

      {modalAberto && (
        <LeadFormModal
          key={lead.id}
          lead={lead}
          etapas={etapasEditaveis}
          onFechar={() => setModalAberto(false)}
          onSalvar={async (dados) => {
            await atualizar(dados);
          }}
        />
      )}
    </div>
  );
}
