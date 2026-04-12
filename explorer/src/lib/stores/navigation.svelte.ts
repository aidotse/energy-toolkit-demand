/**
 * Navigation State Store (Svelte 5 Runes)
 *
 * Global UI state for page layout — menus and modals.
 * Scenario/parameter state is managed by parameterStore (Strategy 2).
 * Comparison mode state is managed by scenarioState (scenario.svelte.ts).
 *
 * Mutual exclusion: scenarioModal and scenarioDropdown cannot both be open.
 * Opening one automatically closes the other (see toggle methods).
 */

/**
 * Navigation State Object
 * Handles UI state for navigation and modals.
 * Comparison mode is handled by scenarioState — do not duplicate here.
 */
class NavigationState {
	mobileMenuOpen = $state(false);
	scenarioModalOpen = $state(false);
	scenarioDropdownOpen = $state(false);

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
