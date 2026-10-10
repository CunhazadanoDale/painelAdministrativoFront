import React, { useState } from 'react';
import { Panel } from '../../app/components/Panel';
import { StatusBadge } from '../../app/components/StatusBadge';
import { SenhaModal } from '../usuarios/SenhaModal';
import { formatarDataHora } from '../../lib/formatar';
import { usePerfil } from './usePerfil';
import { AlertCircle, KeyRound } from 'lucide-react';
import './Perfil.css';

export default function Perfil() {
  const { usuario, cargoMapa, carregando, erro, recarregar, trocarSenha } = usePerfil();
  const [senhaAberta, setSenhaAberta] = useState(false);

  if (carregando) {
    return <div className="perfil-status">Carregando perfil…</div>;
  }

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!usuario) return null;

  const linhas = [
    { rotulo: 'Nome', valor: usuario.nome },
    { rotulo: 'E-mail', valor: usuario.email },
    { rotulo: 'Cargo', valor: cargoMapa[usuario.cargo_id]?.nome ?? '—' },
    { rotulo: 'Último acesso', valor: formatarDataHora(usuario.ultimo_login) },
    { rotulo: 'Criado em', valor: formatarDataHora(usuario.criado_em) },
    { rotulo: 'Atualizado em', valor: formatarDataHora(usuario.atualizado_em) },
  ];

  return (
    <div className="perfil-container">
      <div className="perfil-toolbar">
        <div className="perfil-toolbar-titulo">Meu perfil</div>
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{
            flex: 'none',
            width: 'auto',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          onClick={() => setSenhaAberta(true)}
        >
          <KeyRound size={14} /> Trocar senha
        </button>
      </div>

      <Panel title="Dados da conta">
        <div className="perfil-situacao">
          <StatusBadge
            status={usuario.ativo ? 'success' : 'danger'}
            label={usuario.ativo ? 'Ativo' : 'Inativo'}
          />
        </div>
        <dl className="perfil-lista">
          {linhas.map((linha) => (
            <div key={linha.rotulo} className="perfil-item">
              <dt>{linha.rotulo}</dt>
              <dd>{linha.valor}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {senhaAberta && (
        <SenhaModal
          usuario={usuario}
          onFechar={() => setSenhaAberta(false)}
          onSalvar={trocarSenha}
          exigirSenhaAtual
        />
      )}
    </div>
  );
}
