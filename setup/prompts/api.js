import { checkbox } from '@inquirer/prompts';

export async function askApiParameters() {
  const resolutions = await checkbox({
    message: 'Which resolutions do you want to expose in the API?',
    choices: ['1h', '1w', '1M', '1Y'],
    validate: input => input.length > 0 || 'At least one resolution must be selected'
  });

  const aggregations = await checkbox({
    message: 'Which aggregation methods do you want to support?',
    choices: ['sum', 'mean', 'max', 'min'],
    validate: input => input.length > 0 || 'At least one aggregation must be selected'
  });

  return { resolutions, aggregations };
}