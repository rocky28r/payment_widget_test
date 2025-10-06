// =================================================================
// NAVIGATION & STEP MANAGEMENT
// =================================================================

const STEP_DEFINITIONS = [
    {
        number: 1,
        name: 'Select Offer',
        invalidates: ['tokens', 'preview', 'formData'],
        warning: null
    },
    {
        number: 2,
        name: 'Offer Details',
        invalidates: ['tokens', 'preview', 'formData'],
        warning: null
    },
    {
        number: 3,
        name: 'Your Info',
        invalidates: ['tokens', 'preview'],
        warning: null
    },
    {
        number: 4,
        name: 'Preview',
        invalidates: ['tokens'],
        warning: null
    },
    {
        number: 5,
        name: 'Recurring',
        invalidates: [],
        warning: null
    },
    {
        number: 6,
        name: 'Upfront',
        invalidates: [],
        warning: null
    },
    {
        number: 7,
        name: 'Confirm',
        invalidates: [],
        warning: null
    }
];

class NavigationManager {
    constructor() {
        this.currentStep = 1;
        this.maxReachedStep = 1;
        this.loadState();
        this.initializeProgressIndicator();
    }

    loadState() {
        const saved = storage.get(STORAGE_KEYS.FLOW.CURRENT_STEP);
        if (saved) {
            this.currentStep = saved.currentStep || 1;
            this.maxReachedStep = saved.maxReachedStep || 1;
        }
    }

    saveState() {
        storage.set(STORAGE_KEYS.FLOW.CURRENT_STEP, {
            currentStep: this.currentStep,
            maxReachedStep: this.maxReachedStep
        }, DATA_TTL.FORM);
    }

    initializeProgressIndicator() {
        // Desktop stepper
        const desktopStepper = document.getElementById('desktop-stepper');
        const mobileDots = document.getElementById('mobile-dots');

        if (desktopStepper) {
            let html = '';
            STEP_DEFINITIONS.forEach((step, index) => {
                html += `
                    <div class="step flex items-center" data-progress-step="${step.number}">
                        <div class="step-circle w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                            <span class="step-number">${step.number}</span>
                            <svg class="step-check w-6 h-6 hidden" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="step-label ml-3">
                            <div class="text-sm font-medium">${step.name}</div>
                        </div>
                    </div>
                `;

                if (index < STEP_DEFINITIONS.length - 1) {
                    html += '<div class="step-connector flex-1 h-0.5 mx-4"></div>';
                }
            });
            desktopStepper.innerHTML = html;

            // Add click handlers
            desktopStepper.querySelectorAll('[data-progress-step]').forEach(el => {
                el.addEventListener('click', () => {
                    const step = parseInt(el.getAttribute('data-progress-step'));
                    if (this.canNavigateToStep(step)) {
                        this.navigateToStep(step);
                    }
                });
            });
        }

        // Mobile dots
        if (mobileDots) {
            let html = '';
            STEP_DEFINITIONS.forEach(step => {
                html += `<div class="step-dot w-2 h-2 rounded-full" data-mobile-step="${step.number}"></div>`;
            });
            mobileDots.innerHTML = html;
        }
    }

    async navigateToStep(targetStep) {
        if (targetStep === this.currentStep) return;

        if (targetStep < this.currentStep) {
            await this.navigateBackward(targetStep);
        } else {
            await this.navigateForward(targetStep);
        }
    }

    async navigateBackward(targetStep) {
        const stepDef = STEP_DEFINITIONS.find(s => s.number === targetStep);

        if (stepDef.invalidates.length > 0 && stepDef.warning) {
            const confirmed = confirm(stepDef.warning);
            if (!confirmed) return;

            this.performInvalidations(stepDef.invalidates);
        }

        this.currentStep = targetStep;
        this.saveState();
        this.renderStep(targetStep);
    }

    async navigateForward(targetStep) {
        if (targetStep > this.currentStep + 1) {
            showError('Please complete the current step before proceeding.');
            return;
        }

        const valid = await this.validateCurrentStep();
        if (!valid) return;

        this.currentStep = targetStep;

        if (targetStep > this.maxReachedStep) {
            this.maxReachedStep = targetStep;
        }

        this.saveState();
        this.renderStep(targetStep);
    }

    async validateCurrentStep() {
        // Steps will set their own validation
        return true;
    }

    performInvalidations(invalidations) {
        invalidations.forEach(key => {
            if (key === 'tokens') {
                storage.remove(STORAGE_KEYS.FLOW.TOKENS);
                storage.remove(STORAGE_KEYS.FLOW.FINION_PAY_CUSTOMER_ID);
            } else if (key === 'preview') {
                storage.remove(STORAGE_KEYS.FLOW.PREVIEW_DATA);
            } else if (key === 'formData') {
                storage.remove(STORAGE_KEYS.FLOW.FORM_DATA);
            }
        });
    }

    renderStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });

        // Show current step
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        if (stepElement) {
            stepElement.classList.remove('hidden');
        }

        // Update progress indicator
        this.updateProgressIndicator();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Initialize step
        this.initializeStep(step);
    }

    updateProgressIndicator() {
        // Update desktop stepper
        document.querySelectorAll('[data-progress-step]').forEach(el => {
            const stepNumber = parseInt(el.getAttribute('data-progress-step'));

            el.classList.remove('completed', 'current', 'upcoming', 'clickable');

            if (stepNumber < this.currentStep) {
                el.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                el.classList.add('current');
            } else {
                el.classList.add('upcoming');
            }

            if (this.canNavigateToStep(stepNumber)) {
                el.classList.add('clickable');
                el.style.cursor = 'pointer';
            } else {
                el.style.cursor = 'default';
            }
        });

        // Update mobile dots
        document.querySelectorAll('[data-mobile-step]').forEach(el => {
            const stepNumber = parseInt(el.getAttribute('data-mobile-step'));

            el.classList.remove('completed', 'current');

            if (stepNumber < this.currentStep) {
                el.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                el.classList.add('current');
            }
        });

        // Update mobile step name
        const stepDef = STEP_DEFINITIONS.find(s => s.number === this.currentStep);
        const stepNameEl = document.getElementById('current-step-name');
        if (stepNameEl && stepDef) {
            stepNameEl.textContent = `Step ${this.currentStep}: ${stepDef.name}`;
        }
    }

    canNavigateToStep(step) {
        return step <= this.maxReachedStep;
    }

    initializeStep(step) {
        switch (step) {
            case 1:
                initializeOfferSelectionStep();
                break;
            case 2:
                initializeOfferDetailsStep();
                break;
            case 3:
                initializePersonalInfoStep();
                break;
            case 4:
                initializePreviewStep();
                break;
            case 5:
                initializeRecurringPaymentStep();
                break;
            case 6:
                initializeUpfrontPaymentStep();
                break;
            case 7:
                initializeConfirmationStep();
                break;
        }
    }

    getCurrentStep() {
        return this.currentStep;
    }
}

let navigationManager;

// =================================================================
// STEP 1: OFFER SELECTION
// =================================================================

let selectedOffer = null;

async function initializeOfferSelectionStep() {
    console.log('Initializing Step 1: Offer Selection');

    // Load saved offer if exists
    const savedOffer = storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    if (savedOffer) {
        selectedOffer = savedOffer;
        renderOffers([savedOffer]); // Show saved offer
        document.getElementById('continue-step-1').disabled = false;
    }

    // Load offers
    await loadOffers();

    // Setup continue button
    document.getElementById('continue-step-1').addEventListener('click', () => {
        if (selectedOffer) {
            storage.set(STORAGE_KEYS.FLOW.SELECTED_OFFER, selectedOffer, DATA_TTL.OFFER);
            navigationManager.navigateToStep(2);
        }
    });
}

async function loadOffers() {
    const loadingEl = document.getElementById('offers-loading');
    const errorEl = document.getElementById('offers-error');
    const gridEl = document.getElementById('offers-grid');

    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    gridEl.classList.add('hidden');

    try {
        const offers = await apiClient.getOffers();

        if (!offers || offers.length === 0) {
            // Show friendly empty state instead of error
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            document.getElementById('offers-error-message').textContent =
                'No membership offers available yet. Please create offers in your Magicline admin panel first.';
            document.getElementById('retry-offers').addEventListener('click', loadOffers, { once: true });
            return;
        }

        renderOffers(offers);

        loadingEl.classList.add('hidden');
        gridEl.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading offers:', error);

        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');

        const message = error instanceof APIError ? error.message : 'Failed to load offers. Please try again.';
        document.getElementById('offers-error-message').textContent = message;

        document.getElementById('retry-offers').addEventListener('click', loadOffers, { once: true });
    }
}

