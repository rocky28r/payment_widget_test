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

        // Display pricing information
        const pricingEl = document.getElementById('offer-detail-pricing');
        let pricingHTML = '<h3 class="text-lg font-semibold text-gray-900 mb-4">Pricing</h3><div class="space-y-3">';

        // Show terms and pricing
        if (offerDetails.terms && offerDetails.terms.length > 0) {
            const term = offerDetails.terms[0]; // Use first term
            const currency = term.rateStartPrice?.currency || 'EUR';

            // Monthly/Recurring Price
            if (term.rateStartPrice) {
                pricingHTML += `
                    <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span class="text-gray-700 font-medium">Recurring Price:</span>
                        <span class="text-2xl font-bold text-blue-600">${formatCurrency(term.rateStartPrice.amount, term.rateStartPrice.currency)}</span>
                    </div>
                `;
            }

            // Show flat fees (starter packages, etc.)
            let hasStarterPackage = false;
            let starterPackageAmount = 0;
            if (term.flatFees && term.flatFees.length > 0) {
                term.flatFees.forEach(fee => {
                    if (fee.starterPackage && fee.price) {
                        hasStarterPackage = true;
                        starterPackageAmount += fee.price.amount || 0;
                    }
                    pricingHTML += `
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-600">${fee.name}${fee.starterPackage ? ' (One-time)' : ''}:</span>
                            <span class="font-medium">${fee.price ? formatCurrency(fee.price.amount, fee.price.currency) : fee.formattedPaymentFrequency || 'N/A'}</span>
                        </div>
                    `;
                });
            }

            // Calculate total contract value over minimum term
            if (term.rateStartPrice && term.term) {
                const monthlyAmount = term.rateStartPrice.amount / 100;
                const termMonths = term.term.unit === 'MONTH' ? term.term.value : term.term.value * 12;
                const recurringTotal = monthlyAmount * termMonths;
                const starterTotal = starterPackageAmount / 100;
                const totalValue = recurringTotal + starterTotal;

                pricingHTML += `
                    <div class="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-900 font-semibold">Total Contract Value:</span>
                            <span class="text-2xl font-bold text-purple-700">${currency} ${totalValue.toFixed(2)}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-1">Over ${termMonths}-month initial term</p>
                    </div>
                `;
            }

            // Payment Schedule Section
            pricingHTML += '<div class="mt-4 pt-4 border-t border-gray-200">';
            pricingHTML += '<h4 class="text-sm font-semibold text-gray-900 mb-2">Payment Schedule</h4>';
            pricingHTML += '<div class="space-y-2 text-sm">';

            // Billing Frequency
            const billingInterval = term.billingInterval || term.paymentInterval || 1;
            const billingUnit = term.billingIntervalUnit || 'MONTH';
            pricingHTML += `
                <div class="flex justify-between">
                    <span class="text-gray-600">Billing Frequency:</span>
                    <span class="font-medium">Every ${billingInterval} ${billingUnit.toLowerCase()}${billingInterval > 1 ? 's' : ''}</span>
                </div>
            `;

            // Currency
            pricingHTML += `
                <div class="flex justify-between">
                    <span class="text-gray-600">Currency:</span>
                    <span class="font-medium">${currency}</span>
                </div>
            `;

            // First Payment Date
            if (term.defaultContractStartDate) {
                const startDate = new Date(term.defaultContractStartDate);
                pricingHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">First Payment:</span>
                        <span class="font-medium">${startDate.toLocaleDateString()}</span>
                    </div>
                `;
            } else {
                pricingHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">First Payment:</span>
                        <span class="font-medium">Upon activation</span>
                    </div>
                `;
            }

            // Payment day of month (if applicable)
            if (term.paymentDayOfMonth) {
                pricingHTML += `
                    <div class="flex justify-between">
                        <span class="text-gray-600">Payment Day:</span>
                        <span class="font-medium">Day ${term.paymentDayOfMonth} of each month</span>
                    </div>
                `;
            }

            pricingHTML += '</div></div>'; // Close payment schedule section
        }

        pricingHTML += '</div>';
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
                        ${module.term && module.term.term ? `<p class="text-xs text-gray-500 mt-2">Duration: ${module.term.term.value} ${module.term.term.unit.toLowerCase()}(s)</p>` : ''}
                    </div>
                `;
            });
        }

        // Show contract terms
        if (offerDetails.terms && offerDetails.terms.length > 0) {
            const term = offerDetails.terms[0];
            infoHTML += `
                <div class="p-4 bg-gray-50 rounded-lg md:col-span-2">
                    <h4 class="font-semibold text-gray-900 mb-2">Contract Terms</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            `;

            if (term.cancelationPeriod) {
                infoHTML += `
                    <div>
                        <span class="text-gray-600">Cancellation Period:</span>
                        <span class="font-medium ml-2">${term.cancelationPeriod.value} ${term.cancelationPeriod.unit.toLowerCase()}(s)</span>
                    </div>
                `;
            }

            if (term.extensionTerm) {
                infoHTML += `
                    <div>
                        <span class="text-gray-600">Extension Term:</span>
                        <span class="font-medium ml-2">${term.extensionTerm.value} ${term.extensionTerm.unit.toLowerCase()}(s)</span>
                    </div>
                `;
            }

            if (term.defaultContractStartDate) {
                infoHTML += `
                    <div>
                        <span class="text-gray-600">Contract Start:</span>
                        <span class="font-medium ml-2">${new Date(term.defaultContractStartDate).toLocaleDateString()}</span>
                    </div>
                `;
            }

            // Cancellation Financial Terms
            if (term.cancellationFee || term.refundPolicy) {
                infoHTML += `
                    <div>
                        <span class="text-gray-600">Cancellation Fee:</span>
                        <span class="font-medium ml-2">${term.cancellationFee ? formatCurrency(term.cancellationFee.amount, term.cancellationFee.currency) : 'None'}</span>
                    </div>
                `;
            }

            // Auto-renewal
            const autoRenewal = term.autoRenewal !== undefined ? term.autoRenewal : true;
            infoHTML += `
                <div>
                    <span class="text-gray-600">Auto-Renewal:</span>
                    <span class="font-medium ml-2">${autoRenewal ? 'Yes' : 'No'}</span>
                </div>
            `;

            // Notice Period for Cancellation
            if (term.noticePeriod || term.cancelationPeriod) {
                const noticePeriod = term.noticePeriod || term.cancelationPeriod;
                infoHTML += `
                    <div>
                        <span class="text-gray-600">Notice Period:</span>
                        <span class="font-medium ml-2">${noticePeriod.value} ${noticePeriod.unit.toLowerCase()}(s) before end date</span>
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

async function loadPreview() {
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

        // Calculate start date (use default or today + 1 day)
        let startDate = defaultStartDate;
        if (!startDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            startDate = tomorrow.toISOString().split('T')[0];
        }

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
        // For MEMBER_ACCOUNT scope (recurring payment), use offer's permitted choices or defaults
        if (offer && offer.permittedPaymentChoices && offer.permittedPaymentChoices.length > 0) {
            requestData.permittedPaymentChoices = offer.permittedPaymentChoices;
            console.log('Added permittedPaymentChoices from offer:', offer.permittedPaymentChoices);
        } else {
            console.warn('No permittedPaymentChoices found in offer, using defaults');
            // Fallback to SEPA and CREDIT_CARD for recurring
            requestData.permittedPaymentChoices = ['SEPA', 'CREDIT_CARD'];
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

    // Cleanup any existing widget
    cleanupWidget(paymentWidgetInstances.recurring);
    paymentWidgetInstances.recurring = null;

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

    // Cleanup any existing widget
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

        // Get startDate from preview, or calculate default (tomorrow)
        let startDate = preview.contractStartDate;
        if (!startDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            startDate = tomorrow.toISOString().split('T')[0];
            console.warn('No contractStartDate in preview, using default:', startDate);
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
