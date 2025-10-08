import { writable, derived } from 'svelte/store';

// Create a persistent store for contract flow state
function createContractFlowStore() {
	const defaultState = {
		// Current step (1-5)
		currentStep: 1,

		// Selected offer data
		selectedOfferId: null,
		selectedOffer: null,

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
			country: 'DE',
			dateOfBirth: ''
		},

		// Contract preview data
		preview: null,
		voucher: null,
		customStartDate: null,

		// Payment data
		recurringPaymentToken: null,
		upfrontPaymentToken: null,
		upfrontAmount: 0,

		// Contract submission
		contractId: null,
		contractNumber: null,

		// UI state
		loading: false,
		error: null
	};

	const { subscribe, set, update } = writable(defaultState);

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
			currentStep: 2,
			error: null
		})),

		// Personal info
		updatePersonalInfo: (info) => update(state => ({
			...state,
			personalInfo: { ...state.personalInfo, ...info }
		})),

		// Preview
		setPreview: (preview) => update(state => ({ ...state, preview })),
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

		// Reset
		reset: () => set(defaultState)
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
	$store => $store.preview !== null
);

export const canProceedToStep4 = derived(
	contractFlowStore,
	$store => {
		const { personalInfo } = $store;
		return personalInfo.firstName && personalInfo.lastName &&
		       personalInfo.email && personalInfo.street &&
		       personalInfo.zip && personalInfo.city;
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
