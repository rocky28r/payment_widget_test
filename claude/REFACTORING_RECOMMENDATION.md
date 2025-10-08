# Final Refactoring Recommendation

**Date:** 2025-10-08 (Updated with Framework Approach)
**Status:** Final Recommendation
**Estimated Effort:** 3-4 weeks (with 3-day POC first)
**Risk Level:** Medium-Low (POC minimizes risk)
**Approach:** Svelte + DaisyUI

---

## Executive Summary

After analyzing the codebase and evaluating framework options, I recommend migrating to **Svelte + DaisyUI** for maximum code reduction and maintainability improvements while avoiding over-engineering.

**Key Decision:** Use a modern framework (Svelte) but keep it simple. Avoid React + MUI overkill.

**Strategy:** Start with 3-day POC → Full migration if successful

---

## The Problem (Validated)

✅ **Real Issues:**
- Files too large (3,263 lines in one file)
- Logic duplication (~15-20%)
- Scattered global state (15+ variables)
- Manual DOM manipulation everywhere
- Mixed architectural patterns
- Poor component reusability

❌ **Not Real Issues:**
- Need for Redux-like state management
- Need for custom component framework
- Need for complex migration system
- Insufficient enterprise patterns

---

## Why Svelte + DaisyUI?

### 1. Massive Code Reduction (60%+)

**Before (Vanilla JS - 150+ lines):**
```javascript
const form = document.getElementById('payment-form');
const amountInput = document.getElementById('amount');
const submitBtn = document.getElementById('submitBtn');

amountInput.addEventListener('blur', () => {
    const error = validateField('amount', amountInput.value);
    if (error) {
        amountInput.classList.add('border-red-500');
        let errorEl = document.createElement('span');
        errorEl.className = 'error text-red-500 text-sm';
        errorEl.textContent = error;
        amountInput.parentElement.appendChild(errorEl);
    }
});

submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg class="animate-spin...">...</svg> Loading...';
    try {
        const response = await createPaymentSession({
            amount: amountInput.value
        });
        // ... 50+ more lines
    } catch (error) {
        // ... error handling
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Session';
    }
});
```

**After (Svelte - 35 lines):**
```svelte
<script>
  import { createPaymentSession } from '$lib/api-client.js';
  import { validateField } from '$lib/validation.js';

  let formData = { amount: '' };
  let errors = {};
  let loading = false;

  function validate() {
    errors.amount = validateField('amount', formData.amount);
  }

  async function handleSubmit() {
    validate();
    if (errors.amount) return;

    loading = true;
    try {
      await createPaymentSession(formData);
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div class="form-control">
    <input
      bind:value={formData.amount}
      on:blur={validate}
      class="input input-bordered"
      class:input-error={errors.amount}
      placeholder="Amount"
    />
    {#if errors.amount}
      <span class="label-text-alt text-error">{errors.amount}</span>
    {/if}
  </div>

  <button
    type="submit"
    class="btn btn-primary"
    class:loading
    disabled={loading}
  >
    Create Session
  </button>
</form>
```

**Result:** 150+ lines → 35 lines (77% reduction)

### 2. Key Benefits

✅ **Tiny Bundle Size**
- Svelte compiles to vanilla JS (~10-20KB)
- No runtime overhead (unlike React/Vue)
- Smaller than current TailwindCSS CDN

✅ **Component Reusability**
- Real components (not classes)
- Props and reactive state
- Easy to compose and reuse

✅ **Built-in Reactivity**
- No useState/useEffect
- Automatic UI updates
- Simple mental model

✅ **TailwindCSS Integration**
- DaisyUI extends your existing Tailwind
- Class-based components
- No style conflicts

✅ **Easy Migration**
- Incremental (page by page)
- Looks like HTML/CSS/JS
- Low learning curve

### 3. Why NOT React + MUI

❌ React + MUI is over-engineered for a test tool:
- Bundle size: 300KB+ (vs 20KB for Svelte)
- Complex build setup (Webpack/Babel)
- Steep learning curve (hooks, lifecycle)
- Material Design doesn't match current look
- Enterprise-focused (not test-tool-focused)

