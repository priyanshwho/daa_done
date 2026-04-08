import time

from .merge_sort import merge_sort
from .quick_sort import quick_sort


def rank_products(
    data: list[dict],
    strategy: str,
    algorithm: str,
    k: int,
) -> tuple[list[str], float]:
    """
    Rank products using specified strategy and algorithm.
    
    Args:
        data: List of product dicts with 'product_title', 'discounted_price', 'product_rating', etc.
        strategy: 'price_asc', 'price_desc', 'rating_asc', 'rating_desc'
        algorithm: 'merge_sort' or 'quick_sort'
        k: Return top-k product IDs
    
    Returns:
        (ranked_ids, elapsed_time)
    """
    if not data:
        return [], 0.0

    # Map strategy to key function and sort order
    strategy_map = {
        "price_asc": (lambda x: float(x[1].get("discounted_price", 0)), False),
        "price_desc": (lambda x: float(x[1].get("discounted_price", 0)), True),
        "rating_asc": (lambda x: float(x[1].get("product_rating", 0)), False),
        "rating_desc": (lambda x: float(x[1].get("product_rating", 0)), True),
    }

    if strategy not in strategy_map:
        raise ValueError(f"Unknown strategy: {strategy}")

    key_func, descending = strategy_map[strategy]
    
    # Prepare data as (product_id, product_dict) tuples
    # Use row index as product_id if not present
    items = [(item.get("product_id", f"prod_{i}"), item) for i, item in enumerate(data)]

    # Sort using selected algorithm
    start = time.perf_counter()
    if algorithm == "merge_sort":
        sorted_items = merge_sort(items, key=key_func, descending=descending)
    elif algorithm == "quick_sort":
        sorted_items = quick_sort(items, key=key_func, descending=descending)
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    elapsed = time.perf_counter() - start

    # Extract top-k product IDs
    ranked_ids = [item[0] for item in sorted_items[:k]]
    
    return ranked_ids, elapsed
