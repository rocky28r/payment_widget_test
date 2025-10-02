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