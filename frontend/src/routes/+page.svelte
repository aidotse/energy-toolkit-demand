<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import mapboxgl from 'mapbox-gl'; // Import types for Mapbox
	import 'mapbox-gl/dist/mapbox-gl.css';

    let map: mapboxgl.Map;
    let mapContainer: HTMLDivElement | undefined;
    let lng: number, lat: number, zoom: number;

    lat = 62.9775;
    lng = 3.85556;
    zoom = 4.88;

    onMount(() => {
        const initialState = { lng: lng, lat: lat, zoom: zoom };

        map = new mapboxgl.Map({
            container: mapContainer as HTMLDivElement,
            accessToken:'pk.eyJ1IjoidmlrdG9yYmVuZ3Rzc29uIiwiYSI6ImNtMzRnZnpkYTFuYXgycXFzZTl6ZDk2dHcifQ.6eeJ-8q9Q_84jA4_K8zFfA',
            style: `mapbox://styles/viktorbengtsson/cm34o762h00a801o09g4q99uq`,
            center: [initialState.lng, initialState.lat],
            zoom: initialState.zoom
        }); 
    });

    onDestroy(() => {
        map?.remove();
    });

</script>

<div class="layout">
    <div class="leftside">
        <h1 class="text-4xl">Behovskartan 2.0</h1>
        <p>Left-hand container content goes here.</p>
    </div>
    <div class="map-wrap">
        <div class="map" bind:this={mapContainer} />
    </div>
</div>

<style>
    /* Full screen map container */
    .map-wrap {
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    
    /* Full screen map */
    .map {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    
    /* Sidebar overlay */
    .leftside {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      width: 50%; /* Takes up half the width */
      height: 100%; /* Full height */
      background-color: rgba(240, 240, 240, 1); 
      padding: 1rem;
      box-sizing: border-box;
    }
</style>