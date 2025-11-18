# Build Errors Diagnosis & Resolution Guide

## Executive Summary

Your React Native/Expo application was experiencing two distinct categories of errors:

1. **CRITICAL: Circular Dependency Runtime Error** - ✅ **FIXED**
2. **WARNING: Expo Router Misconfiguration** - ✅ **FIXED** (by user)

---

## Problem 1: Circular Dependency (CRITICAL)

### Error Details
```
ERROR [TypeError: Cannot read property 'prototype' of undefined]

Code: relationshipService.ts:53
this.patientsService = new DatabaseService<Patient>('patients');
```

### Root Cause

A circular module dependency exists between two service files:

```
appwriteDatabase.ts (line 995)
  ↓ imports
relationshipService.ts (line 10)
  ↓ imports
appwriteDatabase.ts (DatabaseService class)
```

**The Problem Flow:**

1. `appwriteDatabase.ts` starts loading
2. At line 995, it imports from `relationshipService.ts`
3. `relationshipService.ts` starts loading
4. At line 10, it imports `DatabaseService` from `appwriteDatabase.ts`
5. At line 798, `relationshipService.ts` creates an instance: `export const relationshipService = new RelationshipService()`
6. The `RelationshipService` constructor (line 52-64) runs immediately
7. Constructor tries to instantiate `new DatabaseService<Patient>('patients')` at line 53
8. **But** `DatabaseService` is `undefined` because `appwriteDatabase.ts` hasn't finished loading!
9. JavaScript tries to access `undefined.prototype` → **CRASH**

### Why This Happens

The circular dependency creates a "chicken and egg" problem:
- Module A needs Module B to finish loading
- Module B needs Module A to finish loading
- Neither can complete, causing undefined values when accessed

### ✅ Applied Solution: Lazy Initialization

The circular dependency has been fixed by implementing lazy initialization. Here's what was changed:

**Changes Made:**

