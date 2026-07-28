import { describe, it, expect } from 'vitest';
import { FAQ_CATEGORIES } from './ayuda.content';

describe('FAQ_CATEGORIES', () => {
  it('tiene 4 categorías con 3 preguntas cada una', () => {
    expect(FAQ_CATEGORIES).toHaveLength(4);
    for (const cat of FAQ_CATEGORIES) {
      expect(cat.items).toHaveLength(3);
    }
  });

  it('expone solo la categoría de cuenta al usuario deslogueado', () => {
    const publicas = FAQ_CATEGORIES.filter(c => c.publicVisible);
    expect(publicas.map(c => c.id)).toEqual(['cuenta']);
  });

  it('usa ids únicos', () => {
    const ids = FAQ_CATEGORIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // El repo de referencia (2025-P4-FE/patient-portal) guardaba las respuestas con
  // <b style="..."> y las inyectaba con bypassSecurityTrustHtml + [innerHTML].
  // Acá se renderizan con interpolación: si vuelve el HTML, el texto se vería crudo.
  it('guarda las respuestas como texto plano, sin HTML', () => {
    for (const cat of FAQ_CATEGORIES) {
      for (const item of cat.items) {
        expect(item.answer).not.toMatch(/[<>]/);
        expect(item.question).not.toMatch(/[<>]/);
      }
    }
  });

  it('cierra cada pregunta con signo de interrogación o punto', () => {
    for (const cat of FAQ_CATEGORIES) {
      for (const item of cat.items) {
        expect(item.question.trim()).toMatch(/[?.]$/);
        expect(item.answer.trim().length).toBeGreaterThan(40);
      }
    }
  });
});
