import React, { useCallback } from 'react';
import { Panel } from '../../app/components/Panel';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { telasPermitidas } from '../../app/layout/navegacao';
import { usePreferencias } from '../../app/preferencias/usePreferencias';
import './Configuracoes.css';

const OPCOES_DE_TEMA = [
  { valor: 'sistema', rotulo: 'Igual ao sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

function agruparTelas(telas) {
  return telas.reduce((grupos, tela) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === tela.grupo) {
      ultimo.telas.push(tela);
    } else {
      grupos.push({ titulo: tela.grupo, telas: [tela] });
    }
    return grupos;
  }, []);
}

export default function Configuracoes() {
  const { administrador, comercial, financeiro } = useAutenticacao();
  const { preferencias, alterar } = usePreferencias();
  const telas = telasPermitidas({ administrador, comercial, financeiro });
  const telaInicial = telas.some((tela) => tela.path === preferencias.telaInicial) ? preferencias.telaInicial : '/';
  const alterarEmpresa = useCallback((valor) => alterar('empresaPadrao', valor), [alterar]);

  return (
    <div className="configuracoes-container">
      <div className="configuracoes-toolbar">
        <div className="configuracoes-toolbar-titulo">Configurações</div>
        <span className="configuracoes-aviso">As alterações são salvas na hora, neste navegador.</span>
      </div>

      <Panel title="Aparência">
        <fieldset className="configuracoes-campo">
          <legend className="filter-label">Tema</legend>
          <div className="configuracoes-opcoes">
            {OPCOES_DE_TEMA.map((opcao) => (
              <label key={opcao.valor} className="configuracoes-opcao">
                <input
                  type="radio"
                  name="tema"
                  value={opcao.valor}
                  checked={preferencias.tema === opcao.valor}
                  onChange={() => alterar('tema', opcao.valor)}
                />
                {opcao.rotulo}
              </label>
            ))}
          </div>
          <p className="configuracoes-ajuda">O tema vale para este aparelho, inclusive na tela de login.</p>
        </fieldset>
      </Panel>

      <Panel title="Navegação e formulários">
        <div className="configuracoes-grade">
          <div className="configuracoes-campo">
            <label className="filter-label" htmlFor="configuracoes-tela-inicial">
              Tela inicial
            </label>
            <select
              id="configuracoes-tela-inicial"
              className="filter-select"
              value={telaInicial}
              onChange={(evento) => alterar('telaInicial', evento.target.value)}
            >
              {agruparTelas(telas).map((grupo) => (
                <optgroup key={grupo.titulo} label={grupo.titulo}>
                  {grupo.telas.map((tela) => (
                    <option key={tela.path} value={tela.path}>
                      {tela.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="configuracoes-ajuda">Aberta depois de entrar, quando você não veio de um link.</p>
          </div>

          <div className="configuracoes-campo">
            <label className="filter-label" htmlFor="configuracoes-empresa">
              Empresa padrão
            </label>
            <SeletorEmpresa
              id="configuracoes-empresa"
              valor={preferencias.empresaPadrao}
              onAlterar={alterarEmpresa}
              placeholder="Nenhuma"
              selecionarUnica={false}
            />
            <p className="configuracoes-ajuda">
              Já vem selecionada nos formulários. Filtros e confirmações continuam pedindo a escolha.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
