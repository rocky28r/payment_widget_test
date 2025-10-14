# Payment Widget Test Suite

A modern Svelte + SvelteKit application for testing and demonstrating the SPA Payment Widget integration with the Finion Pay API. This comprehensive testing interface includes both a standalone payment widget test environment and a complete 6-step membership contract signup flow.

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white) ![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?logo=svelte&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white) ![DaisyUI](https://img.shields.io/badge/DaisyUI-5A0EF8?logo=daisyui&logoColor=white)

## 🚀 Features

### Payment Widget Test Environment
- ✅ **Session Management**: Create and manage payment sessions via Finion Pay API
- ✅ **Widget Configuration**: Configure all widget parameters including environment, locale, and styling
- ✅ **Payment Methods**: Support for SEPA, BACS, Credit Card, PayPal, Twint, iDEAL, Bancontact, and more
- ✅ **Debug Tools**: Real-time logging and error handling
- ✅ **Manual Token Entry**: Test with existing session tokens

### Membership Contract Flow (6 Steps)
A complete end-to-end membership signup process:

1. **Offer Selection** - Browse and select membership offers with detailed pricing
2. **Offer Details** - View comprehensive offer information, pricing breakdown, and contract terms
3. **Personal Information** - Collect member details with inline validation
4. **Payment Method (Recurring)** - Set up recurring payment method for monthly dues
5. **Initial Payment** - Process upfront fees (setup, registration) if applicable
6. **Review & Confirm** - Final review and contract submission

**Key Features:**
- Smart payment step detection (automatically skips unnecessary payment steps)
- Live contract summary with real-time price updates
- Age-based discount detection and application
- Voucher code validation and preview
- Session persistence with auto-save/restore
- Mobile-responsive design with DaisyUI components
- Comprehensive error handling and validation

### Developer Experience
- ✅ **Modern Stack**: Svelte 5, SvelteKit, TailwindCSS, DaisyUI
- ✅ **Type Safety**: JavaScript with JSDoc type annotations
- ✅ **Hot Module Reload**: Instant feedback during development
- ✅ **Component Architecture**: Reusable, maintainable components
- ✅ **Centralized API Config**: Global configuration accessible across all pages

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- Valid **Finion Pay API key** with `PAYMENT_WRITE` permission
- Access to **SPA Payment Widget** library

## 🛠️ Setup & Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd payment-widget-test
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Open your browser to `http://localhost:5173`
   - Payment Widget Test: `http://localhost:5173/`
   - Contract Flow: `http://localhost:5173/contract-flow`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
payment-widget-test/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── contractFlow/       # Contract flow step components
│   │   │   │   ├── ContractSummary.svelte
│   │   │   │   ├── Step1OfferSelection.svelte
│   │   │   │   ├── Step2OfferDetails.svelte
│   │   │   │   ├── Step3PersonalInfo.svelte
│   │   │   │   ├── Step4RecurringPayment.svelte
│   │   │   │   ├── Step5InitialPayment.svelte
│   │   │   │   └── Step6Review.svelte
│   │   │   ├── payment/            # Payment widget components
│   │   │   │   ├── WidgetContainer.svelte
│   │   │   │   └── SessionManager.svelte
│   │   │   ├── layout/             # Navigation and layout
│   │   │   │   └── Navigation.svelte
│   │   │   └── ui/                 # Reusable UI components
│   │   │       ├── Card.svelte
│   │   │       └── Button.svelte
│   │   ├── services/               # API services and utilities
│   │   │   ├── api.js              # Finion Pay API client
│   │   │   └── paymentWidget.js    # Payment widget integration
│   │   └── utils/                  # Helper functions
│   │       ├── format.js           # Formatting utilities
│   │       └── validation.js       # Form validation
│   ├── routes/
│   │   ├── +layout.svelte          # Root layout with navigation
│   │   ├── +page.svelte            # Payment Widget Test (home)
│   │   └── contract-flow/          # Contract flow route
│   │       └── +page.svelte        # Contract flow main page
│   └── app.html                    # HTML template
├── static/                         # Static assets
├── test_data/                      # Test credentials
│   ├── cards.json                  # Test credit card numbers
│   ├── ibans.json                  # Test IBAN/SEPA accounts
│   └── bacs_dd.json                # Test BACS Direct Debit
├── package.json
├── svelte.config.js
├── vite.config.js
├── tailwind.config.js
├── CLAUDE.md                       # Project documentation for AI
└── README.md                       # This file
```

## 🔧 Usage Guide

### Global API Configuration

1. Click the **"Config"** button (gear icon) in the navigation bar
2. Enter your **API Key** and **Base URL**
3. Click **"Save Configuration"**
4. Configuration is automatically synced across all pages

### Payment Widget Test Page

1. **Navigate to Home** (`/`)
2. **Create Payment Session:**
   - Amount, Scope (MEMBER_ACCOUNT or ECOM)
   - Optional: Customer ID, Reference Text, Payment Method Filters
3. **Configure Widget:**
   - Country, Locale, Environment
   - Styling and i18n overrides (optional)
4. **Mount Widget:**
   - Click "Mount Payment Widget"
   - Complete payment flow in widget
5. **Handle Results:**
   - Success: Receive payment token and instrument details
   - Error: Review error messages in logs

### Membership Contract Flow

1. **Navigate to Contract Flow** (`/contract-flow`)
2. **Step 1: Select Offer**
   - Browse available membership offers
   - View pricing and estimated initial payment
   - Click "Continue" on selected offer
3. **Step 2: View Details**
   - Review comprehensive offer details
   - See pricing breakdown, timeline, and contract terms
   - Accept terms and continue
4. **Step 3: Personal Information**
   - Fill in member details (name, DOB, address)
   - Form auto-saves progress to session storage
   - Age discounts automatically detected
5. **Step 4: Recurring Payment** (if applicable)
   - Select payment method for monthly dues
   - Complete payment widget for MEMBER_ACCOUNT scope
6. **Step 5: Initial Payment** (if applicable)
   - Pay setup fees or first month upfront
   - Complete payment widget for ECOM scope
7. **Step 6: Review & Confirm**
   - Review all contract details
   - Verify payment information
   - Submit final signup

**Smart Payment Detection:**
- If no upfront payment needed → Skips Step 5
- If no recurring payment needed → Skips Step 4
- If no payments at all → Skips directly to review

## 🔌 API Integration

### Finion Pay API Endpoints

**Payment Session:** `POST /v1/payments/user-session`
```javascript
{
  "amount": 10.50,                  // Decimal format (not cents)
  "scope": "MEMBER_ACCOUNT",        // or "ECOM"
  "referenceText": "Optional",
  "customerId": 123456,             // Optional ERP ID
  "finionPayCustomerId": "uuid",    // Optional Finion Pay UUID
  "permittedPaymentChoices": []     // Optional array of methods
}
```

**Membership Offers:** `GET /v1/memberships/membership-offers`

**Offer Details:** `GET /v1/memberships/membership-offers/{id}`

**Signup Preview:** `POST /v1/memberships/signup/preview`
- Used for voucher validation and price calculation
- Returns discounts, flat fees, and due-on-signing amount

**Signup Submission:** `POST /v1/memberships/signup`
- Final contract creation with all details

### Authentication

All API requests require the `X-API-KEY` header with a valid API key.

## 💾 Test Data

The `test_data/` directory contains test credentials for various payment methods:

- **cards.json**: Test credit/debit cards (Visa, Mastercard, Amex, etc.)
- **ibans.json**: Test IBAN accounts for SEPA Direct Debit
- **bacs_dd.json**: Test BACS Direct Debit account (UK)

## 🎨 Styling & Theming

The application uses **TailwindCSS** for utility-first styling and **DaisyUI** for component themes.

**Customization:**
- Edit `tailwind.config.js` for theme customization
- DaisyUI theme: Currently using "corporate" theme
- Component-specific styles in Svelte component `<style>` blocks

## 🐛 Troubleshooting

### Common Issues

**API Key Authentication Failed**
- Verify API key has `PAYMENT_WRITE` permission
- Check Base URL is correct (no trailing slash)
- Ensure global config is saved

**Widget Not Loading**
- Check browser console for JavaScript errors
- Verify widget script URL is accessible
- Confirm CORS settings allow widget loading

**Session Token Expired**
- Tokens have limited validity (check `tokenValidUntil`)
- Create a new payment session
- Enable manual token entry to test with existing tokens

**Payment Methods Not Available**
- Some methods are country/currency specific
- Check offer's `allowedPaymentChoices` configuration
- Verify scope matches use case (MEMBER_ACCOUNT vs ECOM)

### Debug Mode

Enable debug logging in components by setting `debug = true` in component code or checking browser console for detailed logs.

## 🔒 Security Notes

- **API Keys**: Never commit API keys to version control
- **Session Tokens**: Short-lived, automatically expire
- **Payment Data**: Never stored in application, handled by secure widget
- **HTTPS Required**: Always use HTTPS in production environments

## 🌐 Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📚 Technical Stack

- **Framework**: SvelteKit 2.x with Svelte 5
- **Styling**: TailwindCSS 3.x + DaisyUI 4.x
- **Build Tool**: Vite 5.x
- **Adapter**: Static adapter for deployment
- **Language**: JavaScript with JSDoc type annotations
- **Payment Integration**: SPA Payment Widget library

## 🚀 Deployment

The application is configured with `@sveltejs/adapter-static` for static site deployment.

**Build for deployment:**
```bash
npm run build
```

The `build/` directory contains the static site ready for deployment to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is provided as-is for testing and development purposes.

---

## 🔄 Recent Changes

### Major Refactor: Svelte Migration (2025-10-14)
- **Complete rewrite** from static HTML/JS to Svelte + SvelteKit
- **Unified application** with two routes: Payment Widget Test and Contract Flow
- **Component architecture** for better maintainability and reusability
- **Modern development** with hot module reload and proper build pipeline
- **Improved UX** with reactive state management and smooth transitions
- **Mobile-first** responsive design with DaisyUI components

### Contract Flow Implementation
- **6-step membership signup** with comprehensive flow
- **Smart payment detection** automatically skips unnecessary steps
- **Session persistence** with localStorage auto-save/restore
- **Live contract summary** with real-time price updates
- **Age discount detection** and voucher code validation
- **Payment instrument details** properly captured for both payment types

---

## 📞 Support

For technical support or questions:
- Check browser console for detailed error messages
- Review `CLAUDE.md` for implementation details
- Verify API documentation for latest requirements
- Test with provided test data in `test_data/` directory

---

**Note**: This is a testing and demonstration tool. Ensure proper security measures and production-ready configurations before deploying to production environments.
