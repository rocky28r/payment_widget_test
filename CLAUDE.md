# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Payment Widget Test Suite that integrates with the Finion Pay API to create payment sessions and test payment widget functionality. The application provides a complete workflow from session creation through widget mounting and payment processing.

## Architecture

**Multi-file Structure**: The application is organized into separate files for better maintainability:
- `index.html` - Main HTML structure with three-section layout and modern responsive design
- `styles.css` - Custom CSS styles (font family and transition effects)
- `script.js` - Comprehensive JavaScript for API integration, session management, and widget control

**Three-Section Layout**:
1. **Payment Session Generation** - API configuration and session creation
2. **Widget Configuration** - Component mounting parameters and settings
3. **Component Container** - Payment widget display area with error handling

**External Dependencies**:
- TailwindCSS via CDN for styling and responsive design
- Google Fonts (Inter) for typography
- SPA Payment Widget library: `https://spa-payment-widget-tgg.s3.eu-west-1.amazonaws.com/spa-payment/widget.js`

## API Integration

**Finion Pay API Endpoint**: `/v1/payments/user-session` (POST)

**Authentication**: API key via `X-API-KEY` header

**Request Parameters**:
- `amount` (required): Payment amount (use 0 for recurring payments)
- `scope` (required): "MEMBER_ACCOUNT" or "ECOM"
- `referenceText` (optional): Bank statement reference
- `customerId` (optional): ERP customer ID (mutually exclusive with finionPayCustomerId)
- `finionPayCustomerId` (optional): Finion Pay customer UUID
- `permittedPaymentChoices` (optional): Array of allowed payment methods

**Response**: Returns session token and expiry timestamp

## Development Commands

Since this is a static website with separate HTML, CSS, and JS files, no build process is required:
- **Run locally**: Open `index.html` directly in a browser or use a simple HTTP server
- **Test with HTTP server**: `python3 -m http.server 8000` or `npx serve .`

## Key Implementation Details

**Session Management**: Application maintains session state including token and expiry validation.

**Form Validation**: Comprehensive client-side validation with real-time error feedback.

**Mutual Exclusivity**: Customer ID fields are mutually exclusive with automatic UI management.

**Progressive Enhancement**: Mount button is disabled until valid session token is created.

**Error Handling**: Comprehensive error handling for API failures, widget loading issues, and session expiry.

**Activity Logging**: Enhanced logging system with timestamps, categorized messages, and clear functionality.

**Loading States**: Visual feedback during API calls and widget mounting operations.

**Payment Methods**: Supports CREDIT_CARD, PAYPAL, SEPA, BACS, TWINT, IDEAL, and other payment types.

## Widget Configuration

**Required Parameters**:
- `userSessionToken`: User authentication token from API
- `container`: DOM element ID for widget mounting (set to 'spa-component-frame')
- `amount`: Payment amount in cents
- `currency`: ISO currency code (EUR, USD, GBP, CHF)
- `countryCode`: ISO country code (DE, US, GB, CH, FR, IT, ES, NL, BE, AT)

**Optional Parameters**:
- `environment`: 'test', 'sandbox' (default), or 'live'
- `locale`: Language locale (en-US, en-GB, de-DE, fr-FR, it-IT, es-ES, nl-NL)
- `onSuccess`: Success callback function receiving payment token
- `onError`: Error callback function receiving error object

## Widget Integration Flow

1. Configure API credentials and session parameters
2. Create payment session via API call
3. Receive and store session token
4. Configure widget mounting parameters (amount, currency, country, environment, locale)
5. Mount payment widget with complete configuration
6. Handle payment success/error callbacks

## UI/UX Features

**Responsive Design**: Three-column layout on desktop, stacked on mobile
**Visual Hierarchy**: Color-coded sections (blue, green, purple) with icons
**Progressive Disclosure**: Form fields and buttons enable/disable based on state
**Real-time Feedback**: Immediate validation and status updates
**Accessibility**: Proper labeling, focus states, and keyboard navigation