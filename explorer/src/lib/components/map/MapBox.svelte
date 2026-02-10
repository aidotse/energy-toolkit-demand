<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import mapboxgl from 'mapbox-gl';
    import 'mapbox-gl/dist/mapbox-gl.css';
    import * as turf from '@turf/turf';
    import { mount } from 'svelte';
    import Popup from '$lib/components/map/Popup.svelte';
    import { formatNumber } from '$lib/utilities';
    import { getEnergyPrefix } from '$lib/stores/units.svelte';
    import { fetchDemandData, mergeGeoData } from '$lib/dataService';
    import { scenarioState } from '$lib/stores/scenario.svelte';
    import { getSettings } from 'svelte-ux';

    // Get svelte-ux theme store
    const { currentTheme } = getSettings();

    // Mapbox style URLs for light and dark themes
    const MAPBOX_STYLES = {
        light: 'mapbox://styles/viktorbengtsson/cm34o762h00a801o09g4q99uq', // Your current light style
        dark: 'mapbox://styles/mapbox/dark-v11' // Mapbox default dark style (you can replace with your custom dark style)
    };

    let { geojsonData, yearData: yearDataProp, year, geography = $bindable(), scenario, lower_bound, upper_bound, segments = ['total'] } = $props();

    // Subscribe to global scenario state - use this instead of prop when available
    const currentScenario = $derived(scenarioState.currentScenario || scenario);

    let mapLoaded = $state(false);
    let hoveredFeatureId = $state(null);
    let fetchedYearData = $state<any[]>([]);
    let currentMapTheme = $state<'light' | 'dark'>('light');

    let map: mapboxgl.Map;
    let mapContainer: HTMLDivElement;
    let popup: mapboxgl.Popup;
    let stickyPopup: boolean = false;

    // Track the year that prop data corresponds to
    let propDataYear = $state<number | null>(null);

    // Initialize propDataYear when yearDataProp is first received
    $effect(() => {
        if (yearDataProp && yearDataProp.length > 0 && propDataYear === null) {
            propDataYear = year;
        }
    });

    // Use fetched data if we've changed years, otherwise use prop data
    const yearData = $derived(
        fetchedYearData.length > 0 ? fetchedYearData : yearDataProp
    );

    const handleMapClick = (e) => {
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

    // Track the last fetched parameters to detect changes
    let lastFetchParams = $state<{ year: number; segment: string } | null>(null);

    // Fetch data when year or segment selection changes
    $effect(() => {
        // Determine if we should use prop data:
        // - Only if segments is 'total' (prop data is total-only)
        // - And year matches the prop data year
        const canUsePropData = segments.includes('total') &&
            yearDataProp && yearDataProp.length > 0 &&
            (propDataYear === null || year === propDataYear);

        if (canUsePropData) {
            fetchedYearData = []; // Clear fetched data to use prop data
            lastFetchParams = null;
            return;
        }

        // Check if we need to fetch (year or segment changed)
        const currentParams = { year, segment: segmentParam };
        if (lastFetchParams &&
            lastFetchParams.year === currentParams.year &&
            lastFetchParams.segment === currentParams.segment) {
            return; // No change, skip fetch
        }

        // Capture current values for the fetch (to avoid stale closures)
        const fetchYear = year;
        const fetchSegment = segmentParam;
        const scenarioId = currentScenario?.id || currentScenario?.scenario_id || 'default';

        // Fetch new data using cached dataService
        const queryParams = new URLSearchParams({
            'period[start]': String(fetchYear),
            'period[end]': String(fetchYear + 1),
            'period[resolution]': '1Y',
            'period[aggregation]': 'sum',
            'geography': 'all',
            'segment': fetchSegment,
            'scenarioId': scenarioId
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
                const dateField = row.period || row.timestamp;
                const rowYear = row.timestamp_year || (dateField ? new Date(dateField).getFullYear() : null);
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

    // Create popup content
    const createPopupContent = (properties: any, sticky: boolean) => {
        const geoName = properties.geo_name;
        const geoID = properties.geo_id;
        const year = properties.year;
        const demand = formatNumber(properties.total, getEnergyPrefix(), 'Wh');

        const popupDiv = document.createElement('div');
        mount(Popup, {
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
    const openPopup = (lngLat, properties, sticky = false) => {
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

    onMount(() => {
        // Define Sweden's bounding box coordinates
        const swedenBounds = [
            [10.5, 55.2], // Southwest coordinates [lng, lat]
            [24.2, 69.1]  // Northeast coordinates [lng, lat]
        ];

        map = new mapboxgl.Map({
            container: mapContainer,
            accessToken: 'pk.eyJ1IjoidmlrdG9yYmVuZ3Rzc29uIiwiYSI6ImNtMzRnZnpkYTFuYXgycXFzZTl6ZDk2dHcifQ.6eeJ-8q9Q_84jA4_K8zFfA',
            style: MAPBOX_STYLES[$currentTheme.dark ? 'dark' : 'light'],
            bounds: swedenBounds,
            fitBoundsOptions: {
                padding: { top: 20, bottom: 20, left: 20, right: 20 },
                maxZoom: 7 // Prevent zooming in too far when fitting bounds
            },
            attributionControl: false // Hide Mapbox logo and info button
        });

        currentMapTheme = $currentTheme.dark ? 'dark' : 'light';

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
                            lower_bound, '#61bbd9',
                            lower_bound + (upper_bound - lower_bound) * 0.33, '#007399',
                            lower_bound + (upper_bound - lower_bound) * 0.66, '#002a66',
                            upper_bound, '#660042',
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
                map.on('mouseenter', 'county-fill', (e) => {
                    if (!stickyPopup && e.features.length > 0) {
                        const feature = e.features[0];
                        openPopup(e.lngLat, feature.properties);
                    }
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mousemove', 'county-fill', (e) => {
                    const id = e.features[0].id;

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
                map.on('click', 'county-fill', (e) => {
                    const properties = e.features[0].properties;
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
            }

            if (stickyPopup) {
                const feature = mergedData.features.find(f => f.properties.geo_id === geography);
                if (feature) {
                    popup.setDOMContent(createPopupContent(feature.properties, true));
                }
            }
        }
    });

    // Switch map style when theme changes
    $effect(() => {
        if (!map || !mapLoaded) return;

        const newTheme = $currentTheme.dark ? 'dark' : 'light';

        // Only change if theme actually changed
        if (newTheme !== currentMapTheme) {
            const newStyle = MAPBOX_STYLES[newTheme];
            map.once('styledata', () => {
                // Re-add data layers after style loads
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
                                lower_bound, '#61bbd9',
                                lower_bound + (upper_bound - lower_bound) * 0.33, '#007399',
                                lower_bound + (upper_bound - lower_bound) * 0.66, '#002a66',
                                upper_bound, '#660042',
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

                    // Re-attach event listeners after style change
                    map.on('mouseenter', 'county-fill', (e) => {
                        if (!stickyPopup && e.features.length > 0) {
                            const feature = e.features[0];
                            openPopup(e.lngLat, feature.properties);
                        }
                        map.getCanvas().style.cursor = 'pointer';
                    });

                    map.on('mousemove', 'county-fill', (e) => {
                        const id = e.features[0].id;

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

                    map.on('click', 'county-fill', (e) => {
                        const properties = e.features[0].properties;
                        geography = properties.geo_id;
                        openPopup(e.lngLat, properties, true);
                    });

                    // Update current theme tracking
                    currentMapTheme = newTheme;
                }
            });

            map.setStyle(newStyle);
        }
    });

    $effect(() => {
        if (!mapLoaded || !map || !mergedData) return;

        const swedenBounds = [
            [10.5, 55.2], // Southwest coordinates [lng, lat]
            [24.2, 69.1]  // Northeast coordinates [lng, lat]
        ];

        if (geography === 'total') {
            // Reset to Sweden view instead of fixed center/zoom
            map.fitBounds(swedenBounds, {
                padding: { top: 20, bottom: 20, left: 20, right: 20 },
                duration: 1000,
                maxZoom: 7
            });
            closePopup();
            return;
        }

        const feature = mergedData.features.find(
            (f) => f.properties?.geo_id === geography
        );

        if (feature) {
            const bbox = turf.bbox(feature);
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
        map?.off('click', handleMapClick); // Detach the event
        map?.remove();
    });

    
</script>

<div bind:this={mapContainer} class="size-full"></div>
