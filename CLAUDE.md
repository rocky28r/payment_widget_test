# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Payment Widget Test Suite that integrates with the Finion Pay API to create payment sessions and test payment widget functionality. The application provides a complete workflow from session creation through widget mounting and payment processing.

## Architecture

**Multi-file Structure**: The application is organized into separate files for better maintainability:
- `index.html` - Main HTML structure with three-section layout and modern responsive design
- `styles.css` - Custom CSS styles (font family and transition effects)
- `config.js` - Centralized API and widget configuration (shared across entire application)
- `script.js` - Comprehensive JavaScript for API integration, session management, and widget control

**Three-Section Layout**:
1. **Payment Session Generation** - API configuration and session creation
2. **Widget Configuration** - Component mounting parameters and settings
3. **Component Container** - Payment widget display area with error handling

**External Dependencies**:
- TailwindCSS via CDN for styling and responsive design
- Google Fonts (Inter) for typography
- SPA Payment Widget library: `https://widget.dev.payment.sportalliance.com/widget.js`

**Widget API**:
- Initialization: `window.paymentWidget.init(config)` returns `{ destroy(): void }`
- Cleanup: Call `widgetInstance.destroy()` to unmount and cleanup resources

## Centralized Configuration

**config.js**: Provides centralized API and widget configuration used throughout the application:
- `API_CONFIG`: Base URLs, endpoints, headers configuration, and helper methods
- `WIDGET_CONFIG`: Widget script URL and default settings
- `STORAGE_CONFIG`: Local storage keys and versioning

**Global API Configuration** (nav.js - `GlobalConfig` class):
- Access via the "Config" button (gear icon) in the navigation bar
- Set API Key and Base URL once, used across all pages
- Automatically syncs to both Payment Widget Test and Contract Flow pages
- Persisted in localStorage under `globalApiConfig` key

**Usage**:
```javascript
// Get API headers with authentication
const headers = API_CONFIG.getHeaders(apiKey);

// Get full API URL
const url = `${baseUrl}${API_CONFIG.endpoints.userSession}`;

// Use widget configuration
script.src = `${WIDGET_CONFIG.scriptUrl}?t=${Date.now()}`;

// Access global configuration
GlobalConfig.open();  // Open config modal
GlobalConfig.save();  // Save and sync configuration
GlobalConfig.load();  // Load saved configuration
```

## API Integration

**Finion Pay API Endpoint**: `/v1/payments/user-session` (POST)

**Authentication**: API key via `X-API-KEY` header

**Request Parameters**:
- `amount` (required): Payment amount (use 0 for recurring payments)
- `scope` (required): "MEMBER_ACCOUNT" or "ECOM"
- `referenceText` (optional): Bank statement reference
- `customerId` (optional): ERP customer ID (can be used with finionPayCustomerId)
- `finionPayCustomerId` (optional): Finion Pay customer UUID (can be used with customerId)
- `permittedPaymentChoices` (optional): Array of allowed payment methods

**Response**: Returns session token and expiry timestamp

**Contract Flow Integration**: When creating payment sessions in the contract flow:
- For `MEMBER_ACCOUNT` scope: Uses `allowedPaymentChoices` from the selected membership offer (field name in API response)
- For `ECOM` scope: Restricts to one-time payment methods only (CREDIT_CARD, PAYPAL, TWINT, IDEAL, BANCONTACT)
- All payment choices from offer are passed, including CASH and BANK_TRANSFER
- Fallback defaults include: SEPA, BACS, CREDIT_CARD, CASH, BANK_TRANSFER
- Implementation: `contract-flow-steps.js:1330` `createPaymentSession()` function

## Development Commands

Since this is a static website with separate HTML, CSS, and JS files, no build process is required:
- **Run locally**: Open `index.html` directly in a browser or use a simple HTTP server
- **Test with HTTP server**: `python3 -m http.server 8000` or `npx serve .`

## Key Implementation Details

**Session Management**: Application maintains session state including token and expiry validation.

**Form Validation**: Comprehensive client-side validation with real-time error feedback.

