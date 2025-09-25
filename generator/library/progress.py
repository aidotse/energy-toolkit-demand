# generator/library/progress.py
# Progress tracking utilities for scenario generation

import json
import time
from pathlib import Path
from typing import Set, Union, Dict, List, Optional, Tuple


def load_progress(output_path: Union[str, Path]) -> Set[str]:
    """
    Load completed scenarios from progress file.

    Args:
        output_path: Path to output directory containing .scenario_progress.json

    Returns:
        Set of completed scenario IDs (excludes base scenarios)
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    if progress_file.exists():
        try:
            with open(progress_file, 'r') as f:
                data = json.load(f)
                # Filter out base scenarios from the count
                return set(item for item in data if not item.startswith('_base_'))
        except Exception:
            return set()
    return set()


def load_all_progress(output_path: Union[str, Path]) -> Set[str]:
    """
    Load all completed items from progress file (including base scenarios).

    Args:
        output_path: Path to output directory containing .scenario_progress.json

    Returns:
        Set of all completed items (scenarios and base scenarios)
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    if progress_file.exists():
        try:
            with open(progress_file, 'r') as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()


def save_progress(output_path: Union[str, Path], completed_scenarios: Union[Set[str], str]) -> None:
    """
    Save completed scenarios to progress file.

    Args:
        output_path: Path to output directory
        completed_scenarios: Set of scenario IDs to mark as completed, or single scenario ID
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    # Ensure completed_scenarios is a set
    if isinstance(completed_scenarios, str):
        completed_scenarios = {completed_scenarios}

    # Load existing progress (including base scenarios)
    all_completed = set()
    if progress_file.exists():
        try:
            with open(progress_file, 'r') as f:
                all_completed = set(json.load(f))
        except Exception:
            pass

    # Add new completed scenarios
    all_completed.update(completed_scenarios)

    # Save back to file
    with open(progress_file, 'w') as f:
        json.dump(list(all_completed), f, indent=2)


def cleanup_progress(output_path: Union[str, Path]) -> bool:
    """
    Remove progress file when all scenarios are complete.

    Args:
        output_path: Path to output directory

    Returns:
        True if file was removed, False if it didn't exist
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    if progress_file.exists():
        progress_file.unlink()
        return True
    return False


def get_base_scenario_key(base_scenario: str) -> str:
    """
    Generate the progress key for a base scenario.

    Args:
        base_scenario: Name of the base scenario

    Returns:
        Progress key for the base scenario
    """
    return f"_base_{base_scenario}"


def is_base_scenario_complete(output_path: Union[str, Path], base_scenario: str) -> bool:
    """
    Check if a base scenario is complete.

    Args:
        output_path: Path to output directory
        base_scenario: Name of the base scenario

    Returns:
        True if base scenario is marked as complete
    """
    all_progress = load_all_progress(output_path)
    base_key = get_base_scenario_key(base_scenario)
    return base_key in all_progress


# Enhanced progress tracking with timing data

def load_progress_with_timing(output_path: Union[str, Path]) -> Dict:
    """
    Load progress data including timing information.

    Args:
        output_path: Path to output directory

    Returns:
        Dictionary with completed scenarios and timing data
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    if progress_file.exists():
        try:
            with open(progress_file, 'r') as f:
                data = json.load(f)

                # Handle old format (list) vs new format (dict)
                if isinstance(data, list):
                    # Convert old format to new format
                    return {
                        'completed': set(item for item in data if not item.startswith('_base_')),
                        'completed_with_base': set(data),
                        'timing_data': {}
                    }
                else:
                    # New format
                    return {
                        'completed': set(item for item in data.get('completed', []) if not item.startswith('_base_')),
                        'completed_with_base': set(data.get('completed', [])),
                        'timing_data': data.get('timing_data', {})
                    }
        except Exception:
            pass

    return {
        'completed': set(),
        'completed_with_base': set(),
        'timing_data': {}
    }


def save_progress_with_timing(
    output_path: Union[str, Path],
    scenario_id: str,
    elapsed_time: Optional[float] = None
) -> None:
    """
    Save completed scenario with timing information.

    Args:
        output_path: Path to output directory
        scenario_id: Scenario ID that was completed
        elapsed_time: Time taken to complete the scenario in seconds
    """
    output_path = Path(output_path)
    progress_file = output_path / ".scenario_progress.json"

    # Load existing progress
    progress_data = load_progress_with_timing(output_path)

    # Add new completed scenario
    progress_data['completed_with_base'].add(scenario_id)

    # Add timing data if provided
    if elapsed_time is not None:
        progress_data['timing_data'][scenario_id] = {
            'elapsed_time': elapsed_time,
            'timestamp': time.time()
        }

    # Save back to file
    with open(progress_file, 'w') as f:
        json.dump({
            'completed': list(progress_data['completed_with_base']),
            'timing_data': progress_data['timing_data']
        }, f, indent=2)


def calculate_eta(
    output_path: Union[str, Path],
    remaining_scenarios: int,
    exclude_base_scenarios: bool = True
) -> Tuple[float, int]:
    """
    Calculate ETA based on historical timing data.

    Args:
        output_path: Path to output directory
        remaining_scenarios: Number of scenarios left to process
        exclude_base_scenarios: Whether to exclude base scenarios from average calculation

    Returns:
        Tuple of (eta_seconds, sample_size) where sample_size is number of scenarios used for average
    """
    progress_data = load_progress_with_timing(output_path)
    timing_data = progress_data['timing_data']

    if not timing_data:
        return 0.0, 0

    # Filter timing data
    relevant_times = []
    for scenario_id, timing_info in timing_data.items():
        if exclude_base_scenarios and scenario_id.startswith('_base_'):
            continue
        if 'elapsed_time' in timing_info:
            relevant_times.append(timing_info['elapsed_time'])

    if not relevant_times:
        return 0.0, 0

    # Calculate average time
    avg_time = sum(relevant_times) / len(relevant_times)
    eta_seconds = avg_time * remaining_scenarios

    return eta_seconds, len(relevant_times)


def get_timing_stats(output_path: Union[str, Path]) -> Dict:
    """
    Get timing statistics for completed scenarios.

    Args:
        output_path: Path to output directory

    Returns:
        Dictionary with timing statistics
    """
    progress_data = load_progress_with_timing(output_path)
    timing_data = progress_data['timing_data']

    if not timing_data:
        return {
            'count': 0,
            'average': 0.0,
            'min': 0.0,
            'max': 0.0,
            'total': 0.0
        }

    # Get times for non-base scenarios
    times = []
    for scenario_id, timing_info in timing_data.items():
        if not scenario_id.startswith('_base_') and 'elapsed_time' in timing_info:
            times.append(timing_info['elapsed_time'])

    if not times:
        return {
            'count': 0,
            'average': 0.0,
            'min': 0.0,
            'max': 0.0,
            'total': 0.0
        }

    return {
        'count': len(times),
        'average': sum(times) / len(times),
        'min': min(times),
        'max': max(times),
        'total': sum(times)
    }