---

## Recommended Approach

### File Structure (SvelteKit + DaisyUI)

```
payment-widget-test/
├── src/
│   ├── lib/                        # Shared utilities (reusable)
│   │   ├── api/
│   │   │   ├── client.js           # HTTP client with retries
│   │   │   ├── payment.js          # Payment API methods
│   │   │   ├── membership.js       # Membership API methods
│   │   │   └── errors.js           # Error classes
│   │   ├── stores/
│   │   │   ├── session.js          # Session state store
│   │   │   ├── config.js           # Config state store
│   │   │   └── widget.js           # Widget state store
│   │   ├── utils/
│   │   │   ├── validation.js       # Validation rules
│   │   │   ├── storage.js          # localStorage wrapper
│   │   │   ├── currency.js         # Currency formatting
│   │   │   └── logger.js           # Logging utility
│   │   └── config.js               # App configuration
│   │
│   ├── components/                 # Reusable Svelte components
│   │   ├── ui/                     # Base UI components
│   │   │   ├── Button.svelte
│   │   │   ├── Input.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Alert.svelte
│   │   │   └── LoadingSpinner.svelte
│   │   ├── forms/
│   │   │   ├── FormField.svelte
│   │   │   ├── FormSection.svelte
│   │   │   └── ValidationError.svelte
│   │   └── layout/
│   │       ├── Navigation.svelte
│   │       ├── ConfigModal.svelte
│   │       └── PageHeader.svelte
│   │
│   ├── routes/                     # SvelteKit routes (pages)
│   │   ├── +layout.svelte          # Shared layout with nav
│   │   │
│   │   ├── payment-test/           # Payment widget test page
│   │   │   ├── +page.svelte        # Main page
│   │   │   ├── SessionForm.svelte  # Session creation form
│   │   │   ├── WidgetContainer.svelte
│   │   │   ├── StylingPanel.svelte
│   │   │   ├── TranslationPanel.svelte
│   │   │   └── ActivityLog.svelte
│   │   │
│   │   ├── contract-flow/          # Original contract flow
│   │   │   ├── +page.svelte
│   │   │   ├── ProgressStepper.svelte
│   │   │   ├── Step1.svelte        # Offer selection
│   │   │   ├── Step2.svelte        # Offer details
│   │   │   ├── Step3.svelte        # Personal info
│   │   │   ├── Step4.svelte        # Preview
│   │   │   ├── Step5.svelte        # Recurring payment
│   │   │   ├── Step6.svelte        # Upfront payment
│   │   │   └── Step7.svelte        # Confirmation
│   │   │
│   │   └── contract-flow-optimized/ # Optimized flow
│   │       ├── +page.svelte
│   │       ├── ScreenA.svelte      # Choose plan
│   │       ├── ScreenB.svelte      # Your details
│   │       ├── ScreenC.svelte      # Payment
│   │       ├── ScreenD.svelte      # Review
│   │       └── ContractSummary.svelte
│   │
│   └── app.html                    # Base HTML template
│
├── static/                         # Static assets
│   └── (images, test data, etc.)
│
├── svelte.config.js                # SvelteKit config
├── vite.config.js                  # Vite config
├── tailwind.config.js              # Tailwind + DaisyUI config
└── package.json

Total: ~30-35 component files + ~15 utility files
```

---

## Implementation Plan

### Phase 0: POC (3 days) - REQUIRED FIRST STEP

**Goal:** Validate Svelte + DaisyUI approach with one page

#### Day 1: Setup
```bash
# Initialize SvelteKit project
npm create svelte@latest payment-widget-test
cd payment-widget-test

# Install dependencies
npm install
npm install -D tailwindcss daisyui autoprefixer
npx tailwindcss init -p

# Configure Tailwind + DaisyUI
```

**tailwind.config.js:**
```javascript
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["light", "dark"],
    base: true,
    styled: true,
    utils: true
  }
}
```

**src/app.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### Day 2-3: Build Payment Test Page

