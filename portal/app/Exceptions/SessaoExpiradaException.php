<?php

namespace App\Exceptions;

use RuntimeException;

/** A API recusou o token (expirado ou inválido): o cliente precisa entrar de novo. */
final class SessaoExpiradaException extends RuntimeException
{
}
