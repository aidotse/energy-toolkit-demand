import numpy as np

def randomize_demand(demand, randomness):
    num_geos, num_hours = demand.shape
    random_factors = np.random.uniform(-randomness, randomness, size=(num_geos, num_hours))

    demand_randomized = demand * (1 + random_factors)
    scaling_factor = demand.sum(axis=1, keepdims=True) / demand_randomized.sum(axis=1, keepdims=True)
    return demand_randomized * scaling_factor

