"""Benchmark report generation."""

import pandas as pd


def generate_benchmark_report(results, report_dir):
    """
    Generate a markdown benchmark report from results.
    
    Args:
        results: List of benchmark result dictionaries
        report_dir: Path to save report
    
    Returns:
        Path to the generated report
    """
    if not results:
        return None
    
    df_results = pd.DataFrame(results)
    algorithms = sorted(set(r["algorithm"] for r in results))
    dataset_sizes = sorted(set(r["dataset_size"] for r in results))
    k_values = sorted(set(r["k"] for r in results))
    strategies = sorted(set(r["strategy"] for r in results))
    
    report_path = report_dir / "benchmark_report.md"
    
    with open(report_path, "w") as f:
        f.write("# Benchmark Report\n\n")
        f.write(f"**Test Configuration**: {len(dataset_sizes)} dataset sizes, ")
        f.write(f"{len(k_values)} k values, {len(strategies)} strategies, ")
        f.write(f"{len(algorithms)} algorithms\n\n")
        
        # Summary metrics
        f.write("## Summary Statistics\n\n")
        f.write("### By Algorithm\n\n")
        for algo in algorithms:
            subset = df_results[df_results["algorithm"] == algo]["avg_time_ms"]
            f.write(f"**{algo.upper()}**\n")
            f.write(f"- Mean: {subset.mean():.4f} ms\n")
            f.write(f"- Min: {subset.min():.4f} ms\n")
            f.write(f"- Max: {subset.max():.4f} ms\n")
            f.write(f"- Std Dev: {subset.std():.4f} ms\n\n")
        
        # Configuration breakdown
        f.write("### By Dataset Size\n\n")
        for size in dataset_sizes:
            subset = df_results[df_results["dataset_size"] == size]["avg_time_ms"]
            f.write(f"**{size:,} products**: {subset.mean():.4f} ms (±{subset.std():.4f})\n")
        
        f.write("\n### By K Value\n\n")
        for k in k_values:
            subset = df_results[df_results["k"] == k]["avg_time_ms"]
            f.write(f"**k={k}**: {subset.mean():.4f} ms (±{subset.std():.4f})\n")
        
        # Overall stats
        f.write(f"\n## Test Statistics\n\n")
        f.write(f"- **Total configurations tested**: {len(results)}\n")
        f.write(f"- **Total runs**: {len(results) * 3} (3 per configuration)\n")
        f.write(f"- **Overall mean time**: {df_results['avg_time_ms'].mean():.4f} ms\n")
    
    return report_path
