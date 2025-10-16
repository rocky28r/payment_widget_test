# Universal Payment Component Test Suite

A showcase application demonstrating the **MagicLine OpenAPI** integration with the **SPA Universal Payment Component**. Built with Svelte + SvelteKit, this project illustrates real-world payment flows including standalone widget testing and a complete 6-step membership contract signup process.

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white) ![DaisyUI](https://img.shields.io/badge/DaisyUI-5A0EF8?logo=daisyui&logoColor=white)

## 🎯 Purpose

This application demonstrates:
- **Payment Session Management** - Creating user sessions via MagicLine OpenAPI
- **Widget Integration** - Mounting and configuring the SPA Universal Payment Component
- **Dual Payment Flows** - Handling both recurring and one-time payments
- **Membership Contracts** - Complete end-to-end membership signup with payment
- **Smart Payment Detection** - Conditional payment steps based on business logic

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

**Configuration:**
1. Click the **Config** button (gear icon) in the navigation
2. Enter your MagicLine API credentials
3. Start testing payment flows

## 📦 What's Included

### 1. Universal Payment Component Test Page (`/`)

A standalone environment for testing the universal payment component with various configurations.

**Features:**
- Create payment sessions with custom amounts and scopes
- Test all payment methods (SEPA, BACS, Cards, PayPal, etc.)
- Configure widget appearance, locale, and environment
- Debug mode with detailed logging

### 2. Membership Contract Flow (`/contract-flow`)

A complete 6-step membership signup process showcasing a real-world integration.

**Flow:**
1. Browse and select membership offers
2. View detailed pricing and contract terms
3. Collect member personal information
4. Set up recurring payment method (if needed)
5. Process upfront fees (if applicable)
6. Review and submit contract

**Key Features:**
- Fetches offers from MagicLine OpenAPI
- Calculates pricing with vouchers and age discounts
- Smart payment step detection (skips unnecessary steps)
- Live contract summary with real-time updates
- Session persistence across page reloads

## 🔑 Key Implementations

### User Session Creation

Payment sessions are created via the MagicLine OpenAPI before mounting the widget. This is the critical first step for any payment flow.

**Endpoint:** `POST /v1/payments/user-session`

**Request Structure:**
```javascript
const response = await fetch(`${baseUrl}/v1/payments/user-session`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey
  },
  body: JSON.stringify({
    amount: 49.99,                      // Decimal format (NOT cents)
    currency: 'EUR',
    scope: 'MEMBER_ACCOUNT',            // or 'ECOM' for one-time payments
    referenceText: 'Monthly Membership',
    customerId: 12345,                  // Optional: Your ERP customer ID
    finionPayCustomerId: 'uuid',        // Optional: Existing Finion Pay customer
    permittedPaymentChoices: [          // Optional: Filter payment methods
      'SEPA_DIRECT_DEBIT',
      'CREDIT_CARD',
      'PAYPAL'
    ]
  })
});

const { token, tokenValidUntil, finionPayCustomerId } = await response.json();
```

**Important Details:**
- **Amount format:** Use decimal values (e.g., `10.50` for €10.50), NOT cents
- **Scope:**
  - `MEMBER_ACCOUNT` - For recurring payments (stores payment method for future use)
  - `ECOM` - For one-time payments (processes payment immediately)
- **Token validity:** Sessions expire after a short time (check `tokenValidUntil`)
- **Customer linking:** Use `finionPayCustomerId` to link multiple sessions to the same customer

### Universal Payment Component Mounting

Once you have a session token, you can mount the universal payment component in your application.

**Widget Library:**
```html
<script src="https://widget.dev.payment.sportalliance.com/widget.js"></script>
```

**Initialization:**
```javascript
// Ensure widget script is loaded
if (window.paymentWidget) {
  const widget = window.paymentWidget.init({
    userSessionToken: token,              // Token from session creation
    container: 'payment-widget-container', // DOM element ID
    countryCode: 'DE',                    // User's country
    locale: 'en-US',                      // Widget language
    environment: 'test',                  // 'test', 'sandbox', or 'live'

    // Success callback
    onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
      console.log('Payment successful!');
      console.log('Token:', paymentRequestToken);
      console.log('Details:', paymentInstrumentDetails);

      // Use paymentRequestToken in your contract/signup API call
      // paymentInstrumentDetails contains method info (last4, brand, etc.)
    },

    // Error callback
    onError: (error) => {
      console.error('Payment failed:', error);
    }
  });

  // Cleanup when unmounting component
  onDestroy(() => {
    widget.destroy();
  });
}
```

**Widget Configuration Options:**
- `countryCode` - Determines available payment methods
- `locale` - Widget UI language (e.g., 'de-DE', 'en-US', 'fr-FR')
- `environment` - Test mode uses sandbox payment processors
- `styling` - Optional custom CSS overrides
- `i18nOverride` - Optional custom translations

### Dual Payment Token System

The membership contract flow showcases a sophisticated pattern: handling both recurring and one-time payments in a single signup.

**The Challenge:**
Members need to:
1. Store a payment method for monthly membership dues (recurring)
2. Pay upfront fees like registration or first month (one-time)

**The Solution:**
Create **two separate payment sessions** with different scopes:

```javascript
// Step 4: Recurring Payment Method
const recurringSession = await createPaymentSession({
  amount: 0,                          // Amount is 0 for storing method
  scope: 'MEMBER_ACCOUNT',            // Recurring scope
  permittedPaymentChoices: [          // From membership offer
    'SEPA_DIRECT_DEBIT',
    'BACS_DIRECT_DEBIT',
    'CREDIT_CARD'
  ]
});

// Step 5: Initial Payment
const upfrontSession = await createPaymentSession({
  amount: 49.99,                      // Actual amount to charge now
  scope: 'ECOM',                      // One-time scope
  permittedPaymentChoices: [          // Limited to immediate payment methods
    'CREDIT_CARD',
    'PAYPAL',
    'TWINT'
  ]
});

// Final Submission: Use both tokens
await submitSignup({
  customer: {
    paymentRequestToken: recurringToken  // For future monthly charges
  },
  contract: {
    initialPaymentRequestToken: upfrontToken  // For upfront fees
  }
});
```

**Why Two Tokens?**
- Each widget session is tied to a specific amount and scope
- You cannot reuse a token for multiple purposes
- The API expects tokens in specific fields based on their purpose
- Recurring tokens store payment methods; ECOM tokens process immediate charges

**Smart Detection:**
The application intelligently determines which payment steps are needed:

```javascript
const needsRecurring = offer.allowedPaymentChoices?.length > 0;
const needsUpfront = dueOnSigningAmount > 0;

// Skip Step 4 if offer doesn't support recurring payments
// Skip Step 5 if there are no upfront fees
// Show both if both are required
```

### Live Pricing with Preview API

The contract flow demonstrates real-time pricing updates using the signup preview endpoint.

**Endpoint:** `POST /v1/memberships/signup/preview`

**Usage:**
```javascript
// Called whenever user enters voucher code or personal info changes
const preview = await fetch(`${baseUrl}/v1/memberships/signup/preview`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey
  },
  body: JSON.stringify({
    membershipOfferId: selectedOffer.id,
    member: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15'    // Age-based discounts detected
    },
    voucherCode: 'SUMMER2025'        // Voucher validation
  })
});

const {
  discounts,              // Applied discounts (age, voucher, etc.)
  flatFees,               // Registration, setup fees
  dueOnSigningAmount      // Total amount due upfront
} = await preview.json();

// Update UI with real-time pricing
contractSummary.totalDueNow = dueOnSigningAmount;
```

**What It Does:**
- Validates voucher codes
- Calculates age-based discounts
- Computes exact upfront amount including all fees
- Provides discount details for transparent pricing

### Session Persistence

The contract flow implements automatic session persistence to prevent data loss during signup.

**Implementation:**
```javascript
// Auto-save to sessionStorage on every form change
function saveState() {
  sessionStorage.setItem('contractFlowState', JSON.stringify({
    selectedOffer,
    memberInfo,
    recurringToken,
    upfrontToken,
    currentStep,
    timestamp: Date.now()
  }));
}

// Restore on page load
function restoreState() {
  const saved = sessionStorage.getItem('contractFlowState');
  if (saved) {
    const state = JSON.parse(saved);

    // Check if state is still valid (1 hour TTL)
    const age = Date.now() - state.timestamp;
    if (age < 3600000) {
      return state;
    }
  }
  return null;
}
```

**Benefits:**
- Survives page refreshes
- Auto-expires after 1 hour
- Debounced saves to prevent excessive writes
- Restores user to exact step they were on

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── contractFlow/          # 6-step contract components
│   │   ├── payment/               # Widget integration components
│   │   ├── layout/                # Navigation with global config
│   │   └── ui/                    # Reusable UI components
│   ├── services/
│   │   └── api.js                 # MagicLine API client
│   └── utils/
│       ├── format.js              # Currency formatting
│       └── validation.js          # Form validation
├── routes/
│   ├── +page.svelte               # Payment widget test
│   └── contract-flow/
│       └── +page.svelte           # Contract flow
└── app.html
```

## 🧪 Test Data

Test credentials are provided in `test_data/`:

- `cards.json` - Test credit/debit cards for all major brands
- `ibans.json` - Test IBAN accounts for SEPA Direct Debit
- `bacs_dd.json` - Test BACS Direct Debit for UK payments

## 🔧 API Configuration

**Global Config System:**
The application uses a centralized configuration accessible from any page:

```javascript
// Located in Navigation.svelte
class GlobalConfig {
  static load() {
    const config = localStorage.getItem('globalApiConfig');
    return config ? JSON.parse(config) : { apiKey: '', baseUrl: '' };
  }

  static save(apiKey, baseUrl) {
    localStorage.setItem('globalApiConfig', JSON.stringify({ apiKey, baseUrl }));
  }
}
```

**Required Permissions:**
Your API key must have the `PAYMENT_WRITE` permission to create payment sessions.

## 📚 Technical Stack

- **Framework:** SvelteKit 2.x with Svelte 5 (Runes API)
- **Styling:** TailwindCSS 3.x + DaisyUI 4.x
- **Build Tool:** Vite 5.x
- **Deployment:** Static adapter for any hosting platform

## 🚀 Production Build

```bash
# Build optimized static site
npm run build

# Preview production build locally
npm run preview

# Deploy the build/ directory to any static host
```

## 🔒 Security Considerations

- **Never commit API keys** - Use environment variables in production
- **HTTPS required** - Payment widget requires secure connection
- **Session token security** - Tokens are short-lived and single-use
- **PCI compliance** - Payment data never touches your servers (handled by widget)

## 💡 Tips for Integration

1. **Amount Format:** Always use decimal format for amounts (e.g., `10.50`), not cents
2. **Scope Selection:** Choose `MEMBER_ACCOUNT` for recurring, `ECOM` for one-time
3. **Widget Cleanup:** Always call `widget.destroy()` when unmounting to prevent memory leaks
4. **Error Handling:** Payment widget errors should be displayed to users for retry
5. **Token Linking:** Use `finionPayCustomerId` to link multiple sessions to same customer
6. **Payment Method Filtering:** Use `permittedPaymentChoices` to control available options
7. **Testing:** Use `environment: 'test'` for development, sandbox processors won't charge real money

---

**Built to showcase:** MagicLine OpenAPI capabilities with SPA Universal Payment Component integration

For detailed implementation documentation, see `CLAUDE.md`
