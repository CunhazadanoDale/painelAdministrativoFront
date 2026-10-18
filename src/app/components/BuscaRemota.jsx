import React, { useEffect, useState } from 'react';
import './SeletorRemoto.css';

const ESPERA_MS = 250;

export function BuscaRemota({
  id,
  nomeBusca,
  rotuloSelecao,
  valor,
  rotuloAtual,
  buscar,
  opcaoDe,
  onEscolher,
  placeholderBusca = 'Digite para buscar',
  className = 'filter-input',
  disabled = false,
  invalido = false,
}) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState({ itens: [], erro: null, carregando: true });

  useEffect(() => {
    const controle = new AbortController();
    const espera = setTimeout(() => {
      buscar(texto.trim(), controle.signal)
        .then((itens) => {
          if (!controle.signal.aborted) setEstado({ itens: itens || [], erro: null, carregando: false });
        })
        .catch((e) => {
          if (controle.signal.aborted) return;
          setEstado({ itens: [], erro: (e && e.message) || 'Erro na busca.', carregando: false });
        });
    }, texto ? ESPERA_MS : 0);

    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [buscar, texto]);

  const opcoes = estado.itens.map((item) => ({ ...opcaoDe(item), item }));
  const atualForaDaLista = valor && !opcoes.some((opcao) => opcao.valor === valor);

  const escolher = (evento) => {
    const escolhido = evento.target.value;
    if (!escolhido) {
      onEscolher(null);
      return;
    }
    const opcao = opcoes.find((item) => item.valor === escolhido);
    if (opcao) onEscolher(opcao.item);
  };

  return (
    <div className="busca-remota">
      <input
        type="search"
        className={className}
        aria-label={`Buscar ${nomeBusca}`}
        placeholder={placeholderBusca}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        disabled={disabled}
      />
      <select
        id={id}
        className={className}
        value={valor || ''}
        onChange={escolher}
        disabled={disabled}
        aria-label={rotuloSelecao}
        aria-invalid={invalido || undefined}
        aria-busy={estado.carregando || undefined}
      >
        <option value="">{estado.carregando ? 'Buscando…' : 'Selecione…'}</option>
        {atualForaDaLista && <option value={valor}>{rotuloAtual || valor}</option>}
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
      {estado.erro && (
        <span className="seletor-remoto-erro" role="alert">
          {estado.erro}
        </span>
      )}
      {!estado.carregando && !estado.erro && opcoes.length === 0 && texto && (
        <span className="busca-remota-vazio">Nada encontrado para “{texto}”.</span>
      )}
    </div>
  );
}
