import React, { useState } from 'react';
import { SaldosCaixa } from './SaldosCaixa';
import './Caixa.css';

const ABAS = [{ valor: 'saldos', rotulo: 'Saldos' }];

export default function Caixa() {
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
      </div>
    </div>
  );
}
