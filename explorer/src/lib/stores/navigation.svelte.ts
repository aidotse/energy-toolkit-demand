/**
 * Navigation State Store (Svelte 5 Runes)
 *
 * Global state for page layout navigation and scenario panel.
 * Uses Svelte 5 runes for reactive state management with localStorage persistence.
 */

import { browser } from '$app/environment';

// Initialize from localStorage if available
const getInitialPanelState = (): boolean => {
	if (!browser) return true;
	const stored = localStorage.getItem('scenarioPanelExpanded');
	return stored !== null ? stored === 'true' : true;
};

/**
 * Navigation State Object
 * Simple reactive state object without effects in constructor
 */
class NavigationState {
	panelExpanded = $state(getInitialPanelState());
	currentScenario = $state<any | null>(null);
	comparisonMode = $state(false);
	comparisonScenarios = $state<any[]>([]);
	mobileMenuOpen = $state(false);
	scenarioModalOpen = $state(false);

	togglePanel() {
		this.panelExpanded = !this.panelExpanded;
		// Persist to localStorage synchronously
		if (browser) {
			localStorage.setItem('scenarioPanelExpanded', String(this.panelExpanded));
		}
	}

	toggleMobileMenu() {
		this.mobileMenuOpen = !this.mobileMenuOpen;
	}

	toggleScenarioModal() {
		this.scenarioModalOpen = !this.scenarioModalOpen;
	}

	setScenario(scenario: any) {
		this.currentScenario = scenario;
	}

	toggleComparisonMode() {
		this.comparisonMode = !this.comparisonMode;
		if (!this.comparisonMode) {
			this.comparisonScenarios = [];
		}
	}

	addToComparison(scenario: any) {
		if (this.comparisonScenarios.length < 3 && !this.comparisonScenarios.includes(scenario)) {
			this.comparisonScenarios.push(scenario);
		}
	}

	removeFromComparison(scenario: any) {
		const index = this.comparisonScenarios.indexOf(scenario);
		if (index > -1) {
			this.comparisonScenarios.splice(index, 1);
		}
	}
}

export const navigationState = new NavigationState();
