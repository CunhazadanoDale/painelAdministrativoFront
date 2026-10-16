import { describe, expect, it } from 'vitest';

import {
  enderecoDaObra,
  erroDoCep,
  erroDoPercentual,
  erroDoTipoComDocumento,
  formatarCep,
  formatarPercentual,
  paraPontosBase,
  pontosBaseParaTexto,
  rotuloTipoCliente,
} from './clientesUtils';

describe('percentual em pontos-base', () => {
  it('formata pontos-base como porcentagem com duas casas', () => {
    expect(formatarPercentual(300)).toBe('3,00%');
    expect(formatarPercentual(250)).toBe('2,50%');
    expect(formatarPercentual(0)).toBe('0,00%');
    expect(formatarPercentual(10000)).toBe('100,00%');
  });

  it('lê a porcentagem digitada com vírgula ou ponto em pontos-base', () => {
    expect(paraPontosBase('3')).toBe(300);
    expect(paraPontosBase('2,5')).toBe(250);
    expect(paraPontosBase('2.75')).toBe(275);
    expect(paraPontosBase(' 1,25 ')).toBe(125);
    expect(paraPontosBase('')).toBe(0);
  });

  it('recusa texto, mais de duas casas e valor fora de 0 a 100', () => {
    expect(paraPontosBase('abc')).toBeNull();
    expect(paraPontosBase('1,234')).toBeNull();
    expect(paraPontosBase('-1')).toBeNull();
    expect(paraPontosBase('100,01')).toBeNull();
    expect(erroDoPercentual('100,01')).toBe('Informe um percentual de 0 a 100, com até duas casas.');
    expect(erroDoPercentual('3,5')).toBeNull();
  });

  it('devolve o texto do campo a partir dos pontos-base', () => {
    expect(pontosBaseParaTexto(300)).toBe('3,00');
    expect(pontosBaseParaTexto(125)).toBe('1,25');
    expect(pontosBaseParaTexto(null)).toBe('0,00');
  });
});

describe('tipo do cliente', () => {
  it('amarra pessoa física ao CPF', () => {
    expect(erroDoTipoComDocumento('pf', '52998224725')).toBeNull();
    expect(erroDoTipoComDocumento('construtora', '11222333000181')).toBeNull();
    expect(erroDoTipoComDocumento('construtora', '52998224725')).toBe(
      'CPF só com o tipo pessoa física, e pessoa física só com CPF.'
    );
    expect(erroDoTipoComDocumento('pf', '11222333000181')).not.toBeNull();
  });

  it('dá nome ao tipo', () => {
    expect(rotuloTipoCliente('pf')).toBe('Pessoa física');
    expect(rotuloTipoCliente('construtora')).toBe('Construtora');
  });
});

describe('endereço da obra', () => {
  it('formata o CEP e monta o endereço com número e bairro quando houver', () => {
    expect(formatarCep('58310000')).toBe('58310-000');
    expect(erroDoCep('58310-000')).toBeNull();
    expect(erroDoCep('5831')).toBe('O CEP tem 8 dígitos.');
    expect(erroDoCep('')).toBeNull();
    expect(enderecoDaObra({ logradouro: 'Av. Beira Mar', numero: '100', bairro: 'Intermares' })).toBe(
      'Av. Beira Mar, 100 — Intermares'
    );
    expect(enderecoDaObra({ logradouro: 'Rua A', numero: null, bairro: null })).toBe('Rua A');
  });
});
