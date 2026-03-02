/**
 * Navigation State Store (Svelte 5 Runes)
 *
 * Global UI state for page layout — panels, menus, and modals.
 * Scenario/parameter state is managed by parameterStore (Strategy 2).
 * Comparison mode state is managed by scenarioState (scenario.svelte.ts).
 *
 * Mutual exclusion: scenarioModal and scenarioDropdown cannot both be open.
 * Opening one automatically closes the other (see toggle methods).
 *
 * Panel state is persisted to localStorage so it survives page reloads.
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
 * Handles UI state for navigation and modals.
 * Comparison mode is handled by scenarioState — do not duplicate here.
 */
class NavigationState {
	panelExpanded = $state(getInitialPanelState());
	mobileMenuOpen = $state(false);
	scenarioModalOpen = $state(false);
	scenarioDropdownOpen = $state(false);

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
		if (this.scenarioModalOpen) {
			this.scenarioDropdownOpen = false; // Close dropdown if modal opens
		}
	}

	toggleScenarioDropdown() {
		this.scenarioDropdownOpen = !this.scenarioDropdownOpen;
		if (this.scenarioDropdownOpen) {
			this.scenarioModalOpen = false; // Close modal if dropdown opens
		}
	}
}

export const navigationState = new NavigationState();
