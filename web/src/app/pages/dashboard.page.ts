import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ChamadosService } from '../core/chamados.service';
import { PRIORIDADES, Prioridade, STATUS, StatusChamado } from '../core/models';
import { PrioridadeComponent, StatusComponent } from './etiquetas.component';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, RouterLink, StatusComponent, PrioridadeComponent],
  template: `
    <h1 class="titulo">Dashboard</h1>

    @if (dados(); as d) {
      <section class="kpis">
        @for (kpi of kpis(); track kpi.rotulo) {
          <mat-card appearance="outlined">
            <mat-card-content class="kpi">
              <mat-icon>{{ kpi.icone }}</mat-icon>
              <div>
                <span class="valor">{{ kpi.valor }}</span>
                <span class="rotulo">{{ kpi.rotulo }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </section>

      <section class="graficos">
        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Por status</mat-card-title></mat-card-header>
          <mat-card-content>
            @for (s of status; track s) {
              <a class="linha" [routerLink]="['/chamados']" [queryParams]="{ status: s }">
                <app-status [status]="s" />
                <mat-progress-bar mode="determinate" [value]="percentual(d.porStatus[s])" />
                <strong>{{ d.porStatus[s] }}</strong>
              </a>
            }
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Por prioridade</mat-card-title></mat-card-header>
          <mat-card-content>
            @for (p of prioridades; track p) {
              <div class="linha">
                <app-prioridade [prioridade]="p" />
                <mat-progress-bar mode="determinate" [value]="percentual(d.porPrioridade[p])" />
                <strong>{{ d.porPrioridade[p] }}</strong>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </section>
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
  styles: `
    .titulo { font: var(--mat-sys-headline-medium); margin: 0 0 24px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .kpi { display: flex; gap: 16px; align-items: center; padding: 16px; }
    .kpi mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--mat-sys-primary); }
    .kpi div { display: flex; flex-direction: column; }
    .valor { font: var(--mat-sys-display-small); }
    .rotulo { color: var(--mat-sys-on-surface-variant); }
    .graficos { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .linha { display: grid; grid-template-columns: 170px 1fr 32px; gap: 12px; align-items: center;
      padding: 8px 0; color: inherit; text-decoration: none; }
    .linha strong { text-align: right; }
  `,
})
export class DashboardPage {
  protected readonly dados = toSignal(inject(ChamadosService).dashboard());
  protected readonly status = Object.keys(STATUS) as StatusChamado[];
  protected readonly prioridades = Object.keys(PRIORIDADES) as Prioridade[];

  protected readonly kpis = computed(() => {
    const d = this.dados();
    if (!d) return [];
    return [
      { rotulo: 'Chamados no total', valor: d.total, icone: 'confirmation_number' },
      { rotulo: 'Em aberto', valor: d.porStatus.Aberto + d.porStatus.EmAndamento + d.porStatus.AguardandoCliente, icone: 'pending_actions' },
      { rotulo: 'Sem responsável', valor: d.semResponsavel, icone: 'person_off' },
      { rotulo: 'Novos em 7 dias', valor: d.criadosUltimos7Dias, icone: 'trending_up' },
    ];
  });

  protected percentual(valor: number): number {
    const total = this.dados()?.total ?? 0;
    return total === 0 ? 0 : (valor / total) * 100;
  }
}
