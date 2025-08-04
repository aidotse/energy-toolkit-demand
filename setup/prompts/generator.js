import { input, confirm } from '@inquirer/prompts';

export async function askDataStructure() {
    const rowGroupSize = await input({ message: 'Specify a row group size in the generator data output', default: '100000' });
    const useScenarioId = await confirm({ message: 'Partition using full scenario combinations (faster single-scenario filtering, fewer files)?', default: true });
    return { rowGroupSize: parseInt(rowGroupSize, 10) || 100000, useScenarioId }; // Default to 100,000 if input is invalid
}
