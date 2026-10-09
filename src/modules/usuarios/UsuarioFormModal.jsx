import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import './Usuarios.css';

export function UsuarioFormModal({ usuario, cargos, onFechar, onSalvar }) {
  const [form, setForm] = useState(() => ({
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    cargo_id: usuario?.cargo_id ?? '',
    senha: '',
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (evento) =>
    setForm((atual) => ({ ...atual, [campo]: evento.target.value }));

  const validar = () => {
    const novosErros = {};
    const email = form.email.trim();

    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do usuário.';
    if (!email) {
      novosErros.email = 'Informe o e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      novosErros.email = 'Informe um e-mail válido.';
    }
    if (!form.cargo_id) novosErros.cargo_id = 'Selecione o cargo.';

    if (!usuario) {
      if (!form.senha) {
        novosErros.senha = 'Informe a senha.';
      } else if (form.senha.length < 8) {
        novosErros.senha = 'A senha deve ter no mínimo 8 caracteres.';
      }
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
      const dados = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        cargo_id: form.cargo_id,
      };
      await onSalvar(usuario ? dados : { ...dados, senha: form.senha });
      onFechar();
    } catch (e) {
      setErroApi(e.message || 'Erro ao salvar o usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={usuario ? 'Editar Usuário' : 'Novo Usuário'}
      onFechar={salvando ? () => {} : onFechar}
      largura="460px"
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
            form="usuario-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="usuario-form" className="usuarios-form" onSubmit={salvar} noValidate>
        {erroApi && <div className="usuarios-form-erro-api">{erroApi}</div>}

        <div className="usuarios-form-campo">
          <label className="filter-label" htmlFor="usuario-nome">
            Nome *
          </label>
          <input
            id="usuario-nome"
            className="filter-input"
            type="text"
            value={form.nome}
            onChange={alterar('nome')}
            autoFocus
            disabled={salvando}
          />
          {erros.nome && <span className="usuarios-form-erro">{erros.nome}</span>}
        </div>

        <div className="usuarios-form-campo">
          <label className="filter-label" htmlFor="usuario-email">
            E-mail *
          </label>
          <input
            id="usuario-email"
            className="filter-input"
            type="email"
            value={form.email}
            onChange={alterar('email')}
            disabled={salvando}
          />
          {erros.email && <span className="usuarios-form-erro">{erros.email}</span>}
        </div>

        <div className="usuarios-form-campo">
          <label className="filter-label" htmlFor="usuario-cargo">
            Cargo *
          </label>
          <select
            id="usuario-cargo"
            className="filter-select"
            value={form.cargo_id}
            onChange={alterar('cargo_id')}
            disabled={salvando}
          >
            <option value="">Selecione…</option>
            {cargos.map((cargo) => (
              <option key={cargo.id} value={cargo.id}>
                {cargo.nome}
              </option>
            ))}
          </select>
          {erros.cargo_id && <span className="usuarios-form-erro">{erros.cargo_id}</span>}
        </div>

        {!usuario && (
          <div className="usuarios-form-campo">
            <label className="filter-label" htmlFor="usuario-senha">
              Senha *
            </label>
            <input
              id="usuario-senha"
              className="filter-input"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              value={form.senha}
              onChange={alterar('senha')}
              disabled={salvando}
            />
            {erros.senha && <span className="usuarios-form-erro">{erros.senha}</span>}
          </div>
        )}
      </form>
    </Modal>
  );
}
