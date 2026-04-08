import sys

# Increase recursion limit for large datasets
sys.setrecursionlimit(50000)

from .Algorithms import merge_sort, quick_sort, rank_products

__all__ = ["merge_sort", "quick_sort", "rank_products"]
