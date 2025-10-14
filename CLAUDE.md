# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## **CRITICAL: Testing Requirement**

**🚨 MANDATORY TESTING POLICY 🚨**

After implementing ANY code changes, fixes, or new features, you **MUST** test the implementation to verify it works correctly. This is **NON-NEGOTIABLE** unless the user explicitly includes `NOTEST` in their prompt.

**Testing Requirements:**
1. **Always test after implementation** - Never assume code works without verification
2. **Use browser automation** - Use Playwright MCP tools to test the actual UI
3. **Verify complete flows** - Test from start to finish, not just individual components
4. **Check API calls** - Verify correct endpoints, request/response structures, error handling
5. **Validate user experience** - Ensure loading states, errors, and success paths work
6. **Check console for errors** - Use browser console to catch JavaScript errors
7. **Document findings** - Report what was tested and results

**Testing Tools Available:**
- `mcp__playwright__browser_navigate` - Navigate to pages
- `mcp__playwright__browser_click` - Click buttons and links
- `mcp__playwright__browser_type` - Fill form fields
- `mcp__playwright__browser_snapshot` - Capture page state
- `mcp__playwright__browser_console_messages` - Check for errors
- `mcp__playwright__browser_wait_for` - Wait for async operations

**When Testing is Optional:**
- User includes `NOTEST` keyword in their prompt
- Changes are purely documentation updates
- Changes are only to configuration files (non-code)

**Consequences of Not Testing:**
- Bugs ship to production undetected
- User loses confidence in implementation quality
- Wasted time debugging issues that testing would have caught

**Remember:** Code that isn't tested is code that doesn't work. Period.

---

## Project Overview

This is a **Svelte + SvelteKit** application that provides comprehensive testing and demonstration of the SPA Payment Widget integration with the Finion Pay API. The application includes:

1. **Payment Widget Test Environment** - Standalone widget testing with session creation and configuration
2. **Membership Contract Flow** - Complete 6-step membership signup process with payment integration

## Architecture

**Framework**: SvelteKit 2.x with Svelte 5 (Runes API)

**Styling**: TailwindCSS 3.x + DaisyUI 4.x for component theming

**Build Tool**: Vite 5.x with hot module reload

**Deployment**: Static adapter for hosting on any static platform

**Structure**:
```
src/
├── lib/
│   ├── components/       # Reusable Svelte components
│   ├── services/         # API clients and business logic
│   └── utils/            # Helper functions
├── routes/               # SvelteKit file-based routing
│   ├── +layout.svelte    # Root layout with navigation
│   ├── +page.svelte      # Payment widget test (home)
│   └── contract-flow/    # Contract flow route
└── app.html              # HTML template
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Key Implementation Details

### Global API Configuration

**Location**: `src/lib/components/layout/Navigation.svelte`

**Implementation**: `GlobalConfig` class provides centralized API configuration accessible across all pages.

**Usage**:
```javascript
// Access from GlobalConfig
const config = GlobalConfig.load();
// config = { apiKey: string, baseUrl: string }

// All API calls use these credentials
const headers = {
  'Content-Type': 'application/json',
  'X-API-KEY': config.apiKey
};

const response = await fetch(`${config.baseUrl}/v1/payments/user-session`, {
  method: 'POST',
  headers,
  body: JSON.stringify(requestData)
});
```

**Storage**: Persisted in localStorage under `globalApiConfig` key.

**Access**: Click "Config" button (gear icon) in navigation bar to open modal.

### Payment Widget Integration

**Widget Library**: `https://widget.dev.payment.sportalliance.com/widget.js`

**Initialization**:
```javascript
const widget = window.paymentWidget.init({
  userSessionToken: 'token-from-api',
  container: 'payment-widget-container', // DOM element ID
  countryCode: 'DE',
  locale: 'en-US',
  environment: 'test' | 'sandbox' | 'live',
  onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
    // Handle successful payment
  },
  onError: (error) => {
    // Handle payment error
  }
});
```

**Cleanup**:
```javascript
// Always destroy widget before unmounting component
widget.destroy();
```

**Important**: The widget uses `userSessionToken` which contains amount and payment details. Do NOT pass separate `amount` or `currency` parameters.

### API Integration

**Finion Pay API Endpoints**:

1. **Payment Session**: `POST /v1/payments/user-session`
   - Creates payment session with token
   - **Amount format**: Decimal (e.g., 10.50 for €10.50, NOT 1050)
   - Scope: `MEMBER_ACCOUNT` (recurring) or `ECOM` (one-time)
   - Response: `{ token, tokenValidUntil, finionPayCustomerId }`

2. **Membership Offers**: `GET /v1/memberships/membership-offers`
   - Lists all available membership offers
   - Response: Array of offer objects with pricing and terms

3. **Offer Details**: `GET /v1/memberships/membership-offers/{membershipOfferId}`
   - Detailed offer information
   - Contains `terms[0]` with pricing breakdown
   - **Price location**: `terms[0].paymentFrequency.price` (primary) or `terms[0].rateStartPrice` (fallback)

