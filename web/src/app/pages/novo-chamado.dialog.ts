import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ChamadosService, mensagemDeErro } from '../core/chamados.service';
import { PRIORIDADES, Prioridade } from '../core/models';

@Component({
  selector: 'app-novo-chamado',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Novo chamado</h2>
    <form [formGroup]="form" (ngSubmit)="salvar()">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Cliente</mat-label>
          <mat-select formControlName="clienteId">
            @for (c of clientes() ?? []; track c.id) {
              <mat-option [value]="c.id">{{ c.nome }} · {{ c.email }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Título</mat-label>
          <input matInput formControlName="titulo" maxlength="150" />
          <mat-hint align="end">{{ form.controls.titulo.value.length }}/150</mat-hint>
          @if (form.controls.titulo.hasError('minlength')) {
            <mat-error>Use pelo menos 5 caracteres.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Prioridade</mat-label>
          <mat-select formControlName="prioridade">
            @for (p of prioridades; track p) {
              <mat-option [value]="p">{{ rotulos[p].rotulo }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="descricao" rows="5"></textarea>
        </mat-form-field>
        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || salvando()">Abrir chamado</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    .erro { color: var(--mat-sys-error); }
  `,
})
export class NovoChamadoDialog {
  private readonly service = inject(ChamadosService);
  private readonly ref = inject(MatDialogRef<NovoChamadoDialog, string>);

  protected readonly clientes = toSignal(this.service.usuarios('Cliente'));
  protected readonly prioridades = Object.keys(PRIORIDADES) as Prioridade[];
  protected readonly rotulos = PRIORIDADES;
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    clienteId: ['', Validators.required],
    titulo: ['', [Validators.required, Validators.minLength(5)]],
    prioridade: ['Media' as Prioridade, Validators.required],
    descricao: ['', Validators.required],
  });

  protected salvar(): void {
    this.salvando.set(true);
    this.service.criar(this.form.getRawValue()).subscribe({
      next: ({ id }) => this.ref.close(id),
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}
