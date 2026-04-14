<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import mapboxgl from 'mapbox-gl';
    import 'mapbox-gl/dist/mapbox-gl.css';
    import * as turf from '@turf/turf';
    import { mount, unmount } from 'svelte';
    import Popup from '$lib/components/map/Popup.svelte';
    import { formatNumber, makeDemandQuery } from '$lib/utilities';
    import { getEnergyPrefix } from '$lib/stores/units.svelte';
    import { fetchDemandData, mergeGeoData } from '$lib/dataService';
    import { DEFAULT_MAP_BOUNDS, FIT_BOUNDS_OPTIONS } from '$lib/mapConfig';
    import { scenarioState } from '$lib/stores/scenario.svelte';
    import { parameterStore } from '$lib/stores/parameterStore.svelte';
    import { viz } from '$lib/colors';

    const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

    let { geojsonData, yearData: yearDataProp, year, geography = $bindable(), scenario, lower_bound, upper_bound, segments = ['total'], fadeLeft = false } = $props();

    // Subscribe to global scenario state - use this instead of prop when available
    const currentScenario = $derived(scenarioState.currentScenario || scenario);

    let mapLoaded = $state(false);
    let hoveredFeatureId = $state<string | number | null>(null);
    let fetchedYearData = $state<any[]>([]);

    // Flipped true one frame after source.setData() runs for the first time,
    // so the overlay doesn't fade out while the map is still rendering an
    // uncoloured base layer. See the setData effect below.
    let dataRendered = $state(false);

    // Ready = style loaded AND first choropleth data is actually painted.
    // Drives the placeholder overlay fade-out.
    const mapReady = $derived(mapLoaded && dataRendered);

    let map: mapboxgl.Map;
    let mapContainer: HTMLDivElement;
    let popup: mapboxgl.Popup;
    let stickyPopup: boolean = false;
    let fadeLeftPad = $state(0);
    let resizeObserver: ResizeObserver | null = null;

    // Track the year and scenario that prop data corresponds to
    let propDataYear = $state<number | null>(null);
    let propDataScenarioId = $state<string | null>(null);

    // Initialize prop data tracking when yearDataProp is first received
    $effect(() => {
        if (yearDataProp && yearDataProp.length > 0 && propDataYear === null) {
            propDataYear = year;
            propDataScenarioId = scenario?.id || scenario?.scenario_id || 'default';
        }
    });

    // Use fetched data if we've changed years, otherwise use prop data
    const yearData = $derived(
        fetchedYearData.length > 0 ? fetchedYearData : yearDataProp
    );

    const handleMapClick = (e: any) => {
            if (stickyPopup) {
                // Check if click was outside the popup
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['county-fill'],
                });

                if (!features.length) {
                    closePopup(); // Close the popup if no features were clicked
                    geography = 'total';
                }
            }
        };

    // Determine segment query parameter based on selection
    const segmentParam = $derived(
        segments.includes('total') ? 'total' : 'all'
    );

    // Reactive parameter dependencies
    const baseScenario = $derived(parameterStore.baseScenario);
    const parameterValues = $derived(parameterStore.parameterValues);
    const hasActiveParameters = $derived(parameterStore.hasActiveParameters);

    // Track the last fetched parameters to detect changes
    let lastFetchParams = $state<{ year: number; segment: string; scenarioId: string; paramKey: string } | null>(null);

    // Fetch data when year, segment, scenario, or parameters change
    $effect(() => {
        const scenarioId = currentScenario?.id || currentScenario?.scenario_id || 'default';

        // Create reactive dependency on parameter values
        const _params = parameterValues;
        const _baseScenario = baseScenario;

        // Serialize active parameters for change detection
        const paramKey = parameterStore.isDefaultScenario
            ? JSON.stringify(parameterStore.parameterValues)
            : '';

        // Determine if we should use prop data:
        // - Only if segments is 'total' (prop data is total-only)
        // - And year matches the prop data year
        // - And scenario matches the one prop data was loaded with
        // - And no parameters are active (prop data was loaded without parameters)
        const canUsePropData = segments.includes('total') &&
            yearDataProp && yearDataProp.length > 0 &&
            (propDataYear === null || year === propDataYear) &&
            (propDataScenarioId === null || scenarioId === propDataScenarioId) &&
            !hasActiveParameters;

        if (canUsePropData) {
            fetchedYearData = []; // Clear fetched data to use prop data
            lastFetchParams = null;
            return;
        }

        // Check if we need to fetch (year, segment, scenario, or parameters changed)
        const currentParams = { year, segment: segmentParam, scenarioId, paramKey };
        if (lastFetchParams &&
            lastFetchParams.year === currentParams.year &&
            lastFetchParams.segment === currentParams.segment &&
            lastFetchParams.scenarioId === currentParams.scenarioId &&
            lastFetchParams.paramKey === currentParams.paramKey) {
            return; // No change, skip fetch
        }

        // Capture current values for the fetch (to avoid stale closures)
        const fetchYear = year;
        const fetchSegment = segmentParam;

        // Build query with parameter support
        const queryParams = makeDemandQuery({
            start: String(fetchYear),
            end: String(fetchYear + 1),
            resolution: '1Y',
            aggregation: 'sum',
            geography: 'all',
            segment: fetchSegment,
            baseScenario: parameterStore.baseScenario,
            parameterValues: parameterStore.isDefaultScenario
                ? parameterStore.parameterValues
                : undefined
        });

        fetchDemandData(queryParams)
            .then(data => {
                fetchedYearData = data;
                lastFetchParams = currentParams;
            })
            .catch(error => {
                console.error('Error updating data:', error.message);
            });
    });

    // Merge geo data with segment filtering
    let mergedData = $derived.by(() => {
        if (!geojsonData || !geojsonData.features || !yearData) {
            return geojsonData || { type: 'FeatureCollection', features: [] };
        }

        // If 'total' is selected, use standard mergeGeoData
        if (segments.includes('total')) {
            return mergeGeoData(geojsonData, yearData, year);
        }

        // For specific segments, filter data and aggregate only selected segments
        const dataMap = new Map<string, Record<string, number>>();

        yearData
            .filter((row: any) => {
                const rowYear = row.timestamp_year || (row.period ? new Date(row.period).getFullYear() : null);
                return rowYear === year;
            })
            .filter((row: any) => segments.includes(row.segment)) // Only include selected segments
            .forEach((row: any) => {
                if (!dataMap.has(row.geography)) {
                    dataMap.set(row.geography, {});
                }
                const geoData = dataMap.get(row.geography)!;
                geoData[row.segment] = (geoData[row.segment] || 0) + row.value;
                geoData['total'] = (geoData['total'] || 0) + row.value; // Sum selected segments into total
            });

        const updatedFeatures = geojsonData.features.map((feature: any) => {
            const geoID = feature.properties?.geo_id;
            const newFeature = { ...feature, properties: { ...feature.properties } };

            if (geoID) {
                newFeature.id = geoID;

                if (dataMap.has(geoID)) {
                    newFeature.properties = {
                        ...newFeature.properties,
                        ...dataMap.get(geoID),
                        geography: geoID,
                        year: year,
                    };
                }
            }

            return newFeature;
        });

        return { ...geojsonData, features: updatedFeatures };
    });

    // Tracks the currently-mounted Popup Svelte instance so we can unmount()
    // it before creating a new one (or on component destroy). Without this,
    // every call to createPopupContent leaks a Svelte component that mapbox
    // has already detached from the DOM.
    let popupInstance: ReturnType<typeof mount> | null = null;

    // Create popup content
    const createPopupContent = (properties: any, sticky: boolean) => {
        const geoName = properties.geo_name;
        const geoID = properties.geo_id;
        const year = properties.year;
        const demand = formatNumber(properties.total, getEnergyPrefix(), 'Wh');

        // Unmount the previous popup component before mounting a new one.
        if (popupInstance) {
            try { unmount(popupInstance); } catch { /* already torn down */ }
            popupInstance = null;
        }

        const popupDiv = document.createElement('div');
        popupInstance = mount(Popup, {
            target: popupDiv,
            props: {
                geoName,
                geoID,
                year,
                demand,
                sticky,
                onClose: () => {
                    popup.remove();
                    geography = 'total';
                    stickyPopup = false;
                },
            },
        });

        return popupDiv;
    };

    // Open popup
    const openPopup = (lngLat: any, properties: any, sticky = false) => {
        popup.setLngLat(lngLat)
            .setDOMContent(createPopupContent(properties, sticky))
            .addTo(map);

        stickyPopup = sticky;
    };

    // Close popup
    const closePopup = () => {
        popup.remove();
        stickyPopup = false;
    };

    // Compute fitBounds padding that accounts for the fadeLeft mask
    function getFitPadding() {
        return {
            ...FIT_BOUNDS_OPTIONS.padding,
            left: FIT_BOUNDS_OPTIONS.padding.left + fadeLeftPad
        };
    }

    onMount(() => {
        // When fadeLeft is active, shift the default view right so it renders
        // in the visible (non-masked) portion of the container.
        if (fadeLeft) {
            fadeLeftPad = Math.round(mapContainer.clientWidth * 0.45);

            resizeObserver = new ResizeObserver((entries) => {
                const newPad = Math.round(entries[0].contentRect.width * 0.45);
                if (newPad !== fadeLeftPad) {
                    fadeLeftPad = newPad;
                    if (map && mapLoaded && geography === 'total') {
                        map.fitBounds(DEFAULT_MAP_BOUNDS, {
                            ...FIT_BOUNDS_OPTIONS,
                            padding: getFitPadding(),
                            duration: 0
                        });
                    }
                }
            });
            resizeObserver.observe(mapContainer);
        }

        map = new mapboxgl.Map({
            container: mapContainer,
            accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
            style: MAPBOX_STYLE,
            bounds: DEFAULT_MAP_BOUNDS,
            fitBoundsOptions: { ...FIT_BOUNDS_OPTIONS, padding: getFitPadding() },
            attributionControl: false // Hide Mapbox logo and info button
        });

        popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
        });

        map.on('load', () => {
            if (geojsonData && yearData && year) {

                map.addSource('counties', {
                    type: 'geojson',
                    data: mergedData,
                });

                map.addLayer({
                    id: 'county-fill',
                    type: 'fill',
                    source: 'counties',
                    paint: {
                        'fill-color': [
                            'interpolate',
                            ['linear'],
                            ['get', 'total'],
                            lower_bound + (upper_bound - lower_bound) * viz.mapStops[0], viz.mapGradient[0],
                            lower_bound + (upper_bound - lower_bound) * viz.mapStops[1], viz.mapGradient[1],
                            lower_bound + (upper_bound - lower_bound) * viz.mapStops[2], viz.mapGradient[2],
                            lower_bound + (upper_bound - lower_bound) * viz.mapStops[3], viz.mapGradient[3],
                            lower_bound + (upper_bound - lower_bound) * viz.mapStops[4], viz.mapGradient[4],
                        ],
                        'fill-opacity': 0.7,
                    },
                });

                map.addLayer({
                    id: 'county-hover',
                    type: 'fill',
                    source: 'counties',
                    layout: {},
                    paint: {
                        'fill-color': '#ffffff',
                        'fill-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.4,
                            0
                        ]
                    }
                });

                map.addLayer({
                    id: 'county-border',
                    type: 'line',
                    source: 'counties',
                    paint: { 'line-color': '#000000', 'line-width': 1, 'line-opacity': 0.33 },
                });

                // Hover behavior
                map.on('mouseenter', 'county-fill', (e: any) => {
                    if (!stickyPopup && e.features && e.features.length > 0) {
                        const feature = e.features[0];
                        openPopup(e.lngLat, feature.properties);
                    }
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mousemove', 'county-fill', (e: any) => {
                    if (!e.features || e.features.length === 0) return;
                    const id = e.features[0].id;
                    if (id === undefined) return;

                    if (hoveredFeatureId !== null && hoveredFeatureId !== id) {
                        map.setFeatureState({ source: 'counties', id: hoveredFeatureId }, { hover: false });
                    }

                    hoveredFeatureId = id;
                    map.setFeatureState({ source: 'counties', id }, { hover: true });


                    if (!stickyPopup) {
                        openPopup(e.lngLat, e.features[0].properties);
                    }
                });

                map.on('mouseleave', 'county-fill', () => {
                    if (!stickyPopup) {
                        closePopup();
                    }
                    if (hoveredFeatureId !== null) {
                        map.setFeatureState({ source: 'counties', id: hoveredFeatureId }, { hover: false });
                    }
                    hoveredFeatureId = null;

                    map.getCanvas().style.cursor = '';
                });

                // Sticky popup on click
                map.on('click', 'county-fill', (e: any) => {
                    if (!e.features || e.features.length === 0) return;
                    const properties = e.features[0].properties;
                    if (!properties) return;
                    // Update geography to properties.geo_id unless properties.geo_id is null in which case it should be '00'
                    geography = properties.geo_id;
                    openPopup(e.lngLat, properties, true);
                });

                map.on('click', handleMapClick);

                mapLoaded = true;

            }
        });
    });
    
    $effect(() => {
        if (mapLoaded && mergedData) {
            const source = map?.getSource('counties') as mapboxgl.GeoJSONSource;
            if (source) {
                source.setData(mergedData);
                // Wait one paint so the browser draws the coloured features
                // before we start fading out the overlay. Without this the
                // overlay starts disappearing while the base tiles are still
                // uncoloured and it reads as a flicker.
                if (!dataRendered && mergedData.features?.length > 0) {
                    requestAnimationFrame(() => { dataRendered = true; });
                }
            }

            if (stickyPopup) {
                const feature = mergedData.features.find((f: any) => f.properties?.geo_id === geography);
                if (feature) {
                    popup.setDOMContent(createPopupContent(feature.properties, true));
                }
            }
        }
    });

    $effect(() => {
        if (!mapLoaded || !map || !mergedData) return;

        if (geography === 'total') {
            // Reset to the configured default view instead of fixed center/zoom
            map.fitBounds(DEFAULT_MAP_BOUNDS, {
                ...FIT_BOUNDS_OPTIONS,
                padding: getFitPadding(),
                duration: 1000
            });
            closePopup();
            return;
        }

        const feature = mergedData.features.find(
            (f: any) => f.properties?.geo_id === geography
        );

        if (feature) {
            const bbox = turf.bbox(feature) as [number, number, number, number];
            map.fitBounds(bbox, {
                padding: 40,
                duration: 1000
            });

            // Open popup for the selected geography
            const center = turf.center(feature);
            openPopup([center.geometry.coordinates[0], center.geometry.coordinates[1]], feature.properties, true);
        }
    });

    onDestroy(() => {
        resizeObserver?.disconnect();
        map?.off('click', handleMapClick); // Detach the event
        if (popupInstance) {
            try { unmount(popupInstance); } catch { /* already torn down */ }
            popupInstance = null;
        }
        map?.remove();
    });

    
</script>

<div class="relative size-full">
    <div bind:this={mapContainer} class="size-full"
      style={fadeLeft
        ? 'mask-image: linear-gradient(to right, transparent, black 50%); -webkit-mask-image: linear-gradient(to right, transparent, black 50%);'
        : ''}
    ></div>
    {#if !mapReady}
        <!-- Placeholder fill while mapbox-gl loads and the first choropleth
             data renders. A full pre-rendered PNG of the implementation's
             default view can be dropped at /data/map-snapshot.png (generate
             via `npm run fetch-map-snapshot` in behovskartan's reference
             explorer) to replace the flat fill, but a neutral colour works
             fine as a default for the template. -->
        <div
            class="absolute inset-0 pointer-events-none bg-slate-100"
            out:fade={{ duration: 350 }}
        ></div>
    {/if}
</div>
