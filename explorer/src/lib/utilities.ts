export const formatNumber = (
    num: number,
    inputPrefix: string,
    unit: string
): string => {
    const prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
    const inputIndex = prefixes.indexOf(inputPrefix);
    if (inputIndex === -1) {
        throw new Error(`Invalid input prefix: ${inputPrefix}`);
    }

    // Convert the number to the base unit (no prefix)
    num *= Math.pow(1000, inputIndex);

    // Find the appropriate output prefix
    let outputIndex = 0;
    while (Math.abs(num) >= 1000 && outputIndex < prefixes.length - 1) {
        num /= 1000;
        outputIndex++;
    }

    // Format the number with up to two decimal places
    const formattedNum = num.toFixed(num < 10 ? 2 : num < 100 ? 1 : 0);

    // Return the formatted number with the correct output prefix and unit
    return `${formattedNum} ${prefixes[outputIndex]}${unit}`;
};

export function handleAnchorClick(event: Event) {
    event.preventDefault()
    const link = event.currentTarget as HTMLAnchorElement
    const anchorId = new URL(link.href).hash.replace('#', '')
    const anchor = document.getElementById(anchorId)
    const mainElement = document.querySelector("main");
    if (anchor && mainElement) {
        mainElement.scrollTo({
            top: anchor.offsetTop - 35,
            behavior: 'smooth'
        })
    }
}

export function getGeos(geographies: any[]) {
    return geographies.map((geo) => ({
        label: geo.geo_name, // The text displayed in the dropdown
        value: geo.geo_id,   // The value associated with the option
    })).filter(geo => geo.label && geo.value) // Filter out invalid entries
    .sort((a, b) => { // Sort alphabetically by label but put 'Sverige' first
        return a.label === "Sverige" ? -1
            : b.label === "Sverige" ? 1
            : (a.label || '').localeCompare((b.label || ''), 'sv'); // Sort alphabetically for others
    });
}  
  
/**
 * Helper to build demand API query parameters for the new OpenAPI 3.1 compliant backend
 * @param opts - Query options object
 * @returns URLSearchParams object ready for API calls
 */
export const makeDemandQuery = (opts: {
    start: string;
    end: string;
    resolution: '1h' | '1d' | '1M' | '1Y';
    aggregation: 'mean' | 'sum';
    geography: string;
    segment: string;
    scenarioId?: string;
}) => {
    const {
        start, end, resolution, aggregation,
        geography, segment, scenarioId
    } = opts;

    const qp = new URLSearchParams();

    // Period parameters (based on OpenAPI structure)
    qp.set('period[start]', start);
    qp.set('period[end]', end);
    qp.set('period[resolution]', resolution);
    qp.set('period[aggregation]', aggregation);

    // Geography parameter
    qp.set('geography', geography);

    // Segment parameter
    qp.set('segment', segment);

    // Scenario parameter
    if (scenarioId) {
        qp.set('scenarioId', scenarioId);
    }

    // Response format
    qp.set('format', 'json');

    return qp;
};

/**
 * Build query parameters for configuration endpoint
 */
export const makeConfigQuery = () => {
    return new URLSearchParams();
};

/**
 * Build query parameters for scenarios endpoint
 */
export const makeScenariosQuery = () => {
    return new URLSearchParams();
};

/**
 * Build query parameters for parameters endpoint
 */
export const makeParametersQuery = () => {
    return new URLSearchParams();
};

/**
 * Build query parameters for globals endpoint
 */
export const makeGlobalsQuery = () => {
    return new URLSearchParams();
};

/**
 * Build query parameters for geographies endpoint
 * @param format - Response format: 'json' for metadata or 'geojson' for spatial data
 */
export const makeGeographiesQuery = (format: 'json' | 'geojson' = 'json') => {
    const qp = new URLSearchParams();
    qp.set('format', format);
    return qp;
};
