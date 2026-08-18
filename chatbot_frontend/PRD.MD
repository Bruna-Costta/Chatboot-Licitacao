# PRD — Plataforma de Chatbot com IA

**Produto:** Plataforma de atendimento inteligente com IA
**Versão:** MVP / V1
**Status:** Em definição
**Owner:** Product Management

---

## 1. Contexto e Problema

Órgãos públicos (prefeituras e entidades vinculadas) enfrentam dúvidas recorrentes sobre licitações, contratações, contratos administrativos, fiscalização e envio de informações ao eSfinge/TCE-MS. Hoje essas dúvidas dependem de consulta manual a manuais, legislação e equipes de apoio, gerando lentidão e inconsistência nas respostas.

## 2. Objetivo do Produto

Disponibilizar um chatbot especializado, com IA, capaz de responder dúvidas sobre licitações, contratações, contratos, fiscalização e prestação de informações ao eSfinge/TCE-MS — com respostas contextualizadas a partir de uma triagem inicial do usuário.

## 3. Objetivos de Negócio / Métricas de Sucesso

| Objetivo                                     | Métrica sugerida                                   |
| -------------------------------------------- | -------------------------------------------------- |
| Reduzir tempo de resolução de dúvidas        | Tempo médio entre pergunta e resposta útil         |
| Aumentar adoção pelas organizações (tenants) | Nº de organizações ativas / usuários ativos        |
| Garantir qualidade das respostas             | Taxa de conversas sem necessidade de escalonamento |
| Garantir segurança multi-tenant              | Zero incidentes de vazamento cross-tenant          |

> Métricas a serem validadas com stakeholders antes do desenvolvimento.

## 4. Visão do Produto

O sistema é uma **plataforma multi-tenant de chatbot com IA**. Cada usuário pertence obrigatoriamente a uma organização (tenant), criada automaticamente no cadastro.

Fluxo de alto nível:

```
Sign Up → Organization + User → Triagem → Chat (com contexto) → Histórico
```

Na **triagem**, o sistema coleta:

- assunto da dúvida
- etapa do processo
- tipo de contratação
- natureza da dúvida
- descrição livre da necessidade

Essas informações constroem o contexto inicial da conversa, direcionam a estratégia de recuperação de conhecimento e melhoram a qualidade das respostas da IA.

O sistema mantém histórico de conversas, permitindo retomar chats anteriores.

## 5. Personas

| Persona                          | Descrição                                               | Necessidade principal                                       |
| -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Servidor público (usuário final) | Responsável por licitações/contratos em sua organização | Respostas rápidas e confiáveis sobre normas e procedimentos |
| Organização (tenant)             | Prefeitura ou entidade pública                          | Isolamento total de dados frente a outras organizações      |

## 6. Escopo do MVP

### Dentro do escopo

- Criação de conta com organização automática
- Login / logout
- Fluxo de triagem (wizard) com persistência
- Criação e continuidade de conversas
- Envio de mensagens e respostas da IA
- Histórico de conversas
- Sidebar de navegação
- Tela "Sobre nós"
- Isolamento total entre organizações

### Fora do escopo (MVP)

- Upload e administração de documentos
- Vector database / embeddings / RAG completo
- Dashboard administrativo
- Gestão de usuários da organização e roles avançadas
- Billing e analytics avançado
- Feedback e avaliação automática de respostas da IA
- Fine-tuning e agentes autônomos

> A arquitetura deve estar preparada para incorporar esses itens em versões futuras, sem retrabalho estrutural.

---

## 7. Requisitos Funcionais

### 7.1 Autenticação e Onboarding

| ID    | Requisito                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------- |
| RF-01 | Usuário deve conseguir criar conta com nome, e-mail e senha                                     |
| RF-02 | E-mail não pode ser duplicado                                                                   |
| RF-03 | Senha deve ser armazenada com hash                                                              |
| RF-04 | Uma Organization deve ser criada automaticamente no cadastro                                    |
| RF-05 | Usuário deve ser autenticado automaticamente após o cadastro                                    |
| RF-06 | Após cadastro, usuário é redirecionado para `/triage`                                           |
| RF-07 | Usuário deve conseguir fazer login e logout                                                     |
| RF-08 | Se a triagem estiver incompleta, login redireciona para `/triage`; caso contrário, para `/chat` |

**Fluxo de Sign Up:**

```
Sign Up → Criar Organization → Criar User → Vincular User↔Organization → Triage
```