**Migrate ONE page** (payment test) to Svelte:
- Session creation form
- Widget container
- Activity log
- Basic navigation

**Evaluate:**
- ✅ Code reduction achieved?
- ✅ Developer experience improved?
- ✅ Build process manageable?
- ✅ Team comfortable with Svelte?

**Decision Point:**
- If POC successful → Proceed with full migration
- If POC problematic → Consider Alpine.js or vanilla refactoring

---

### Phase 1: Foundation (Week 1) - IF POC SUCCEEDS

#### Day 1: Project Setup
- Finalize SvelteKit configuration
- Setup dev environment
- Configure linting/formatting (ESLint, Prettier)
- Setup Git hooks (pre-commit)

#### Day 2-3: Shared Utilities

**1. API Client (`src/lib/api/client.js`)**
```javascript
export class ApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.timeout = 10000;
        this.maxRetries = 3;
    }

    async request(endpoint, options = {}) {
        // ... (same as before, reusable in Svelte)
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }
}

// Singleton
let apiClient = null;

export function getApiClient() {
    if (!apiClient) {
        const config = get(configStore); // From Svelte store
        apiClient = new ApiClient(config.apiBaseUrl, config.apiKey);
    }
    return apiClient;
}
```

**2. Svelte Stores (`src/lib/stores/`)**

**session.js:**
```javascript
import { writable } from 'svelte/store';
import { persist } from './persist.js';

const initialState = {
    token: null,
    expiry: null,
    customerId: null
};

export const session = persist(writable(initialState), 'session');

// Helper functions
export function setSessionToken(token, expiry, customerId) {
    session.update(s => ({ ...s, token, expiry, customerId }));
}

export function clearSession() {
    session.set(initialState);
}

export function isSessionValid() {
    let valid = false;
    session.subscribe(s => {
        valid = s.token && (!s.expiry || new Date() < new Date(s.expiry));
    })();
    return valid;
}
```

**config.js:**
```javascript
import { writable } from 'svelte/store';
import { persist } from './persist.js';

export const configStore = persist(writable({
    apiKey: '',
    apiBaseUrl: 'https://api.dev.payment.sportalliance.com'
}), 'config');

export function updateConfig(key, value) {
    configStore.update(c => ({ ...c, [key]: value }));
}
```

**persist.js** (localStorage persistence for stores):
```javascript
export function persist(store, key) {
    const stored = localStorage.getItem(key);
    if (stored) {
        store.set(JSON.parse(stored));
    }

    store.subscribe(value => {
        localStorage.setItem(key, JSON.stringify(value));
    });

    return store;
}
```

**3. Validation (`src/lib/utils/validation.js`)**
```javascript
// Same as before - pure JS utilities work in Svelte
export const VALIDATION_RULES = { /* ... */ };
export function validateField(fieldName, value, rules) { /* ... */ }
export function validateForm(formData, rules) { /* ... */ }
```

#### Day 4-5: Base UI Components

**Button.svelte:**
```svelte
<script>
  export let variant = 'primary'; // primary, secondary, accent, ghost
  export let size = 'md'; // xs, sm, md, lg
  export let loading = false;
  export let disabled = false;
  export let type = 'button';

  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost'
  };

  const sizeClass = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };
</script>

<button
  {type}
  class="btn {variantClass[variant]} {sizeClass[size]}"
  class:loading
  disabled={disabled || loading}
  on:click
>
  <slot />
</button>
```

**Input.svelte:**
```svelte
<script>
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let error = null;
  export let label = null;
  export let required = false;
</script>

<div class="form-control w-full">
  {#if label}
    <label class="label">
      <span class="label-text">
        {label}
        {#if required}<span class="text-error">*</span>{/if}
      </span>
    </label>
  {/if}

  <input
    {type}
    {placeholder}
    bind:value
    class="input input-bordered w-full"
    class:input-error={error}
    on:blur
    on:input
  />

  {#if error}
    <label class="label">
      <span class="label-text-alt text-error">{error}</span>
    </label>
  {/if}
</div>
```

