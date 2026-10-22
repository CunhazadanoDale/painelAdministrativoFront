import { describe, expect, it } from 'vitest';
import {
  ESTRUTURA_DRE,
  formatarMes,
  formatarPontosBase,
  idDoItem,
  itensDasLinhas,
  mesesAntes,
  mesesNoPeriodo,
  rotuloLinhaPagamento,
  somarDias,
  valorDaLinha,
  valorDoItem,
} from './dreUtils';

describe('dreUtils', () => {
  it('monta a DRE com as dez linhas, os subtotais na ordem e fora_dre por último', () => {
    expect(ESTRUTURA_DRE.map((item) => item.chave)).toEqual([
      'receita_bruta',
      'outras_receitas',
      'deducoes',
      'receita_liquida_centavos',
      'cmv',
      'perdas_estoque',
      'lucro_bruto_centavos',
      'despesas_variaveis',
      'margem_contribuicao_centavos',
      'despesas_fixas',
      'nao_classificado',
      'resultado_operacional_centavos',
      'resultado_financeiro',
      'resultado_centavos',
      'fora_dre',
    ]);
    expect(ESTRUTURA_DRE.filter((item) => item.tipo === 'subtotal')).toHaveLength(5);
    expect(ESTRUTURA_DRE.find((item) => item.chave === 'cmv').rotulo).toBe('CMV');
  });

  it('conta e recua meses', () => {
    expect(mesesAntes('2026-10', 11)).toBe('2025-11');
    expect(mesesAntes('2026-01', 1)).toBe('2025-12');
    expect(mesesAntes('2026-03', 0)).toBe('2026-03');
    expect(mesesNoPeriodo('2025-11', '2026-10')).toBe(12);
    expect(mesesNoPeriodo('2026-10', '2026-09')).toBe(0);
    expect(formatarMes('2026-10')).toBe('out/2026');
    expect(formatarMes('2026-01')).toBe('jan/2026');
  });

  it('soma dias numa data sem fuso', () => {
    expect(somarDias('2026-10-12', 7)).toBe('2026-10-19');
    expect(somarDias('2026-10-12', -7)).toBe('2026-10-05');
    expect(somarDias('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('formata pontos-base como percentual e nulo como traço', () => {
    expect(formatarPontosBase(5263)).toBe('52,63%');
    expect(formatarPontosBase(-150)).toBe('-1,50%');
    expect(formatarPontosBase(null)).toBe('—');
  });

  it('lê o valor da linha e do subtotal num demonstrativo', () => {
    const demonstrativo = {
      linhas: [{ linha: 'cmv', valor_centavos: -500, itens: [] }],
      subtotais: { lucro_bruto_centavos: 900 },
    };
    expect(valorDaLinha(demonstrativo, { tipo: 'linha', chave: 'cmv' })).toBe(-500);
    expect(valorDaLinha(demonstrativo, { tipo: 'subtotal', chave: 'lucro_bruto_centavos' })).toBe(900);
    expect(valorDaLinha(demonstrativo, { tipo: 'linha', chave: 'deducoes' })).toBe(0);
    expect(valorDaLinha(undefined, { tipo: 'linha', chave: 'cmv' })).toBe(0);
  });

  it('junta os itens de uma linha em todos os meses e lê o valor de cada um', () => {
    const setembro = {
      linhas: [
        {
          linha: 'despesas_fixas',
          itens: [{ chave: 'categoria', categoria_id: 'cat-1', nome: 'Aluguel', valor_centavos: -100 }],
        },
      ],
    };
    const outubro = {
      linhas: [
        {
          linha: 'despesas_fixas',
          itens: [
            { chave: 'categoria', categoria_id: 'cat-2', nome: 'Salários', valor_centavos: -300 },
            { chave: 'categoria', categoria_id: 'cat-1', nome: 'Aluguel', valor_centavos: -120 },
          ],
        },
      ],
    };

    expect(itensDasLinhas([setembro, outubro], 'despesas_fixas')).toEqual([
      { id: 'cat-1', nome: 'Aluguel' },
      { id: 'cat-2', nome: 'Salários' },
    ]);
    expect(idDoItem({ chave: 'nf_venda', categoria_id: null })).toBe('nf_venda');
    expect(valorDoItem(outubro, 'despesas_fixas', 'cat-1')).toBe(-120);
    expect(valorDoItem(setembro, 'despesas_fixas', 'cat-2')).toBe(0);
  });

  it('rotula a linha da DRE dos pagamentos, com sem categoria', () => {
    expect(rotuloLinhaPagamento('despesa_fixa')).toBe('Despesa fixa');
    expect(rotuloLinhaPagamento(null)).toBe('Sem categoria');
  });
});
