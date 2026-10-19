import React, { useCallback, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import './Financeiro.css';

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

export function GerarCompetenciaModal({ descricaoDe, onGerar, onFechar }) {
  const [competencia, setCompetencia] = useState(mesAtual);
  const [empresa, setEmpresa] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(false);
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const gerar = async () => {
    if (!competencia) {
      setErro('Informe a competência.');
      return;
    }
    setErro(null);
    setRelatorio(null);
    setGerando(true);
    try {
      setRelatorio(await onGerar({ competencia, empresa }));
    } catch (e) {
      setErro(e.message || 'Erro ao gerar a competência.');
    } finally {
      setGerando(false);
    }
  };

  const recusadas = relatorio?.recusadas ?? [];

  return (
    <Modal
      aberto
      titulo="Gerar as contas da competência"
      onFechar={gerando ? () => {} : onFechar}
      largura="560px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={gerando}
          >
            Fechar
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={gerar}
            disabled={gerando}
          >
            {gerando ? 'Gerando…' : 'Gerar'}
          </button>
        </>
      }
    >
      <div className="financeiro-form">
        <p className="financeiro-form-ajuda">
          Cria uma solicitação por despesa ativa e vigente na competência. As geradas nascem pendentes de aprovação, com
          você como solicitante. Rodar de novo não duplica.
        </p>
        {erro && (
          <div className="financeiro-form-erro-api" role="alert">
            {erro}
          </div>
        )}
        <div className="financeiro-form-linha">
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="gerar-competencia">
              Competência *
            </label>
            <input
              id="gerar-competencia"
              className="filter-input"
              type="month"
              value={competencia}
              onChange={(evento) => setCompetencia(evento.target.value)}
              disabled={gerando}
            />
          </div>
          <div className="financeiro-form-campo">
            <label className="filter-label" htmlFor="gerar-empresa">
              Empresa
            </label>
            <SeletorEmpresa
              id="gerar-empresa"
              className="filter-input"
              valor={empresa}
              onAlterar={alterarEmpresa}
              selecionarUnica={false}
              placeholder="Todas do meu acesso"
              disabled={gerando}
            />
          </div>
        </div>

        {relatorio && (
          <div className="financeiro-relatorio" role="status">
            <strong>{`${relatorio.geradas?.length ?? 0} geradas, ${relatorio.ja_existentes ?? 0} já existiam.`}</strong>
            {recusadas.length > 0 && (
              <>
                <span>Não geradas:</span>
                <ul>
                  {recusadas.map((item) => (
                    <li key={item.despesa_recorrente_id}>
                      {`${descricaoDe(item.despesa_recorrente_id)}: ${item.motivo}`}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