**Card.svelte:**
```svelte
<script>
  export let title = null;
  export let compact = false;
</script>

<div class="card bg-base-100 shadow-xl" class:card-compact={compact}>
  <div class="card-body">
    {#if title}
      <h2 class="card-title">{title}</h2>
    {/if}
    <slot />
  </div>
</div>
```

**Alert.svelte:**
```svelte
<script>
  export let type = 'info'; // info, success, warning, error
  export let dismissible = false;

  const typeClass = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error'
  };

  function handleDismiss() {
    // Dispatch event or remove element
  }
</script>

<div class="alert {typeClass[type]}">
  <slot />
  {#if dismissible}
    <button class="btn btn-ghost btn-sm" on:click={handleDismiss}>✕</button>
  {/if}
</div>
```

---

### Phase 2: Payment Test Page (Week 2)

#### Day 1-2: Page Structure

**routes/payment-test/+page.svelte:**
```svelte
<script>
  import SessionForm from './SessionForm.svelte';
  import WidgetContainer from './WidgetContainer.svelte';
  import StylingPanel from './StylingPanel.svelte';
  import TranslationPanel from './TranslationPanel.svelte';
  import ActivityLog from './ActivityLog.svelte';
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Payment Widget Test</h1>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Session Creation -->
    <div class="lg:col-span-1">
      <SessionForm />
    </div>

    <!-- Widget Container -->
    <div class="lg:col-span-2">
      <WidgetContainer />
    </div>

    <!-- Styling Panel -->
    <div class="lg:col-span-1">
      <StylingPanel />
    </div>

    <!-- Translation Panel -->
    <div class="lg:col-span-1">
      <TranslationPanel />
    </div>

    <!-- Activity Log -->
    <div class="lg:col-span-1">
      <ActivityLog />
    </div>
  </div>
</div>
```

**SessionForm.svelte:**
```svelte
<script>
  import { session, setSessionToken } from '$lib/stores/session.js';
  import { configStore } from '$lib/stores/config.js';
  import { getApiClient } from '$lib/api/client.js';
  import { validateForm } from '$lib/utils/validation.js';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import Card from '$components/ui/Card.svelte';

  let formData = {
    amount: '',
    scope: 'ECOM',
    referenceText: '',
    customerId: '',
    finionPayCustomerId: ''
  };

  let errors = {};
  let loading = false;

  async function handleSubmit() {
    const validation = validateForm(formData);
    if (!validation.valid) {
      errors = validation.errors;
      return;
    }

    loading = true;
    try {
      const apiClient = getApiClient();
      const response = await apiClient.post('/v1/payments/user-session', {
        amount: parseFloat(formData.amount),
        scope: formData.scope,
        ...(formData.referenceText && { referenceText: formData.referenceText }),
        ...(formData.customerId && { customerId: parseInt(formData.customerId, 10) }),
        ...(formData.finionPayCustomerId && { finionPayCustomerId: formData.finionPayCustomerId })
      });

      setSessionToken(response.token, response.tokenValidUntil, response.finionPayCustomerId);
    } catch (error) {
      console.error('Session creation failed:', error);
    } finally {
      loading = false;
    }
  }
</script>

<Card title="Create Payment Session">
  <form on:submit|preventDefault={handleSubmit}>
    <Input
      label="Amount"
      type="number"
      bind:value={formData.amount}
      error={errors.amount}
      required
    />

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Scope</span>
      </label>
      <select bind:value={formData.scope} class="select select-bordered">
        <option value="ECOM">ECOM</option>
        <option value="MEMBER_ACCOUNT">Member Account</option>
      </select>
    </div>

    <Input
      label="Reference Text"
      bind:value={formData.referenceText}
      placeholder="Optional"
    />

    <Input
      label="Customer ID"
      type="number"
      bind:value={formData.customerId}
      placeholder="Optional"
    />

    <div class="card-actions justify-end mt-6">
      <Button type="submit" {loading}>
        Create Session
      </Button>
    </div>
  </form>
</Card>
```

#### Day 3-4: Widget Integration

