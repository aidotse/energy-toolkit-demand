/**
 * Tests for navigation store
 *
 * Note: The navigation store uses Svelte 5 $state() runes in a .svelte.ts file.
 * Tests run in vitest browser mode where the Svelte compiler processes runes.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { navigationState } from './navigation.svelte';

describe('navigationState', () => {
	beforeEach(() => {
		// Reset all states to defaults
		navigationState.mobileMenuOpen = false;
		navigationState.scenarioModalOpen = false;
		navigationState.scenarioDropdownOpen = false;
	});

	describe('initial state defaults', () => {
		test('mobileMenuOpen defaults to false', () => {
			expect(navigationState.mobileMenuOpen).toBe(false);
		});

		test('scenarioModalOpen defaults to false', () => {
			expect(navigationState.scenarioModalOpen).toBe(false);
		});

		test('scenarioDropdownOpen defaults to false', () => {
			expect(navigationState.scenarioDropdownOpen).toBe(false);
		});
	});

	describe('toggleMobileMenu', () => {
		test('toggles mobileMenuOpen from false to true', () => {
			expect(navigationState.mobileMenuOpen).toBe(false);

			navigationState.toggleMobileMenu();

			expect(navigationState.mobileMenuOpen).toBe(true);
		});

		test('toggles mobileMenuOpen from true to false', () => {
			navigationState.mobileMenuOpen = true;

			navigationState.toggleMobileMenu();

			expect(navigationState.mobileMenuOpen).toBe(false);
		});
	});

	describe('toggleScenarioModal', () => {
		test('toggles scenarioModalOpen from false to true', () => {
			expect(navigationState.scenarioModalOpen).toBe(false);

			navigationState.toggleScenarioModal();

			expect(navigationState.scenarioModalOpen).toBe(true);
		});

		test('toggles scenarioModalOpen from true to false', () => {
			navigationState.scenarioModalOpen = true;

			navigationState.toggleScenarioModal();

			expect(navigationState.scenarioModalOpen).toBe(false);
		});

		test('closes scenarioDropdown when opening modal', () => {
			navigationState.scenarioDropdownOpen = true;

			navigationState.toggleScenarioModal();

			expect(navigationState.scenarioModalOpen).toBe(true);
			expect(navigationState.scenarioDropdownOpen).toBe(false);
		});

		test('does not affect scenarioDropdown when closing modal', () => {
			navigationState.scenarioModalOpen = true;
			navigationState.scenarioDropdownOpen = true;

			navigationState.toggleScenarioModal();

			expect(navigationState.scenarioModalOpen).toBe(false);
			expect(navigationState.scenarioDropdownOpen).toBe(true);
		});
	});

	describe('toggleScenarioDropdown', () => {
		test('toggles scenarioDropdownOpen from false to true', () => {
			expect(navigationState.scenarioDropdownOpen).toBe(false);

			navigationState.toggleScenarioDropdown();

			expect(navigationState.scenarioDropdownOpen).toBe(true);
		});

		test('toggles scenarioDropdownOpen from true to false', () => {
			navigationState.scenarioDropdownOpen = true;

			navigationState.toggleScenarioDropdown();

			expect(navigationState.scenarioDropdownOpen).toBe(false);
		});

		test('closes scenarioModal when opening dropdown', () => {
			navigationState.scenarioModalOpen = true;

			navigationState.toggleScenarioDropdown();

			expect(navigationState.scenarioDropdownOpen).toBe(true);
			expect(navigationState.scenarioModalOpen).toBe(false);
		});

		test('does not affect scenarioModal when closing dropdown', () => {
			navigationState.scenarioDropdownOpen = true;
			navigationState.scenarioModalOpen = true;

			navigationState.toggleScenarioDropdown();

			expect(navigationState.scenarioDropdownOpen).toBe(false);
			expect(navigationState.scenarioModalOpen).toBe(true);
		});
	});
});
