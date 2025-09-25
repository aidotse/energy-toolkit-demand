import numpy as np
import pandas as pd

def randomize_demand(demand, randomness):
    num_geos, num_hours = demand.shape
    random_factors = np.random.uniform(-randomness, randomness, size=(num_geos, num_hours))

    demand_randomized = demand * (1 + random_factors)
    scaling_factor = demand.sum(axis=1, keepdims=True) / demand_randomized.sum(axis=1, keepdims=True)
    return demand_randomized * scaling_factor

def random_factor_time_series(start_time, end_time, resolution, randomness):
    timestamps = pd.date_range(start=start_time, end=end_time, freq=resolution)
    random_factors = np.random.uniform(-randomness, randomness, size=len(timestamps))
    return pd.Series(random_factors, index=timestamps)