**WidgetContainer.svelte:**
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { session } from '$lib/stores/session.js';
  import Card from '$components/ui/Card.svelte';

  let widgetInstance = null;
  let container;

  $: if ($session.token && container) {
    mountWidget();
  }

  async function mountWidget() {
    if (widgetInstance) {
      await widgetInstance.destroy();
    }

    widgetInstance = window.paymentWidget.init({
      userSessionToken: $session.token,
      container: container,
      environment: 'sandbox',
      countryCode: 'DE',
      locale: 'en',
      onSuccess: (token, details) => {
        console.log('Payment success:', token, details);
      },
      onError: (error) => {
        console.error('Payment error:', error);
      }
    });
  }

  onDestroy(() => {
    if (widgetInstance) {
      widgetInstance.destroy();
    }
  });
</script>

<Card title="Payment Widget">
  {#if !$session.token}
    <div class="alert alert-info">
      Create a payment session first to mount the widget
    </div>
  {:else}
    <div bind:this={container} id="payment-widget-container"></div>
  {/if}
</Card>
```

#### Day 5: Polish & Test
- Test all functionality
- Fix bugs
- Optimize performance

---

### Phase 3: Contract Flow Pages (Week 3-4)

#### Week 3: Original Contract Flow

Migrate 7-step flow to Svelte components:
- ProgressStepper component
- Each step as a Svelte component
- Shared state via stores
- Navigation logic

#### Week 4: Optimized Contract Flow

Migrate 4-screen flow:
- Screen components
- ContractSummary component
- Live preview with debouncing
- Payment integration

---

## Migration Checklist

### POC Phase (3 days):
- [ ] Initialize SvelteKit project
- [ ] Configure Tailwind + DaisyUI
- [ ] Build payment test page
- [ ] Test build process
- [ ] Evaluate developer experience
- [ ] **DECISION:** Proceed or pivot?

### Phase 1 (Week 1):
- [ ] Setup project fully
- [ ] Create shared utilities
- [ ] Build Svelte stores
- [ ] Create base UI components
- [ ] Test component library

### Phase 2 (Week 2):
- [ ] Migrate payment test page
- [ ] Integrate widget
- [ ] Add styling panel
- [ ] Add translation panel
- [ ] Full page testing

### Phase 3 (Week 3-4):
- [ ] Migrate original contract flow
- [ ] Migrate optimized contract flow
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation update

### Quality Gates:
- [ ] No functionality regressions
- [ ] All forms work correctly
- [ ] Widget mounts properly
- [ ] Storage persists correctly
- [ ] Build size < 100KB gzipped
- [ ] Lighthouse score > 90

---

## What We're NOT Doing

❌ **Avoid These Patterns:**

1. **Redux/MobX**: Svelte stores are sufficient
2. **React/Vue**: Svelte is the right choice
3. **Complex State Management**: Keep stores simple
4. **Over-abstraction**: Don't create unnecessary layers
5. **Comprehensive Testing**: Focus on critical paths
6. **Micro-components**: Balance component size

---

## Code Reduction Examples

### Example 1: Button with Loading

**Before (40 lines):**
```javascript
const button = document.createElement('button');
button.className = 'px-4 py-2 bg-blue-600 text-white rounded';
function setLoading(isLoading) {
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `<svg class="animate-spin...">...</svg> Loading...`;
    } else {
        button.textContent = 'Submit';
    }
}
```

**After (1 line):**
```svelte
<Button {loading}>Submit</Button>
```

### Example 2: Form Validation

**Before (150+ lines):**
```javascript
const form = document.getElementById('form');
const amountInput = document.getElementById('amount');

amountInput.addEventListener('blur', () => {
    const error = validateField('amount', amountInput.value);
    if (error) {
        showFieldError(amountInput, error);
    } else {
        clearFieldError(amountInput);
    }
});

function showFieldError(field, message) {
    field.classList.add('border-red-500');
    let errorEl = field.parentElement.querySelector('.error');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'error text-red-500 text-sm';
        field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
}
// ... 100+ more lines
```

**After (35 lines):**
```svelte
<script>
  let formData = { amount: '' };
  let errors = {};

  function validate() {
    const result = validateForm(formData);
    errors = result.errors;
  }
