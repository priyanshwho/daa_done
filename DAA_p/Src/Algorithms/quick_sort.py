import random
from typing import Callable, Literal


PivotStrategy = Literal["first", "last", "middle", "random"]


def _select_pivot_index(low: int, high: int, strategy: PivotStrategy) -> int:
    """Select pivot index based on the given strategy."""
    if strategy == "first":
        return low
    elif strategy == "last":
        return high
    elif strategy == "middle":
        return (low + high) // 2
    elif strategy == "random":
        return random.randint(low, high)
    else:
        raise ValueError(f"Unknown pivot strategy: {strategy}")


def quick_sort(
    arr: list[tuple],
    key: Callable = lambda x: x[0],
    descending: bool = False,
    pivot_strategy: PivotStrategy = "middle"
) -> list[tuple]:
    """
    Quick Sort with configurable pivot strategy.
    
    Args:
        arr: List of tuples to sort
        key: Function to extract sort key from element
        descending: Whether to sort in descending order
        pivot_strategy: One of "first", "last", "middle" (default), or "random"
    
    Returns:
        Sorted list (new copy, original unchanged)
    """
    if len(arr) <= 1:
        return arr

    def partition(arr, low, high):
        # Select pivot based on strategy
        pivot_idx = _select_pivot_index(low, high, pivot_strategy)
        arr[pivot_idx], arr[high] = arr[high], arr[pivot_idx]
        
        pivot = key(arr[high])
        i = low - 1
        for j in range(low, high):
            if (key(arr[j]) > pivot) if descending else (key(arr[j]) < pivot):
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        return i + 1

    def quick_sort_recursive(arr, low, high):
        if low < high:
            pi = partition(arr, low, high)
            quick_sort_recursive(arr, low, pi - 1)
            quick_sort_recursive(arr, pi + 1, high)
        return arr

    arr_copy = arr.copy()
    return quick_sort_recursive(arr_copy, 0, len(arr_copy) - 1)
