import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PRIORIDADES, Prioridade, STATUS, StatusChamado } from '../core/models';

/** Etiqueta visual de status do chamado. */
@Component({
  selector: 'app-status',
  imports: [MatIconModule],
  template: `<span class="etiqueta" [class]="status()"><mat-icon>{{ info().icone }}</mat-icon>{{ info().rotulo }}</span>`,
  styleUrl: './etiquetas.scss',
})
export class StatusComponent {
  readonly status = input.required<StatusChamado>();
  protected readonly info = computed(() => STATUS[this.status()]);
}

/** Etiqueta visual de prioridade do chamado. */
@Component({
  selector: 'app-prioridade',
  imports: [MatIconModule],
  template: `<span class="etiqueta" [class]="'p-' + prioridade()"><mat-icon>{{ info().icone }}</mat-icon>{{ info().rotulo }}</span>`,
  styleUrl: './etiquetas.scss',
})
export class PrioridadeComponent {
  readonly prioridade = input.required<Prioridade>();
  protected readonly info = computed(() => PRIORIDADES[this.prioridade()]);
}
