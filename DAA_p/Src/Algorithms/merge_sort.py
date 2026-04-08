from typing import Callable


def merge_sort(arr: list[tuple], key: Callable = lambda x: x[0], descending: bool = False) -> list[tuple]:
    """Merge Sort: O(n log n) time, stable."""
    if len(arr) <= 1:
        return arr

    def merge(left, right):
        result = []
        i = j = 0
        while i < len(left) and j < len(right):
            l_val, r_val = key(left[i]), key(right[j])
            if (l_val > r_val) if descending else (l_val < r_val):
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        result.extend(left[i:])
        result.extend(right[j:])
        return result

    def merge_sort_recursive(arr):
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = merge_sort_recursive(arr[:mid])
        right = merge_sort_recursive(arr[mid:])
        return merge(left, right)

    return merge_sort_recursive(arr)
