# Agent guidelines

## Reuse Before Creating

Before introducing new code:

1. Search for an existing implementation.
2. Reuse existing utilities.
3. Reuse existing components.
4. Reuse existing hooks.
5. Reuse existing serializers.
6. Reuse existing managers.
7. Reuse existing permissions.
8. Reuse existing API mappers.

Match the nearest existing implementation.

Consistency is preferred over novelty.

---

# Repository Structure

This repository is a monorepo.

## Frontend

All frontend code belongs inside:

client/

## Backend

All backend code belongs inside:

server/

# API Contract Rules

## Naming Conventions

Frontend uses camelCase.

Backend uses snake_case.

This rule is strict but can be relaxed when necessary.
---

## Translation Boundary

Frontend is responsible for payload transformation.

Always use existing API mapping utilities.

Never manually translate payload casing.

Never send camelCase payloads directly to Django.

Use:

* apiDataResponseMapper
* apiPayloadMapper
* dynamicFieldsPayloadMapper

Avoid introducing custom payload transformation logic.

---

# Frontend Standards

## File Naming

All filenames must use kebab-case.

Examples:

* deployment-panel.tsx
* validation-service.ts
* use-project-details.ts

Avoid:

* DeploymentPanel.tsx
* deploymentPanel.tsx

---

## Component Organization

Organize components by module ownership.

Do not keep page-related components inside the common component directory. Instead, make a folder with the same name as the page file and keep the page specific component and supporting components inside the page directory itself (e.g., `client/src/pages/editor/`).

Do not introduce a global components folder for feature-specific components. Only truly common, generic components (like global layout wrappers, base nodes, and UI primitives) should remain in the generic `components/` directory.

Keep components close to the feature they belong to.

---

## Component Design

Favor composition over large components.

Split responsibilities into:

* Components
* Hooks
* Utilities
* Services

Avoid render helper functions when a separate component would be clearer.

Use compound components when appropriate.

---

## UI Components (Shadcn)

Always use shadcn UI components (from `components/ui`) instead of native HTML tag elements (like `<select>`, `<button>`, `<input>`, etc.). if they are not available in the project design system feel free to add them.

---

## TypeScript

Avoid any.

Use existing type utilities before creating new ones.

Always provide types for:

* useState
* useRef
* function parameters
* function returns
* etc

Use enums or constants instead of hardcoded string comparisons.
---

## Constants

Constants must use SCREAMING_SNAKE_CASE.

Example:

const OTP_CELL_COUNT = 6;

Avoid:

const otpCellCount = 6;

---

## React

Use arrow functions by default.

Use function declarations only when technically required.

Avoid inline conditional complexity.

Prefer early returns.

---

## Hooks

Add explicit cleanup for all event listeners.

Remove listeners during unmount.

Review whether a useEffect is actually required before creating one.

Avoid effects that derive state from existing state.

Prefer computed values when possible.

---

## React Query

React Query is the source of truth for server state.

Do not duplicate query results into:

* useState
* Redux
* Context

unless there is a documented business requirement.

Prefer derived values from query data.

---

## API Mappers

Do not modify existing API mappers unless absolutely required.

For new payloads:

* Extend existing mappers.
* Follow existing patterns.

Avoid rewriting mapper behavior.

---

## Documentation

Every complex or long function must contain JSDoc documentation.

Helper utilities must have unit tests.

---

# Backend Standards

## Architecture

Prefer Django and DRF built-ins.

Use:

* ViewSet
* ModelViewSet
* GenericViewSet

etc

Avoid ad-hoc implementations when framework primitives exist.

---

## Views

Views should remain thin.

Views are responsible for:

* Permissions
* Queryset scoping
* Serializer orchestration
* Response formatting
* etc

---

## Query Logic

All custom query logic belongs in:

* Managers
* QuerySets

Avoid query construction in:

* Views
* Serializers
* etc

---

## Permissions

Every user-facing endpoint must enforce:

1. Authentication
2. Capability or role authorization
3. Resource ownership validation

Never expose unscoped data.

Always scope querysets by organization and access permissions.

---

## Object Access

Object retrieval must enforce object-level permissions.

Always validate access before returning resources.

---

## Serializers

Accumulate validation errors and raise them together.

Keep validation centralized.

---

## Models

Models should contain:

* Fields
* Relationships
* Lightweight properties

Avoid request-aware logic in models.

---

## Exceptions

Use existing project exceptions.

Do not raise raw exceptions from API code.

Register reusable errors through the central exception handling system.

---

## Imports

Within the same Django app: Use relative imports.

Across Django apps: Use absolute imports.

---

## Database

Prevent N+1 queries.

Use:

* select_related
* prefetch_related
* Prefetch

when appropriate.

Wrap multi-step writes in transaction.atomic().

---

## Dependencies

Prefer existing dependencies.

Do not introduce new packages without a clear justification.

---

# Testing Standards

## Backend

Use Django's testing framework.

Extend project base test classes whenever possible.

Test:

* Success paths
* Permission failures
* Ownership failures
* Invalid parameters
* Empty results
* Cross-organization access

Mock external systems only.

Do not mock internal business logic.

---

## Frontend

Write unit tests for helper functions.

Complex reusable logic should be tested.

---

# Code Quality

## Single Responsibility

Each component, serializer, manager, hook, and permission should have a single clear responsibility.

---

## Variable Naming

Do not use single-character variable names (e.g., `s`, `e`, `i`, `v`). Use descriptive names instead (e.g., `service`, `event`, `index`, `value`). keep the name explict but concise.

---

## No Dead Code

Do not leave:

* Commented code
* Temporary hacks
* Unused serializers
* Unused permissions
* Unused utilities

Remove obsolete code completely.

---

## Comments

Use comments to explain intent, not implementation.

Prefer JSDoc for reusable functions.

Avoid obvious comments.

Prefer no comments. Add them only when they explain non-obvious logic or mark a meaningful block boundary (e.g. separating setup vs. core flow).

When you do write a comment, end the sentence with a full stop.

---

# Docker Rules

Run backend operations through Docker.

Examples:

docker compose run --rm server python manage.py check

docker compose run --rm server python manage.py test

docker compose run --rm server python manage.py makemigrations

docker compose run --rm server python manage.py migrate

---

# Final Checklist

Before completing any task:

* Reused existing patterns
* Reused existing utilities
* Reused existing components
* Reused existing serializers
* Reused existing managers
* Reused existing permissions
* Added types
* Added tests where required
* Avoided duplicate state
* Avoided N+1 queries
* Enforced permissions
* Kept business logic in the correct layer
* Followed naming conventions
* Maintained consistency with nearby code
