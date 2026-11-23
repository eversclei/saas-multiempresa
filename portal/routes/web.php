<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChamadoController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [AuthController::class, 'formulario'])->name('login');
Route::post('/login', [AuthController::class, 'entrar'])->middleware('throttle:10,1')->name('login.entrar');
Route::post('/sair', [AuthController::class, 'sair'])->name('sair');

Route::middleware('api.auth')->group(function () {
    Route::redirect('/', '/chamados');
    Route::get('/chamados', [ChamadoController::class, 'index'])->name('chamados.index');
    Route::get('/chamados/novo', [ChamadoController::class, 'create'])->name('chamados.create');
    Route::post('/chamados', [ChamadoController::class, 'store'])->name('chamados.store');
    Route::get('/chamados/{id}', [ChamadoController::class, 'show'])->whereUuid('id')->name('chamados.show');
    Route::post('/chamados/{id}/comentarios', [ChamadoController::class, 'comentar'])->whereUuid('id')->name('chamados.comentar');
});
