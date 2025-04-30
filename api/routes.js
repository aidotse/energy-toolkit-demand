export default [
    {
      path: '/geo',
      method: 'GET',
      filePattern: ({ division }) => `geo,division=${division}.geojson`,
      contentType: 'application/json',
      requiredParams: ['division']
    },
    {
      path: '/demand_t',
      method: 'GET',
      filePattern: ({ geography, resolution, sector, aggregation, year, growth }) =>
        `demand_t,geography=${geography},resolution=${resolution},sector=${sector},aggregation=${aggregation},year=${year},growth=${growth}.csv.gz`,
      contentType: 'text/csv',
      encoding: 'gzip',
      requiredParams: ['geography', 'resolution', 'sector', 'aggregation', 'year', 'growth']
    },
    {
      path: '/demand',
      method: 'GET',
      filePattern: ({ geography, sector, aggregation, year, growth }) =>
        `demand,geography=${geography},resolution=1YE,sector=${sector},aggregation=${aggregation},year=${year},growth=${growth}.csv.gz`,
      contentType: 'text/csv',
      encoding: 'gzip',
      requiredParams: ['geography', 'sector', 'aggregation', 'year', 'growth']
    },
    {
      path: '/config',
      method: 'GET',
      filePattern: () => `config.json`,
      contentType: 'application/json'
    },
    {
      path: '/scenarios',
      method: 'GET',
      filePattern: () => `scenarios.json`,
      contentType: 'application/json'
    },
    {
      path: '/parameters',
      method: 'GET',
      filePattern: () => `parameters.json`,
      contentType: 'application/json'
    },
    {
      path: '/globals',
      method: 'GET',
      filePattern: () => `globals.json`,
      contentType: 'application/json'
    }
  ];
  