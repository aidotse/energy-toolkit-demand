<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import mapboxgl from 'mapbox-gl';
    import 'mapbox-gl/dist/mapbox-gl.css';
    import * as turf from '@turf/turf';
    import { mount } from 'svelte';
    import Popup from '$lib/components/map/Popup.svelte';
    import { formatNumber } from '$lib/utilities';
    import { fetchYearly, mergeGeoData } from '$lib/dataService';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { geojsonData, yearData, year, geography = $bindable(), scenario, lower_bound, upper_bound } = $props();
    let mapLoaded = $state(false);
    let hoveredFeatureId = $state(null);

    let map: mapboxgl.Map;
    let mapContainer: HTMLDivElement;
    let popup: mapboxgl.Popup;
    let stickyPopup: boolean = false;

    const handleMapClick = (e) => {
            if (stickyPopup) {
                // Check if click was outside the popup
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['county-fill'],
                });

                if (!features.length) {
                    closePopup(); // Close the popup if no features were clicked
                    geography = '00';
                }
            }
        };

    $effect(async () => {
        try {
            // Use new OpenAPI format for demand data
            const queryParams = new URLSearchParams({
                'period[start]': String(year),
                'period[end]': String(year + 1),
                'period[resolution]': '1Y',
                'period[aggregation]': 'sum',
                'geography': 'all',
                'segment': 'total',
                'scenarioId': scenario?.id || scenario?.scenario_id || 'default',
                'format': 'json'
            });

            const response = await fetch(`${API_BASE_URL}/demand?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            yearData = await response.json();
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    let mergedData = $derived(mergeGeoData(geojsonData, yearData, year));

    // Create popup content
    const createPopupContent = (properties: any, sticky: boolean) => {
        const geoName = properties.geo_name;
        const geoID = properties.geo_id;
        const year = properties.year;
        const demand = formatNumber(properties.total, 'M', 'Wh');

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
                    geography = '00';
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
            style: 'mapbox://styles/viktorbengtsson/cm34o762h00a801o09g4q99uq',
            bounds: swedenBounds,
            fitBoundsOptions: {
                padding: { top: 20, bottom: 20, left: 20, right: 20 },
                maxZoom: 7 // Prevent zooming in too far when fitting bounds
            }
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
                            lower_bound, '#0000FF',
                            lower_bound + (upper_bound - lower_bound) * 0.025, '#00FF7F',
                            lower_bound + (upper_bound - lower_bound) * 0.25, '#FFFF00',
                            lower_bound + (upper_bound - lower_bound) * 0.75, '#FFA500',
                            upper_bound, '#df4217',
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
            map?.getSource('counties').setData(mergedData);

            if (stickyPopup) {
                const feature = mergedData.features.find(f => f.properties.geo_id === geography);
                if (feature) {
                    const coords = popup.getLngLat();
                    popup.setDOMContent(createPopupContent(feature.properties, true));
                }
            }
        }
    });

    $effect(() => {
        if (!mapLoaded || !map || !mergedData) return;

        const swedenBounds = [
            [10.5, 55.2], // Southwest coordinates [lng, lat]
            [24.2, 69.1]  // Northeast coordinates [lng, lat]
        ];

        if (geography === '00') {
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
