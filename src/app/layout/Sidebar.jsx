import React, { useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import { usePendenciasSolicitacao } from '../../modules/solicitacoes/usePendenciasSolicitacao';
import { agruparPorSecao, filtrarPorPerfil, gruposDeNavegacao } from './navegacao';
import './Sidebar.css';

const CHAVE_AREAS = 'mia.menu.areas';

function lerAreas() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_AREAS));
    return bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  } catch {
    return {};
  }
}

function gravarAreas(areas) {
  try {
    localStorage.setItem(CHAVE_AREAS, JSON.stringify(areas));
  } catch {
    return;
  }
}

function areaDaRota(grupos, pathname) {
  const grupo = grupos.find((g) =>
    g.items.some((item) => matchPath({ path: item.path, end: item.end ?? item.path === '/' }, pathname))
  );
  return grupo?.title ?? null;
}

function idDaArea(titulo) {
  return `sidebar-area-${titulo.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}`;
}

export function Sidebar({ aberto = false, onFechar = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const [areas, setAreas] = useState(lerAreas);
  const { pathname } = useLocation();
  const { administrador, comercial, financeiro } = useAutenticacao();
  const pendencias = usePendenciasSolicitacao();
  const gruposVisiveis = filtrarPorPerfil(gruposDeNavegacao(pendencias), { administrador, comercial, financeiro });
  const areaAtual = areaDaRota(gruposVisiveis, pathname);

  const estaAberta = (titulo) => areas[titulo] ?? titulo === areaAtual;

  const alternarArea = (titulo) => {
    const novas = { ...areas, [titulo]: !estaAberta(titulo) };
    setAreas(novas);
    gravarAreas(novas);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${aberto ? 'aberto' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-marca">{collapsed ? 'M' : 'MiaConstrutora'}</span>
        <span className="sidebar-marca-movel">MiaConstrutora</span>
        <button type="button" className="sidebar-fechar" aria-label="Fechar menu" onClick={onFechar}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-content">
        {gruposVisiveis.map((group) => {
          const areaAberta = estaAberta(group.title);
          const contador = group.items.find((item) => item.contador)?.contador;
          const idArea = idDaArea(group.title);

          return (
            <div key={group.title} className={`sidebar-group ${areaAberta ? 'aberta' : ''}`}>
              <button
                type="button"
                className="sidebar-group-title"
                aria-expanded={areaAberta}
                aria-controls={idArea}
                onClick={() => alternarArea(group.title)}
              >
                <span className="sidebar-group-nome">{collapsed ? '...' : group.title}</span>
                {!areaAberta && contador && (
                  <span className="sidebar-contador" title={contador.titulo}>
                    {contador.total}
                  </span>
                )}
                <ChevronDown size={14} className="sidebar-group-seta" aria-hidden="true" />
              </button>
              <div id={idArea} className="sidebar-area">
                {agruparPorSecao(group.items).map((secao, secaoIdx) => (
                  <div key={secao.title ?? secaoIdx} className="sidebar-secao">
                    {secao.title && <div className="sidebar-secao-title">{secao.title}</div>}
                    <ul className="sidebar-nav">
                      {secao.items.map((item) => (
                        <li key={item.label}>
                          <NavLink
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                            onClick={onFechar}
                          >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-label">{item.label}</span>
                            {item.contador && (
                              <span className="sidebar-contador" title={item.contador.titulo}>
                                {item.contador.total}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
