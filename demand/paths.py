from pathlib import Path

# Define the root path
root_path = Path(__file__).resolve().parent

# API path
api_path = root_path / '..' / 'api' / 'data'

# Generator paths

generator_path = root_path / 'generator'
config_path = generator_path / 'configs'

# Input paths
input_path = root_path / 'input'
base_demand_path = input_path / 'base_demand'

# Transformers paths
transformers_path = root_path / 'transformers'