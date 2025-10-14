import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'contractFlowSession';

// Load from localStorage
function loadSession() {
	if (!browser) return null;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	} catch (e) {
		console.error('Failed to load session:', e);
		return null;
	}
}

// Save to localStorage
function saveSession(state) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.error('Failed to save session:', e);
	}
}

// Create a persistent store for contract flow state
function createContractFlowStore() {
	const defaultState = {
		// Current step (1-5)
		currentStep: 1,

		// Selected offer data
		selectedOfferId: null,
		selectedOffer: null,
		selectedTermId: null,

		// Personal information
		personalInfo: {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			street: '',
			houseNumber: '',
			zip: '',
			city: '',
			countryCode: '',
			dateOfBirth: '',
			startDate: '',
			voucherCode: ''
		},

		// Contract preview data
		preview: null,
		previewLoading: false,
		previewError: null,
		voucher: null,
		customStartDate: null,

		// Payment data
		recurringPaymentToken: null,
		upfrontPaymentToken: null,
		upfrontAmount: 0,

		// Payment session tokens (for widget remount)
		recurringSessionToken: null,
		upfrontSessionToken: null,

		// Contract submission
		contractId: null,
		contractNumber: null,

		// UI state
		loading: false,
		error: null
	};

	// Try to restore session, otherwise use default
	const initialState = loadSession() || defaultState;

	const { subscribe, set, update } = writable(initialState);

	// Auto-save to localStorage on every change
	if (browser) {
		subscribe((state) => {
			saveSession(state);
		});
	}

	return {
		subscribe,

		// Navigation methods
		goToStep: (step) => update(state => ({ ...state, currentStep: step, error: null })),
		nextStep: () => update(state => ({ ...state, currentStep: state.currentStep + 1, error: null })),
		previousStep: () => update(state => ({ ...state, currentStep: Math.max(1, state.currentStep - 1), error: null })),

		// Offer selection
		selectOffer: (offerId, offer) => update(state => ({
			...state,
			selectedOfferId: offerId,
			selectedOffer: offer,
			selectedTermId: offer?.terms?.[0]?.id || null, // Auto-select first term
			currentStep: 2,
			error: null
		})),

		// Term selection
		selectTerm: (termId) => update(state => ({
			...state,
			selectedTermId: termId,
			// Clear preview when term changes
			preview: null,
			previewLoading: false,
			previewError: null
		})),

		// Personal info
		updatePersonalInfo: (info) => update(state => ({
			...state,
			personalInfo: { ...state.personalInfo, ...info }
		})),

		// Preview
		setPreview: (preview) => update(state => ({ ...state, preview, previewLoading: false, previewError: null })),
		setPreviewLoading: (loading) => update(state => ({ ...state, previewLoading: loading })),
		setPreviewError: (error) => update(state => ({ ...state, previewError: error, previewLoading: false })),
		clearPreviewError: () => update(state => ({ ...state, previewError: null })),
		setVoucher: (voucher) => update(state => ({ ...state, voucher })),
		clearVoucher: () => update(state => ({ ...state, voucher: null })),
		setCustomStartDate: (date) => update(state => ({ ...state, customStartDate: date })),

		// Payment
		setRecurringPaymentToken: (token) => update(state => ({ ...state, recurringPaymentToken: token })),
		setUpfrontPaymentToken: (token, amount) => update(state => ({
			...state,
			upfrontPaymentToken: token,
			upfrontAmount: amount
		})),

		// Payment session tokens (for widget remount)
		setRecurringSessionToken: (sessionToken) => update(state => ({ ...state, recurringSessionToken: sessionToken })),
		setUpfrontSessionToken: (sessionToken) => update(state => ({ ...state, upfrontSessionToken: sessionToken })),

		// Contract
		setContract: (contractId, contractNumber) => update(state => ({
			...state,
			contractId,
			contractNumber
		})),

		// UI state
		setLoading: (loading) => update(state => ({ ...state, loading })),
		setError: (error) => update(state => ({ ...state, error, loading: false })),
		clearError: () => update(state => ({ ...state, error: null })),

		// Reset and clear localStorage
		reset: () => {
			if (browser) localStorage.removeItem(STORAGE_KEY);
			set(defaultState);
		}
	};
}

export const contractFlowStore = createContractFlowStore();

// Derived stores
export const canProceedToStep2 = derived(
	contractFlowStore,
	$store => $store.selectedOfferId !== null && $store.selectedOffer !== null
);

export const canProceedToStep3 = derived(
	contractFlowStore,
	$store => true // Can always proceed to Step 3 after selecting offer
);

export const canProceedToStep4 = derived(
	contractFlowStore,
	$store => {
		const { personalInfo, preview, previewLoading } = $store;
		// Must have personal info filled AND preview loaded successfully
		const hasPersonalInfo = personalInfo.firstName && personalInfo.lastName &&
		                        personalInfo.email && personalInfo.street &&
		                        personalInfo.zip && personalInfo.city;
		const hasValidPreview = preview !== null && !previewLoading;
		return hasPersonalInfo && hasValidPreview;
	}
);

export const canProceedToStep5 = derived(
	contractFlowStore,
	$store => $store.recurringPaymentToken !== null
);

export const hasUpfrontPayment = derived(
	contractFlowStore,
	$store => $store.preview && $store.preview.upfrontAmount > 0
);
