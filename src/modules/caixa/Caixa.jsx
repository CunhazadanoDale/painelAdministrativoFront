import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { ConciliacaoExtrato } from './ConciliacaoExtrato';
import { FechamentosCaixa } from './FechamentosCaixa';
import { ListaImportacoes } from './ListaImportacoes';
import { RegistrosCaixa } from './RegistrosCaixa';
import { SaldosCaixa } from './SaldosCaixa';
import './Caixa.css';

const ABAS = [
  { valor: 'saldos', rotulo: 'Saldos' },
  { valor: 'importacoes', rotulo: 'Importações' },
  { valor: 'conciliacao', rotulo: 'Conciliação' },
  { valor: 'registros', rotulo: 'Registros' },
  { valor: 'fechamentos', rotulo: 'Fechamentos' },
];

export default function Caixa() {
  const { administrador } = useAutenticacao();
  const [aba, setAba] = useState('saldos');

  return (
    <div className="caixa-container">
      <div className="caixa-toolbar">
        <h1 className="caixa-toolbar-titulo">Caixa</h1>
        <div className="caixa-abas" role="tablist" aria-label="Caixa">
          {ABAS.map((item) => (
            <button
              key={item.valor}
              type="button"
              role="tab"
              id={`aba-caixa-${item.valor}`}
              aria-selected={aba === item.valor}
              aria-controls="painel-caixa"
              className={`caixa-aba ${aba === item.valor ? 'caixa-aba-ativa' : ''}`}
              onClick={() => setAba(item.valor)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div id="painel-caixa" role="tabpanel" aria-labelledby={`aba-caixa-${aba}`} className="caixa-painel">
        {aba === 'saldos' && <SaldosCaixa />}
        {aba === 'importacoes' && <ListaImportacoes administrador={administrador} />}
        {aba === 'conciliacao' && <ConciliacaoExtrato />}
        {aba === 'registros' && <RegistrosCaixa />}
        {aba === 'fechamentos' && <FechamentosCaixa administrador={administrador} />}
      </div>
    </div>
  );
}
