# Project Technical Specification

## 1 Introduction

This document specifies the design and implementation of the E-Commerce Product Ranking Proof-of-Concept. It covers algorithms, ranking strategies, the HTTP API server, benchmarking protocol, and execution details.

## 2 Algorithms Specification and Rationale

### 2.1 Merge Sort

- **Complexity**: O(n log n) guaranteed
- **Space**: O(n) auxiliary
- **Properties**: Stable, divide-and-conquer
- **Use case**: Predictable performance; good for large datasets

### 2.2 Quick Sort

- **Complexity**: O(n log n) average, O(n²) worst-case
- **Space**: O(log n) auxiliary (in-place partition)
- **Properties**: Typically faster in practice; non-stable
- **Use case**: Performance comparison with merge sort

### 2.3 Deterministic Comparators

All algorithms enforce a deterministic total order:

1. Primary sort key: strategy-specific (score or attribute value)
2. Tie-break: strategy-specific rules
3. Final tie-break: `product_id` (ascending), then `row_uid` (ascending)

Floating-point scores are equal iff `|a - b| ≤ 1e-9`.

## 3 Ranking Strategies

### 3.1 Single-Attribute Ascending

Sort by a single numeric attribute in ascending order (lower values first).

Example: price ascending → cheapest products first.

### 3.2 Single-Attribute Descending

Sort by a single numeric attribute in descending order (higher values first).

Example: rating descending → highest-rated products first.

## 4 Server Architecture & Request/Response Protocol

### 4.1 HTTP API

**Endpoint**: `POST /rank`

**Request Body** (JSON):

```json
{
  "strategy": "single_attribute_desc",
  "algorithm": "merge_sort",
  "attribute": "rating",
  "k": 10
}
```

**Fields**:

- `strategy`: Strategy name (single_attribute_asc, single_attribute_desc)
- `algorithm`: Algorithm choice (merge_sort, quick_sort)
- `attribute`: Attribute name to rank by
- `k`: Number of top products to return

**Response** (JSON):

```json
{
  "product_ids": [42, 156, 203, ...],
  "ranking_time_ms": 12.5,
  "end_to_end_time_ms": 14.2,
  "count": 10
}
```

**Fields**:

- `product_ids`: Sorted list of top k product IDs
- `ranking_time_ms`: Ranking algorithm execution time
- `end_to_end_time_ms`: Total API latency including I/O
- `count`: Actual number of results returned

### 4.2 Error Responses

**400 Bad Request**: Invalid strategy, algorithm, or k value.
**404 Not Found**: Attribute does not exist.
**500 Internal Server Error**: Unexpected server error.

### 4.3 Caching

- Simple in-memory LRU cache (optional, can be disabled for benchmarks)
- Cache key: hash of {strategy, algorithm, attribute/weights, k}
- TTL: Configurable (default: 300 seconds)
- Cache is cleared on benchmark runs

### 4.4 Configuration

- Dataset path: environment variable `DATASET_PATH` (default: `data/amazon_products.csv`)
- Cache enabled: environment variable `CACHE_ENABLED` (default: true)
- Cache TTL: environment variable `CACHE_TTL_SECONDS` (default: 300)
- Server port: 5000 (configurable)

## 5 Data Loading and Preprocessing

### 5.1 Loading

Load dataset CSV into memory; skip malformed rows.

### 5.2 Active Attributes

- **Core attributes** (`price`, `rating`): Always used
- **Optional attributes** (`discount`, `reviews_count`, `delivery_time`, `category`): Used if present in CSV
- All numeric columns are loaded as-is; missing values are handled per row

### 5.3 Data Issues

- Skip rows with missing core attributes (price, rating)
- Non-numeric values in numeric columns cause row skip

## 6 Request Processing Flow

1. Parse and validate request
2. Check if attribute exists and is active
3. Load data (or use cache)
4. Apply preprocessing (normalization if needed)
5. Sort using specified algorithm
6. Truncate to top k
7. Return product IDs with timing

## 7 Comparator Rules for Deterministic Ordering

For all strategies, final tie-breaking order:

1. Primary key (strategy-dependent)
2. `product_id` (ascending)
3. `row_uid` (ascending)

This ensures identical results across multiple runs.

## 8 Validation

- Dataset records: >= 1000 required
- Core attributes: non-null and numeric
- k value: 1 <= k <= len(dataset)
- Strategy name: must be single_attribute_asc or single_attribute_desc
- Algorithm name: must be merge_sort or quick_sort
- Attribute must exist in dataset

## 9 Benchmark Design and Validation Protocol

### 9.1 Benchmark Matrix

- **Dataset sizes**: 1K, 5K, 10K, 42K records
- **k values**: 10, 100
- **Strategies**: single_attribute_asc, single_attribute_desc
- **Algorithms**: merge_sort, quick_sort
- **Total runs**: 4 sizes × 2 k-values × 2 strategies × 2 algorithms = 32 core runs

### 9.2 Benchmark Protocol

1. **Warmup**: 2 iterations per configuration (cache disabled)
2. **Measured runs**: 5 iterations per configuration
3. Report: **mean** and **median** for both ranking-only and end-to-end times
4. Cache is disabled for all benchmark runs

### 9.3 Outputs

- `outputs/benchmarks/benchmark_results.csv`: Raw timing data
- `outputs/reports/benchmark_report.md`: Summary findings
- `outputs/reports/runtime_scaling.png`: Runtime vs. dataset size
- `outputs/reports/algorithm_comparison*.png`: Algorithm comparison charts
- `outputs/reports/speedup_analysis.png`: Speedup metrics

### 9.4 Validation Criteria

- All benchmark runs complete without error
- Ranking results are deterministic (same configuration = identical output)
- Timing measurements are positive and reasonable
- Merge Sort vs Quick Sort show similar or expected performance differences

## 10 Reproducibility

- Python 3.12, pinned dependencies via `uv.lock`
- Dataset is static and committed
- All random seeds are fixed
- Benchmark warmup and iteration counts are consistent
- Hardware details are recorded in benchmark report

## 11 Execution

### 11.1 Start Server

```bash
uv run uvicorn Src.api.app:app --host 0.0.0.0 --port 5000
```

### 11.2 Example Request

```bash
curl -X POST http://localhost:5000/rank \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "single_attribute_desc",
    "algorithm": "merge_sort",
    "attribute": "rating",
    "k": 10
  }'
```

### 11.3 Run Benchmarks

Smoke benchmark:

```bash
uv run python Src/main.py benchmark --smoke
```

Full benchmark:

```bash
uv run python Src/main.py benchmark --full
```

### 11.4 Run Tests

```bash
uv run pytest -v
```

## 12 References

- [project.md](project.md): This specification
- [dataset.md](dataset.md): Dataset details and schema
- [README.md](README.md): Quick start and overview
- [links.md](links.md): Dataset source and repository links
