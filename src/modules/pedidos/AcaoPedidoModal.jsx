import React, { useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import './Pedidos.css';

export function AcaoPedidoModal({
  titulo,
  rotuloConfirmar,
  validar,
  onConfirmar,
  onFechar,
  onRecarregar,
  largura = '480px',
  children,
}) {
  const [erro, setErro] = useState(null);
  const [conflito, setConflito] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    const erroValidacao = validar ? validar() : null;
    if (Array.isArray(erroValidacao) ? erroValidacao.length > 0 : erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setSalvando(true);
    setErro(null);
    setConflito(null);
    try {
      await onConfirmar();
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErro(e.message || 'Erro ao gravar a operação.');
    } finally {
      setSalvando(false);
    }
  };

  const recarregar = () => {
    onFechar();
    onRecarregar();
  };

  return (
    <Modal
      aberto
      titulo={titulo}
      onFechar={salvando ? () => {} : onFechar}
      largura={largura}
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={salvando}
          >
            Voltar
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={confirmar}
            disabled={salvando}
          >
            {salvando ? 'Gravando…' : rotuloConfirmar}
          </button>
        </>
      }
    >
      <div className="pedidos-form">
        {Array.isArray(erro) ? (
          <ul className="pedidos-form-erros" role="alert">
            {erro.map((mensagem) => (
              <li key={mensagem}>{mensagem}</li>
            ))}
          </ul>
        ) : (
          erro && (
            <div className="pedidos-form-erro-api" role="alert">
              {erro}
            </div>
          )
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} />}
        {children}
      </div>
    </Modal>
  );
}
