import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { TerminosYCondicionesComponent } from './terminos-y-condiciones.component';
import { TenantService } from '../../../core/tenant/tenant.service';

describe('TerminosYCondicionesComponent', () => {
  let injector: Injector;

  function configure(config: unknown) {
    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: { config: signal(config) } },
      ],
    });
    injector = TestBed.inject(Injector);
  }

  it('usa el nombre del tenant activo en el título, no un valor hardcodeado', () => {
    configure({ id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo', contact: {} });
    const cmp = runInInjectionContext(injector, () => new TerminosYCondicionesComponent());
    expect(cmp.content().header.title).toContain('Laboratorio Demo');
    expect(cmp.content().header.title).not.toContain('Castillo Chidiak');
  });

  it('incluye el mail de contacto del tenant en la sección de derechos ARCO cuando está configurado', () => {
    configure({
      id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo',
      contact: { helpEmail: 'contacto@labdemo.test' },
    });
    const cmp = runInInjectionContext(injector, () => new TerminosYCondicionesComponent());
    const contactSection = cmp.content().sections
      .find(s => s.title.startsWith('11.'))!
      .content.map(item => (item.type === 'paragraph' ? item.text : ''))
      .join(' ');
    expect(contactSection).toContain('contacto@labdemo.test');
  });

  it('no rompe si el tenant todavía no cargó (config null)', () => {
    configure(null);
    const cmp = runInInjectionContext(injector, () => new TerminosYCondicionesComponent());
    expect(cmp.content().header.title).toContain('el laboratorio');
  });
});
