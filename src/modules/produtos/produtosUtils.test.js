import { describe, expect, it } from 'vitest';
import {
  LIMITE_ARQUIVO,
  TIPOS_MOVIMENTO,
  UNIDADES_MEDIDA,
  aceitaQuantidadeNegativa,
  consomeSaldo,
  custoNoMovimento,
  ehEstoqueMinimoValido,
  ehPesoValido,
  imagemPermitida,
  rotuloTipoMovimento,
  rotuloUnidade,
} from './produtosUtils';

describe('constantes', () => {
  it('mantém as unidades de medida do domínio', () => {
    expect(UNIDADES_MEDIDA.map((unidade) => unidade.valor)).toEqual([
      'un',
      'm',
      'm2',
      'm3',
      'kg',
      't',
      'cx',
      'sc',
      'pct',
      'lt',
    ]);
  });

  it('mantém os tipos de movimento do domínio', () => {
    expect(TIPOS_MOVIMENTO.map((tipo) => tipo.valor)).toEqual([
      'entrada',
      'saida',
      'ajuste',
      'perda',
      'devolucao',
      'implantacao',
    ]);
  });

  it('limita o arquivo a 10MB', () => {
    expect(LIMITE_ARQUIVO).toBe(10 * 1024 * 1024);
  });
});

describe('rotuloUnidade', () => {
  it('traduz unidades conhecidas', () => {
    expect(rotuloUnidade('m2')).toBe('Metro quadrado (m²)');
    expect(rotuloUnidade('un')).toBe('Unidade (un)');
  });

  it('devolve o próprio valor ou travessa quando desconhecido', () => {
    expect(rotuloUnidade('xx')).toBe('xx');
    expect(rotuloUnidade(null)).toBe('—');
    expect(rotuloUnidade('')).toBe('—');
  });
});

describe('rotuloTipoMovimento', () => {
  it('traduz tipos conhecidos', () => {
    expect(rotuloTipoMovimento('entrada')).toBe('Entrada');
    expect(rotuloTipoMovimento('devolucao')).toBe('Devolução');
    expect(rotuloTipoMovimento('implantacao')).toBe('Implantação');
    expect(rotuloTipoMovimento('transferencia')).toBe('Transferência');
  });

  it('devolve o próprio valor ou travessa quando desconhecido', () => {
    expect(rotuloTipoMovimento('estorno')).toBe('estorno');
    expect(rotuloTipoMovimento(null)).toBe('—');
  });
});

describe('aceitaQuantidadeNegativa', () => {
  it('só o ajuste aceita quantidade negativa', () => {
    expect(aceitaQuantidadeNegativa('ajuste')).toBe(true);
    expect(aceitaQuantidadeNegativa('entrada')).toBe(false);
    expect(aceitaQuantidadeNegativa('saida')).toBe(false);
    expect(aceitaQuantidadeNegativa('perda')).toBe(false);
    expect(aceitaQuantidadeNegativa('devolucao')).toBe(false);
    expect(aceitaQuantidadeNegativa('implantacao')).toBe(false);
  });
});

describe('custoNoMovimento', () => {
  it('exige custo na entrada', () => {
    expect(custoNoMovimento('entrada', 10)).toBe('obrigatorio');
  });

  it('deixa o custo opcional no que cria lote', () => {
    expect(custoNoMovimento('devolucao', 2)).toBe('opcional');
    expect(custoNoMovimento('implantacao', 4)).toBe('opcional');
    expect(custoNoMovimento('ajuste', 3)).toBe('opcional');
  });

  it('não aceita custo no que consome lote', () => {
    expect(custoNoMovimento('saida', 1)).toBe('proibido');
    expect(custoNoMovimento('perda', 1)).toBe('proibido');
    expect(custoNoMovimento('ajuste', -3)).toBe('proibido');
  });
});

describe('consomeSaldo', () => {
  it('identifica os movimentos que tiram do local', () => {
    expect(consomeSaldo('saida', 2)).toBe(true);
    expect(consomeSaldo('perda', 2)).toBe(true);
    expect(consomeSaldo('ajuste', -2)).toBe(true);
    expect(consomeSaldo('ajuste', 2)).toBe(false);
    expect(consomeSaldo('entrada', 2)).toBe(false);
    expect(consomeSaldo('implantacao', 2)).toBe(false);
  });
});

describe('imagemPermitida', () => {
  it('aceita PNG, JPEG e WEBP dentro do limite', () => {
    expect(imagemPermitida({ type: 'image/png', size: 1024 })).toBe(true);
    expect(imagemPermitida({ type: 'image/jpeg', size: 1024 })).toBe(true);
    expect(imagemPermitida({ type: 'image/webp', size: 1024 })).toBe(true);
  });

  it('recusa outros tipos e arquivos acima do limite', () => {
    expect(imagemPermitida({ type: 'application/pdf', size: 1024 })).toBe(false);
    expect(imagemPermitida({ type: 'image/gif', size: 1024 })).toBe(false);
    expect(imagemPermitida({ type: 'image/png', size: LIMITE_ARQUIVO + 1 })).toBe(false);
  });
});

describe('ehPesoValido', () => {
  it('aceita vazio como ausência de peso', () => {
    expect(ehPesoValido('')).toEqual({ valido: true, valor: null });
    expect(ehPesoValido('   ')).toEqual({ valido: true, valor: null });
  });

  it('converte notação brasileira', () => {
    expect(ehPesoValido('1,5')).toEqual({ valido: true, valor: 1.5 });
    expect(ehPesoValido('12')).toEqual({ valido: true, valor: 12 });
  });

  it('recusa valores inválidos e negativos', () => {
    expect(ehPesoValido('abc').valido).toBe(false);
    expect(ehPesoValido('-1').valido).toBe(false);
  });
});

describe('ehEstoqueMinimoValido', () => {
  it('aceita vazio como ausência de mínimo', () => {
    expect(ehEstoqueMinimoValido('')).toEqual({ valido: true, valor: null });
  });

  it('aceita inteiros não negativos', () => {
    expect(ehEstoqueMinimoValido('0')).toEqual({ valido: true, valor: 0 });
    expect(ehEstoqueMinimoValido('15')).toEqual({ valido: true, valor: 15 });
  });

  it('recusa fracionários, negativos e textos', () => {
    expect(ehEstoqueMinimoValido('1,5').valido).toBe(false);
    expect(ehEstoqueMinimoValido('-2').valido).toBe(false);
    expect(ehEstoqueMinimoValido('abc').valido).toBe(false);
  });
});
