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