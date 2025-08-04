import numpy as np
from generator.library.randomizer import random_factor_time_series

def generate_growth_time_series(timestamps, resolution, scenario):
    # Generate the new timestamps for the extended demand
    delta_intervals = len(timestamps)

    if scenario['type'] == 'exp-growth-to-target':
        interval_growth =  scenario['target'] ** (1 / delta_intervals) - 1

        # Calculate the growth factors for all hours
        intervals_elapsed = np.arange(len(timestamps))  # Elapsed hours as a 1D array
        growth_factors = (1 + interval_growth) ** intervals_elapsed  # Shape: (len(new_timestamps),)
        return growth_factors
    else:
        raise ValueError(f"Invalid growth scenario type: {scenario['type']}")