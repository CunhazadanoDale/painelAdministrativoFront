import React, { useState } from 'react';
import { formatarData } from './leadsUtils';
import { AlertCircle, X } from 'lucide-react';
import './Leads.css';

/**
 * Quadro Kanban: uma coluna por etapa do funil selecionado, com cards
 * arrastáveis (HTML5 drag and drop). A coluna de destino responde a
 * dragover/drop e repassa o lead ao hook, que faz o PATCH da etapa.
 * O clique no card abre a tela de detalhe do lead.
 *
 * @param {{ etapas: object[], colunas: Record<string, object[]>,
 *           carregando: boolean, erro: string|null, erroMovimento: string|null,
 *           onMover: (lead: object, etapaId: string) => Promise<void>,
 *           onAbrir: (lead: object) => void, onLimparErroMovimento: () => void,
 *           onRecarregar: () => void }} props
 */
export function LeadsKanban({
  etapas,
  colunas,
  carregando,
  erro,
  erroMovimento,
  onMover,
  onAbrir,
  onLimparErroMovimento,
  onRecarregar,
}) {
  const [alvoSobre, setAlvoSobre] = useState(null);
  const [arrastandoId, setArrastandoId] = useState(null);

  const aoArrastar = (event, lead) => {
    event.dataTransfer.setData('text/plain', lead.id);
    event.dataTransfer.effectAllowed = 'move';
    setArrastandoId(lead.id);
  };

  const aoSoltar = (event, etapa) => {
    event.preventDefault();
    setAlvoSobre(null);
    setArrastandoId(null);

    const id = event.dataTransfer.getData('text/plain');
    const lead = Object.values(colunas)
      .flat()
      .find((item) => item.id === id);
    if (lead) onMover(lead, etapa.etapa_id);
  };

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={onRecarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (carregando) {
    return <div className="leads-status">Carregando quadro…</div>;
  }

  if (etapas.length === 0) {
    return (
      <div className="leads-vazio">
        O funil selecionado não tem etapas. Cadastre as etapas na tela de
        Funis.
      </div>
    );
  }

  return (
    <div className="kanban-area">
      {erroMovimento && (
        <div className="leads-erro kanban-erro-movimento">
          <AlertCircle size={16} />
          <span>{erroMovimento}</span>
          <button
            type="button"
            title="Dispensar"
            className="kanban-erro-fechar"
            onClick={onLimparErroMovimento}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="kanban-colunas">
        {etapas.map((etapa) => {
          const leads = colunas[etapa.etapa_id] ?? [];
          const sobreAlvo = alvoSobre === etapa.etapa_id;

          return (
            <section
              key={etapa.etapa_id}
              className={`kanban-coluna ${sobreAlvo ? 'kanban-coluna-alvo' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (alvoSobre !== etapa.etapa_id) setAlvoSobre(etapa.etapa_id);
              }}
              onDragLeave={(event) => {
                // Ignora a saída para um filho (o dragleave borbulha).
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setAlvoSobre((atual) => (atual === etapa.etapa_id ? null : atual));
              }}
              onDrop={(event) => aoSoltar(event, etapa)}
            >
              <header className="kanban-coluna-cabecalho">
                <span className="kanban-coluna-nome">{etapa.nome}</span>
                <span className="kanban-coluna-contagem">{leads.length}</span>
              </header>

              <div className="kanban-cards">
                {leads.length === 0 && (
                  <div className="kanban-vazio">Arraste leads para cá</div>
                )}

                {leads.map((lead) => (
                  <article
                    key={lead.id}
                    className={`kanban-card ${
                      arrastandoId === lead.id ? 'kanban-card-arrastando' : ''
                    }`}
                    draggable
                    onDragStart={(event) => aoArrastar(event, lead)}
                    onDragEnd={() => {
                      setArrastandoId(null);
                      setAlvoSobre(null);
                    }}
                    onClick={() => onAbrir(lead)}
                    title="Ver detalhes do lead"
                  >
                    <div className="kanban-card-nome">{lead.nome}</div>
                    <div className="kanban-card-contato">
                      {lead.email && <span>{lead.email}</span>}
                      {lead.telefone && <span>{lead.telefone}</span>}
                      {!lead.email && !lead.telefone && <span>—</span>}
                    </div>
                    <div className="kanban-card-rodape">
                      {lead.origem && (
                        <span className="kanban-card-origem">{lead.origem}</span>
                      )}
                      <span className="kanban-card-data">
                        {formatarData(lead.criado_em)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
