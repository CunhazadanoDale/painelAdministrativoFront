import React, { useState } from 'react';
import { mesesNoPeriodo } from './dreUtils';
import './Dre.css';

function erroDoPeriodo({ de, ate }, maximo) {
  if (!de || !ate) return 'Informe o mês inicial e o final.';
  if (de > ate) return 'O mês inicial não pode ser depois do final.';
  if (mesesNoPeriodo(de, ate) > maximo) return `O período vai até ${maximo} meses.`;
  return null;
}

export function PeriodoMensal({ inicial, maximo, onAplicar, prefixo }) {
  const [periodo, setPeriodo] = useState(inicial);
  const erro = erroDoPeriodo(periodo, maximo);

  const alterar = (campo) => (evento) => {
    const novo = { ...periodo, [campo]: evento.target.value };
    setPeriodo(novo);
    if (!erroDoPeriodo(novo, maximo)) onAplicar(novo);
  };

  return (
    <>
      <label className="filter-label" htmlFor={`${prefixo}-de`}>
        De
      </label>
      <input
        id={`${prefixo}-de`}
        className="filter-input dre-periodo-campo"
        type="month"
        value={periodo.de}
        onChange={alterar('de')}
      />
      <label className="filter-label" htmlFor={`${prefixo}-ate`}>
        Até
      </label>
      <input
        id={`${prefixo}-ate`}
        className="filter-input dre-periodo-campo"
        type="month"
        value={periodo.ate}
        onChange={alterar('ate')}
      />
      {erro && (
        <span className="dre-form-erro-api" role="alert">
          {erro}
        </span>
      )}
    </>
  );
}
