<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import mapboxgl from 'mapbox-gl';
    import 'mapbox-gl/dist/mapbox-gl.css';
    import { mount } from 'svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { formatNumber } from '$lib/utilities';

    export let geojsonData: any;
    export let yearlyData: any;
    export let minDemandValue: number;
    export let maxDemandValue: number;
    export let selectedGeography: string | null;

    let map: mapboxgl.Map;
    let mapContainer: HTMLDivElement;
    let popup: mapboxgl.Popup;
    let stickyPopup: boolean = false;

    const handleMapClick = (e) => {
            if (stickyPopup) {
                // Check if click was outside the popup
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['municipality-fill'],
                });

                if (!features.length) {
                    closePopup(); // Close the popup if no features were clicked
                }
            }
        };

    // Merge yearlyData into geojsonData by matching kom_code
    const mergeData = (geojson, data) => {
        const dataMap = new Map(data.map(row => [row.geography, row]));
        
        const updatedFeatures = geojson.features.map(feature => {
            const komCode = feature.properties.kom_code;
            if (dataMap.has(komCode)) {
                feature.properties = {
                    ...feature.properties,
                    ...dataMap.get(komCode),
                };
            }
            return feature;
        });

        return { ...geojson, features: updatedFeatures };

    }

    // Create popup content
    const createPopupContent = (properties: any, sticky: boolean) => {
        const komName = properties.kom_name;
        const komCode = properties.kom_code;
        const year = properties.year;
        const demand = formatNumber(properties.total, 'M', 'Wh');

        const popupDiv = document.createElement('div');
        mount(Popup, {
            target: popupDiv,
            props: {
                komName,
                komCode,
                year,
                demand,
                sticky,
                onClose: () => {
                    popup.remove();
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
        map = new mapboxgl.Map({
            container: mapContainer,
            accessToken: 'pk.eyJ1IjoidmlrdG9yYmVuZ3Rzc29uIiwiYSI6ImNtMzRnZnpkYTFuYXgycXFzZTl6ZDk2dHcifQ.6eeJ-8q9Q_84jA4_K8zFfA',
            style: 'mapbox://styles/viktorbengtsson/cm34o762h00a801o09g4q99uq',
            center: [17, 62.92],
            zoom: 4.8,
        });

        popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
        });

        map.on('load', () => {
            if (geojsonData && yearlyData) {
                const mergedData = mergeData(geojsonData, yearlyData);

                map.addSource('municipalities', {
                    type: 'geojson',
                    data: mergedData,
                });

                map.addLayer({
                    id: 'municipality-fill',
                    type: 'fill',
                    source: 'municipalities',
                    paint: {
                        'fill-color': [
                            'interpolate',
                            ['linear'],
                            ['get', 'total'],
                            minDemandValue, '#0000FF',
                            minDemandValue + (maxDemandValue - minDemandValue) * 0.025, '#00FF7F',
                            minDemandValue + (maxDemandValue - minDemandValue) * 0.25, '#FFFF00',
                            minDemandValue + (maxDemandValue - minDemandValue) * 0.75, '#FFA500',
                            maxDemandValue, '#df4217',
                        ],
                        'fill-opacity': 0.7,
                    },
                });

                map.addLayer({
                    id: 'municipality-border',
                    type: 'line',
                    source: 'municipalities',
                    paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 1 },
                });

                // Hover behavior
                map.on('mouseenter', 'municipality-fill', (e) => {
                    if (!stickyPopup) {
                        const properties = e.features[0].properties;
                        openPopup(e.lngLat, properties);
                    }
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mousemove', 'municipality-fill', (e) => {
                    if (!stickyPopup) {
                        const properties = e.features[0].properties;
                        openPopup(e.lngLat, properties);
                    }
                });

                map.on('mouseleave', 'municipality-fill', () => {
                    if (!stickyPopup) {
                        closePopup();
                    }
                    map.getCanvas().style.cursor = '';
                });

                // Sticky popup on click
                map.on('click', 'municipality-fill', (e) => {
                    const properties = e.features[0].properties;
                    openPopup(e.lngLat, properties, true);
                });

                map.on('click', handleMapClick);

            }
        });
    });

    onDestroy(() => {
        map?.off('click', handleMapClick); // Detach the event
        map?.remove();
    });
    
</script>

<div bind:this={mapContainer} class="size-full"></div>
