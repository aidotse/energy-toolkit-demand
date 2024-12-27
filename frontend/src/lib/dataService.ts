import Papa from 'papaparse';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchParameters = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/parameters`);
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

export const fetchCSV = async (url: string): Promise<any> => {
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