function renderOffers(offers) {
    const grid = document.getElementById('offers-grid');

    grid.innerHTML = offers.map(offer => `
        <div class="offer-card bg-white rounded-lg border-2 border-gray-200 p-6 cursor-pointer ${selectedOffer?.id === offer.id ? 'selected' : ''}"
             data-offer-id="${offer.id}"
             onclick="selectOffer('${offer.id}', ${JSON.stringify(offer).replace(/"/g, '&quot;')})">

            <h3 class="text-xl font-bold text-gray-900 mb-2">${offer.name || 'Membership Offer'}</h3>

            ${offer.description ? `<p class="text-gray-600 mb-4">${offer.description}</p>` : ''}

            <div class="space-y-2">
                ${offer.price ? `
                    <div class="flex justify-between items-center">
                        <span class="text-gray-700">Price:</span>
                        <span class="text-2xl font-bold text-blue-600">
                            ${formatCurrency(offer.price.amount, offer.price.currency)}
                        </span>
                    </div>
                ` : ''}

                ${offer.billingPeriod ? `
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Billing:</span>
                        <span class="text-gray-900 font-medium">${offer.billingPeriod}</span>
                    </div>
                ` : ''}
            </div>

            ${selectedOffer?.id === offer.id ? `
                <div class="mt-4 flex items-center text-blue-600">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="font-medium">Selected</span>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function selectOffer(offerId, offer) {
    selectedOffer = offer;

    // Update UI
    document.querySelectorAll('.offer-card').forEach(card => {
        card.classList.remove('selected');
        const icon = card.querySelector('.text-blue-600');
        if (icon) icon.remove();
    });

    const selectedCard = document.querySelector(`[data-offer-id="${offerId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedCard.innerHTML += `
            <div class="mt-4 flex items-center text-blue-600">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="font-medium">Selected</span>
            </div>
        `;
    }

    // Enable continue button
    document.getElementById('continue-step-1').disabled = false;
}

function formatCurrency(amount, currency) {
    const symbols = {
        EUR: '€',
        USD: '$',
        GBP: '£',
        CHF: 'Fr'
    };

    const formatted = (amount / 100).toFixed(2);
    const symbol = symbols[currency] || currency;

    return `${symbol}${formatted}`;
}

/**
 * Format currency for amounts that are already in decimal format (not cents)
 * Used for API responses that return amounts like 9.68, 120.00, etc.
 */
function formatCurrencyDecimal(amount, currency) {
    const symbols = {
        EUR: '€',
        USD: '$',
        GBP: '£',
        CHF: 'Fr'
    };

    const formatted = Number(amount).toFixed(2);
    const symbol = symbols[currency] || currency;

    return `${symbol}${formatted}`;
}

// =================================================================
// STEP 2: OFFER DETAILS
// =================================================================

async function initializeOfferDetailsStep() {
    console.log('Initializing Step 2: Offer Details');

    const savedOffer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);

    if (!savedOffer || !savedOffer.id) {
        showNotification('No offer selected. Returning to Step 1.', 'error');
        navigationManager.navigateToStep(1);
        return;
    }

    // Show loading state
    document.getElementById('offer-detail-name').textContent = 'Loading...';
    document.getElementById('offer-detail-description').textContent = '';
    document.getElementById('offer-detail-pricing').innerHTML = '<p class="text-gray-500">Loading pricing information...</p>';
    document.getElementById('offer-detail-info').innerHTML = '<p class="text-gray-500">Loading details...</p>';

    try {
        // Fetch full offer details from API
        const offerDetails = await apiClient.getOfferById(savedOffer.id);

        // Store full offer details
        storage.set(STORAGE_KEYS.FLOW.SELECTED_OFFER, offerDetails, DATA_TTL.OFFER);
        selectedOffer = offerDetails;

        // Display offer header
        document.getElementById('offer-detail-name').textContent = offerDetails.name || 'Membership Offer';
        document.getElementById('offer-detail-description').textContent = offerDetails.description || '';

        // Display pricing information with comprehensive, transparent breakdown
        const pricingEl = document.getElementById('offer-detail-pricing');
        let pricingHTML = '';

        // Show terms and pricing
        if (offerDetails.terms && offerDetails.terms.length > 0) {
            const term = offerDetails.terms[0]; // Use first term

            // Get monthly price from correct location (paymentFrequency.price or fallback to rateStartPrice)
            const getTermPrice = () => {
                // Try paymentFrequency.price first (primary location)
                if (term.paymentFrequency?.price) {
                    return term.paymentFrequency.price;
                }
                // Fallback to rateStartPrice (legacy field)
                if (term.rateStartPrice) {
                    return term.rateStartPrice;
                }
                return null;
            };

            const termPrice = getTermPrice();
            const currency = termPrice?.currency || 'EUR';

            // Helper to safely format price (API returns decimal values, not cents)
            const safePriceFormat = (priceObj) => {
                if (!priceObj) return null;
                const amount = priceObj.amount;
                const curr = priceObj.currency || currency;
                return formatCurrencyDecimal(amount, curr);
            };

            // ============================================================
            // 1. HERO COST SUMMARY CARD
            // ============================================================
            pricingHTML += '<div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-6 shadow-lg">';
            pricingHTML += '<h3 class="text-lg font-semibold mb-4 opacity-90">Cost Summary</h3>';
            pricingHTML += '<div class="space-y-3">';

            // Starting Price (most prominent)
            if (termPrice) {
                const formattedPrice = safePriceFormat(termPrice);
                if (formattedPrice) {
                    pricingHTML += `
                        <div class="flex justify-between items-baseline">
                            <span class="text-sm opacity-90">Starting at</span>
                            <div class="text-right">
                                <div class="text-4xl font-bold">${formattedPrice}</div>
                                <div class="text-sm opacity-75">per month</div>
                            </div>
                        </div>
                    `;
                }
            }

            // One-time fees (if any)
            let oneTimeFeesTotal = 0;
            let hasOneTimeFees = false;
            if (term.flatFees && term.flatFees.length > 0) {
                term.flatFees.forEach(fee => {
                    if (fee.starterPackage && fee.price?.amount) {
                        oneTimeFeesTotal += fee.price.amount;
                        hasOneTimeFees = true;
                    }
                });
                if (hasOneTimeFees && oneTimeFeesTotal > 0) {
                    pricingHTML += `
                        <div class="flex justify-between items-center text-sm pt-2 border-t border-white border-opacity-20">
                            <span class="opacity-90">Setup Fee</span>
                            <span class="font-semibold">${formatCurrencyDecimal(oneTimeFeesTotal, currency)}</span>
                        </div>
                    `;
                }
            }

            // Total contract value (use API data if available)
            if (term.contractVolumeInformation?.totalContractVolume) {
                const total = term.contractVolumeInformation.totalContractVolume;
                const formattedTotal = safePriceFormat(total);
                if (formattedTotal) {
                    pricingHTML += `
                        <div class="flex justify-between items-baseline pt-3 border-t border-white border-opacity-20">
                            <div>
                                <div class="text-sm opacity-90">Total Contract Value</div>
                                <div class="text-xs opacity-75">over initial term</div>
                            </div>
                            <div class="text-2xl font-bold">${formattedTotal}</div>
                        </div>
                    `;
                }
            }

            pricingHTML += '</div></div>'; // Close hero card

            // ============================================================
            // 2. CONTRACT TIMELINE VISUALIZATION
            // ============================================================
            pricingHTML += '<div class="bg-white border border-gray-200 rounded-lg p-5 mb-4">';
            pricingHTML += '<h4 class="text-md font-semibold text-gray-900 mb-4">Contract Timeline</h4>';

            // Timeline visualization
            pricingHTML += '<div class="relative">';

            let hasTimeline = false;
            const afterPrice = term.priceAfterExtension || termPrice;
            const priceChangesAfterInitialTerm = afterPrice && termPrice && afterPrice.amount !== termPrice.amount;

            // Bonus Periods (promotional/free periods)
            if (term.rateBonusPeriods && term.rateBonusPeriods.length > 0) {
                hasTimeline = true;
                term.rateBonusPeriods.forEach((bonus, index) => {
                    if (bonus.term) {
                        const bonusTerm = bonus.term;
                        pricingHTML += `
                            <div class="flex items-start mb-3 ${index > 0 ? 'mt-2' : ''}">
                                <div class="flex-shrink-0 w-3 h-3 mt-1 rounded-full bg-green-500"></div>
                                <div class="ml-3 flex-1">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <div class="font-semibold text-green-700">Promotional Period</div>
                                            <div class="text-sm text-gray-600">${bonusTerm.value} ${bonusTerm.unit.toLowerCase()}${bonusTerm.value > 1 ? 's' : ''}</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="font-bold text-green-600">${formatCurrencyDecimal(0, currency)}/mo</div>
                                            ${bonus.displaySeparately ? '<div class="text-xs text-gray-500">Not included in total</div>' : ''}
                                        </div>
                                    </div>
                                    ${bonus.extendsCancellationPeriod ? '<div class="text-xs text-amber-600 mt-1">⚠️ Extends cancellation period</div>' : ''}
                                </div>
                            </div>
                        `;
                    }
                });
            }

            // Initial Term - show starting price with contract info
            if (termPrice) {
                hasTimeline = true;
                const startPrice = safePriceFormat(termPrice);
                // Try to get term info from cancellation period or extension term
                let termInfo = '';
                if (term.cancelationPeriod) {
                    termInfo = `${term.cancelationPeriod.value} ${term.cancelationPeriod.unit.toLowerCase()}${term.cancelationPeriod.value > 1 ? 's' : ''} cancellation period`;
                } else if (term.extensionTerm) {
                    termInfo = `${term.extensionTerm.value} ${term.extensionTerm.unit.toLowerCase()}${term.extensionTerm.value > 1 ? 's' : ''} renewal term`;
                } else {
                    termInfo = 'Ongoing membership';
                }

                pricingHTML += `
                    <div class="flex items-start ${priceChangesAfterInitialTerm ? 'mb-3' : ''}">
                        <div class="flex-shrink-0 w-3 h-3 mt-1 rounded-full bg-blue-500"></div>
                        <div class="ml-3 flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-semibold text-blue-700">Membership</div>
                                    <div class="text-sm text-gray-600">${termInfo}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-blue-600">${startPrice || 'N/A'}/mo</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Extension/After Initial Term - ONLY show if price actually changes
            if (term.extensionType && term.extensionType !== 'NONE' && priceChangesAfterInitialTerm) {
                hasTimeline = true;
                const afterTerm = term.termAfterExtension || term.extensionTerm;
                const afterPriceFormatted = safePriceFormat(afterPrice);

                pricingHTML += `
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-3 h-3 mt-1 rounded-full bg-purple-500"></div>
                        <div class="ml-3 flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-semibold text-purple-700">After Initial Term</div>
                                    ${afterTerm ? `<div class="text-sm text-gray-600">${afterTerm.value} ${afterTerm.unit.toLowerCase()}${afterTerm.value > 1 ? 's' : ''} auto-renewal</div>` : '<div class="text-sm text-gray-600">Auto-renewing</div>'}
                                </div>
                                <div class="text-right">
                                    ${afterPriceFormatted ? `<div class="font-bold text-purple-600">${afterPriceFormatted}/mo</div>` : ''}
                                    <div class="text-xs text-amber-600">Price changes</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (!hasTimeline) {
                pricingHTML += '<p class="text-sm text-gray-500 italic">Timeline information will be displayed based on your selected offer terms</p>';
            }

            pricingHTML += '</div></div>'; // Close timeline

            // ============================================================
            // 4. PRICE ADJUSTMENTS & CHANGES
            // ============================================================
            if (term.priceAdjustmentRules && term.priceAdjustmentRules.length > 0) {
                pricingHTML += '<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">';
                pricingHTML += '<h4 class="text-md font-semibold text-amber-900 mb-3 flex items-center">';
                pricingHTML += '<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
                pricingHTML += 'Price Adjustments';
                pricingHTML += '</h4>';
                pricingHTML += '<div class="space-y-2">';
                term.priceAdjustmentRules.forEach(rule => {
                    const icon = rule.type === 'RAISE' ? '📈' : rule.type === 'REDUCTION' ? '📉' : '💰';
                    pricingHTML += `
                        <div class="flex items-start text-sm">
                            <span class="mr-2">${icon}</span>
                            <div class="flex-1">
                                <div class="font-medium text-amber-900">${rule.defaultDescription || `${rule.value} ${rule.recurrenceFrequency}`}</div>
                                <div class="text-xs text-amber-700 mt-1">Type: ${rule.type.replace('_', ' ')} • Frequency: ${rule.recurrenceFrequency}</div>
                            </div>
                        </div>
                    `;
                });
                pricingHTML += '</div></div>';
            }

        }

        pricingEl.innerHTML = pricingHTML;

        // Display additional information
        const infoEl = document.getElementById('offer-detail-info');
        let infoHTML = '<h3 class="text-lg font-semibold text-gray-900 mb-4 md:col-span-2">What\'s Included</h3>';

        // Show included modules
        if (offerDetails.includedModules && offerDetails.includedModules.length > 0) {
            offerDetails.includedModules.forEach(module => {
                infoHTML += `
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <h4 class="font-semibold text-gray-900 mb-1">${module.name}</h4>
                        <p class="text-sm text-gray-600">${module.description}</p>
                    </div>
                `;
            });
        }

        // Show contract terms
        if (offerDetails.terms && offerDetails.terms.length > 0) {
            const term = offerDetails.terms[0];
            infoHTML += `
                <div class="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <h4 class="font-semibold text-gray-900 mb-3">Contract Terms</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            `;

            // Cancellation Period
            if (term.cancelationPeriod) {
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Cancellation Period:</span>
                        <span class="font-medium">${term.cancelationPeriod.value} ${term.cancelationPeriod.unit.toLowerCase()}${term.cancelationPeriod.value > 1 ? 's' : ''}</span>
                    </div>
                `;
            }

            // Extension Term
            if (term.extensionTerm) {
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Extension Term:</span>
                        <span class="font-medium">${term.extensionTerm.value} ${term.extensionTerm.unit.toLowerCase()}${term.extensionTerm.value > 1 ? 's' : ''}</span>
                    </div>
                `;
            }

            // Contract Start Date
            if (term.defaultContractStartDate) {
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Contract Start:</span>
                        <span class="font-medium">${new Date(term.defaultContractStartDate).toLocaleDateString()}</span>
                    </div>
                `;
            }

            // Default Start Date of Use
            if (term.defaultContractStartDateOfUse && term.defaultContractStartDateOfUse !== term.defaultContractStartDate) {
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Start Date of Use:</span>
                        <span class="font-medium">${new Date(term.defaultContractStartDateOfUse).toLocaleDateString()}</span>
                    </div>
                `;
            }

            // Auto-renewal (derive from extensionType)
            if (term.extensionType) {
                const autoRenewal = term.extensionType !== 'NONE';
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Auto-Renewal:</span>
                        <span class="font-medium">${autoRenewal ? 'Yes' : 'No'}</span>
                    </div>
                `;
            }

            // Cancellation Strategy
            if (term.cancelationStrategy) {
                const strategyDisplay = term.cancelationStrategy === 'TERM' ? 'End of term' :
                                      term.cancelationStrategy === 'RECEIPT_DATE' ? 'Upon receipt' :
                                      term.cancelationStrategy.replace('_', ' ');
                infoHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Cancellation applies:</span>
                        <span class="font-medium">${strategyDisplay}</span>
                    </div>
                `;
            }

            infoHTML += `</div></div>`;

            // Refund Policy Section
            if (term.refundPolicy || term.cancelationPeriod) {
                infoHTML += `
                    <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg md:col-span-2">
                        <h4 class="font-semibold text-gray-900 mb-2 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                            Cancellation & Refund Policy
                        </h4>
                        <div class="text-sm text-gray-700 space-y-1">
                            ${term.refundPolicy ? `<p>${term.refundPolicy}</p>` : ''}
                            ${term.cancelationPeriod ? `
                                <p>• You may cancel within the ${term.cancelationPeriod.value} ${term.cancelationPeriod.unit.toLowerCase()}(s) cancellation period</p>
                            ` : ''}
                            ${!term.cancellationFee || term.cancellationFee.amount === 0 ?
                                '<p>• No cancellation fees during cancellation period</p>' :
                                `<p>• Cancellation fee: ${formatCurrency(term.cancellationFee.amount, term.cancellationFee.currency)}</p>`
                            }
                            ${term.proRataRefund ? '<p>• Pro-rata refunds available for unused period</p>' : '<p>• No pro-rata refunds for unused period</p>'}
                        </div>
                    </div>
                `;
            }
        }

        // Show payment methods
        if (offerDetails.allowedPaymentChoices && offerDetails.allowedPaymentChoices.length > 0) {
            infoHTML += `
                <div class="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <h4 class="font-semibold text-gray-900 mb-2">Accepted Payment Methods</h4>
                    <div class="flex flex-wrap gap-2">
                        ${offerDetails.allowedPaymentChoices.map(method =>
                            `<span class="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">${method.replace('_', ' ')}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Show footnote if exists
        if (offerDetails.footnote) {
            infoHTML += `
                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg md:col-span-2">
                    <p class="text-sm text-gray-700">${offerDetails.footnote}</p>
                </div>
            `;
        }

        infoEl.innerHTML = infoHTML;

    } catch (error) {
        console.error('Error loading offer details:', error);
        showNotification('Failed to load offer details. Please try again.', 'error');
        document.getElementById('offer-detail-name').textContent = savedOffer.name || 'Error';
        document.getElementById('offer-detail-description').textContent = 'Could not load full details.';
        document.getElementById('offer-detail-pricing').innerHTML = '<p class="text-red-600">Error loading pricing</p>';
        document.getElementById('offer-detail-info').innerHTML = '<p class="text-red-600">Error loading details</p>';
    }

    // Setup back button
    document.getElementById('back-step-2').addEventListener('click', () => {
        navigationManager.navigateToStep(1);
    }, { once: true });

    // Setup continue button
    document.getElementById('continue-step-2').addEventListener('click', () => {
        navigationManager.navigateToStep(3);
    }, { once: true });
}

// =================================================================
// STEP 3: PERSONAL INFORMATION
// =================================================================

function initializePersonalInfoStep() {
    console.log('Initializing Step 3: Personal Information');

    // Show selected offer summary
    if (selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER)) {
        const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
        document.getElementById('offer-summary-name').textContent = offer.name || 'Membership';
    }

    // Load saved form data
    const savedData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);
    if (savedData) {
        loadFormData(savedData);
    }

    // Setup form validation
    const form = document.getElementById('personal-info-form');
    setupFormValidation(form);

    // Setup Fill Test Data button
    document.getElementById('fill-test-data').addEventListener('click', () => {
        fillTestData();
    });

    // Setup back button - now goes to Step 2 (Offer Details)
    document.getElementById('back-step-3').addEventListener('click', () => {
        navigationManager.navigateToStep(2);
    });

    // Setup form submit - now goes to Step 4 (Preview)
    form.addEventListener('formValid', (e) => {
        const formData = e.detail;

        // Save form data
        storage.set(STORAGE_KEYS.FLOW.FORM_DATA, formData, DATA_TTL.FORM);

        // Clear cached preview data to force fresh API call
        storage.remove(STORAGE_KEYS.FLOW.PREVIEW_DATA);

        // Continue to preview
        navigationManager.navigateToStep(4);
    });

    // Auto-save on input
    let saveTimeout;
    form.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const formData = getFormData(form);
            storage.set(STORAGE_KEYS.FLOW.FORM_DATA, formData, DATA_TTL.FORM);
        }, 1000);
    });
}