**Customer ID Fields**: Both customerId and finionPayCustomerId can be provided together in the same session request.

**Progressive Enhancement**: Mount button is disabled until valid session token is created.

**Error Handling**: Comprehensive error handling for API failures, widget loading issues, and session expiry.

**Activity Logging**: Enhanced logging system with timestamps, categorized messages, and clear functionality.

**Loading States**: Visual feedback during API calls and widget mounting operations.

**Payment Methods**: Supports CREDIT_CARD, PAYPAL, SEPA, BACS, TWINT, IDEAL, and other payment types.

## Membership Offer Cost Display

**Contract Flow - Step 2: Offer Details** implements a streamlined, transparent cost display system:

**Design Strategy**:
1. **Cost Hierarchy** - Most important costs shown first (hero card)
2. **Visual Timeline** - Chronological display with intelligent deduplication
3. **Single Source of Truth** - "What's Included" consolidates all contract terms
4. **No Redundancy** - Information appears once, in the most relevant location
5. **Smart Condensing** - Timeline hides duplicate pricing, shows only when it changes

**Implementation Components**:

**1. Hero Cost Summary Card** (Gradient blue card, most prominent)
- Starting price with large, bold typography (from `term.paymentFrequency.price` or `term.rateStartPrice`)
- Setup fees and one-time costs (from `term.flatFees`)
- Total contract value over initial term (from `term.contractVolumeInformation.totalContractVolume`)
- Safe price formatting using `formatCurrencyDecimal()` for API decimal values

**2. Contract Timeline Visualization** (Intelligently condensed)
- 🟢 **Green**: Promotional/bonus periods (from `term.rateBonusPeriods`) - only if present
- 🔵 **Blue**: Initial membership period with pricing
- 🟣 **Purple**: Extension period - **ONLY shown if price actually changes**
  - Automatically hidden if extension price equals initial price
  - Eliminates redundant €10.00/mo → €10.00/mo display
- Uses `priceChangesAfterInitialTerm` check to prevent duplication

**3. Price Adjustments & Changes** (Amber warning box)
- Only shown if `term.priceAdjustmentRules` exist
- All future price changes with icons (📈 RAISE, 📉 REDUCTION, 💰 NEW_BASIC_AMOUNT)
- Default description from API
- Ensures transparency for future pricing

**4. What's Included** (Comprehensive single section - NOT expandable)
- **Included Modules**: List of all `includedModules` with descriptions
- **Contract Terms**: Two-column grid with all term details:
  - Cancellation Period (from `term.cancelationPeriod`)
  - Extension Term (from `term.extensionTerm`)
  - Contract Start Date (from `term.defaultContractStartDate`)
  - Start Date of Use (from `term.defaultContractStartDateOfUse`, if different)
  - Auto-Renewal (derived from `term.extensionType !== 'NONE'`)
  - Cancellation Strategy (formatted from `term.cancelationStrategy`)
- **Cancellation & Refund Policy**: Yellow warning box with bullets
  - Cancellation period details
  - Fee information
  - Pro-rata refund policy
- **Accepted Payment Methods**: Pills display of `allowedPaymentChoices`
- **Footnote**: Legal/contractual comments if present

**Removed Sections** (eliminated redundancy):
- ❌ "Detailed Cost Breakdown" expandable - removed (price already in hero + timeline)
- ❌ "Contract Terms" expandable - removed (consolidated into "What's Included")
- ❌ Duplicate timeline entries - hidden when price doesn't change

**API Data Sources**: Uses `/v1/memberships/membership-offers/{membershipOfferId}` endpoint:
- `terms[0].paymentFrequency.price` - Primary price location
- `terms[0].rateStartPrice` - Fallback price location
- `terms[0].contractVolumeInformation` - Total and average costs
- `terms[0].rateBonusPeriods` - Promotional periods
- `terms[0].priceAdjustmentRules` - Future price changes
- `terms[0].flatFees` - One-time setup costs
- `terms[0].cancelationPeriod`, `extensionTerm`, `cancelationStrategy` - Contract terms
- `allowedPaymentChoices` - Payment methods

