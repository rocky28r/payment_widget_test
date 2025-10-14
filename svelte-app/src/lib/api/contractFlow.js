import { ApiClient } from './client.js';

export class ContractFlowApi extends ApiClient {
	constructor(baseUrl, apiKey) {
		super(baseUrl, apiKey);
	}

	// Get all membership offers
	async getMembershipOffers() {
		return this.get('/v1/memberships/membership-offers');
	}

	// Get single membership offer details
	async getMembershipOffer(offerId) {
		return this.get(`/v1/memberships/membership-offers/${offerId}`);
	}

	// Create contract preview
	async createContractPreview(data) {
		return this.post('/v1/memberships/signup/preview', data);
	}

	// Create membership (signup)
	async createMembership(data) {
		return this.post('/v1/memberships/signup', data);
	}

	// Create payment session
	async createPaymentSession(data) {
		return this.post('/v1/payments/user-session', data);
	}
}