function fillTestData() {
    // Randomize email to avoid duplicate customer checks
    const randomId = Math.floor(Math.random() * 100000);
    const timestamp = Date.now().toString().slice(-6);
    const randomEmail = `max.mustermann+${timestamp}${randomId}@example.com`;

    // Randomize birth date (between 25 and 50 years old)
    const today = new Date();
    const minAge = 25;
    const maxAge = 50;
    const randomAge = minAge + Math.floor(Math.random() * (maxAge - minAge));
    const birthYear = today.getFullYear() - randomAge;
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const randomBirthDate = `${birthYear}-${birthMonth}-${birthDay}`;

    const testData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: randomEmail,
        dateOfBirth: randomBirthDate,
        phone: '+491234567890',
        'address.street': 'Hauptstraße 123',
        'address.city': 'Berlin',
        'address.postalCode': '10115',
        'address.country': 'DE'
    };

    loadFormData(testData);

    // Trigger validation on all fields
    const form = document.getElementById('personal-info-form');
    const fields = form.querySelectorAll('[data-validate]');
    fields.forEach(field => {
        field.dispatchEvent(new Event('blur', { bubbles: true }));
    });

    showNotification('Test data filled with randomized email and birth date', 'success', 3000);
}

function loadFormData(data) {
    Object.keys(data).forEach(key => {
        const field = document.querySelector(`[name="${key}"]`);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = data[key];
            } else {
                field.value = data[key] || '';
            }
        }
    });
}

