# EduControl — Sistema de Controle de Faltas dos Alunos

Sistema modular, seguro e preparado para crescimento para a Secretaria Municipal de Educação. Permite que cada escola acesse **apenas** os alunos de sua unidade, registre faltas e envie para análise administrativa.

## Stack

- **React 19** + **TypeScript** + **Vite** — Single Page Application
- **Tailwind CSS 4** — interface responsiva e acessível
- **Supabase (PostgreSQL)** — banco de dados, autenticação e autorização
- **Supabase Auth** — login por e-mail/senha (e OAuth no futuro)
- **Row Level Security (RLS)** — segurança no nível do banco, via políticas PostgreSQL
- **GitHub** + **Vercel** — versionamento e publicação contínua

## Arquitetura de Segurança

A segurança **não** depende do frontend. Toda a autorização é feita via **RLS no PostgreSQL**:

- Usuário `ESCOLA` só vê/edita dados da sua própria escola (`escola_id`).
- Usuário `ADMIN` tem acesso a todas as escolas.
- A identidade do usuário vem de `auth.uid()` (Supabase Auth), unida à tabela `usuarios` para resolver o `perfil` e `escola_id`.

Veja as políticas em `supabase/migrations/002_rls_policies.sql`.

## Perfis

| Perfil    | Acesso                                                        |
| --------- | ------------------------------------------------------------- |
| **ADMIN** | Todas as escolas, alunos, faltas, envios, importação de PDF   |
| **ESCOLA**| Apenas os dados da sua escola. Registra e envia faltas        |

## Desenvolvimento Local

```bash
pnpm install
pnpm check     # typecheck
pnpm dev       # Vite dev server
```

### Configurar Supabase local

1. Crie um projeto no [Supabase](https://supabase.com).
2. Copie `.env.example` para `.env`:

```bash
cp .env.example .env
# edite e adicione sua URL e anon key
```

3. Rode as migrations no SQL Editor do Supabase:
   - `supabase/migrations/001_create_tables.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/seed.sql`

4. Crie usuários de teste:
   - No Supabase Auth, crie um usuário com `email`/`password`.
   - Insira um registro em `usuarios` ligando `auth_user_id` ao UUID do usuário criado.

## Navegação

### Admin
```
/admin/dashboard       — Visão geral da rede
/admin/escolas         — Listagem e gestão de escolas
/admin/usuarios        — Usuários do sistema (ADMIN / ESCOLA)
/admin/alunos          — Todos os alunos com filtros
/admin/importar-pdf    — Importar e validar alunos por PDF
/admin/faltas          — Filtros avançados de faltas
/admin/envios          — Análise e aprovação de envios
/admin/relatorios      — Indicadores e estatísticas
```

### Escola
```
/escola/dashboard      — Visão geral da unidade
/escola/turmas         — Turmas e alunos da escola
/escola/alunos         — Lista de alunos com busca e registro de faltas
/escola/faltas         — Histórico de faltas da escola
/escola/envios         — Envio de faltas para análise
```

## Importação de PDF

O parser (`shared/pdfParser.ts`) processa o PDF no cliente:
1. Identifica a escola pelo cabeçalho `Escola:`;
2. Separa blocos de aluno (número + nome → INEP → turma → matrícula → data);
3. Extrai filiações, responsável, telefones, endereço;
4. Valida e marca duplicidades (`escola_id + matricula` / `escola_id + inep`);
5. Nada é salvo antes da confirmação explícita do administrador.

## Publicação (Vercel)

Configure as Environment Variables na Vercel:

| Variável                 | Valor                          |
|--------------------------|--------------------------------|
| `VITE_SUPABASE_URL`      | URL do projeto Supabase        |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima pública          |

> **Nunca** adicione `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Banco de Dados

Migrations em `supabase/migrations/`. Seed inicial com as 19 escolas em `supabase/migrations/seed.sql`.
