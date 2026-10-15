import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../app/components/Modal';
import { useAcessoEmpresas } from './useAcessoEmpresas';
import './Usuarios.css';

export function AcessoEmpresasModal({ usuario, administrador = false, onFechar }) {
  const { empresas, acessoTodas, empresaIds, chaveDados, carregando, erro, recarregar, salvar } =
    useAcessoEmpresas(usuario.id);

  const [rascunho, setRascunho] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const atual =
    rascunho && rascunho.chave === chaveDados
      ? rascunho
      : { chave: chaveDados, acessoTodas, marcadas: new Set(empresaIds) };

  const alternarTodas = (event) =>
    setRascunho({ ...atual, acessoTodas: event.target.checked });

  const alternarEmpresa = (id) => (event) => {
    const marcadas = new Set(atual.marcadas);
    if (event.target.checked) marcadas.add(id);
    else marcadas.delete(id);
    setRascunho({ ...atual, marcadas });
  };

  const idsParaGravar = () => {
    const daLista = empresas.filter((empresa) => atual.marcadas.has(empresa.id)).map((empresa) => empresa.id);
    const conhecidas = new Set(empresas.map((empresa) => empresa.id));
    const foraDaLista = [...atual.marcadas].filter((id) => !conhecidas.has(id));
    return [...daLista, ...foraDaLista];
  };

  const gravar = async (event) => {
    event.preventDefault();
    if (!chaveDados) return;
    setSalvando(true);
    setErroApi(null);
    try {
      await salvar(atual.acessoTodas, idsParaGravar());
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao gravar as empresas do usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const semAcesso = !administrador && !atual.acessoTodas && atual.marcadas.size === 0;

  return (
    <Modal
      aberto
      titulo={`Empresas de ${usuario.nome}`}
      onFechar={salvando ? () => {} : onFechar}
      largura="480px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="acesso-empresas-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando || !chaveDados}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      {carregando ? (
        <div className="usuarios-acesso-status">Carregando empresas…</div>
      ) : erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <form id="acesso-empresas-form" className="usuarios-form" onSubmit={gravar} noValidate>
          {erroApi && (
            <div className="usuarios-form-erro-api" role="alert">
              {erroApi}
            </div>
          )}

          {administrador && (
            <div className="usuarios-acesso-aviso">
              Este usuário tem cargo de administrador e enxerga todas as empresas, com ou sem
              vínculo.
            </div>
          )}

          <label className="usuarios-acesso-opcao" htmlFor="acesso-todas">
            <input
              id="acesso-todas"
              type="checkbox"
              checked={atual.acessoTodas}
              onChange={alternarTodas}
              disabled={salvando}
            />
            Acesso a todas as empresas, inclusive as cadastradas depois
          </label>

          {empresas.length === 0 ? (
            <div className="usuarios-acesso-status">Nenhuma empresa cadastrada.</div>
          ) : (
            <fieldset className="usuarios-acesso-lista" disabled={salvando || atual.acessoTodas}>
              <legend className="filter-label">Empresas vinculadas</legend>
              {empresas.map((empresa) => {
                const id = `acesso-empresa-${empresa.id}`;
                return (
                  <label key={empresa.id} className="usuarios-acesso-opcao" htmlFor={id}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={atual.marcadas.has(empresa.id)}
                      onChange={alternarEmpresa(empresa.id)}
                    />
                    {empresa.ativa ? empresa.nome_fantasia : `${empresa.nome_fantasia} (inativa)`}
                  </label>
                );
              })}
            </fieldset>
          )}

          {semAcesso && (
            <div className="usuarios-acesso-aviso">
              Sem vínculo, o usuário não enxerga nenhuma empresa e não consegue abrir solicitações.
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