// =================================================================
// =================================================================
// STEP 4: PREVIEW
// =================================================================

let previewData = null;
let appliedVouchers = [];
let selectedStartDate = null; // Track the user-selected start date

async function initializePreviewStep() {
    console.log('Initializing Step 4: Preview');

    // Get required data
    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    const formData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);

    if (!offer || !formData) {
        showNotification('Missing required data. Please complete previous steps.', 'error');
        navigationManager.navigateToStep(offer ? 3 : 1);
        return;
    }

    // Load saved preview data if exists
    const savedPreview = storage.get(STORAGE_KEYS.FLOW.PREVIEW_DATA);
    if (savedPreview) {
        previewData = savedPreview;
        appliedVouchers = savedPreview.voucherCodes || [];
        renderPreview(previewData);
    } else {
        await loadPreview();
    }

    // Setup start date functionality
    document.getElementById('apply-start-date').addEventListener('click', applyStartDate, { once: false });
    document.getElementById('contract-start-date').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyStartDate();
        }
    });

    // Setup voucher code functionality
    document.getElementById('apply-voucher').addEventListener('click', applyVoucherCode, { once: false });
    document.getElementById('voucher-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyVoucherCode();
        }
    });

    // Setup retry button
    document.getElementById('retry-preview').addEventListener('click', loadPreview, { once: false });

    // Setup navigation buttons
    document.getElementById('back-step-4').addEventListener('click', () => {
        navigationManager.navigateToStep(3);
    }, { once: true });

    document.getElementById('continue-step-4').addEventListener('click', () => {
        if (previewData) {
            // Always go to Step 5 (Recurring Payment) next
            // Step 6 will automatically skip to Step 7 if no upfront payment is needed
            navigationManager.navigateToStep(5);
        }
    }, { once: true });
}

async function loadPreview(customStartDate = null) {
    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    const formData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);

    // Show loading state
    document.getElementById('preview-loading').classList.remove('hidden');
    document.getElementById('preview-error').classList.add('hidden');
    document.getElementById('preview-content').classList.add('hidden');
    document.getElementById('preview-navigation').classList.add('hidden');

    try {
        // Get the term ID from the offer (use first term if multiple)
        const termId = offer.terms && offer.terms.length > 0 ? offer.terms[0].id : null;
        const defaultStartDate = offer.terms && offer.terms.length > 0 ? offer.terms[0].defaultContractStartDate : null;

        if (!termId) {
            throw new Error('No term ID found for the selected offer');
        }

        // Calculate start date:
        // 1. Use customStartDate if provided (user changed it)
        // 2. Use selectedStartDate if we have one from previous preview (preserves user selection)
        // 3. Use defaultStartDate from offer term
        // 4. Fall back to today's date
        let startDate = customStartDate || selectedStartDate || defaultStartDate;
        if (!startDate) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0];
        }

        // Store the selected start date for future use
        selectedStartDate = startDate;

        // Build customer object according to API spec (ALL required fields must be present)
        const customer = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            dateOfBirth: formData.dateOfBirth,
            phoneNumberMobile: formData.phone || undefined,
            street: formData['address.street'],
            city: formData['address.city'],
            zipCode: formData['address.postalCode'],
            countryCode: formData['address.country'],
            language: {
                languageCode: storage.get(STORAGE_KEYS.CONFIG.LOCALE)?.split('-')[0] || 'en',
                countryCode: formData['address.country']
            }
        };

        // Build contract object according to API spec (startDate is REQUIRED)
        const contract = {
            contractOfferTermId: termId,
            startDate: startDate
        };

        // Add voucher code if exists
        if (appliedVouchers.length > 0) {
            contract.voucherCode = appliedVouchers[0]; // API accepts single voucher code as string
        }

        // Call preview API with correct structure
        const requestData = {
            contract: contract,
            customer: customer
        };

        console.log('Preview API request:', JSON.stringify(requestData, null, 2));

        previewData = await apiClient.previewMembership(requestData);

        console.log('Preview API response:', JSON.stringify(previewData, null, 2));

        // Store preview data
        storage.set(STORAGE_KEYS.FLOW.PREVIEW_DATA, previewData, DATA_TTL.PREVIEW);

        // Render preview
        renderPreview(previewData);

    } catch (error) {
        console.error('Error loading preview:', error);

        // Hide loading, show error
        document.getElementById('preview-loading').classList.add('hidden');
        document.getElementById('preview-error').classList.remove('hidden');

        const message = error instanceof APIError ? error.message : 'Failed to load contract preview. Please try again.';
        document.getElementById('preview-error-message').textContent = message;
    }
}

