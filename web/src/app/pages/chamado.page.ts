import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { ChamadosService, mensagemDeErro } from '../core/chamados.service';
import { STATUS, StatusChamado } from '../core/models';
import { PrioridadeComponent, StatusComponent } from './etiquetas.component';

@Component({
  selector: 'app-chamado',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDividerModule,
    MatProgressBarModule,
    StatusComponent,
    PrioridadeComponent,
  ],
  template: `
    <a mat-button routerLink="/chamados"><mat-icon>arrow_back</mat-icon> Voltar</a>

    @if (chamado.value(); as c) {
      <div class="grade">
        <section>
          <mat-card appearance="outlined">
            <mat-card-header>
              <mat-card-title>{{ c.titulo }}</mat-card-title>
              <mat-card-subtitle>Aberto por {{ c.cliente.nome }} em {{ c.criadoEm | date: 'dd/MM/yyyy HH:mm' }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="descricao">{{ c.descricao }}</p>
            </mat-card-content>
          </mat-card>

          <h2>Conversa</h2>
          @for (m of c.comentarios; track m.id) {
            <mat-card appearance="outlined" class="comentario" [class.interno]="m.interno">
              <mat-card-content>
                <div class="autor">
                  <mat-icon>{{ m.interno ? 'lock' : 'chat' }}</mat-icon>
                  <strong>{{ m.autor.nome }}</strong>
                  <small>{{ m.criadoEm | date: 'dd/MM/yyyy HH:mm' }}{{ m.interno ? ' · nota interna' : '' }}</small>
                </div>
                <p>{{ m.texto }}</p>
              </mat-card-content>
            </mat-card>
          } @empty {
            <p class="vazio">Nenhum comentário ainda.</p>
          }

          @if (c.status !== 'Fechado') {
            <mat-card appearance="outlined">
              <mat-card-content>
                <mat-form-field appearance="outline" class="cheio">
                  <mat-label>Responder</mat-label>
                  <textarea matInput rows="3" [(ngModel)]="texto"></textarea>
                </mat-form-field>
                <div class="acoes-comentario">
                  <mat-checkbox [(ngModel)]="interno">Nota interna (cliente não vê)</mat-checkbox>
                  <button mat-flat-button [disabled]="!texto.trim() || ocupado()" (click)="comentar(c.id)">
                    <mat-icon>send</mat-icon> Enviar
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </section>

        <aside>
          <mat-card appearance="outlined">
            <mat-card-content class="painel">
              <div><span class="legenda">Status</span><app-status [status]="c.status" /></div>
              <div><span class="legenda">Prioridade</span><app-prioridade [prioridade]="c.prioridade" /></div>
              <mat-divider />
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Responsável</mat-label>
                <mat-select [value]="c.responsavel?.id" (selectionChange)="atribuir(c.id, $event.value)"
                            [disabled]="c.status === 'Fechado' || ocupado()">
                  @for (u of equipe() ?? []; track u.id) {
                    <mat-option [value]="u.id">{{ u.nome }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (c.proximosStatus.length) {
                <span class="legenda">Mover para</span>
                @for (s of c.proximosStatus; track s) {
                  <button mat-stroked-button [disabled]="ocupado()" (click)="mudarStatus(c.id, s)">
                    {{ rotulos[s].rotulo }}
                  </button>
                }
              }
            </mat-card-content>
          </mat-card>
        </aside>
      </div>
    } @else if (chamado.error()) {
      <p class="vazio">Chamado não encontrado.</p>
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
  styles: `
    .grade { display: grid; grid-template-columns: 1fr 300px; gap: 16px; margin-top: 8px; }
    @media (max-width: 900px) { .grade { grid-template-columns: 1fr; } }
    section { display: flex; flex-direction: column; gap: 12px; }
    h2 { font: var(--mat-sys-title-medium); margin: 12px 0 0; }
    .descricao { white-space: pre-line; }
    .comentario.interno { background: var(--mat-sys-tertiary-container); }
    .autor { display: flex; gap: 8px; align-items: center; }
    .autor small, .legenda, .vazio { color: var(--mat-sys-on-surface-variant); }
    .cheio { width: 100%; }
    .acoes-comentario { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .painel { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .painel > div { display: flex; justify-content: space-between; align-items: center; }
    .legenda { font: var(--mat-sys-label-large); }
  `,
})
export class ChamadoPage {
  private readonly service = inject(ChamadosService);
  private readonly snack = inject(MatSnackBar);

  /** Vem da rota (/chamados/:id) via withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly chamado = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.service.obter(params),
  });
  protected readonly equipe = toSignal(
    this.service.usuarios().pipe(map((usuarios) => usuarios.filter((u) => u.papel !== 'Cliente'))),
  );
  protected readonly rotulos = STATUS;
  protected readonly ocupado = signal(false);
  protected texto = '';
  protected interno = false;

  protected mudarStatus(id: string, status: StatusChamado): void {
    this.executar(this.service.alterarStatus(id, status), `Chamado movido para "${STATUS[status].rotulo}".`);
  }

  protected atribuir(id: string, responsavelId: string): void {
    this.executar(this.service.atribuir(id, responsavelId), 'Responsável atualizado.');
  }

  protected comentar(id: string): void {
    this.executar(this.service.comentar(id, this.texto.trim(), this.interno), 'Comentário enviado.', () => {
      this.texto = '';
      this.interno = false;
    });
  }

  private executar(acao: Observable<unknown>, sucesso: string, depois?: () => void): void {
    this.ocupado.set(true);
    acao.subscribe({
      next: () => {
        this.ocupado.set(false);
        depois?.();
        this.snack.open(sucesso, 'OK', { duration: 3000 });
        this.chamado.reload();
      },
      error: (e) => {
        this.ocupado.set(false);
        this.snack.open(mensagemDeErro(e), 'Fechar', { duration: 5000 });
        this.chamado.reload();
      },
    });
  }
}