**Benefits**:
- ✅ **No redundancy** - Each piece of information appears exactly once
- ✅ **Cleaner layout** - Less vertical space, easier to scan
- ✅ **Intelligent condensing** - Timeline adapts based on actual price changes
- ✅ **Single source of truth** - "What's Included" is comprehensive
- ✅ **Proper price location** - Uses `paymentFrequency.price` per API structure
- ✅ **Better UX** - Users don't see duplicate €10.00/mo three times

## Widget Configuration

**Required Parameters**:
- `userSessionToken`: User authentication token from API (contains payment amount and session details)
- `container`: DOM element ID or HTMLElement for widget mounting (set to 'payment-widget-container')
- `countryCode`: ISO country code (DE, US, GB, CH, FR, IT, ES, NL, BE, AT)
- `locale`: Language locale (en, en-US, en-GB, de-DE, fr-FR, it-IT, es-ES, nl-NL)

**Optional Parameters**:
- `environment`: 'test', 'sandbox' (default), or 'live'
- `styling`: Custom theme colors and styling object
- `i18n`: Translation overrides object
- `onSuccess`: Success callback function receiving (paymentRequestToken, paymentInstrumentDetails)
- `onError`: Error callback function receiving error object
- `devMode`: Show i18n keys instead of translated text (development only)

**Note**: `amount` and `currency` are no longer required in widget config as they are handled by the user session token.

## Widget Integration Flow

1. Configure API credentials and session parameters (including amount)
2. Create payment session via API call
3. Receive and store session token (contains amount and payment details)
4. Configure widget mounting parameters (country, environment, locale, styling, i18n)
5. Initialize widget with `window.paymentWidget.init(config)`
6. Handle payment success/error callbacks with payment instrument details

## Payment Instrument Details

The `onSuccess` callback receives two parameters:
1. `paymentRequestToken` (string): The payment authorization token
2. `paymentInstrumentDetails` (object, optional): Details about the payment method used

**PaymentInstrumentDetails Interface**:
- `creditCard`: Brand, card holder, masked card number, expiry, issuer country
- `sepa`: Bank account details (account holder, bank name, BIC, IBAN, signature)
- `bacs`: Account holder, bank account number, sort code, mandate ID, direct debit PDF URL
- `chDD`: Swiss Direct Debit bank account details
- `lsvDD`: LSV Direct Debit bank account details
- `ideal`: iDEAL issuer information
- `banContactCard`: Bancontact card details (holder, masked number, expiry)
- `paypal`: PayPal payment confirmation
- `twint`: Twint payment confirmation
- `cash`: Cash payment confirmation
- `bankTransfer`: Bank transfer payment confirmation

## UI/UX Features

**Responsive Design**: Three-column layout on desktop, stacked on mobile
**Visual Hierarchy**: Color-coded sections (blue, green, purple) with icons
**Progressive Disclosure**: Form fields and buttons enable/disable based on state
**Real-time Feedback**: Immediate validation and status updates
**Accessibility**: Proper labeling, focus states, and keyboard navigation

## Test Data

The `test_data/` directory contains test payment credentials for automated testing:

**cards.json**: Test credit/debit card numbers for various card brands and countries
- American Express, Bancontact, Cartes Bancaires, China UnionPay, Dankort, Diners, Discover, JCB, Maestro, Mastercard, Visa, Visa Electron, V Pay
- Each card includes: card number, expiry date, CVC, issuer country
- Some cards support 3D Secure authentication (marked with `secure3DS: true`)
- Test data format: `{ "cardnumber": "4111 1111 1111 1111", "expiry": "03/30", "CVC": "737", "country": "NL" }`

**ibans.json**: Test IBAN bank account numbers for SEPA Direct Debit
- 13 test German IBANs with corresponding BIC codes and bank names
- Test data format: `{ "iban": "DE02...", "bic": "...", "bank": "..." }`

**bacs_dd.json**: Test BACS Direct Debit account for UK payments
- Account name: David Archer
- Account number: 09083055
- Sort code: 560036