4. **Signup Preview**: `POST /v1/memberships/signup/preview`
   - Validates vouchers and calculates final pricing
   - Returns discounts, flat fees, and `dueOnSigningAmount`
   - Used for real-time price updates during form entry

5. **Signup Submission**: `POST /v1/memberships/signup`
   - Final contract creation
   - Requires: member info, selected offer, payment tokens
   - **Two payment tokens**:
     - `customer.paymentRequestToken` - Recurring payment method
     - `contract.initialPaymentRequestToken` - Upfront payment

**Authentication**: All requests require `X-API-KEY` header with valid API key.

### Contract Flow - 6-Step Process

**Location**: `src/routes/contract-flow/+page.svelte`

**Components**:
- `Step1OfferSelection.svelte` - Browse and select offers
- `Step2OfferDetails.svelte` - View detailed offer information
- `Step3PersonalInfo.svelte` - Collect member details
- `Step4RecurringPayment.svelte` - Set up recurring payment method
- `Step5InitialPayment.svelte` - Process upfront fees
- `Step6Review.svelte` - Final review and submission
- `ContractSummary.svelte` - Live pricing summary (sidebar)

**State Management**:
- Reactive Svelte stores for global state
- Session storage for form persistence (1-hour TTL)
- Auto-save on field changes (debounced)

**Smart Payment Detection**:
The flow automatically detects which payment steps are needed:

```javascript
const needsRecurring = offer?.allowedPaymentChoices?.length > 0;
const needsUpfront = dueOnSigningAmount > 0;

// Skip Step 4 if no recurring payment needed
// Skip Step 5 if no upfront payment needed
// Show both if both are needed
```

**Two Payment Tokens**:
- **Step 4** creates `recurringToken` (MEMBER_ACCOUNT scope, amount: 0)
- **Step 5** creates `upfrontToken` (ECOM scope, amount: dueOnSigningAmount)
- **Step 6** submits both tokens in correct fields

**Critical**: Never use the same token for both payment types. The API requires:
- `customer.paymentRequestToken` = recurring token (monthly payments)
- `contract.initialPaymentRequestToken` = upfront token (initial fees)

### Membership Offer Pricing Display

**Step 2: Offer Details** implements comprehensive pricing display:

**Components**:
1. **Hero Cost Summary** - Prominent card with monthly price, setup fees, total contract value
2. **Contract Timeline** - Visual timeline with promotional periods, initial term, extension
   - Intelligently hides extension period if price doesn't change
   - Uses `priceChangesAfterInitialTerm` check to prevent duplication
3. **Price Adjustments** - Future price changes (if configured)
4. **What's Included** - Comprehensive single section with:
   - Included modules
   - Contract terms (cancellation, extension, dates)
   - Cancellation & refund policy
   - Accepted payment methods

**Price Formatting**:
- Use `formatCurrencyDecimal()` for API decimal values
- API returns: `{ amount: 10.50, currency: "EUR" }`
- Display: "€10.50"

**Data Sources**:
- `terms[0].paymentFrequency.price` - Primary price location
- `terms[0].rateStartPrice` - Fallback price
- `terms[0].contractVolumeInformation` - Total and average costs
- `terms[0].rateBonusPeriods` - Promotional periods
- `terms[0].priceAdjustmentRules` - Future price changes
- `terms[0].flatFees` - Setup/registration fees
- `allowedPaymentChoices` - Payment methods from API response

### Session Persistence

**Contract Flow State**: Saved to `sessionStorage` under `contractFlowState` key.

**Structure**:
```javascript
{
  selectedOffer: { ... },
  memberInfo: { ... },
  recurringToken: string,
  upfrontToken: string,
  timestamp: number, // For TTL validation
  currentStep: number
}
```

**Auto-save**: Triggered on form field changes (debounced 500ms)

**TTL**: 1 hour - state expires after inactivity

**Restoration**: Automatically loaded on page mount if valid

## Test Data

Located in `test_data/` directory:

- **cards.json**: Test credit/debit card numbers for all major brands
  - Format: `{ cardnumber, expiry, CVC, country, secure3DS? }`
  - Includes Visa, Mastercard, Amex, Bancontact, iDEAL, etc.

- **ibans.json**: Test IBAN accounts for SEPA Direct Debit
  - Format: `{ iban, bic, bank }`
  - 13 German test accounts

- **bacs_dd.json**: Test BACS Direct Debit for UK
  - Account: David Archer, 09083055, 560036

## Component Architecture

### Svelte 5 Runes API

This project uses Svelte 5 with the new Runes API:

```svelte
<script>
  // Reactive state with $state
  let count = $state(0);

  // Derived state with $derived
  let doubled = $derived(count * 2);

  // Effects with $effect
  $effect(() => {
    console.log(`Count is now: ${count}`);
  });

  // Props with $props
  let { title, onSubmit } = $props();
</script>
```

### Component Best Practices

1. **Props validation**: Use TypeScript-style JSDoc for prop types
2. **Events**: Use callback props instead of `createEventDispatcher`
3. **State**: Prefer local component state, use stores for global state
4. **Lifecycle**: Use `$effect` for side effects, `onMount` for initialization
5. **Cleanup**: Always cleanup subscriptions and event listeners

