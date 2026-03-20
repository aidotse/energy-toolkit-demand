<script lang="ts">
	/**
	 * ScenarioBottomSheet Component
	 *
	 * Mobile bottom sheet overlay for Strategy 2 parameter selection.
	 * Slides up from bottom with drag-to-close functionality.
	 * Uses ParameterControls for base scenario and parameter sliders.
	 */
	import { X } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import { browser } from '$app/environment';
	import type { Strategy2Parameter } from '$lib/dataService';
	import type { Snippet } from 'svelte';

	// Props
	let {
		sliderComponent
	}: {
		sliderComponent?: Snippet<[Strategy2Parameter, number, (value: number) => void]>;
	} = $props();

	// Local state
	let sheetRef: HTMLDivElement | undefined;
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

	function handleBackdropClick() {
		navigationState.toggleScenarioModal();
	}

	// Get current scenario label for display
	const currentBaseLabel = $derived(
		parameterStore.baseScenarios.find(s => s.id === parameterStore.baseScenario)?.name || 'Välj scenario'
	);
</script>

{#if navigationState.scenarioModalOpen}
	<!-- Backdrop -->
	<button
		onclick={handleBackdropClick}
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-default"
		aria-label="Stäng"
	></button>

	<!-- Bottom Sheet -->
	<div
		bind:this={sheetRef}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		class="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-up"
	>
		<!-- Drag Handle -->
		<div class="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
			<div class="w-12 h-1.5 bg-gray-300 rounded-full"></div>
		</div>

		<!-- Header -->
		<div
			class="flex items-center justify-between px-6 py-3 border-b border-gray-200"
		>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Scenarioinställningar</h3>
				<p class="text-sm text-gray-500 mt-0.5">
					{currentBaseLabel}
					{#if parameterStore.activeParameterCount > 0}
						<span class="text-primary-600">
							+{parameterStore.activeParameterCount} justeringar
						</span>
					{/if}
				</p>
			</div>
			<button
				onclick={() => navigationState.toggleScenarioModal()}
				class="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
				aria-label="Stäng"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			<ParameterControls
				compact={false}
				showReset={true}
				showSummary={true}
				{sliderComponent}
			/>
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
