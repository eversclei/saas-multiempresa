import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChamadosService, FiltroChamados } from '../core/chamados.service';
import { ChamadoResumo, Pagina, PRIORIDADES, Prioridade, STATUS, StatusChamado } from '../core/models';
import { PrioridadeComponent, StatusComponent } from './etiquetas.component';
import { NovoChamadoDialog } from './novo-chamado.dialog';

@Component({
  selector: 'app-chamados',
  imports: [
    DatePipe,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    StatusComponent,
    PrioridadeComponent,
  ],
  template: `
    <header class="cabecalho">
      <h1>Chamados</h1>
      <button mat-flat-button (click)="novo()"><mat-icon>add</mat-icon> Novo chamado</button>
    </header>

    <mat-card appearance="outlined">
      <div class="filtros">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Buscar pelo título</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="busca()" (ngModelChange)="busca.set($event); pagina.set(1)" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Status</mat-label>
          <mat-select [ngModel]="status()" (ngModelChange)="status.set($event); pagina.set(1)">
            <mat-option [value]="null">Todos</mat-option>
            @for (s of opcoesStatus; track s) {
              <mat-option [value]="s">{{ rotuloStatus[s].rotulo }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Prioridade</mat-label>
          <mat-select [ngModel]="prioridade()" (ngModelChange)="prioridade.set($event); pagina.set(1)">
            <mat-option [value]="null">Todas</mat-option>
            @for (p of opcoesPrioridade; track p) {
              <mat-option [value]="p">{{ rotuloPrioridade[p].rotulo }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (carregando()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <div class="tabela">
        <table mat-table [dataSource]="resultado()?.itens ?? []">
          <ng-container matColumnDef="titulo">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let c"><strong>{{ c.titulo }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let c">{{ c.cliente.nome }}</td>
          </ng-container>
          <ng-container matColumnDef="prioridade">
            <th mat-header-cell *matHeaderCellDef>Prioridade</th>
            <td mat-cell *matCellDef="let c"><app-prioridade [prioridade]="c.prioridade" /></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let c"><app-status [status]="c.status" /></td>
          </ng-container>
          <ng-container matColumnDef="responsavel">
            <th mat-header-cell *matHeaderCellDef>Responsável</th>
            <td mat-cell *matCellDef="let c">{{ c.responsavel?.nome ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Aberto em</th>
            <td mat-cell *matCellDef="let c">{{ c.criadoEm | date: 'dd/MM/yyyy HH:mm' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let c; columns: colunas" class="clicavel" (click)="abrir(c)"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vazio" [attr.colspan]="colunas.length">Nenhum chamado encontrado.</td>
          </tr>
        </table>
      </div>

      <mat-paginator [length]="resultado()?.total ?? 0" [pageIndex]="pagina() - 1" [pageSize]="tamanho()"
                     [pageSizeOptions]="[10, 20, 50]" (page)="mudarPagina($event)" />
    </mat-card>
  `,
  styles: `
    .cabecalho { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
    .cabecalho h1 { font: var(--mat-sys-headline-medium); margin: 0; }
    .filtros { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; padding: 16px; }
    @media (max-width: 720px) { .filtros { grid-template-columns: 1fr; } }
    .tabela { overflow-x: auto; }
    table { width: 100%; min-width: 760px; }
    .clicavel { cursor: pointer; }
    .clicavel:hover { background: var(--mat-sys-surface-container-high); }
    .vazio { padding: 24px; text-align: center; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class ChamadosPage {
  private readonly service = inject(ChamadosService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly colunas = ['titulo', 'cliente', 'prioridade', 'status', 'responsavel', 'criadoEm'];
  protected readonly rotuloStatus = STATUS;
  protected readonly rotuloPrioridade = PRIORIDADES;
  protected readonly opcoesStatus = Object.keys(STATUS) as StatusChamado[];
  protected readonly opcoesPrioridade = Object.keys(PRIORIDADES) as Prioridade[];

  protected readonly busca = signal('');
  protected readonly status = signal<StatusChamado | null>(
    (this.params()?.get('status') as StatusChamado | null) ?? null,
  );
  protected readonly prioridade = signal<Prioridade | null>(null);
  protected readonly pagina = signal(1);
  protected readonly tamanho = signal(10);
  protected readonly resultado = signal<Pagina<ChamadoResumo> | null>(null);
  protected readonly carregando = signal(false);

  constructor() {
    // Recarrega quando um filtro ou a página mudar; espera 300 ms para não chamar a API a cada tecla.
    effect((onCleanup) => {
      const filtro: FiltroChamados = {
        busca: this.busca(),
        status: this.status(),
        prioridade: this.prioridade(),
        pagina: this.pagina(),
        tamanho: this.tamanho(),
      };
      let assinatura: Subscription | undefined;
      const espera = setTimeout(() => {
        this.carregando.set(true);
        assinatura = this.service.listar(filtro).subscribe({
          next: (r) => {
            this.resultado.set(r);
            this.carregando.set(false);
          },
          error: () => this.carregando.set(false),
        });
      }, 300);
      onCleanup(() => {
        clearTimeout(espera);
        assinatura?.unsubscribe();
      });
    });
  }

  protected mudarPagina(e: PageEvent): void {
    this.tamanho.set(e.pageSize);
    this.pagina.set(e.pageIndex + 1);
  }

  protected abrir(c: ChamadoResumo): void {
    this.router.navigate(['/chamados', c.id]);
  }

  protected novo(): void {
    this.dialog
      .open(NovoChamadoDialog, { width: '560px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((id?: string) => {
        if (id) this.router.navigate(['/chamados', id]);
      });
  }
}
