import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AcaoModal } from '../../app/components/AcaoModal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import { linkDoMovimento, rotuloMovimento, somarDias } from './caixaUtils';
import '../../app/components/DataGrid.css';
import './Caixa.css';

const JANELA_DIAS = 3;
const chaveDe = (movimento) => `${movimento.tipo}:${movimento.id}`;

function useCandidatos(lancamento) {
  const [estado, setEstado] = useState({ carregado: false, candidatos: [], erro: null });
  const { id, conta_bancaria_id: conta, data, valor_centavos: valor } = lancamento;

  useEffect(() => {
    const controle = new AbortController();
    Promise.all([
      caixaService.listarSugestoes(id, { sinal: controle.signal }),
      caixaService.listarPendenciasSistema({
        conta,
        de: somarDias(data, -JANELA_DIAS),
        ate: somarDias(data, JANELA_DIAS),
        tamanho: 100,
        sinal: controle.signal,
      }),
    ])
      .then(([sugestoes, pendencias]) => {
        if (controle.signal.aborted) return;
        const sugeridos = new Set((sugestoes?.dados ?? []).map(chaveDe));
        const mesmoSinal = (movimento) => Math.sign(movimento.valor_centavos) === Math.sign(valor);
        const vistos = new Set();
        const candidatos = [...(sugestoes?.dados ?? []), ...(pendencias?.dados ?? [])]
          .filter((movimento) => {
            const chave = chaveDe(movimento);
            if (vistos.has(chave) || !mesmoSinal(movimento)) return false;
            vistos.add(chave);
            return true;
          })
          .map((movimento) => ({ ...movimento, sugerido: sugeridos.has(chaveDe(movimento)) }));
        setEstado({ carregado: true, candidatos, erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ carregado: true, candidatos: [], erro: e.message || 'Erro ao carregar os movimentos.' });
      });
    return () => controle.abort();
  }, [id, conta, data, valor]);

  return estado;
}

export function ConciliarModal({ lancamento, onConciliado, onFechar }) {
  const { carregado, candidatos, erro } = useCandidatos(lancamento);
  const [selecionados, setSelecionados] = useState([]);

  const escolhidos = candidatos.filter((movimento) => selecionados.includes(chaveDe(movimento)));
  const soma = escolhidos.reduce((total, movimento) => total + movimento.valor_centavos, 0);
  const falta = lancamento.valor_centavos - soma;

  const alternar = (movimento) => {
    const chave = chaveDe(movimento);
    setSelecionados((atual) => (atual.includes(chave) ? atual.filter((item) => item !== chave) : [...atual, chave]));
  };

  const validar = () => {
    if (escolhidos.length === 0) return 'Escolha ao menos um movimento.';
    if (falta !== 0) return 'A soma dos movimentos precisa ser igual ao valor do lançamento.';
    return null;
  };

  const conciliar = async () => {
    await caixaService.conciliarLancamento(lancamento.id, escolhidos);
    onConciliado();
  };

  return (
    <AcaoModal
      titulo={`Conciliar lançamento de ${formatarData(lancamento.data)}`}
      rotuloConfirmar="Conciliar"
      validar={validar}
      onConfirmar={conciliar}
      onFechar={onFechar}
      onRecarregar={onConciliado}
      largura="760px"
    >
      <p className="caixa-texto">
        {lancamento.descricao} · <strong>{formatarMoeda(lancamento.valor_centavos)}</strong>. Escolha os movimentos do
        sistema desta conta, até {JANELA_DIAS} dias antes ou depois, cuja soma seja o valor do lançamento.
      </p>
      {!carregado ? (
        <span className="caixa-secundario">Carregando movimentos…</span>
      ) : erro ? (
        <span className="caixa-form-erro">{erro}</span>
      ) : candidatos.length === 0 ? (
        <span className="caixa-secundario">
          Nenhum movimento pendente na janela. Se a linha não tem par no sistema, classifique-a ou registre como
          transferência.
        </span>
      ) : (
        <>
          <div className="datagrid-container">
            <table className="datagrid" aria-label="Movimentos do sistema">
              <thead>
                <tr>
                  <th aria-label="Selecionar" />
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th aria-label="Sugestão" />
                </tr>
              </thead>
              <tbody>
                {candidatos.map((movimento) => {
                  const link = linkDoMovimento(movimento);
                  return (
                    <tr key={chaveDe(movimento)}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Usar ${movimento.descricao}`}
                          checked={selecionados.includes(chaveDe(movimento))}
                          onChange={() => alternar(movimento)}
                        />
                      </td>
                      <td>{formatarData(movimento.data)}</td>
                      <td>
                        {link ? (
                          <Link to={link} target="_blank" rel="noreferrer">
                            {rotuloMovimento(movimento.tipo)}
                          </Link>
                        ) : (
                          rotuloMovimento(movimento.tipo)
                        )}
                      </td>
                      <td>{movimento.descricao}</td>
                      <td>{formatarMoeda(movimento.valor_centavos)}</td>
                      <td>{movimento.sugerido && <StatusBadge status="info" label="Sugerido" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <span className={falta === 0 ? 'caixa-form-ajuda' : 'caixa-negativo'}>
            {`Selecionado: ${formatarMoeda(soma)} de ${formatarMoeda(lancamento.valor_centavos)}`}
            {falta !== 0 && ` (falta ${formatarMoeda(falta)})`}
          </span>
        </>
      )}
    </AcaoModal>
  );
}