**Fluxo de Sign In:**

```
Sign In → Validar credenciais → Carregar organizationId → Sessão → /chat (ou /triage se pendente)
```

### 7.2 Triagem (Wizard)

| ID    | Requisito                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| RF-09 | Triagem deve ser um wizard de múltiplas etapas, com opção de avançar/voltar                                      |
| RF-10 | Etapas: (1) Assunto, (2) Etapa do processo, (3) Tipo de contratação, (4) Natureza da dúvida, (5) Descrição livre |
| RF-11 | Campo de descrição é obrigatório (mínimo 10 / máximo 2000 caracteres)                                            |
| RF-12 | A `semanticDimension` deve ser **calculada no backend**, nunca aceita do frontend                                |
| RF-13 | Triagem possui estado `IN_PROGRESS` / `COMPLETED`, permitindo retomar de onde parou                              |
| RF-14 | Ao concluir, o sistema cria automaticamente uma Conversation vinculada à triagem                                 |

**Classificação semântica (backend):**

| Natureza da dúvida | Dimensão semântica | Fonte de conhecimento   |
| ------------------ | ------------------ | ----------------------- |
| Legislação         | NORMATIVE          | Lei nº 14.133/2021      |
| Procedimento       | OPERATIONAL        | Manuais e procedimentos |
| eSfinge            | OPERATIONAL        | Manual eSfinge          |
| Documentos         | DOCUMENTAL         | Documentos / exigências |
| Não sei            | UNCERTAIN          | Recuperação híbrida     |

### 7.3 Chat

| ID    | Requisito                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------- |
| RF-15 | Usuário deve conseguir iniciar uma nova conversa                                                |
| RF-16 | Usuário deve conseguir enviar mensagens e receber respostas da IA                               |
| RF-17 | Mensagens (usuário e assistente) devem ser persistidas                                          |
| RF-18 | Histórico deve permanecer disponível após refresh e em novos logins                             |
| RF-19 | Usuário deve conseguir reabrir conversas anteriores via sidebar                                 |
| RF-20 | O contexto da triagem deve ser enviado à IA junto com o histórico da conversa e a nova pergunta |
| RF-21 | Usuário só pode acessar conversas que pertençam a si e à sua organização                        |

**Contexto enviado à IA:**

```
SYSTEM PROMPT
+ Contexto da triagem (assunto, etapa, tipo, natureza, dimensão, descrição)
+ Histórico da conversa
+ Nova pergunta
```

### 7.4 Navegação e UI

| ID    | Requisito                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| RF-22 | Sidebar com: Logo, "+ Novo chat", Chat, "Sobre nós", Usuário, Sair                                                        |
| RF-23 | Histórico de conversas agrupado por data (Hoje, Ontem, datas anteriores)                                                  |
| RF-24 | Em telas mobile, a sidebar deve se comportar como Sheet/Drawer                                                            |
| RF-25 | Rotas protegidas (`/triage`, `/chat`, `/chat/:id`, `/about`) devem redirecionar usuários não autenticados para `/sign-in` |

---

## 8. Requisitos Não Funcionais

| ID     | Requisito                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | **Isolamento multi-tenant absoluto** — nenhuma organização pode acessar dados de outra                                           |
| RNF-02 | O `organizationId` nunca deve ser confiável quando enviado pelo frontend; deve sempre derivar da sessão autenticada              |
| RNF-03 | Acesso indevido a recurso de outra organização deve retornar `404 Not Found` (nunca revelar existência do recurso)               |
| RNF-04 | Arquitetura deve isolar o provedor de IA por trás de uma interface (`AIProvider`), permitindo troca futura sem alterar o domínio |
| RNF-05 | Camada de RAG deve ser independente e desacoplada do controller da API                                                           |
| RNF-06 | Sistema deve suportar estados de loading, erro e vazio na UI                                                                     |
| RNF-07 | Índices de banco de dados devem cobrir `organizationId` em todas as entidades multi-tenant                                       |

---

## 9. Regra de Ouro — Segurança Multi-Tenant

Toda operação protegida deve derivar o tenant da sessão do usuário autenticado, nunca de parâmetros enviados pelo cliente.

**Incorreto:**

```
GET /conversations?organizationId=123
```

**Correto:**

```ts
const user = await getCurrentUser();

const conversations = await prisma.conversation.findMany({
  where: {
    organizationId: user.organizationId,
    userId: user.id,
  },
});
```

