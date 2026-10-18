import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as clientesService from '../../services/clientes';
import { ClienteFormModal } from './ClienteFormModal';
import { useCadastrosCliente } from './useCadastrosCliente';
import { useClienteDoLead } from './useClienteDoLead';
import { UserCheck, UserPlus } from 'lucide-react';
import '../../app/components/SeletorRemoto.css';
import './Clientes.css';

function ConversaoModal({ lead, onFechar, onSalvar }) {
  const { grupos, representantes } = useCadastrosCliente(true);

  return (
    <ClienteFormModal
      inicial={{ nome: lead.nome, email_nf: lead.email, telefone: lead.telefone }}
      grupos={grupos}
      representantes={representantes}
      titulo="Converter lead em cliente"
      ajuda="O cliente nasce ligado a este lead; o lead não muda e continua no funil."
      onFechar={onFechar}
      onSalvar={onSalvar}
    />
  );
}

const BOTAO = { flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 };

export function ConversaoLead({ lead }) {
  const { cliente, erro, carregando, recarregar } = useClienteDoLead(lead.id);
  const [aberto, setAberto] = useState(false);

  const converter = async (dados) => {
    await clientesService.converterLead(lead.id, dados);
    recarregar();
  };

  if (erro) {
    return (
      <div className="seletor-remoto-erro" role="alert">
        <span>{erro}</span>
        <button type="button" className="seletor-remoto-tentar" onClick={recarregar}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (carregando && !cliente) return null;

  if (cliente) {
    return (
      <Link to={`/clientes/${cliente.id}`} className="filter-btn filter-btn-secondary" style={BOTAO}>
        <UserCheck size={14} /> Cliente: {cliente.nome}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO} onClick={() => setAberto(true)}>
        <UserPlus size={14} /> Converter em cliente
      </button>
      {aberto && <ConversaoModal lead={lead} onFechar={() => setAberto(false)} onSalvar={converter} />}
    </>
  );
}
