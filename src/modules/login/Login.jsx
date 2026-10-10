import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { AlertCircle, Info, LogIn } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { entrar, aviso } = useAutenticacao();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.');
      return;
    }

    setEntrando(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
      navegar('/', { replace: true });
    } catch (e) {
      setErro(e.message || 'Erro ao entrar.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-cartao" onSubmit={enviar} noValidate>
        <div className="login-marca">
          <span className="login-marca-icone">
            <LogIn size={20} />
          </span>
          <span className="login-marca-nome">MiaConstrutora</span>
        </div>
        <h1 className="login-titulo">Entrar no painel</h1>

        {aviso && !erro && (
          <div className="login-aviso" role="status">
            <Info size={16} />
            <span>{aviso}</span>
          </div>
        )}

        {erro && (
          <div className="login-erro">
            <AlertCircle size={16} />
            <span>{erro}</span>
          </div>
        )}

        <div className="login-campo">
          <label className="filter-label" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            className="filter-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={entrando}
            autoFocus
          />
        </div>

        <div className="login-campo">
          <label className="filter-label" htmlFor="login-senha">
            Senha
          </label>
          <input
            id="login-senha"
            className="filter-input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            disabled={entrando}
          />
        </div>

        <button type="submit" className="filter-btn filter-btn-primary login-entrar" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