</script>

<Input
  bind:value={formData.amount}
  on:blur={validate}
  error={errors.amount}
  label="Amount"
  required
/>
```

---

## Success Metrics

### Code Quality:
- **Total lines:** 7,700 → ~3,000 lines (60% reduction)
- **Lines per file:** < 200 (Svelte components)
- **Duplication:** < 3% (reusable components)
- **Global variables:** 0 (Svelte stores)

### Developer Experience:
- **Time to add feature:** < 4 hours (vs 1 day)
- **Component reuse:** 80%+ (vs 0%)
- **Build time:** < 10 seconds
- **Hot reload:** < 1 second

### Performance:
- **Bundle size:** < 100KB gzipped
- **First paint:** < 1 second
- **Lighthouse score:** > 90
- **TTI (Time to Interactive):** < 2 seconds

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| POC fails | Low | High | Fall back to Alpine.js or vanilla |
| Learning curve | Medium | Medium | Svelte is easiest framework to learn |
| Regressions | Medium | High | Thorough testing, incremental migration |
| Build complexity | Low | Low | Vite is simple, well-documented |
| Team adoption | Medium | Medium | POC demonstrates value first |

**Overall Risk:** Medium-Low (POC minimizes risk)

---

## Comparison: Framework Options

| Aspect | Vanilla JS | Alpine.js | React+MUI | Vue+Vuetify | Svelte+DaisyUI ⭐ |
|--------|-----------|-----------|-----------|-------------|-------------------|
| **Code Reduction** | 0% | 40% | 60% | 60% | 60% |
| **Bundle Size** | 0KB | 15KB | 300KB+ | 200KB | 20KB |
| **Build Process** | None | None | Complex | Medium | Simple |
| **Learning Curve** | None | Minimal | Steep | Medium | Easy |
| **Component Reuse** | Manual | Limited | Excellent | Excellent | Excellent |
| **Timeline** | 1-2 weeks | 1 week | 5 weeks | 4 weeks | 3-4 weeks |
| **Maintainability** | Poor | Good | Good | Good | Excellent |
| **For Test Tool** | OK | Good | Overkill | Overkill | **Perfect** |

---

## Next Steps

### Immediate Actions:

1. ✅ **Review and approve this plan**
2. ✅ **Start 3-day POC** (build payment test page in Svelte)
3. ✅ **Evaluate POC results**

### After POC (if successful):

**Week 1:**
- Setup project fully
- Build shared utilities
- Create component library

**Week 2:**
- Complete payment test page
- Full feature parity with current

**Week 3-4:**
- Migrate contract flows
- Testing and optimization

---

## Conclusion

Migrating to **Svelte + DaisyUI** offers the best balance of code reduction, maintainability, and developer experience without over-engineering.

**Key Benefits:**
- ✅ 60% code reduction (7,700 → 3,000 lines)
- ✅ Component-based architecture
- ✅ Built-in reactivity (no manual DOM)
- ✅ Tiny bundle size (20KB vs 0KB, negligible)
- ✅ Modern developer experience
- ✅ Easy to learn and maintain

**Strategy:**
- Start with 3-day POC
- If successful → Full migration (3-4 weeks)
- If problematic → Fall back to Alpine.js

**Trade-offs:**
- Requires build process (Vite - very simple)
- 3-4 weeks investment (vs 1-2 weeks for vanilla)
- Learning Svelte (but easiest framework)
- Node.js dependency (for builds)

**Recommendation:** ✅ **Start with 3-day POC, then decide**

---

**Document Version:** 2.0 (Updated for Svelte + DaisyUI)
**Status:** Final Recommendation
**Approval Required:** Yes
**Next Step:** Start 3-day POC
**POC Success Criteria:**
- ✅ Payment test page works in Svelte
- ✅ Code reduction > 50%
- ✅ Build process is manageable
- ✅ Team comfortable with approach