Isso garante que, mesmo alterando o ID de uma conversa na URL, um usuário jamais acesse dados de outra organização.

---

## 10. Modelo de Dados (MVP)

```
Organization
 ├── User[]
 ├── Triage[]
 ├── Conversation[]
 └── Message[]

User
 ├── Organization
 ├── Triage[]
 └── Conversation[]

Triage
 ├── Organization
 ├── User
 └── Conversation[]

Conversation
 ├── Organization
 ├── User
 ├── Triage
 └── Message[]

Message
 ├── Organization
 └── Conversation
```

**Entidades futuras (pós-MVP):** Document, KnowledgeBase, DocumentChunk, Embedding, Citation, AIRequest, AIUsage.

### Entidades principais

**Organization** — `id, name, slug, createdAt, updatedAt`

**User** — `id, organizationId, name, email, passwordHash, createdAt, updatedAt`

**Triage** — `id, organizationId, userId, subject, processStage, contractType, doubtType, description, semanticDimension, completedAt, createdAt, updatedAt`

**Conversation** — `id, organizationId, userId, triageId, title, status (ACTIVE/ARCHIVED), createdAt, updatedAt`

**Message** — `id, conversationId, organizationId, role (USER/ASSISTANT/SYSTEM), content, metadata, createdAt`

> `metadata` de Message deve suportar futuramente: modelo utilizado, tokens, documentos recuperados, confidence, latency, citations.

**Índices recomendados:** `User.email`, `User.organizationId`, `[organizationId, userId]` em Conversation/Triage, `[organizationId, conversationId]` em Message.

---

## 11. Stack Tecnológica

| Camada         | Tecnologias                                                               |
| -------------- | ------------------------------------------------------------------------- |
| Frontend       | React, Next.js, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod |
| Backend        | ElysiaJS, Bun, TypeScript, Prisma ORM                                     |
| Banco de dados | PostgreSQL                                                                |
| Arquitetura    | Monorepo, multi-tenant, API REST (preparada para LLM/RAG)                 |

**Estrutura do monorepo:**

```
apps/
├── web/      → Next.js
└── api/      → ElysiaJS

packages/
├── ui/         → shadcn/ui + componentes compartilhados
├── database/   → Prisma + migrations
├── auth/       → autenticação/autorização
├── ai/         → abstração do provedor de IA
├── config/     → configurações compartilhadas
└── types/      → tipos compartilhados
```

**Camadas de implementação (Clean Architecture):**

```
UI → Application / Use Cases → Domain → Infrastructure
```

---

## 12. API (proposta inicial)

```
/auth
  POST /sign-up
  POST /sign-in
  POST /sign-out
  GET  /me

/triage
  GET   /
  POST  /
  PATCH /:id

/conversations
  GET    /
  POST   /
  GET    /:id
  DELETE /:id

/conversations/:id/messages
  GET  /
  POST /

/about
  GET /
```

## 13. Rotas Frontend

```
app/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
├── (protected)/
│   ├── layout.tsx      # autentica, carrega organizationId, renderiza Sidebar
│   ├── triage/
│   ├── chat/
│   │   └── [conversationId]/
│   └── about/
└── api/
```

---

## 14. Critérios de Aceite

### Sign Up

- [ ] Cadastro com nome, e-mail e senha; e-mail único; senha com hash
- [ ] Organization criada automaticamente e vinculada ao User
- [ ] Usuário autenticado e redirecionado para `/triage`

### Triagem

- [ ] Fluxo em etapas, com avanço/retorno
- [ ] Respostas persistidas; descrição obrigatória
- [ ] Dimensão semântica calculada no backend
- [ ] Triagem vinculada a usuário e organização
- [ ] Conversation criada ao final; usuário direcionado ao chat

### Chat

- [ ] Criação de novo chat e envio de mensagens
- [ ] Mensagens (usuário e IA) persistidas
- [ ] Histórico sobrevive a refresh; conversas anteriores reabríveis
- [ ] Usuário acessa somente seus próprios chats
- [ ] Contexto da triagem utilizado na conversa

### Multi-Tenant

- [ ] Usuário da Organização A não acessa recursos da Organização B
- [ ] Tentativa de acesso cross-tenant retorna `404`, nunca `200` com dados de outro tenant

---

## 15. Definition of Done — MVP

O MVP está pronto quando o fluxo abaixo funciona ponta a ponta:

