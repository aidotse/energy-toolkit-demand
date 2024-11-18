from pathlib import Path

# Define the root path
root_path = Path(__file__).resolve().parent

# API path
api_path = root_path / '..' / 'api'

# Generator paths

generator_path = root_path / 'generator'
config_path = generator_path / 'configs'

# Input paths
input_path = root_path / 'input'

# Transformers paths
transformers_path = root_path / 'transformers'