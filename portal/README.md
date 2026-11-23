# Portal do Cliente (Laravel)

Parte do projeto [SaaS Multiempresa](../README.md). É o portal onde o cliente final abre e acompanha os chamados de suporte.

- **Laravel 13** (PHP 8.4) consumindo a API .NET pelo cliente HTTP do Laravel (`App\Services\SaasApi`)
- **Material Web** (componentes Material 3 do Google) nas telas Blade
- O token JWT do cliente fica na **sessão do servidor** e não vai para o navegador
- Erros da API viram mensagens na tela: 400 vira erro de validação, 409 vira regra de negócio, 401 encerra a sessão

## Rodar só o portal

```bash
composer install
cp .env.example .env && php artisan key:generate
# SAAS_API_URL no .env aponta para a API (padrão: http://localhost:5080)
php artisan serve --port=8000
php artisan test    # 9 testes com a API simulada (Http::fake)
```

Para subir tudo junto (API, painel e portal), use o `docker compose up` na raiz do projeto.
