import Papa from 'papaparse';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchParameters = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/parameters`);
    if (!response.ok) {
        throw new Error(`Failed to fetch parameters: ${response.statusText}`);
    }
    return response.json();
};

export const fetchGeoJSON = async (url: string): Promise<any> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
    }
    return response.json();
};

export const fetchTimeseries = async (url: string): Promise<any> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const compressedData = await response.arrayBuffer();
    const decompressedStream = new Response(
        compressedData,
        { headers: { 'Content-Encoding': 'gzip' } }
    ).body;

    if (!decompressedStream) {
        throw new Error("Decompression stream is not available.");
    }

    const decompressedText = await new Response(decompressedStream).text();
    const parsedData = Papa.parse(decompressedText, { header: true }).data;

    return parsedData
        .filter((row: Record<string, string>) => row['timestamp'] && row['total'] && row['buildings'] && row['industry'] && row['transport'])
        .map((row: Record<string, string>) => ({
            timestamp: new Date(row['timestamp']),
            total: parseFloat(row['total']),
            buildings: parseFloat(row['buildings']),
            industry: parseFloat(row['industry']),
            transport: parseFloat(row['transport']),

        }));
};


export const fetchYearly = async (url: string): Promise<any> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const compressedData = await response.arrayBuffer();
    const decompressedStream = new Response(
        compressedData,
        { headers: { 'Content-Encoding': 'gzip' } }
    ).body;

    if (!decompressedStream) {
        throw new Error("Decompression stream is not available.");
    }

    const decompressedText = await new Response(decompressedStream).text();
    const parsedData = Papa.parse(decompressedText, { header: true }).data;

    return parsedData
        .filter((row: Record<string, string>) => row['geography'] && row['total'] && row['buildings'] && row['industry'] && row['transport'])
        .map((row: Record<string, string>) => ({
            geography: row['geography'],
            total: parseFloat(row['total']),
            buildings: parseFloat(row['buildings']),
            industry: parseFloat(row['industry']),
            transport: parseFloat(row['transport']),

        }));
};

export const fetchAllYears = async (url: string): Promise<any> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const compressedData = await response.arrayBuffer();
    const decompressedStream = new Response(
        compressedData,
        { headers: { 'Content-Encoding': 'gzip' } }
    ).body;

    if (!decompressedStream) {
        throw new Error("Decompression stream is not available.");
    }

    const decompressedText = await new Response(decompressedStream).text();
    const parsedData = Papa.parse(decompressedText, { header: true }).data;

    return parsedData
        .filter((row: Record<string, string>) => row['timestamp'] && row['total'] && row['buildings'] && row['industry'] && row['transport'])
        .map((row: Record<string, string>) => ({
            timestamp: parseInt(row['timestamp']),
            total: parseFloat(row['total']),
            buildings: parseFloat(row['buildings']),
            industry: parseFloat(row['industry']),
            transport: parseFloat(row['transport']),

        }));
};

export const calculateSectorData = (yrlyData, geo) => {
    const sectorObj = { ...yrlyData.find(item => item.geography === geo) };
    const { geography, total, ...sectorsObj } = sectorObj;
    return Object.entries(sectorsObj).map(([sector, value]) => ({ sector, value }));
}

export const calculateHistogram = (data, field, numBins) => {
    // Extract the relevant field values
    const values = data.map(entry => entry[field]);
    
    // Find min and max values
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    // Calculate bin width
    const binWidth = (maxVal - minVal) / numBins;
    
    // Initialize bins
    const bins = Array.from({ length: numBins }, (_, i) => ({
        x0: minVal + i * binWidth,
        x1: minVal + (i + 1) * binWidth,
        length: 0
    }));
    
    // Populate bins
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - minVal) / binWidth), numBins - 1);
        bins[binIndex].length += 1;
    });
    
    return bins;
}