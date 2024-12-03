def get_path(filename, properties, ending):
    return f"{filename}," + ",".join(f"{key}={properties[key]}" for key in sorted(properties.keys())) + f".{ending}"
