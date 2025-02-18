<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import mapboxgl from 'mapbox-gl';
    import 'mapbox-gl/dist/mapbox-gl.css';
    import { mount } from 'svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { formatNumber } from '$lib/utilities';

    let { geojsonData, yearlyData, year, geography = $bindable(), lower_bound, upper_bound } = $props();

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

    // Merge yearlyData into geojsonData by matching geo_id
    const mergeData = (geojson, data, yr) => {
        const dataMap = new Map(data.map(row => [row.geography, row]));        
        const updatedFeatures = geojson.features.map(feature => {
            const geoID = feature.properties.geo_id;
            if (dataMap.has(geoID)) {
                feature.properties = {
                    ...feature.properties,
                    ...dataMap.get(geoID),
                    year: yr,
                };
            }

            return feature;
        });

        return { ...geojson, features: updatedFeatures };

    }

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
            if (geojsonData && yearlyData && year) {
                const mergedData = mergeData(geojsonData, yearlyData, year);

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
                    id: 'county-border',
                    type: 'line',
                    source: 'counties',
                    paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 1 },
                });

                // Hover behavior
                map.on('mouseenter', 'county-fill', (e) => {
                    if (!stickyPopup) {
                        const properties = e.features[0].properties;
                        openPopup(e.lngLat, properties);
                    }
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mousemove', 'county-fill', (e) => {
                    if (!stickyPopup) {
                        const properties = e.features[0].properties;
                        openPopup(e.lngLat, properties);
                    }
                });

                map.on('mouseleave', 'county-fill', () => {
                    if (!stickyPopup) {
                        closePopup();
                    }
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

            }
        });
    });

    onDestroy(() => {
        map?.off('click', handleMapClick); // Detach the event
        map?.remove();
    });
    
</script>

<div bind:this={mapContainer} class="size-full"></div>