### Styling

**TailwindCSS Utilities**: Use utility classes for most styling

**DaisyUI Components**: Use for buttons, cards, modals, forms

**Custom Styles**: Use `<style>` blocks for component-specific styles

**Theme**: Currently using "corporate" theme from DaisyUI

**Responsive**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints

## Common Patterns

### API Calls with Error Handling

```javascript
async function fetchData() {
  const config = GlobalConfig.load();

  if (!config.apiKey || !config.baseUrl) {
    console.error('API configuration missing');
    return;
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    // Handle error appropriately
  }
}
```

### Form Validation

```javascript
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDateOfBirth(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  return age >= 16; // Minimum age requirement
}
```

### Currency Formatting

```javascript
// For API decimal values (e.g., 10.50)
export function formatCurrencyDecimal(value, currency = 'EUR') {
  if (typeof value === 'object' && value.amount !== undefined) {
    return formatCurrencyDecimal(value.amount, value.currency);
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(value);
}

// For cent values (e.g., 1050 = €10.50)
export function formatCurrency(cents, currency = 'EUR') {
  return formatCurrencyDecimal(cents / 100, currency);
}
```

## Debugging

**Browser Console**: Check for JavaScript errors and API responses

**Network Tab**: Inspect API requests and responses

**Svelte DevTools**: Use browser extension for component inspection

**Debug Logging**: Add `console.log` statements in components

**Test Mode**: Use `environment: 'test'` for payment widget testing

## Deployment

**Build Command**: `npm run build`

**Output**: `build/` directory with static files

**Adapter**: `@sveltejs/adapter-static` configured in `svelte.config.js`

**Hosting Options**:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting service

**Environment Variables**: Set API credentials via environment variables in production (not hardcoded)

## Critical Implementation Notes

### Payment Session Amount Format

**CRITICAL**: The `/v1/payments/user-session` endpoint expects **decimal format**, not cents.

```javascript
// ❌ WRONG - Don't multiply by 100
const requestBody = {
  amount: Math.round(10.50 * 100), // 1050 - INCORRECT!
  scope: "ECOM"
};

// ✅ CORRECT - Use decimal directly
const requestBody = {
  amount: 10.50, // Decimal format
  scope: "ECOM"
};
```

**Why this matters**: The API interprets the value as-is. Sending 1050 will charge €1050.00 instead of €10.50.

### Two Payment Tokens Required

The contract submission requires **two separate payment tokens**:

1. **Recurring Payment Token** (MEMBER_ACCOUNT scope, amount: 0)
   - Stores payment method for future monthly charges
   - Field: `customer.paymentRequestToken`
   - Created in Step 4

2. **Upfront Payment Token** (ECOM scope, actual amount)
   - Processes immediate payment for setup fees
   - Field: `contract.initialPaymentRequestToken`
   - Created in Step 5

**Never use the same token for both fields**. Each payment widget session creates a unique token tied to its scope and amount.

### Contract Flow Payment Integration

When creating payment sessions in the contract flow:

- **MEMBER_ACCOUNT scope**: Uses `allowedPaymentChoices` from the selected membership offer
- **ECOM scope**: Restricts to one-time payment methods only (CREDIT_CARD, PAYPAL, TWINT, IDEAL, BANCONTACT)
- All payment choices from offer are passed, including CASH and BANK_TRANSFER
- Fallback defaults: SEPA, BACS, CREDIT_CARD, CASH, BANK_TRANSFER

**Implementation**: Step 4 and Step 5 components handle payment token creation separately.

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Session Tokens**: Short-lived, stored only in memory or sessionStorage
3. **Payment Data**: Never stored locally, handled entirely by widget
4. **HTTPS**: Always use HTTPS in production
5. **Input Validation**: Validate all user inputs before API submission
6. **XSS Prevention**: Svelte automatically escapes content, but be careful with `{@html}`

---

## Deprecations and Removed Features

### Old HTML/JS Implementation Removed (2025-10-14)

The following files were removed as part of the Svelte migration:
- `index.html` - Old payment widget test page
- `script.js` - Old widget test logic
- `styles.css` - Old custom styles
- `config.js` - Old centralized configuration
- `nav.js` - Old navigation system
- `contract-flow.html` - Original 7-step contract flow
- `contract-flow-steps.js` - Original contract flow logic
- `contract-flow-app.js` - Legacy contract flow code
- `contract-flow-optimized.html` - Intermediate 4-step optimized flow
- `contract-flow-optimized.js` - Optimized flow logic

**Accessing Old Implementation**: The old HTML/JS implementation is preserved in git history under the tag `old-html-flow-final`.

```bash
# To view old implementation:
git checkout old-html-flow-final
```

**Migration Rationale**:
- Modern component architecture
- Better maintainability and code organization
- Improved developer experience with hot reload
- Proper build pipeline with optimizations
- Mobile-first responsive design
- Reusable component library

---

*End of documentation.*
