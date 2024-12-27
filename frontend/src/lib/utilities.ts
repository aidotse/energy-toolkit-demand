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
