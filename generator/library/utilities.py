import shutil
import re

def get_path(filename, properties, ending):
    return f"{filename}," + ",".join(f"{key}={properties[key]}" for key in sorted(properties.keys())) + f".{ending}"

def sort_params(params,sections = None):
    """
    Sorts the filter and scenario parameters alphabetically and returns
    a filename-safe string, skipping empty values.
    """

    if sections is not None:
        def format_section(section):
            return ",".join(
                f"{section}.{ktok(k)}={v}"
                for k, v in sorted(params.get(section, {}).items())
                if v not in [None, "", [], {}]
            )

        parts = [format_section(section) for section in sections]
        return ",".join(part for part in parts if part)
    else:
        return ",".join([f"{ktok(k)}={v}" for k, v in sorted(params.items())])

def reset_parameters(parameters):
    # Resets a dictionary to empty values while keeping all the keys.
    return {'filter': {key: None for key in parameters['filter']}, 'scenario': {key: None for key in parameters['scenario']}}

def clear_dir(path):
    shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)

def get_scenarios(config):
    # Returns a dictionary of active scenarios from the config.
    return {s['name']: None for s in config['scenarios'] if not s['disable'] and s['type'] != 'constraint'}

def get_filters(config):
    # Returns a dictionary of active filters from the config.
    f_array = [v for k,v in config['filters'].items()]
    return {f['name']: None for f in f_array}

def is_base_resolution(resolution, config):
    # Checks if the resolution is a base resolution.

    return resolution == config['base']['properties']['resolution']

def ktok(s):
    return re.sub(r'(?<!^)(?=[A-Z])', '-', s).lower()

