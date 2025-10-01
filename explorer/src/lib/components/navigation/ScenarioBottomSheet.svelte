<script lang="ts">
	/**
	 * ScenarioBottomSheet Component
	 *
	 * Mobile bottom sheet overlay for scenario parameter selection.
	 * Slides up from bottom with drag-to-close functionality.
	 */
	import { X } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { browser } from '$app/environment';

	// Props
	let {
		scenarios = [],
		baseScenarios = [],
		parameters = {}
	}: {
		scenarios?: any[];
		baseScenarios?: any[];
		parameters?: any;
	} = $props();

	// Local state
	let sheetRef: HTMLDivElement | undefined;
	let matchingCount = $derived(scenarios.length);
	let startY = 0;
	let currentY = 0;
	let isDragging = false;

	// ESC key handler
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			navigationState.toggleScenarioModal();
		}
	}

	// Touch drag handlers
	function handleTouchStart(event: TouchEvent) {
		startY = event.touches[0].clientY;
		isDragging = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging) return;
		currentY = event.touches[0].clientY;
		const deltaY = currentY - startY;

		// Only allow downward drag
		if (deltaY > 0 && sheetRef) {
			sheetRef.style.transform = `translateY(${deltaY}px)`;
		}
	}

	function handleTouchEnd() {
		if (!isDragging) return;
		isDragging = false;

		const deltaY = currentY - startY;

		// Close if dragged down more than 100px
		if (deltaY > 100) {
			navigationState.toggleScenarioModal();
		}

		// Reset position
		if (sheetRef) {
			sheetRef.style.transform = 'translateY(0)';
		}
	}

	// Setup and cleanup event listeners
	$effect(() => {
		if (browser && navigationState.scenarioModalOpen) {
			document.addEventListener('keydown', handleKeydown);

			return () => {
				document.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	// Placeholder base scenarios
	const defaultBaseScenarios = [
		{ name: 'Baseline 2030', color: 'blue', growth: 0 },
		{ name: 'High Growth 2040', color: 'green', growth: 2.5 },
		{ name: 'Low Growth 2030', color: 'orange', growth: -1.0 }
	];

	const displayBaseScenarios = baseScenarios.length > 0 ? baseScenarios : defaultBaseScenarios;

	function selectBaseScenario(scenario: any) {
		navigationState.setScenario(scenario);
		navigationState.applyScenario();
	}

	function handleApply() {
		navigationState.applyScenario();
	}

	function handleReset() {
		navigationState.tempParameters = {};
	}

	function handleAddComparison() {
		// TODO: Add current scenario to comparison
		navigationState.applyScenario();
	}

	function handleBackdropClick() {
		navigationState.toggleScenarioModal();
	}
</script>

{#if navigationState.scenarioModalOpen}
	<!-- Backdrop -->
	<button
		onclick={handleBackdropClick}
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-default"
		aria-label="Close modal"
	></button>

	<!-- Bottom Sheet -->
	<div
		bind:this={sheetRef}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		class="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-up"
	>
		<!-- Drag Handle -->
		<div class="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
			<div class="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
		</div>

		<!-- Header -->
		<div
			class="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700"
		>
			<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Select Scenario</h3>
			<button
				onclick={() => navigationState.toggleScenarioModal()}
				class="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				aria-label="Close"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
			<!-- Quick Select Section -->
			<div>
				<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Select</h4>
				<div class="space-y-3">
					{#each displayBaseScenarios as scenario}
						<button
							onclick={() => selectBaseScenario(scenario)}
							class="flex items-center justify-between w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all duration-200 active:scale-98"
						>
							<span class="font-medium text-lg text-gray-900 dark:text-white">{scenario.name}</span>
							<div
								class="w-4 h-4 rounded-full"
								style="background-color: var(--color-{scenario.color}-500)"
							></div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Parameter Groups Section -->
			<div>
				<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
					Customize Parameters
				</h4>
				<div class="text-sm text-gray-500 dark:text-gray-400">
					Parameter controls coming soon...
				</div>
				<!-- TODO: Integrate ParameterChip and ParameterGroup components -->
			</div>

			<!-- Matching Indicator -->
			<div class="flex items-center justify-center py-2">
				<span class="text-base text-gray-600 dark:text-gray-400">
					{matchingCount} scenario{matchingCount !== 1 ? 's' : ''} available
				</span>
			</div>
		</div>

		<!-- Footer Actions -->
		<div
			class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
		>
			<button
				onclick={handleReset}
				class="px-5 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
			>
				Reset
			</button>
			<div class="flex items-center gap-3">
				<button
					onclick={handleAddComparison}
					class="px-5 py-3 text-base font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
				>
					Compare
				</button>
				<button
					onclick={handleApply}
					class="px-6 py-3 text-base font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
				>
					Apply
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
