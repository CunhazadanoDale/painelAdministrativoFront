import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { paraCentavos } from '../../lib/formatar';
import * as produtosService from '../../services/produtos';
import * as precosService from '../../services/tabelaPrecos';
import { MODELOS, hojeEmBrasilia } from '../pedidos/pedidosUtils';
import './Precos.css';

const LIMITE_OBSERVACAO = 500;

const buscarProdutos = (texto, sinal) =>
  produtosService
    .listarProdutos({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeProduto = (produto) => ({
  valor: produto.id,
  rotulo: produto.codigo ? `${produto.nome} (${produto.codigo})` : produto.nome,
});

export function LancarPrecoModal({ produto, modeloInicial, onLancado, onFechar }) {
  const [escolhido, setEscolhido] = useState(null);
  const [modelo, setModelo] = useState(modeloInicial);
  const [preco, setPreco] = useState('');
  const [vigenteDe, setVigenteDe] = useState(hojeEmBrasilia());
  const [observacao, setObservacao] = useState('');
  const produtoId = produto?.id ?? escolhido?.id ?? '';

  const validar = () => {
    const erros = [];
    if (!produtoId) erros.push('Escolha o produto.');
    const centavos = paraCentavos(preco);
    if (!preco.trim() || !Number.isFinite(centavos) || centavos <= 0) erros.push('Informe um preço maior que zero.');
    if (!vigenteDe) erros.push('Informe o início da vigência.');
    if (observacao.trim().length > LIMITE_OBSERVACAO) {
      erros.push(`A observação tem no máximo ${LIMITE_OBSERVACAO} caracteres.`);
    }
    return erros;
  };

  const lancar = async () => {
    await precosService.lancarPreco({
      produto_id: produtoId,
      modelo,
      preco_centavos: paraCentavos(preco),
      vigente_de: vigenteDe,
      observacao: observacao.trim() || null,
    });
    onLancado();
  };

  return (
    <AcaoModal
      titulo={produto ? `Novo preço — ${produto.nome}` : 'Novo preço'}
      rotuloConfirmar="Lançar"
      validar={validar}
      onConfirmar={lancar}
      onFechar={onFechar}
      onRecarregar={onFechar}
      largura="560px"
    >
      <p className="precos-texto">
        Um preço novo encerra o anterior a partir da data de início. O histórico não é editado; uma vigência que ainda
        não começou pode ser excluída. Data no passado corrige a tabela, mas não muda pedidos já lançados.
      </p>
      {!produto && (
        <div className="precos-form-campo">
          <label className="filter-label" htmlFor="lancar-preco-produto">
            Produto *
          </label>
          <BuscaRemota
            id="lancar-preco-produto"
            nomeBusca="produto do preço"
            valor={escolhido?.id ?? ''}
            rotuloAtual={escolhido ? opcaoDeProduto(escolhido).rotulo : ''}
            buscar={buscarProdutos}
            opcaoDe={opcaoDeProduto}
            onEscolher={setEscolhido}
            placeholderBusca="Nome ou código"
          />
        </div>
      )}
      <div className="precos-form-linha">
        <div className="precos-form-campo">
          <label className="filter-label" htmlFor="lancar-preco-modelo">
            Modelo *
          </label>
          <select
            id="lancar-preco-modelo"
            className="filter-select"
            value={modelo}
            onChange={(evento) => setModelo(evento.target.value)}
          >
            {MODELOS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="precos-form-campo">
          <label className="filter-label" htmlFor="lancar-preco-valor">
            Preço *
          </label>
          <input
            id="lancar-preco-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={preco}
            onChange={(evento) => setPreco(evento.target.value)}
          />
        </div>
      </div>
      <div className="precos-form-campo">
        <label className="filter-label" htmlFor="lancar-preco-vigencia">
          Vigente a partir de *
        </label>
        <input
          id="lancar-preco-vigencia"
          className="filter-input"
          type="date"
          value={vigenteDe}
          onChange={(evento) => setVigenteDe(evento.target.value)}
        />
      </div>
      <div className="precos-form-campo">
        <label className="filter-label" htmlFor="lancar-preco-observacao">
          Observação
        </label>
        <input
          id="lancar-preco-observacao"
          className="filter-input"
          type="text"
          maxLength={LIMITE_OBSERVACAO}
          placeholder="Ex.: reajuste do fornecedor"
          value={observacao}
          onChange={(evento) => setObservacao(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}
