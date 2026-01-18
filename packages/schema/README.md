# @jlnstack/schema

Schema migration utilities for evolving data structures. Works with any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible library (Zod, Valibot, ArkType, etc.).

> **Note:** This is not a schema validation library. Use Zod, Valibot, Effect Schema, or any other Standard Schema compatible library for that. This package helps you handle migrations when your schemas evolve over time.

## Installation

```bash
npm install @jlnstack/schema
```

## The Problem

When you store validated data (cookies, localStorage, databases), the schema may change over time:

```typescript
// v1: Initial schema
{ name: string }

// v2: Added age field
{ name: string, age: number }

// v3: Added optional email
{ name: string, age: number, email?: string }
```

Old stored data needs to be read and migrated to the current format. This package provides a clean way to handle that.

## Usage

```typescript
import { createMigratableSchema } from '@jlnstack/schema'
import type { Migration } from '@jlnstack/schema'
import { z } from 'zod'

// Your current schema (source of truth)
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
})

type User = z.infer<typeof userSchema>

// Define migrations from older formats
const v1Migration: Migration<{ name: string }, User> = {
  from: z.object({ name: z.string() }),
  migrate: (old) => ({ name: old.name, age: 0, email: undefined }),
}

const v2Migration: Migration<{ name: string; age: number }, User> = {
  from: z.object({ name: z.string(), age: z.number() }),
  migrate: (old) => ({ ...old, email: undefined }),
}

// Create the migratable schema
const migratableUserSchema = createMigratableSchema(userSchema, [
  v1Migration,
  v2Migration,
])
```

## How It Works

1. **Validates against current schema first** - if data matches, returns it directly
2. **Falls back to migrations** - tries each migration's `from` schema in order
3. **Migrates matching data** - transforms old format to current using `migrate` function
4. **Returns validation error** - if nothing matches, returns the original schema's error

```
Input data
    │
    ▼
┌─────────────────────────┐
│ Validate against        │
│ current schema          │──── Valid ────▶ Return value
└───────────┬─────────────┘
            │ Invalid
            ▼
┌─────────────────────────┐
│ Try migration schemas   │
│ in order                │──── Match ────▶ migrate() ──▶ Return value
└───────────┬─────────────┘
            │ No match
            ▼
      Return error
```

## With @jlnstack/cookies

This package integrates seamlessly with `@jlnstack/cookies`:

```typescript
import { createCookie, browserCookie } from '@jlnstack/cookies/browser'
import { createMigratableSchema } from '@jlnstack/schema'
import { z } from 'zod'

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.number(),
  compact: z.boolean(),
})

const migratablePreferences = createMigratableSchema(preferencesSchema, [
  {
    // Original format - just had theme
    from: z.object({ theme: z.enum(['light', 'dark']) }),
    migrate: (old) => ({
      theme: old.theme,
      fontSize: 16,
      compact: false
    }),
  },
])

const preferencesCookie = createCookie({
  name: 'preferences',
  schema: migratablePreferences,
  ...browserCookie('preferences'),
})

// Old cookie with { theme: 'dark' } automatically migrates to:
// { theme: 'dark', fontSize: 16, compact: false }
```

## With Valibot

```typescript
import { createMigratableSchema } from '@jlnstack/schema'
import * as v from 'valibot'

const currentSchema = v.object({
  name: v.string(),
  age: v.number(),
})

const migratable = createMigratableSchema(currentSchema, [
  {
    from: v.object({ name: v.string() }),
    migrate: (old) => ({ name: old.name, age: 0 }),
  },
])
```

## API

### `createMigratableSchema(schema, migrations)`

Creates a Standard Schema that handles migrations from older formats.

**Parameters:**
- `schema` - Your current schema (any Standard Schema compatible)
- `migrations` - Array of migration definitions

**Returns:** A Standard Schema that validates and migrates data

### `Migration<TFrom, TTo>`

Type for defining a migration:

```typescript
type Migration<TFrom, TTo> = {
  from: StandardSchemaV1<unknown, TFrom>
  migrate: (value: TFrom) => TTo | Promise<TTo>
}
```

## Async Support

Both schema validation and migration functions can be async:

```typescript
const migration = {
  from: someAsyncSchema,
  migrate: async (old) => {
    const enrichedData = await fetchAdditionalData(old.id)
    return { ...old, ...enrichedData }
  },
}
```

## License

MIT
