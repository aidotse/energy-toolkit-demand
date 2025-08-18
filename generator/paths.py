from pathlib import Path

# Define the root path
project_path = Path(__file__).resolve().parent.parent

# API path
api_path = project_path / 'api'
data_path = api_path / 'data'

# Generator paths

generator_path = project_path / 'generator'
pipeline_path = generator_path / 'pipelines'
input_path = generator_path / 'input'
output_path = generator_path / 'output'