1. **[services/relationshipService.ts:798-816](services/relationshipService.ts#L798-L816)**
   - Removed direct instantiation: `export const relationshipService = new RelationshipService()`
   - Added lazy initialization function: `getRelationshipService()`
   - Created backward-compatible object with getter property

2. **[services/appwriteDatabase.ts:995-996](services/appwriteDatabase.ts#L995-L996)**
   - Updated imports to use `getRelationshipService`
   - Updated exports to include `getRelationshipService`
   - Modified default export to use getter for backward compatibility

**How It Works:**
- The `RelationshipService` instance is no longer created at module load time
- It's created on first access via `getRelationshipService()`
- By that time, `DatabaseService` is fully loaded and available
- Circular dependency is broken!

### Alternative Solution Options (Not Used)

#### Option 1: Lazy Initialization (✅ APPLIED)
Change the singleton instance creation to be lazy (created on first use):

**File:** [relationshipService.ts](appwrite-frontend/vaccinate-mi/app/services/relationshipService.ts#L798)

```typescript
// REMOVE THIS (line 798):
export const relationshipService = new RelationshipService();

// REPLACE WITH:
let relationshipServiceInstance: RelationshipService | null = null;

export function getRelationshipService(): RelationshipService {
  if (!relationshipServiceInstance) {
    relationshipServiceInstance = new RelationshipService();
  }
  return relationshipServiceInstance;
}

export const relationshipService = {
  get instance() {
    return getRelationshipService();
  }
};
```

Then update [appwriteDatabase.ts](appwrite-frontend/vaccinate-mi/app/services/appwriteDatabase.ts#L995) imports:

```typescript
// CHANGE FROM:
import { relationshipService, RelationshipService, validateRelationshipData } from './relationshipService';

// TO:
import { getRelationshipService, RelationshipService, validateRelationshipData } from './relationshipService';

// Update export:
export { getRelationshipService, RelationshipService, validateRelationshipData };

// Update default export:
export default {
  // ...other exports
  relationshipService: getRelationshipService(),
  // ...
};
```

#### Option 2: Break the Circular Dependency
Extract `DatabaseService` into its own file:

1. Create `app/services/baseDatabaseService.ts`
2. Move `DatabaseService` class to this new file
3. Both `appwriteDatabase.ts` and `relationshipService.ts` import from `baseDatabaseService.ts`
4. No more circular dependency!

#### Option 3: Dependency Injection
Modify `RelationshipService` to accept service instances via constructor:

```typescript
export class RelationshipService {
  constructor(
    private patientsService?: DatabaseService<Patient>,
    private immunizationRecordsService?: DatabaseService<ImmunizationRecord>,
    // ... etc
  ) {
    // Only create services if not provided
    this.patientsService = patientsService || new DatabaseService<Patient>('patients');
    // ... etc
  }
}
```

---

## Problem 2: Expo Router Misconfiguration (WARNING)

### Error Details
```
WARN Route "./schemas/auth.ts" is missing the required default export
WARN Route "./services/appwriteAuth.ts" is missing the required default export
WARN Route "./hooks/useProfiles.ts" is missing the required default export
... (60+ similar warnings)
```

### Root Cause

Expo Router is treating **all** files in the `app/` directory as route components, including:
- Service files (`app/services/*`)
- Schema files (`app/schemas/*`)
- Hook files (`app/hooks/*`)
- Type files (`app/types/*`)
- Utility files (`app/utils/*`)
- Non-route components (`app/components/*`)

Only files that represent actual screens/routes should be detected by Expo Router.

### Why This Happens

By default, Expo Router treats every `.ts`, `.tsx`, `.js`, `.jsx` file in the `app/` directory as a potential route unless explicitly configured otherwise.

### Solution

Create a Metro config file to exclude non-route files from the router.

**Create:** `metro.config.js` in project root (`appwrite-frontend/vaccinate-mi/`)

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Expo Router to ignore non-route files
config.resolver.sourceExts = [...config.resolver.sourceExts];

// Add custom resolver to exclude service/utility files from routing
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
```

**Better Solution:** Use Expo Router's built-in ignore patterns

Expo Router should ignore files in certain directories by default. The issue is that your non-route files are directly in the `app/` directory.

**Recommended File Structure:**

```
app/
├── (auth)/               ← Routes
│   ├── login.tsx
│   ├── register.tsx
│   └── ...
├── (tabs)/               ← Routes
│   └── ...
├── _layout.tsx           ← Route layout
├── index.tsx             ← Route
│
├── api/                  ← NOT routes (move here or rename with _)
├── _components/          ← Prefixed with _ to ignore
├── _hooks/               ← Prefixed with _ to ignore
├── _schemas/             ← Prefixed with _ to ignore
├── _services/            ← Prefixed with _ to ignore
├── _types/               ← Prefixed with _ to ignore
└── _utils/               ← Prefixed with _ to ignore
```

**Quick Fix:** Prefix directories with underscore

Rename these directories to tell Expo Router to ignore them:

```bash
mv app/components app/_components
mv app/hooks app/_hooks
mv app/schemas app/_schemas
mv app/services app/_services
mv app/types app/_types
mv app/utils app/_utils
mv app/context app/_context
```

Then update all imports throughout your codebase:
```typescript
// OLD:
import { useAuth } from '../context/auth';
import { loginSchema } from '../schemas/auth';

// NEW:
import { useAuth } from '../_context/auth';
import { loginSchema } from '../_schemas/auth';
```

---

## Missing Default Exports in Routes

Some actual route files are also missing default exports:

### Files That Need Default Exports

The following route files currently have named exports but need default exports:

1. [app/(auth)/login.tsx](appwrite-frontend/vaccinate-mi/app/(auth)/login.tsx) - **HAS default export** ✓
2. [app/(auth)/register.tsx](appwrite-frontend/vaccinate-mi/app/(auth)/register.tsx) - Check this
3. [app/(auth)/forgot-password.tsx](appwrite-frontend/vaccinate-mi/app/(auth)/forgot-password.tsx) - Check this
4. [app/(auth)/verify-email.tsx](appwrite-frontend/vaccinate-mi/app/(auth)/verify-email.tsx) - Check this
5. [app/(tabs)/_layout.tsx](appwrite-frontend/vaccinate-mi/app/(tabs)/_layout.tsx) - Check this
6. [app/_layout.tsx](appwrite-frontend/vaccinate-mi/app/_layout.tsx) - **HAS default export** ✓

**Pattern to follow:**
```typescript
// ✓ CORRECT (login.tsx already does this)
export default function LoginScreen() {
  return <View>...</View>;
}

// ✗ WRONG
export function LoginScreen() {
  return <View>...</View>;
}
```

---

## Implementation Priority

### 1. Fix Circular Dependency (CRITICAL - Do this first!)
   - Choose Option 1 (Lazy Initialization) for quickest fix
   - Or choose Option 2 (Separate file) for cleaner architecture

### 2. Fix Route Configuration (HIGH)
   - Rename directories to use underscore prefix
   - Update all import statements

### 3. Verify Route Components (MEDIUM)
   - Ensure all route files have default exports
   - Test navigation after fixes

---

## Testing After Fixes

1. **Clear cache and rebuild:**
   ```bash
   cd appwrite-frontend/vaccinate-mi
   rm -rf .expo node_modules/.cache
   npx expo start --clear
   ```

2. **Verify fixes:**
   - No more "Cannot read property 'prototype' of undefined" errors
   - Warnings about missing default exports should be gone (or only on actual route files)
   - Application should load without crashes

3. **Test critical paths:**
   - Login flow
   - Profile switching
   - Data fetching

---

## Additional Notes

### Why Circular Dependencies Are Bad

1. **Unpredictable initialization order** - Cannot guarantee which module loads first
2. **Partial module exports** - Accessing exports before they're defined
3. **Hard to debug** - Error might appear far from the actual cause
4. **Performance impact** - Module bundlers may struggle to optimize

### Best Practices

1. **Avoid circular dependencies** - Design modules to have clear dependency hierarchy
2. **Use dependency injection** - Pass dependencies explicitly rather than importing
3. **Lazy initialization** - Create instances when needed, not at module load
4. **Separation of concerns** - Base classes shouldn't import their consumers
5. **Follow Expo Router conventions** - Use underscore prefix for non-route files

---

## Summary of Changes Needed

| File/Directory | Action | Priority |
|---------------|--------|----------|
| `app/services/relationshipService.ts:798` | Implement lazy initialization | CRITICAL |
| `app/services/appwriteDatabase.ts:995` | Update imports to use lazy getter | CRITICAL |
| `app/components` → `app/_components` | Rename directory | HIGH |
| `app/hooks` → `app/_hooks` | Rename directory | HIGH |
| `app/schemas` → `app/_schemas` | Rename directory | HIGH |
| `app/services` → `app/_services` | Rename directory | HIGH |
| `app/types` → `app/_types` | Rename directory | HIGH |
| `app/utils` → `app/_utils` | Rename directory | HIGH |
| `app/context` → `app/_context` | Rename directory | HIGH |
| All files importing from renamed dirs | Update import paths | HIGH |
| `app/(auth)/*.tsx` route files | Verify default exports | MEDIUM |

---

## Questions or Need Help?

If you encounter issues after implementing these fixes, check:

1. Did you update ALL import statements after renaming directories?
2. Did you clear the cache before rebuilding?
3. Are there other circular dependencies? (Use `madge` tool to check)

```bash
# Install madge to detect circular dependencies
npm install -g madge

# Check for circular dependencies
madge --circular --extensions ts,tsx app/
```
