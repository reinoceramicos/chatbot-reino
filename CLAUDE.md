# CLAUDE.md

This file defines **non-negotiable rules** for Claude when working in this repository.
If a change violates these rules, it must not be implemented.

---

## Project Overview

WhatsApp chatbot and multi-level agent management system for Reino Cerámicos.

The system:
- Automatically handles customer conversations
- Executes predefined conversation flows
- Escalates to human agents with strict role-based visibility
- Uses real-time updates via WebSockets

---

## Architectural Style

**Clean Architecture + Hexagonal (Ports & Adapters) + Screaming Architecture**

This is not optional.

### Core rules
- Business rules **must not depend** on:
  - NestJS
  - Prisma
  - HTTP
  - Controllers
  - Framework decorators
  - External APIs
- Dependencies always point **inward**.
- The folder structure must **scream business intent**, not technology.

---

## Module Structure (Screaming Architecture)

src/
├── chatbot/ # Bot intelligence & business rules
├── agents/ # Agent lifecycle, roles, assignment rules
├── messaging/ # Outbound messaging (WhatsApp)
├── webhook/ # Inbound message handling
└── shared/ # Truly cross-cutting concerns only


### Each module must follow:

module/
├── domain/
│ ├── entities/
│ ├── value-objects/
│ ├── ports/ # Repository / gateway interfaces
│ └── domain-services/ # Only if logic does not belong to an entity
├── application/
│ ├── use-cases/
│ ├── dtos/
│ └── services/ # Orchestration only
└── infrastructure/
├── controllers/
├── repositories/ # Prisma implementations
├── adapters/
└── modules/


---

## Database Access (STRICT)

### Repository rule (mandatory)
- **All database access must go through repositories**
- Direct Prisma usage is forbidden outside:
  - `infrastructure/repositories`

### Repositories
- Defined as **interfaces** in `domain/ports`
- Implemented in `infrastructure/repositories`
- One repository per aggregate (no god repositories)
- Methods must express **business intent**, not technical queries

✅ Correct:
```ts
findWaitingConversationsForZone(zoneId: ZoneId): Promise<Conversation[]>
❌ Incorrect:

findMany(where: Prisma.ConversationWhereInput)
Services (Important clarification)
Application services
Coordinate use cases

Call repositories and domain services

Never access Prisma or infrastructure details

Domain services
Contain business logic that does not fit an entity

No framework or DB knowledge

Forbidden
“Service” classes that:

Build Prisma queries

Return Prisma models

Mix orchestration + persistence logic

If a service talks to the DB directly, the architecture is broken.

NestJS Boundaries
NestJS is delivery & infrastructure only

Decorators allowed only in:

Controllers

Modules

Infrastructure adapters

Controllers
Map HTTP / Webhook input → DTO → Use case

No business logic

No database access

Typing Rules (Critical)
any is strictly forbidden

Forbidden:

any

as any

Disabling @typescript-eslint/no-explicit-any

Allowed alternatives:

unknown + validation

Explicit DTOs

Value Objects

Proper generics

If something cannot be typed correctly, the design is wrong.

Comments
No redundant or obvious comments

Comments allowed only to:

Explain business intent

Justify a non-trivial decision

Document a real edge case

If code needs comments to be understood → refactor it

Code Quality Rules
Apply SOLID strictly

One real reason to change per class/file

Avoid over-engineering and generic abstractions

Prefer readability over cleverness

Explicit error handling (no silent failures)

Testing
Focus on:

Domain logic

Use cases

Avoid tests coupled to:

NestJS

Prisma

HTTP

Tests describe behavior, not implementation

Final Rule
If a change does not improve:

domain clarity

maintainability

correctness

type safety

it must not be merged.