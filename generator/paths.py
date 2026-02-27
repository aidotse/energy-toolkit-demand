from pathlib import Path

# Define the root path
project_path = Path(__file__).resolve().parent.parent

# Data path (shared between generator and API)
data_path = project_path / 'data'

# API path
api_path = project_path / 'api'

# Generator paths
generator_path = project_path / 'generator'
pipeline_path = generator_path / 'pipelines'
input_path = generator_path / 'input'
output_path = project_path / 'data'
temp_path = generator_path / 'output'  # Temporary files (DuckDB, progress)