1. Usuário acessa `/sign-up` e cria Organization + User
2. Sistema autentica e redireciona para `/triage`
3. Usuário completa todas as etapas da triagem
4. Sistema persiste a Triage e calcula `semanticDimension`
5. Sistema cria Conversation e redireciona para `/chat/:id`
6. Usuário envia uma pergunta
7. API recupera usuário, organização, triagem e histórico
8. API envia contexto completo para a IA e recebe resposta
9. Mensagens de usuário e assistente são persistidas
10. Conversa aparece no histórico da sidebar
11. Usuário faz logout e login novamente, mantendo o histórico
12. Usuário **não** consegue acessar dados de outra organização

---

## 16. Roadmap (Sprints)

| Sprint             | Foco                                                                            | Resultado esperado                                   |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1 — Fundação       | Monorepo, Next.js, ElysiaJS, Prisma, PostgreSQL, shadcn, Tailwind, lint/format  | Projeto rodando localmente (front + API + banco)     |
| 2 — Auth + Tenant  | Sign Up/In/Out, Session, Organization, User, rotas protegidas                   | Usuário cria conta e acessa área autenticada         |
| 3 — Triagem        | Wizard, persistência, validação, classificação semântica                        | Usuário conclui triagem e chega ao chat com contexto |
| 4 — Chat           | Conversation, Message, Sidebar, histórico, integração com LLM                   | Chat funcional e persistente                         |
| 5 — Segurança + UX | Isolamento de tenant, loading/error/empty states, responsividade, rate limiting | MVP utilizável e seguro                              |

## 17. Backlog Inicial (por Épico)

- **Epic 01 — Foundation:** setup de monorepo, Bun, Next.js, ElysiaJS, Prisma, PostgreSQL, Tailwind, shadcn, TypeScript, lint/format
- **Epic 02 — Authentication:** User, Organization, Sign Up/In/Out, Session, rotas protegidas
- **Epic 03 — Triage:** modelo, wizard, progress indicator, 5 perguntas, classificação semântica, persistência
- **Epic 04 — Chat:** Conversation, Message, Sidebar, lista de conversas, novo chat, tela de chat, input, integração com IA, persistência
- **Epic 05 — Multi-Tenancy:** middleware de tenant, autorização, query scoping, testes de segurança e de acesso cross-tenant
- **Epic 06 — UX:** loading/empty/error states, toasts, sidebar mobile, chat responsivo, skeletons

---

## 18. Decisões Arquiteturais (ADRs resumidos)

| Decisão                                                     | Racional                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Organization criada automaticamente no cadastro             | Nenhum usuário deve existir sem tenant (`organizationId` obrigatório)                        |
| `organizationId` replicado em todas as entidades de domínio | Mesmo quando inferível via relacionamento — facilita segurança, queries, auditoria e índices |
| Tenant sempre obtido da sessão, nunca do frontend           | Previne manipulação de `organizationId` pelo cliente                                         |
| Triagem vinculada à conversa                                | Permite que conversas futuras tenham contextos distintos                                     |
| IA acessada via interface (`AIProvider`)                    | Evita acoplamento a um provedor específico (OpenAI, Anthropic, etc.)                         |
| RAG como camada independente do controller                  | Mantém a lógica de recuperação desacoplada da API, facilitando evolução                      |

## 19. Visão de Arquitetura de IA (futuro)

```
Pergunta → Triagem → Classificação semântica → Query
  → Busca híbrida (Full Text + Vector Search + Metadata Filtering)
  → Documentos relevantes → LLM → Resposta + Fontes
```

Preparar o `packages/ai` para múltiplos providers:

```ts
interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>
}
```

## 20. Riscos e Dependências

| Risco                                                 | Mitigação                                                 |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Qualidade das respostas da IA sem RAG completo no MVP | Contexto rico via triagem; roadmap claro para RAG pós-MVP |
| Falha no isolamento multi-tenant                      | Testes automatizados de acesso cross-tenant no Epic 05    |
| Escolha de provedor de IA impactar arquitetura        | Abstração `AIProvider` desde o início                     |
| Escopo crescer além do MVP                            | Lista explícita de itens fora de escopo (seção 6)         |

---

## 21. Abertos / Pontos a Validar com Stakeholders

- Métricas de sucesso e metas quantitativas (seção 3)
- Provedor de IA a ser utilizado no MVP (OpenAI, Anthropic, outro)
- Política de retenção de dados e LGPD para conversas
- SLA de resposta da IA
- Necessidade de rate limiting por organização vs. por usuário
