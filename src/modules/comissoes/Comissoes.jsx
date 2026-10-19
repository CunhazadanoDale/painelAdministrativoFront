import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ApurarModal } from './ApurarModal';
import { textoDaApuracao } from './comissoesUtils';
import { ListaAjustes } from './ListaAjustes';
import { ListaComissoes } from './ListaComissoes';
import { ListaFechamentos } from './ListaFechamentos';
import { PendenciasApuracao } from './PendenciasApuracao';
import { Calculator } from 'lucide-react';
import './Comissoes.css';

const ABAS = [
  { valor: 'comissoes', rotulo: 'Comissões' },
  { valor: 'ajustes', rotulo: 'Ajustes' },
  { valor: 'fechamentos', rotulo: 'Fechamentos' },
  { valor: 'pendencias', rotulo: 'Pendências de apuração', financeiro: true },
];

function ResultadoApuracao({ resultado }) {
  const falhas = resultado.falhas ?? [];
  return (
    <section className="comissoes-resultado" role="region" aria-label="Resultado da apuração">
      <strong>{textoDaApuracao(resultado)}</strong>
      {falhas.length > 0 && (
        <ul className="comissoes-falhas">
          {falhas.map((falha) => (
            <li key={falha.entrega_id}>Entrega {falha.entrega_id.slice(0, 8)}: {falha.motivo}</li>
          ))}
        </ul>
      )}
      {resultado.restam_entregas && <span>Ainda há entregas a apurar; apure de novo.</span>}
    </section>
  );
}

export default function Comissoes() {
  const { financeiro } = useAutenticacao();
  const abas = ABAS.filter((aba) => !aba.financeiro || financeiro);
  const [aba, setAba] = useState('comissoes');
  const [apurando, setApurando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [geracao, setGeracao] = useState(0);

  const concluirApuracao = (dados) => {
    setResultado(dados);
    setGeracao((valor) => valor + 1);
  };

  return (
    <div className="comissoes-container">
      <div className="comissoes-toolbar">
        <div className="comissoes-toolbar-titulo">Comissões</div>
        <div className="comissoes-abas" role="tablist" aria-label="Comissões">
          {abas.map((item) => (
            <button
              key={item.valor}
              type="button"
              role="tab"
              id={`aba-comissoes-${item.valor}`}
              aria-selected={aba === item.valor}
              aria-controls="painel-comissoes"
              className={`comissoes-aba ${aba === item.valor ? 'comissoes-aba-ativa' : ''}`}
              onClick={() => setAba(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        {financeiro && (
          <div className="comissoes-toolbar-acoes">
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setApurando(true)}
            >
              <Calculator size={14} /> Apurar
            </button>
          </div>
        )}
      </div>

      {resultado && <ResultadoApuracao resultado={resultado} />}

      <div
        id="painel-comissoes"
        role="tabpanel"
        aria-labelledby={`aba-comissoes-${aba}`}
        className="comissoes-painel"
      >
        {aba === 'comissoes' && <ListaComissoes key={geracao} financeiro={financeiro} />}
        {aba === 'ajustes' && <ListaAjustes key={geracao} financeiro={financeiro} />}
        {aba === 'fechamentos' && <ListaFechamentos key={geracao} financeiro={financeiro} />}
        {aba === 'pendencias' && <PendenciasApuracao key={geracao} />}
      </div>

      {apurando && <ApurarModal onConcluido={concluirApuracao} onFechar={() => setApurando(false)} />}
    </div>
  );
}
