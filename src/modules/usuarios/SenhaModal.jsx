import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Usuarios.css';

export function SenhaModal({ usuario, onFechar, onSalvar, exigirSenhaAtual = false }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const validar = () => {
    const novosErros = {};

    if (exigirSenhaAtual && !senhaAtual) {
      novosErros.senhaAtual = 'Informe a senha atual.';
    }

    if (!senha) {
      novosErros.senha = 'Informe a nova senha.';
    } else if (senha.length < 8) {
      novosErros.senha = 'A senha deve ter no mínimo 8 caracteres.';
    }

    if (!confirmacao) {
      novosErros.confirmacao = 'Confirme a nova senha.';
    } else if (senha !== confirmacao) {
      novosErros.confirmacao = 'As senhas não coincidem.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    setErroApi(null);
    try {
      await onSalvar(senha, senhaAtual);
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao trocar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Trocar senha"
      onFechar={salvando ? () => {} : onFechar}
      largura="420px"
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
            form="senha-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="senha-form" className="usuarios-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="usuarios-form-erro-api">{erroApi}</div>}

        <p className="usuarios-senha-alvo">
          {usuario?.nome} {usuario?.email ? `(${usuario.email})` : ''}
        </p>

        {exigirSenhaAtual && (
          <div className="usuarios-form-campo">
            <label className="filter-label" htmlFor="senha-atual">
              Senha atual *
            </label>
            <input
              id="senha-atual"
              className="filter-input"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(evento) => setSenhaAtual(evento.target.value)}
              autoFocus
              disabled={salvando}
            />
            {erros.senhaAtual && <span className="usuarios-form-erro">{erros.senhaAtual}</span>}
          </div>
        )}

        <div className="usuarios-form-campo">
          <label className="filter-label" htmlFor="senha-nova">
            Nova senha *
          </label>
          <input
            id="senha-nova"
            className="filter-input"
            type="password"
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            autoFocus={!exigirSenhaAtual}
            disabled={salvando}
          />
          {erros.senha && <span className="usuarios-form-erro">{erros.senha}</span>}
        </div>

        <div className="usuarios-form-campo">
          <label className="filter-label" htmlFor="senha-confirmacao">
            Confirmação *
          </label>
          <input
            id="senha-confirmacao"
            className="filter-input"
            type="password"
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            disabled={salvando}
          />
          {erros.confirmacao && (
            <span className="usuarios-form-erro">{erros.confirmacao}</span>
          )}
        </div>
      </form>
    </Modal>
  );
}