function renderPreview(preview) {
    // Hide loading, show content
    document.getElementById('preview-loading').classList.add('hidden');
    document.getElementById('preview-error').classList.add('hidden');
    document.getElementById('preview-content').classList.remove('hidden');
    document.getElementById('preview-navigation').classList.remove('hidden');

    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    const formData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);

    // Set the start date input field with the current start date
    const startDateInput = document.getElementById('contract-start-date');
    if (startDateInput && selectedStartDate) {
        startDateInput.value = selectedStartDate;
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        startDateInput.min = today;
    }

    // Render contract summary
    const summaryEl = document.getElementById('preview-summary');
    summaryEl.innerHTML = `
        <div class="flex justify-between py-2 border-b">
            <span class="text-gray-600">Membership:</span>
            <span class="font-semibold">${offer.name}</span>
        </div>
        <div class="flex justify-between py-2 border-b">
            <span class="text-gray-600">Member:</span>
            <span class="font-semibold">${formData.firstName} ${formData.lastName}</span>
        </div>
        ${preview.contractStartDate ? `
        <div class="flex justify-between py-2 border-b">
            <span class="text-gray-600">Start Date:</span>
            <span class="font-semibold">${new Date(preview.contractStartDate).toLocaleDateString()}</span>
        </div>
        ` : ''}
        ${preview.contractEndDate ? `
        <div class="flex justify-between py-2 border-b">
            <span class="text-gray-600">End Date:</span>
            <span class="font-semibold">${new Date(preview.contractEndDate).toLocaleDateString()}</span>
        </div>
        ` : ''}
    `;

    // Render payment details
    const paymentEl = document.getElementById('preview-payment');
    let paymentHTML = '';

    // Debug: Show all preview data to understand structure
    console.log('Preview object keys:', Object.keys(preview));
    console.log('Preview data:', preview);

    // Try different possible field names from API response
    const recurringAmount = preview.recurringPaymentAmount || preview.recurringAmount || preview.monthlyPrice;
    const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount || preview.dueOnSigningAmount || preview.upfrontAmount || preview.initialPayment;
    const totalValue = preview.contractVolumeInformation?.totalContractVolume || preview.totalContractValue || preview.totalAmount || preview.contractValue;

    if (recurringAmount) {
        const amount = recurringAmount.amount || recurringAmount;
        const currency = recurringAmount.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-2 border-b border-blue-300">
                <span class="text-gray-700">Recurring Payment:</span>
                <span class="font-bold text-lg">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    if (dueOnSigning && (dueOnSigning.amount > 0 || dueOnSigning > 0)) {
        const amount = dueOnSigning.amount || dueOnSigning;
        const currency = dueOnSigning.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-2 border-b border-blue-300">
                <span class="text-gray-700">Due on Signing:</span>
                <span class="font-bold text-lg text-orange-600">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    if (totalValue) {
        const amount = totalValue.amount || totalValue;
        const currency = totalValue.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-3 bg-blue-100 -mx-6 px-6 mt-3 rounded">
                <span class="text-gray-900 font-semibold">Total Contract Value:</span>
                <span class="font-bold text-xl text-blue-700">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    // If no payment data found, show a message
    if (!paymentHTML) {
        paymentHTML = `
            <div class="text-gray-500 italic py-4">
                Payment details will be calculated during checkout.
            </div>
        `;
    }

    paymentEl.innerHTML = paymentHTML;

    // Show applied vouchers if any
    if (appliedVouchers.length > 0) {
        const voucherStatus = document.getElementById('voucher-status');
        voucherStatus.innerHTML = `
            <div class="flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>Voucher applied: ${appliedVouchers.join(', ')}</span>
            </div>
        `;
        voucherStatus.classList.remove('hidden');
    }
}

async function applyVoucherCode() {
    const voucherInput = document.getElementById('voucher-code');
    const voucherCode = voucherInput.value.trim();

    if (!voucherCode) {
        showNotification('Please enter a voucher code', 'warning');
        return;
    }

    if (appliedVouchers.includes(voucherCode)) {
        showNotification('This voucher has already been applied', 'info');
        return;
    }

    // Add voucher and reload preview
    appliedVouchers.push(voucherCode);
    voucherInput.value = '';
    showNotification('Applying voucher...', 'info', 2000);

    await loadPreview();
}

async function applyStartDate() {
    const startDateInput = document.getElementById('contract-start-date');
    const newStartDate = startDateInput.value;

    if (!newStartDate) {
        showNotification('Please select a start date', 'warning');
        return;
    }

    // Validate that the date is not in the past
    const selectedDate = new Date(newStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (selectedDate < today) {
        showNotification('Start date cannot be in the past', 'error');
        return;
    }

    // Check if the date has actually changed
    if (newStartDate === selectedStartDate) {
        showNotification('Start date is already set to this value', 'info');
        return;
    }

    // Reload preview with new start date
    showNotification('Recalculating preview with new start date...', 'info', 2000);
    await loadPreview(newStartDate);
    showNotification('Preview updated with new start date', 'success');
}

// =================================================================
// PAYMENT WIDGET MANAGEMENT
// =================================================================

let paymentWidgetInstances = {
    recurring: null,
    upfront: null
};

/**
 * Create a payment session via API
 * @param {string} scope - MEMBER_ACCOUNT or ECOM
 * @param {number} amount - Amount in cents (0 for recurring payment setup)
 * @returns {Promise<string>} userSessionToken
 */
async function createPaymentSession(scope, amount = 0) {
    console.log(`Creating payment session: scope=${scope}, amount=${amount}`);

    const requestData = {
        amount: amount,
        scope: scope,
        referenceText: 'Membership Contract Payment' // Required field
    };

    // Add cached finionPayCustomerId if available
    const cachedFinionPayCustomerId = storage.get(STORAGE_KEYS.FLOW.FINION_PAY_CUSTOMER_ID);
    if (cachedFinionPayCustomerId) {
        requestData.finionPayCustomerId = cachedFinionPayCustomerId;
        console.log('Using cached finionPayCustomerId:', cachedFinionPayCustomerId);
    }

    // Add permittedPaymentChoices based on scope
    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    console.log('Offer data for payment session:', offer);

    if (scope === 'ECOM') {
        // For ECOM scope (upfront payment), only allow one-time payment methods
        requestData.permittedPaymentChoices = ['CREDIT_CARD', 'PAYPAL', 'TWINT', 'IDEAL', 'BANCONTACT'];
        console.log('ECOM scope: Using one-time payment methods only');
    } else if (scope === 'MEMBER_ACCOUNT') {
        // For MEMBER_ACCOUNT scope (recurring payment), use ALL payment choices from offer
        // API field name is 'allowedPaymentChoices' (not 'permittedPaymentChoices')
        if (offer && offer.allowedPaymentChoices && offer.allowedPaymentChoices.length > 0) {
            requestData.permittedPaymentChoices = offer.allowedPaymentChoices;
            console.log('Added permittedPaymentChoices from offer.allowedPaymentChoices:', offer.allowedPaymentChoices);
        } else {
            console.warn('No allowedPaymentChoices found in offer, using defaults');
            // Fallback to common recurring payment methods
            requestData.permittedPaymentChoices = ['SEPA', 'BACS', 'CREDIT_CARD', 'CASH', 'BANK_TRANSFER'];
        }
    }

    console.log('Payment session request:', JSON.stringify(requestData, null, 2));

    try {
        const response = await apiClient.createPaymentSession(requestData);
        console.log('Payment session response:', JSON.stringify(response, null, 2));

        // Cache finionPayCustomerId from response for future payment sessions
        if (response.finionPayCustomerId) {
            storage.set(STORAGE_KEYS.FLOW.FINION_PAY_CUSTOMER_ID, response.finionPayCustomerId, DATA_TTL.TOKENS);
            console.log('Cached finionPayCustomerId from response:', response.finionPayCustomerId);
        }

        // API returns 'token' not 'userSessionToken'
        return response.token;
    } catch (error) {
        console.error('Error creating payment session:', error);
        console.error('Error details:', error.details);
        throw error;
    }
}

/**
 * Mount the payment widget
 * @param {string} containerSelector - DOM selector for widget container
 * @param {string} userSessionToken - Session token from API
 * @param {number} amount - Amount in cents
 * @param {Function} onSuccess - Success callback receiving paymentRequestToken
 * @param {Function} onError - Error callback
 * @returns {Promise<Object>} Widget instance
 */
async function mountPaymentWidget(containerSelector, userSessionToken, amount, onSuccess, onError) {
    console.log(`Mounting payment widget in ${containerSelector}`);

    // Check if widget library is loaded
    if (typeof window.paymentWidget === 'undefined') {
        throw new Error('Payment widget library not loaded');
    }

    const config = {
        userSessionToken: userSessionToken,
        container: containerSelector,
        countryCode: storage.get(STORAGE_KEYS.CONFIG.COUNTRY_CODE) || 'DE',
        locale: storage.get(STORAGE_KEYS.CONFIG.LOCALE) || 'de-DE',
        environment: storage.get(STORAGE_KEYS.CONFIG.ENVIRONMENT) || 'sandbox',
        featureFlags: {
            useRubiksUI: storage.get(STORAGE_KEYS.CONFIG.USE_RUBIKS_UI) || false
        },
        onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
            console.log('Payment widget success:', paymentRequestToken);
            if (paymentInstrumentDetails) {
                console.log('Payment instrument details:', paymentInstrumentDetails);
            }
            onSuccess(paymentRequestToken);
        },
        onError: (error) => {
            console.error('Payment widget error:', error);
            onError(error);
        }
    };

    console.log('Widget config:', config);

    try {
        const widgetInstance = window.paymentWidget.init(config);
        console.log('Payment widget mounted successfully');
        return widgetInstance;
    } catch (error) {
        console.error('Error mounting payment widget:', error);
        throw error;
    }
}

/**
 * Unmount and cleanup widget instance
 */
function cleanupWidget(widgetInstance) {
    if (widgetInstance && typeof widgetInstance.destroy === 'function') {
        try {
            widgetInstance.destroy();
            console.log('Widget destroyed');
        } catch (error) {
            console.error('Error destroying widget:', error);
        }
    }
}

// =================================================================
// STEP 5: RECURRING PAYMENT
// =================================================================

async function initializeRecurringPaymentStep() {
    console.log('Initializing Step 5: Recurring Payment');

    // Cleanup ALL existing widgets to ensure complete isolation
    cleanupWidget(paymentWidgetInstances.recurring);
    paymentWidgetInstances.recurring = null;
    cleanupWidget(paymentWidgetInstances.upfront);
    paymentWidgetInstances.upfront = null;

    // Clear the container DOM to ensure clean mount
    const containerEl = document.getElementById('recurring-payment-container');
    if (containerEl) {
        containerEl.innerHTML = '';
    }

    // Get required data
    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    const preview = storage.get(STORAGE_KEYS.FLOW.PREVIEW_DATA);

    if (!offer || !preview) {
        showNotification('Missing required data. Returning to preview step.', 'error');
        navigationManager.navigateToStep(4);
        return;
    }

    // Setup back button
    document.getElementById('back-step-5').addEventListener('click', () => {
        navigationManager.navigateToStep(4);
    }, { once: true });

    // Load payment widget
    await loadRecurringPaymentWidget();
}

async function loadRecurringPaymentWidget() {
    const loadingEl = document.getElementById('recurring-payment-loading');
    const errorEl = document.getElementById('recurring-payment-error');
    const containerEl = document.getElementById('recurring-payment-container');
    const successEl = document.getElementById('recurring-payment-success');
    const navigationEl = document.getElementById('recurring-payment-navigation');
    const continueBtn = document.getElementById('continue-step-5');

    // Show loading
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    containerEl.classList.add('hidden');
    successEl.classList.add('hidden');
    navigationEl.classList.add('hidden');

    try {
        // Create payment session (scope: MEMBER_ACCOUNT, amount: 0)
        const userSessionToken = await createPaymentSession('MEMBER_ACCOUNT', 0);

        // Hide loading, show container
        loadingEl.classList.add('hidden');
        containerEl.classList.remove('hidden');
        navigationEl.classList.remove('hidden');

        // Mount widget
        paymentWidgetInstances.recurring = await mountPaymentWidget(
            'recurring-payment-container',
            userSessionToken,
            0,
            (paymentRequestToken) => {
                // Success callback
                console.log('Recurring payment token received:', paymentRequestToken);

                // Store token with TTL (15 minutes)
                const tokens = storage.get(STORAGE_KEYS.FLOW.TOKENS) || {};
                tokens.recurring = {
                    token: paymentRequestToken,
                    timestamp: Date.now()
                };
                storage.set(STORAGE_KEYS.FLOW.TOKENS, tokens, DATA_TTL.TOKEN);

                // Show success message
                successEl.classList.remove('hidden');

                // Enable continue button
                continueBtn.disabled = false;

                showNotification('Payment method saved successfully!', 'success');
            },
            (error) => {
                // Error callback
                console.error('Payment widget error:', error);
                showNotification('Payment widget error: ' + error.message, 'error');
            }
        );

        // Setup continue button
        continueBtn.addEventListener('click', () => {
            // Always navigate to Step 6 (it will handle skipping if no upfront payment)
            navigationManager.navigateToStep(6);
        }, { once: true });

    } catch (error) {
        console.error('Error loading recurring payment widget:', error);

        // Hide loading, show error
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        navigationEl.classList.remove('hidden');

        const message = error instanceof APIError ? error.message : 'Failed to load payment widget. Please try again.';
        document.getElementById('recurring-payment-error-message').textContent = message;

        // Setup retry button
        document.getElementById('retry-recurring-payment').addEventListener('click', () => {
            loadRecurringPaymentWidget();
        }, { once: true });
    }
}

// =================================================================
// STEP 6: UPFRONT PAYMENT (CONDITIONAL)
// =================================================================

async function initializeUpfrontPaymentStep() {
    console.log('Initializing Step 6: Upfront Payment');

    // Cleanup ALL existing widgets to ensure complete isolation
    cleanupWidget(paymentWidgetInstances.recurring);
    paymentWidgetInstances.recurring = null;
    cleanupWidget(paymentWidgetInstances.upfront);
    paymentWidgetInstances.upfront = null;

    // Clear the container DOM to ensure clean mount
    const containerEl = document.getElementById('upfront-payment-container');
    if (containerEl) {
        containerEl.innerHTML = '';
    }

    // Get required data
    const preview = storage.get(STORAGE_KEYS.FLOW.PREVIEW_DATA);

    if (!preview) {
        showNotification('Missing preview data. Returning to preview step.', 'error');
        navigationManager.navigateToStep(4);
        return;
    }

    // Get upfront amount - try multiple possible field names
    const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount || preview.dueOnSigningAmount || preview.upfrontAmount || preview.initialPayment;

    console.log('Upfront payment check:', { dueOnSigning, preview });

    // If no upfront payment object exists, skip to confirmation
    if (!dueOnSigning) {
        console.log('No upfront payment needed (no dueOnSigning object), skipping to confirmation');
        navigationManager.navigateToStep(7);
        return;
    }

    // Extract amount (handle both object and primitive)
    const amount = typeof dueOnSigning === 'object' ? dueOnSigning.amount : dueOnSigning;
    const currency = typeof dueOnSigning === 'object' ? (dueOnSigning.currency || 'EUR') : 'EUR';

    console.log('Upfront payment amount:', { amount, currency, type: typeof amount });

    // If amount is 0, null, undefined, or NaN, skip to confirmation
    if (!amount || amount === 0 || isNaN(amount)) {
        console.log('No upfront payment needed (amount is 0/null/NaN), skipping to confirmation');
        navigationManager.navigateToStep(7);
        return;
    }

    // Display amount
    document.getElementById('upfront-amount').textContent = formatCurrencyDecimal(amount, currency);

    // Setup back button
    document.getElementById('back-step-6').addEventListener('click', () => {
        navigationManager.navigateToStep(5);
    }, { once: true });

    // Load payment widget
    await loadUpfrontPaymentWidget(amount);
}

async function loadUpfrontPaymentWidget(amount) {
    const loadingEl = document.getElementById('upfront-payment-loading');
    const errorEl = document.getElementById('upfront-payment-error');
    const containerEl = document.getElementById('upfront-payment-container');
    const successEl = document.getElementById('upfront-payment-success');
    const navigationEl = document.getElementById('upfront-payment-navigation');
    const continueBtn = document.getElementById('continue-step-6');

    // Show loading
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    containerEl.classList.add('hidden');
    successEl.classList.add('hidden');
    navigationEl.classList.add('hidden');

    try {
        // Create payment session (scope: ECOM, amount: upfront amount)
        const userSessionToken = await createPaymentSession('ECOM', amount);

        // Hide loading, show container
        loadingEl.classList.add('hidden');
        containerEl.classList.remove('hidden');
        navigationEl.classList.remove('hidden');

        // Mount widget
        paymentWidgetInstances.upfront = await mountPaymentWidget(
            'upfront-payment-container',
            userSessionToken,
            amount,
            (paymentRequestToken) => {
                // Success callback
                console.log('Upfront payment token received:', paymentRequestToken);

                // Store token with TTL (15 minutes)
                const tokens = storage.get(STORAGE_KEYS.FLOW.TOKENS) || {};
                tokens.upfront = {
                    token: paymentRequestToken,
                    timestamp: Date.now()
                };
                storage.set(STORAGE_KEYS.FLOW.TOKENS, tokens, DATA_TTL.TOKEN);

                // Show success message
                successEl.classList.remove('hidden');

                // Enable continue button
                continueBtn.disabled = false;

                showNotification('Payment completed successfully!', 'success');
            },
            (error) => {
                // Error callback
                console.error('Payment widget error:', error);
                showNotification('Payment widget error: ' + error.message, 'error');
            }
        );

        // Setup continue button
        continueBtn.addEventListener('click', () => {
            navigationManager.navigateToStep(7);
        }, { once: true });

    } catch (error) {
        console.error('Error loading upfront payment widget:', error);

        // Hide loading, show error
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        navigationEl.classList.remove('hidden');

        const message = error instanceof APIError ? error.message : 'Failed to load payment widget. Please try again.';
        document.getElementById('upfront-payment-error-message').textContent = message;

        // Setup retry button
        document.getElementById('retry-upfront-payment').addEventListener('click', () => {
            loadUpfrontPaymentWidget(amount);
        }, { once: true });
    }
}

// =================================================================
// STEP 7: CONFIRMATION
// =================================================================

async function initializeConfirmationStep() {
    console.log('Initializing Step 7: Confirmation');

    // Get all required data
    const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
    const formData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);
    const preview = storage.get(STORAGE_KEYS.FLOW.PREVIEW_DATA);
    const tokens = storage.get(STORAGE_KEYS.FLOW.TOKENS);

    if (!offer || !formData || !preview || !tokens || !tokens.recurring) {
        showNotification('Missing required data. Please complete all previous steps.', 'error');
        navigationManager.navigateToStep(1);
        return;
    }

    // Render member information
    const memberInfoEl = document.getElementById('confirm-member-info');
    memberInfoEl.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="text-gray-600">Name:</span>
                <span class="font-semibold ml-2">${formData.firstName} ${formData.lastName}</span>
            </div>
            <div>
                <span class="text-gray-600">Email:</span>
                <span class="font-semibold ml-2">${formData.email}</span>
            </div>
            <div>
                <span class="text-gray-600">Date of Birth:</span>
                <span class="font-semibold ml-2">${new Date(formData.dateOfBirth).toLocaleDateString()}</span>
            </div>
            <div>
                <span class="text-gray-600">Phone:</span>
                <span class="font-semibold ml-2">${formData.phone || 'N/A'}</span>
            </div>
            <div class="col-span-2">
                <span class="text-gray-600">Address:</span>
                <span class="font-semibold ml-2">${formData['address.street']}, ${formData['address.postalCode']} ${formData['address.city']}, ${formData['address.country']}</span>
            </div>
        </div>
    `;

    // Render membership information
    const membershipInfoEl = document.getElementById('confirm-membership-info');

    // Extract contract details
    const contractStartDate = preview.contractStartDate;
    const contractEndDate = preview.contractEndDate;
    const duration = preview.contractDuration || preview.duration;
    const billingPeriod = preview.billingPeriod || offer.billingPeriod;
    const minimumTerm = preview.minimumTerm || preview.minimumContractTerm || offer.minimumTerm;

    membershipInfoEl.innerHTML = `
        <div class="space-y-2">
            <div class="flex justify-between">
                <span class="text-gray-600">Membership:</span>
                <span class="font-semibold">${offer.name}</span>
            </div>
            ${contractStartDate ? `
            <div class="flex justify-between">
                <span class="text-gray-600">Start Date:</span>
                <span class="font-semibold">${new Date(contractStartDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
            ${contractEndDate ? `
            <div class="flex justify-between">
                <span class="text-gray-600">End Date:</span>
                <span class="font-semibold">${new Date(contractEndDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
            ${duration ? `
            <div class="flex justify-between">
                <span class="text-gray-600">Duration:</span>
                <span class="font-semibold">${duration} months</span>
            </div>
            ` : ''}
            ${billingPeriod ? `
            <div class="flex justify-between">
                <span class="text-gray-600">Billing Period:</span>
                <span class="font-semibold">${billingPeriod}</span>
            </div>
            ` : ''}
            ${minimumTerm ? `
            <div class="flex justify-between">
                <span class="text-gray-600">Minimum Term:</span>
                <span class="font-semibold">${minimumTerm} months</span>
            </div>
            ` : ''}
        </div>
    `;

    // Render payment information
    const paymentInfoEl = document.getElementById('confirm-payment-info');
    let paymentHTML = '<div class="space-y-2">';

    const recurringAmount = preview.recurringPaymentAmount || preview.recurringAmount || preview.monthlyPrice;
    const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount || preview.dueOnSigningAmount || preview.upfrontAmount || preview.initialPayment;
    const totalValue = preview.contractVolumeInformation?.totalContractVolume || preview.totalContractValue || preview.totalAmount || preview.contractValue;

    if (recurringAmount) {
        const amount = recurringAmount.amount || recurringAmount;
        const currency = recurringAmount.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Recurring Payment:</span>
                <span class="font-semibold">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    if (dueOnSigning && (dueOnSigning.amount > 0 || dueOnSigning > 0)) {
        const amount = dueOnSigning.amount || dueOnSigning;
        const currency = dueOnSigning.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Paid Today:</span>
                <span class="font-semibold text-orange-600">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    if (totalValue) {
        const amount = totalValue.amount || totalValue;
        const currency = totalValue.currency || 'EUR';
        paymentHTML += `
            <div class="flex justify-between py-3 bg-blue-50 rounded px-3 mt-2">
                <span class="text-gray-900 font-semibold">Total Contract Value:</span>
                <span class="font-bold text-lg text-blue-700">${formatCurrencyDecimal(amount, currency)}</span>
            </div>
        `;
    }

    paymentHTML += `
        <div class="flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="font-medium">Payment methods verified</span>
        </div>
    </div>`;

    paymentInfoEl.innerHTML = paymentHTML;

    // Setup back button
    document.getElementById('back-step-7').addEventListener('click', () => {
        // Check if upfront payment was needed by looking at preview data
        const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount || preview.dueOnSigningAmount || preview.upfrontAmount || preview.initialPayment;
        const amount = typeof dueOnSigning === 'object' ? dueOnSigning.amount : dueOnSigning;
        const hasUpfrontPayment = amount && amount > 0 && !isNaN(amount);

        // Go back to upfront payment if it was required, otherwise recurring payment
        navigationManager.navigateToStep(hasUpfrontPayment ? 6 : 5);
    }, { once: true });

    // Setup terms checkbox
    const termsCheckbox = document.getElementById('accept-terms');
    const submitButton = document.getElementById('submit-contract');

    termsCheckbox.addEventListener('change', () => {
        submitButton.disabled = !termsCheckbox.checked;
    });

    // Setup submit button
    submitButton.addEventListener('click', () => {
        submitContract();
    }, { once: true });
}

async function submitContract() {
    console.log('Submitting contract...');

    const loadingEl = document.getElementById('submit-loading');
    const errorEl = document.getElementById('submit-error');
    const successEl = document.getElementById('submit-success');
    const navigationEl = document.getElementById('confirm-navigation');

    // Show loading
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');
    navigationEl.style.display = 'none';

    try {
        // Get all required data
        const offer = selectedOffer || storage.get(STORAGE_KEYS.FLOW.SELECTED_OFFER);
        const formData = storage.get(STORAGE_KEYS.FLOW.FORM_DATA);
        const preview = storage.get(STORAGE_KEYS.FLOW.PREVIEW_DATA);
        const tokens = storage.get(STORAGE_KEYS.FLOW.TOKENS);
        const vouchers = appliedVouchers.length > 0 ? appliedVouchers : undefined;

        // Build customer object
        const customer = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            dateOfBirth: formData.dateOfBirth,
            phoneNumberMobile: formData.phone || undefined,
            street: formData['address.street'],
            city: formData['address.city'],
            zipCode: formData['address.postalCode'],
            countryCode: formData['address.country'],
            language: {
                languageCode: storage.get(STORAGE_KEYS.CONFIG.LOCALE)?.split('-')[0] || 'en',
                countryCode: formData['address.country']
            },
            paymentRequestToken: tokens.recurring.token // REQUIRED for recurring payment
        };

        // Build contract object
        const termId = offer.terms[0].id;

        // Get startDate from preview, or use selectedStartDate, or fall back to today
        let startDate = preview.contractStartDate || selectedStartDate;
        if (!startDate) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0];
            console.warn('No contractStartDate in preview or selectedStartDate, using today:', startDate);
        }

        const contract = {
            contractOfferTermId: termId,
            startDate: startDate,
            voucherCode: vouchers ? vouchers[0] : undefined
        };

        // Build signup request
        const signupRequest = {
            contract: contract,
            customer: customer
        };

        // Add upfront payment token if exists (only required if offer has upfront payment)
        if (tokens.upfront) {
            contract.initialPaymentRequestToken = tokens.upfront.token;
            console.log('Added initialPaymentRequestToken to contract:', tokens.upfront.token);
        }

        console.log('Signup request:', JSON.stringify(signupRequest, null, 2));

        // Call signup API
        const response = await apiClient.createMembership(signupRequest);

        console.log('Membership created:', response);

        // Hide loading, show success
        loadingEl.classList.add('hidden');
        successEl.classList.remove('hidden');

        // Display customer ID (from API response)
        const customerId = response.customerId || response.customer?.id || response.id || 'N/A';
        document.getElementById('membership-id').textContent = customerId;

        // Setup "Create Another Membership" button (in success message)
        const createAnotherBtn = document.getElementById('create-another-membership');
        if (createAnotherBtn) {
            createAnotherBtn.addEventListener('click', () => {
                console.log('Create Another Membership clicked');
                // Clear only flow data, keep configuration
                storage.clear('mlContractFlow:flow');
                // Reset navigation state
                navigationManager.currentStep = 1;
                navigationManager.maxReachedStep = 1;
                navigationManager.saveState();
                // Reload page to start fresh
                window.location.href = 'contract-flow.html';
            }, { once: true });
        }

        showNotification('Membership created successfully!', 'success');

    } catch (error) {
        console.error('Error creating membership:', error);

        // Hide loading, show error
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        navigationEl.style.display = 'flex';

        const message = error instanceof APIError ? error.message : 'Failed to create membership. Please try again.';
        document.getElementById('submit-error-message').textContent = message;

        // Setup retry button
        document.getElementById('retry-submit').addEventListener('click', () => {
            submitContract();
        }, { once: true });
    }
}

// =================================================================
// INITIALIZATION
// =================================================================

function initializeContractFlow() {
    console.log('🚀 Initializing Contract Creation Flow');

    // Load configuration
    loadConfiguration();

    // Initialize navigation manager
    navigationManager = new NavigationManager();

    // Render current step
    navigationManager.renderStep(navigationManager.getCurrentStep());

    // Setup configuration panel
    setupConfigPanel();

    showSuccess('Contract flow initialized');
}

function loadConfiguration() {
    // Load from storage
    const apiKey = storage.get(STORAGE_KEYS.CONFIG.API_KEY);
    const baseUrl = storage.get(STORAGE_KEYS.CONFIG.API_BASE_URL);

    if (apiKey && baseUrl) {
        apiClient.configure(baseUrl, apiKey);
    }

    // Load UI config
    document.getElementById('apiKey').value = apiKey || '';
    document.getElementById('apiBaseUrl').value = baseUrl || '';
    document.getElementById('environment').value = storage.get(STORAGE_KEYS.CONFIG.ENVIRONMENT) || 'sandbox';
    document.getElementById('countryCode').value = storage.get(STORAGE_KEYS.CONFIG.COUNTRY_CODE) || 'DE';
    document.getElementById('currency').value = storage.get(STORAGE_KEYS.CONFIG.CURRENCY) || 'EUR';
    document.getElementById('locale').value = storage.get(STORAGE_KEYS.CONFIG.LOCALE) || 'de-DE';
    document.getElementById('useRubiksUI').checked = storage.get(STORAGE_KEYS.CONFIG.USE_RUBIKS_UI) || false;
    document.getElementById('requireDirectDebitSignature').checked = storage.get(STORAGE_KEYS.CONFIG.REQUIRE_DD_SIG) || false;
}

function setupConfigPanel() {
    const toggle = document.getElementById('config-toggle');
    const close = document.getElementById('config-close');
    const panel = document.getElementById('config-panel');
    const overlay = document.getElementById('config-overlay');

    toggle.addEventListener('click', () => {
        panel.classList.toggle('translate-x-full');
        if (!panel.classList.contains('translate-x-full')) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    });

    close.addEventListener('click', () => {
        panel.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    });

    overlay.addEventListener('click', () => {
        panel.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    });

    // Save configuration
    document.getElementById('save-config').addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value;
        const baseUrl = document.getElementById('apiBaseUrl').value;

        if (!apiKey || !baseUrl) {
            showError('Please provide API key and base URL');
            return;
        }

        // Save to storage
        storage.set(STORAGE_KEYS.CONFIG.API_KEY, apiKey, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.API_BASE_URL, baseUrl, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.ENVIRONMENT, document.getElementById('environment').value, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.COUNTRY_CODE, document.getElementById('countryCode').value, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.CURRENCY, document.getElementById('currency').value, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.LOCALE, document.getElementById('locale').value, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.USE_RUBIKS_UI, document.getElementById('useRubiksUI').checked, DATA_TTL.CONFIG);
        storage.set(STORAGE_KEYS.CONFIG.REQUIRE_DD_SIG, document.getElementById('requireDirectDebitSignature').checked, DATA_TTL.CONFIG);

        // Configure API client
        apiClient.configure(baseUrl, apiKey);

        showSuccess('Configuration saved');

        // Close panel
        panel.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    });

    // Start Over button (in config panel)
    document.getElementById('start-over').addEventListener('click', () => {
        if (confirm('Start over from Step 1? Your current progress will be cleared.')) {
            // Clear only flow data, keep configuration
            storage.clear('mlContractFlow:flow');

            // Reset to step 1
            navigationManager.currentStep = 1;
            navigationManager.maxReachedStep = 1;
            navigationManager.saveState();

            // Reload page to start fresh
            window.location.href = 'contract-flow.html';
        }
    }, { once: false });

    // Clear data
    document.getElementById('clear-data').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL data including configuration?')) {
            storage.clear('mlContractFlow');
            showSuccess('All data cleared');
            setTimeout(() => location.reload(), 1000);
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeContractFlow();
});
