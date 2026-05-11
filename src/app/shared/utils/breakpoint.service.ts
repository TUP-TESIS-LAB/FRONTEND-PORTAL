import { Injectable, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly bp = inject(BreakpointObserver);

  isMobile = toSignal(
    this.bp.observe('(max-width: 1023px)').pipe(map(r => r.matches)),
    { initialValue: false },
  );

  isDesktop = toSignal(
    this.bp.observe('(min-width: 1024px)').pipe(map(r => r.matches)),
    { initialValue: false },
  );
}
