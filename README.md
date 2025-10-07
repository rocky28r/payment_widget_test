# Payment Widget Test Suite

A comprehensive testing interface for the SPA Payment Widget that integrates with the Finion Pay API. This tool provides a complete workflow for creating payment sessions, configuring widgets, and testing payment functionality.

![Payment Widget Test Suite](https://img.shields.io/badge/Status-Active-green) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white)

## 🚀 Features

### Payment Session Management
- ✅ **API Integration**: Full integration with Finion Pay API endpoints
- ✅ **Session Creation**: Create user payment sessions with comprehensive parameters
- ✅ **Token Management**: Automatic token handling with expiry validation
- ✅ **Manual Token Entry**: Option to manually enter session tokens for testing

### Widget Configuration
- ✅ **Complete Parameter Support**: All required and optional widget parameters
- ✅ **Environment Selection**: Test, Sandbox, and Live environment support
- ✅ **Currency & Localization**: Multiple currencies and locales supported
- ✅ **Payment Methods**: Full support for all available payment methods

### Developer Tools
- ✅ **Debug Mode**: Detailed API request/response logging
- ✅ **Activity Logs**: Real-time logging with categorized messages
- ✅ **Local Storage**: Automatic persistence of form data across sessions
- ✅ **Responsive Design**: Mobile-friendly interface

### Payment Methods Supported
- Cash, Bank Transfer, BACS Direct Debit
- SEPA Direct Debit, CH DD, LSV Direct Debit
- Credit Card, Twint, PayPal
- Bancontact, iDEAL

## 📋 Prerequisites

- Modern web browser with JavaScript enabled
- Valid Finion Pay API key
- Access to SPA Payment Widget library
- HTTP server (for local testing)

## 🛠️ Setup & Installation

### Quick Start
1. **Clone or download** the project files
2. **Open locally**: Open `index.html` directly in a browser, or
3. **Use HTTP server**: 
   ```bash
   # Python
   python3 -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```
4. **Access**: Navigate to `http://localhost:8000` (if using HTTP server)

### File Structure
```
payment-widget-test/
├── index.html          # Main HTML structure
├── styles.css          # Custom CSS styles
├── script.js           # JavaScript functionality
├── CLAUDE.md           # Development documentation
└── README.md           # This file
```

## 🔧 Usage Guide

### 1. Payment Session Creation

1. **Configure API Settings**:
   - Enter your Finion Pay API key
   - Set the API base URL

2. **Set Session Parameters**:
   - **Amount**: Payment amount (use 0 for recurring payments)
   - **Scope**: Choose between `MEMBER_ACCOUNT` or `ECOM`
   - **Reference Text**: Optional bank statement reference
   - **Customer ID**: Either ERP Customer ID or Finion Pay Customer ID (mutually exclusive)

3. **Select Payment Methods** (optional):
   Choose from available payment methods to filter options

4. **Enable Debug Mode** (optional):
   Toggle for detailed API request/response information

5. **Create Session**:
   Click "Create Payment Session" to generate a session token

### 2. Widget Configuration

1. **Session Token**:
   - Automatically populated from API response, or
   - Enable "Manual Entry" to input existing token

2. **Widget Parameters**:
   - **Amount**: Payment amount in cents (required)
   - **Currency**: Select from supported currencies (required)
   - **Country Code**: Choose target country (required)
   - **Environment**: Test, Sandbox, or Live
   - **Locale**: Language and region settings

3. **Mount Widget**:
   Click "Mount Payment Widget" to initialize the payment interface

### 3. Testing & Monitoring

- **Activity Logs**: Monitor real-time activity and debug information
- **Payment Widget**: Interact with the mounted payment interface
- **Local Storage**: Your settings are automatically saved and restored

## 🔌 API Integration

### Finion Pay API Endpoint
```
POST /v1/payments/user-session
```

### Authentication
```javascript
Headers: {
  'Content-Type': 'application/json',
  'X-API-KEY': 'your-api-key'
}
```

### Request Parameters
```javascript
{
  "amount": 19.99,                    // Required: Payment amount
  "scope": "ECOM",                    // Required: MEMBER_ACCOUNT or ECOM
  "referenceText": "Optional text",   // Optional: Bank statement reference
  "customerId": 1234567890,           // Optional: ERP Customer ID
  "finionPayCustomerId": "uuid",      // Optional: Finion Pay Customer UUID
  "permittedPaymentChoices": []       // Optional: Array of payment methods
}
```

### Response
```javascript
{
  "token": "session-token-string",
  "tokenValidUntil": "2025-01-07T16:25:09.416924Z",
  "finionPayCustomerId": "uuid"
}
```

## 🔧 Widget Configuration

### Required Parameters
- `userSessionToken`: Session token from API
- `container`: DOM element ID ('spa-component-frame')
- `amount`: Payment amount in cents
- `currency`: ISO currency code
- `countryCode`: ISO country code

### Optional Parameters
- `environment`: 'test', 'sandbox', or 'live' (default: 'sandbox')
- `locale`: Language locale (default: 'en-US')
- `onSuccess`: Success callback function
- `onError`: Error callback function

### Example Implementation
```javascript
const widget = paymentWidget.init({
    userSessionToken: 'your-session-token',
    environment: 'sandbox',
    container: 'spa-component-frame',
    amount: 2000,
    currency: 'EUR',
    countryCode: 'DE',
    locale: 'en-US',
    onSuccess: (paymentToken) => {
        console.log('Payment successful:', paymentToken);
    },
    onError: (error) => {
        console.error('Payment error:', error);
    }
});
```

## 🐛 Troubleshooting

### Common Issues

**API Key Authentication Failed**
- Verify API key is correct and has required permissions (`PAYMENT_WRITE`)
- Check API base URL is correct
- Ensure proper header format (`X-API-KEY`)

**Widget Library Not Loading**
- Verify widget script URL is accessible
- Check browser console for loading errors
- Confirm CORS settings allow widget loading

**Token Expired**
- Session tokens have limited validity
- Create a new session if token has expired
- Check token expiry timestamp in widget configuration

**Payment Methods Not Available**
- Some payment methods may be restricted by country/currency
- Verify scope settings match intended use case
- Check permitted payment choices configuration

### Debug Mode
Enable debug mode to see:
- Complete API request headers and body
- Full API response data
- Widget configuration parameters
- Detailed error messages

## 💾 Local Storage

The application automatically saves:
- API configuration (excluding API key for security)
- Session parameters and payment method selections
- Widget configuration settings
- Debug mode and manual token preferences

**Clear Storage**: Use the "Clear Storage" button to reset all saved data.

## 🔒 Security Notes

- **API Keys**: Never stored in local storage for security
- **Session Tokens**: Only manual tokens are persisted
- **HTTPS Required**: Use HTTPS in production environments
- **Token Expiry**: Automatic validation of token expiration

## 🌐 Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📚 Technical Details

### Dependencies
- **TailwindCSS**: Styling framework (loaded via CDN)
- **Google Fonts**: Inter font family
- **SPA Payment Widget**: External payment library

### Architecture
- **Static HTML/CSS/JS**: No build process required
- **Responsive Design**: Mobile-first approach
- **Local Storage API**: Browser-native persistence
- **Fetch API**: Modern HTTP requests
- **ES6+ JavaScript**: Modern language features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across browsers
5. Submit a pull request

## 📄 License

This project is provided as-is for testing and development purposes.

## 📞 Support

For technical support or questions about the Payment Widget Test Suite:
- Check the troubleshooting section above
- Review browser console for error messages
- Verify API documentation for latest requirements

---

**Note**: This is a testing tool for development purposes. Ensure proper security measures are in place before using in production environments.

## 🚀 Contract Flow (Optimized) - NEW!

### Overview
An experimental, conversion-optimized membership signup flow based on UX/UI best practices. This new route reduces friction and improves user experience through a streamlined 4-screen process.

### Key Features
- **Reduced Steps**: Condensed from 7 steps to 4 screens (Choose Plan → Your Details → Payment → Review)
- **Always-Visible Contract Summary**: Sticky panel shows real-time pricing updates as users fill forms
- **Live Preview**: Debounced API calls update pricing instantly when DOB, start date, or voucher changes
- **Single Payment Flow**: Unified payment experience for both upfront and recurring charges
- **Smart Defaults**: Auto-applies age discounts, prefills start dates, shows estimated costs upfront
- **Progressive Disclosure**: Hides complexity, shows only relevant information at each step
- **Mobile Optimized**: Responsive layout with bottom sheet contract summary on mobile

### Architecture
```
contract-flow-optimized.html    # Main HTML with 4-screen layout
contract-flow-optimized.js      # Complete application logic
├── StateManager                # Centralized state with persistence
├── APIService                  # All API integrations
├── PreviewService              # Debounced preview API calls
├── NavigationController        # Screen transitions
└── Screen Controllers
    ├── ScreenAController       # Offer selection
    ├── ScreenBController       # Details form + Contract Summary
    ├── ScreenCController       # Unified payment
    └── ScreenDController       # Review & sign
```

### Screen Flow

**Screen A: Choose Plan**
- Grid layout with offer cards
- Each card shows monthly price and estimated "Pay Today" amount
- "Best Value" badges for featured offers
- One-click selection with visual feedback

**Screen B: Your Details**
- Split layout: Form (left) + Sticky Contract Summary (right)
- Personal info + address in collapsible sections
- Inline voucher field with instant validation
- Date of Birth triggers age discount detection
- Start date and voucher changes debounce preview API calls (500ms)
- Contract Summary updates in real-time with skeleton loaders

**Screen C: Payment**
- Single payment method for both upfront + recurring
- Respects `allowedPaymentChoices` from offer
- Secure payment widget integration
- Contract Summary remains visible
- Trust indicators and reassurance text

**Screen D: Review & Confirm**
- Member info snapshot with "Change" links
- Membership details with pricing breakdown
- Payment summary highlighting "Pay Today" and "Next Charge"
- Terms & conditions acceptance
- Optional signature pad (if required)
- Final signup submission

### Technical Highlights

**State Management**
- Single source of truth with `StateManager` class
- Automatic localStorage persistence (1-hour TTL)
- Deep merge for nested state updates
- Subscribe/notify pattern for reactivity

**Debounced Preview**
- `PreviewService` class with 500ms delay
- AbortController for request cancellation
- Prevents API spam during rapid form changes
- Skeleton loaders during preview updates

**API Integration**
- Centralized `APIService` class
- Uses global API configuration (via Config button)
- Error handling with user-friendly messages
- Support for all membership API endpoints:
  - `GET /v1/memberships/membership-offers`
  - `GET /v1/memberships/membership-offers/{id}`
  - `POST /v1/memberships/signup/preview`
  - `POST /v1/memberships/signup`

**Contract Summary Features**
- Sticky positioning on desktop (top: 5rem)
- Shows plan name, monthly fee, setup fees breakdown, and discounts
- Prominent "Due Today" display with total amount
- Next charge date and amount
- Updates with age discounts and vouchers
- Skeleton loader during preview loading

**Smart Payment Step Skipping**
- Automatically detects payment scenarios and skips unnecessary steps
- **No payments needed**: Skips directly to review (edge case)
- **Full payment upfront**: Skips recurring payment setup, shows only upfront payment
- **No upfront payment**: Skips upfront step, shows only recurring payment setup
- **Both payments needed**: Shows both steps in sequence (default)
- Logic mirrors the original contract flow implementation
- Improves UX by reducing unnecessary steps based on offer configuration

**Validation**
- Real-time inline validation on blur
- Email format checking
- Date of birth age verification (16+ years)
- Phone number format validation
- Required field checks before screen progression

### Usage

1. **Navigate**: Access via "Contract Flow (Optimized)" in the navigation bar
2. **Configure API**: Use the "Config" button to set API key and base URL (shared with other pages)
3. **Select Offer**: Browse and select a membership offer
4. **Fill Details**: Enter personal info, watch pricing update live
5. **Add Voucher** (optional): Apply discount codes with instant feedback
6. **Select Payment**: Choose payment method for both upfront + recurring
7. **Review & Confirm**: Final review with all details, then complete signup

### Benefits Over Original Flow
- ✅ **50% fewer steps**: 7 → 4 screens reduces abandonment
- ✅ **Price transparency**: Users see costs immediately on offer cards
- ✅ **Live updates**: Preview API shows real pricing as users fill forms
- ✅ **Smart payment skipping**: Automatically skips unnecessary payment steps based on offer
- ✅ **Better mobile UX**: Optimized layouts for small screens
- ✅ **Smart defaults**: Less manual input required
- ✅ **Error prevention**: Inline validation catches issues early

### Implementation Details

**File Structure**
```
payment-widget-test/
├── contract-flow-optimized.html        # NEW: Optimized flow HTML
├── contract-flow-optimized.js          # NEW: Main application logic
├── IMPLEMENTATION_PLAN.md              # NEW: Detailed implementation plan
├── config.js                            # UPDATED: Added membership API endpoints
├── nav.js                               # UPDATED: Added optimized flow route
├── contract-flow.html                   # EXISTING: Original flow (unchanged)
└── contract-flow-steps.js               # EXISTING: Original logic (unchanged)
```

**Testing**
- Tested with Playwright MCP for browser automation
- Verified page load, navigation, error handling
- Screenshots captured for documentation
- All 4 screens implemented and functional

### Performance Optimizations
- Debounced API calls (500ms) prevent request spam
- AbortController cancels in-flight requests on navigation
- Skeleton loaders provide instant visual feedback
- localStorage caching reduces redundant API calls
- Lazy loading of offer details (only on expand)

### Accessibility
- Semantic HTML with proper ARIA labels
- Keyboard navigable throughout
- Focus management on screen transitions
- Error messages announced to screen readers
- Proper form labels and required indicators

### Known Limitations
- Requires valid API key to function (no demo mode yet)
- Signature pad not yet implemented (placeholder in code)
- Multi-voucher support is basic (single voucher recommended)
- No A/B testing framework integrated yet

### Future Enhancements
- [ ] A/B testing framework integration
- [ ] Analytics event tracking
- [ ] Offer preview modal with full details
- [ ] Signature pad implementation
- [ ] Multi-step form progress persistence across refresh
- [ ] Optimistic UI updates with rollback on error
- [ ] Payment method icons in order summary
- [ ] Schedule viewer (expandable payment schedule)

---

## 🔄 Recent Changes

### Contract Flow (Optimized) - NEW! (2025-10-06)
- **Experimental Route**: New conversion-optimized membership signup flow under `/contract-flow-optimized.html`
- **4-Screen Flow**: Reduced from 7 steps to 4 screens (Choose Plan → Your Details → Payment → Review)
- **Live Contract Summary**: Sticky panel with real-time pricing updates based on form inputs
- **Debounced Preview**: API calls triggered on DOB, start date, voucher changes with 500ms debounce
- **Single Payment**: Unified payment experience for both upfront and recurring charges
- **State Management**: Centralized StateManager with localStorage persistence (1-hour TTL)
- **Age Discounts**: Automatic detection and display when date of birth qualifies
- **Voucher Validation**: Instant inline feedback with success/error chips
- **Mobile Optimized**: Responsive layouts with bottom sheet contract summary on mobile
- **Skeleton Loaders**: Visual feedback during API preview loading
- **Original Flow Preserved**: Existing contract-flow.html remains unchanged for comparison

### Global API Configuration (2025-01-06)
- **Centralized Credentials**: API key and base URL are now managed globally via the "Config" button in the navigation bar
- **Cross-Page Sync**: Configuration automatically syncs between Payment Widget Test and Contract Flow pages
- **Removed Local Storage**: API credentials are no longer stored in page-specific local storage for improved security
- **Migration**: Old API credentials are automatically cleaned up from local storage on page load
- **Required Fields**: Both API Key and Base URL are now required fields in the global configuration
- **No Default URL**: The API Base URL no longer has a default value and must be explicitly set

---

## Deprecations and Changes

### Two-Step Payment Flow Fix - Separate Tokens for Contract and Customer (2025-10-06)
- **CRITICAL FIX**: Implemented separate payment flows for recurring and upfront payments with correct token assignment
  - **Issue**: Optimized flow was using a single payment widget and token for both recurring and upfront payments, but the API requires separate tokens:
    - `customer.paymentRequestToken` - for recurring monthly payments
    - `contract.initialPaymentRequestToken` - for upfront/initial payment
  - **Impact**: Contracts were failing to submit or had incorrect payment setup because both tokens were the same
  - **Solution**: Split Screen C into two sequential payment steps matching the original contract flow:
    1. **Step 1 - Recurring Payment**: MEMBER_ACCOUNT scope, amount 0 → stores as `recurringToken`
    2. **Step 2 - Upfront Payment**: ECOM scope, actual amount → stores as `upfrontToken`
  - **Files Updated**:
    - `contract-flow-optimized.html` - Added separate sections for recurring and upfront payments
    - `contract-flow-optimized.js:1126-1367` - Complete rewrite of ScreenCController class
  - **Payment Flow**:
    1. User completes recurring payment setup (MEMBER_ACCOUNT, amount: 0)
    2. System checks if upfront payment is needed (`dueOnSigningAmount > 0`)
    3. If yes, show upfront payment section (ECOM, amount: actual)
    4. If no, skip directly to review screen
    5. Final submission uses: `contract.initialPaymentRequestToken = upfrontToken`, `customer.paymentRequestToken = recurringToken`
  - **UI Changes**:
    - Screen C now shows "Payment Setup" with two distinct sections
    - Step 1: "Recurring Payment Method" with completion badge
    - Step 2: "Upfront Payment" (conditionally shown) with completion badge
    - Progress indicators show when each step is complete
  - **Pattern Applied**: Following exact same pattern as original contract flow (Steps 5 & 6)
- **Testing**: Implementation follows working pattern from contract-flow-steps.js

### Amount Format Fix - Payment Session API (2025-10-06)
- **CRITICAL FIX**: Fixed incorrect amount format when creating payment sessions (2025-10-07)
  - **Issue**: Payment Session API was receiving amounts multiplied by 100 (e.g., 15000 for £150.00)
  - **Root Cause**: Code was incorrectly converting decimal amounts to cents before sending to `/v1/payments/user-session` endpoint
  - **Impact**: Payments were being collected with wrong amounts (factor of 100 too high)
  - **Solution**: The `/v1/payments/user-session` endpoint expects decimal amounts (e.g., "10.50" for €10.50, not "1050")
  - **Files Updated**:
    - `contract-flow-steps.js:1734` - Removed incorrect `Math.round(amount * 100)` conversion
    - `contract-flow-steps.js:1401` - Updated JSDoc to clarify decimal format expected
    - `contract-flow-optimized.js:1273` - Removed incorrect `Math.round(amount * 100)` conversion
    - `contract-flow-optimized.js:1284` - Updated comment to clarify decimal format expected
  - **API Request Format**: The `/v1/payments/user-session` endpoint expects `amount` parameter in decimal format (e.g., 10.50)
  - **API Response Format**: `paymentPreview.dueOnSigningAmount = { amount: number, currency: string }` (decimal format)
  - **Display Format**: UI displays amounts in decimal format using `formatCurrency()` and `formatCurrencyDecimal()` functions
- **Testing**: Payment sessions now correctly send decimal amounts (150 for £150.00, not 15000)

### Contract Flow (Optimized) - Terminology Update (2025-10-06)
- **Renamed "Order Summary" to "Contract Summary"**: Throughout the optimized contract flow, all references to "Order Summary" have been renamed to "Contract Summary" for better clarity and accuracy in the membership context
  - Updated in HTML headings, CSS comments, JavaScript comments, and mobile UI
  - Affects `contract-flow-optimized.html` and `contract-flow-optimized.js`
- **Enhanced Contract Summary Display**:
  - Added explicit breakdown of setup fees (flatFees) in the summary panel
  - Changed "Pay Today" label to "Due Today" for improved clarity
  - Setup fees now display with their names (e.g., "Registration Fee") and amounts before the total due amount
- **Location**: Contract Flow (Optimized) - Screens B and C (Your Details and Payment screens)