# CLAUDE.md

Este arquivo orienta o Claude Code ao trabalhar neste repositório.

## Visão geral do projeto

Plataforma **multi-tenant de chatbot com IA** para atendimento a dúvidas sobre licitações, contratações, contratos administrativos, fiscalização e envio de informações ao eSfinge/TCE-MS.

Fluxo central do produto:

```
Sign Up → Organization + User → Triagem (wizard) → Conversation → Chat com IA → Histórico
```

Todo usuário pertence obrigatoriamente a uma `Organization` (tenant). Isolamento entre organizações é um requisito crítico e não negociável — ver seção "Regra de Ouro" abaixo.

## Stack tecnológica

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod
- **Backend:** ElysiaJS, Bun, TypeScript, Prisma ORM
- **Banco:** PostgreSQL
- **Arquitetura:** Monorepo, multi-tenant, API REST (preparada para LLM/RAG)

## Estrutura do monorepo

```
apps/
├── web/      → Next.js (frontend)
└── api/      → ElysiaJS (backend)

packages/
├── ui/         → shadcn/ui + componentes compartilhados
├── database/   → Prisma + migrations
├── auth/       → autenticação/autorização
├── ai/         → abstração do provedor de IA (AIProvider)
├── config/     → configurações compartilhadas
└── types/      → tipos compartilhados
```

## Camadas de implementação

Seguir Clean Architecture em todo código de domínio/aplicação:

```
UI → Application / Use Cases → Domain → Infrastructure
```

- **UI:** páginas, componentes, formulários, estados visuais, chamadas à API
- **Application:** casos de uso (`CreateUser`, `CreateOrganization`, `CompleteTriage`, `CreateConversation`, `SendMessage`, `GetConversationHistory`)
- **Domain:** regras de negócio (`User`, `Organization`, `Triage`, `Conversation`, `Message`, `SemanticDimension`)
- **Infrastructure:** Prisma, PostgreSQL, Auth, LLM Provider, APIs externas

Não colocar lógica de negócio em controllers da API nem em componentes de UI.

## ⚠️ Regra de Ouro — Segurança Multi-Tenant

**Nunca confiar no `organizationId` enviado pelo frontend.** O tenant sempre deve ser derivado da sessão do usuário autenticado.

```ts
// ❌ ERRADO
GET /conversations?organizationId=123

// ✅ CORRETO
const user = await getCurrentUser();

const conversations = await prisma.conversation.findMany({
  where: {
    organizationId: user.organizationId,
    userId: user.id,
  },
});
```

Regras obrigatórias em toda query/mutação sobre entidades multi-tenant (`Conversation`, `Message`, `Triage`, `User`):

- Filtrar sempre por `organizationId` da sessão, mesmo quando o relacionamento permitiria inferir o tenant.
- Acesso a recurso de outra organização deve retornar `404 Not Found` — nunca `200` com dados de outro tenant, e nunca revelar que o recurso existe.
- Escrever/atualizar teste de isolamento cross-tenant para toda nova rota que toque essas entidades.

Ao implementar qualquer endpoint ou query nova, sempre perguntar: "esta query está escopada por `organizationId` da sessão?"

## Modelo de dados (MVP)

```
Organization
 ├── User[]
 ├── Triage[]
 ├── Conversation[]
 └── Message[]

User        → Organization, Triage[], Conversation[]
Triage      → Organization, User, Conversation[]
Conversation→ Organization, User, Triage, Message[]
Message     → Organization, Conversation
```

- `Triage.semanticDimension` (enum `NORMATIVE | OPERATIONAL | DOCUMENTAL | UNCERTAIN`) **sempre calculado no backend**, nunca aceito do cliente.
- `Triage.status`: `IN_PROGRESS | COMPLETED`.
- `Conversation.status`: `ACTIVE | ARCHIVED`.
- `Message.role`: `USER | ASSISTANT | SYSTEM`.
- Índices obrigatórios: `User.email`, `User.organizationId`, `[organizationId, userId]` em Conversation/Triage, `[organizationId, conversationId]` em Message.

Entidades futuras (não implementar ainda, mas não quebrar a extensibilidade): `Document`, `KnowledgeBase`, `DocumentChunk`, `Embedding`, `Citation`, `AIRequest`, `AIUsage`.

## Camada de IA

A API nunca deve chamar um provedor de IA diretamente — sempre passar pela abstração em `packages/ai`:

```ts
interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>
}
```

Contexto enviado à IA em cada mensagem deve incluir, nesta ordem:

1. System prompt
2. Contexto da triagem (assunto, etapa, tipo de contratação, natureza da dúvida, dimensão semântica, descrição)
3. Histórico da conversa
4. Nova pergunta

A lógica de RAG (quando implementada) deve viver em uma camada própria (`Context Builder → Retriever → AI`), nunca dentro do controller.

## API — rotas de referência

```
/auth        POST /sign-up | /sign-in | /sign-out   GET /me
/triage      GET / | POST / | PATCH /:id
/conversations   GET / | POST / | GET /:id | DELETE /:id
/conversations/:id/messages   GET / | POST /
/about       GET /
```

## Rotas frontend (Next.js)

```
app/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
├── (protected)/
│   ├── layout.tsx      # autentica, carrega organizationId, renderiza Sidebar
│   ├── triage/
│   ├── chat/[conversationId]/
│   └── about/
└── api/
```

Todas as rotas em `(protected)` exigem sessão válida; sem sessão, redirecionar para `/sign-in`.

## Convenções de UI

- Usar **shadcn/ui** como base; evitar recriar componentes que já existem no design system (Button, Input, Textarea, Card, Badge, Dialog, Sheet, Skeleton, Alert, RadioGroup, Progress, etc.).
- Sidebar vira `Sheet`/`Drawer` em mobile.
- Componentes de domínio ficam em nomes específicos, ex.: `ChatSidebar`, `ChatMessage`, `ChatInput`, `ConversationList`, `TriageWizard`, `TriageStep`, `SignInForm`, `SignUpForm`.
- Sempre tratar estados de loading, erro e vazio.

## Escopo do MVP — não implementar sem alinhamento

Fora de escopo por enquanto: upload/administração de documentos, vector database, embeddings, RAG completo, dashboard administrativo, gestão avançada de usuários/roles, billing, analytics avançado, avaliação automática de respostas, fine-tuning, agentes autônomos. A arquitetura deve permanecer aberta a essas features, mas não implementá-las preventivamente.

## Checklist antes de abrir PR / considerar tarefa concluída

- [ ] Toda query/mutação sobre dado multi-tenant está escopada por `user.organizationId` da sessão (não por input do cliente)?
- [ ] Endpoints protegidos validam autenticação?
- [ ] Chamadas à IA passam pela interface `AIProvider`, nunca diretamente pelo SDK do provedor?
- [ ] Componentes novos reutilizam shadcn/ui quando aplicável?
- [ ] Estados de loading/erro/vazio cobertos na UI?
- [ ] Testes de isolamento cross-tenant adicionados/atualizados quando a mudança toca `Conversation`, `Message`, `Triage` ou `User`?
