import pandas as pd
import matplotlib.pyplot as plt


def generate_benchmark_plots(results, report_dir):
    """
    Generate benchmark plots from results.
    
    Args:
        results: List of benchmark result dictionaries
        report_dir: Path to save plots
    """
    if not results:
        return
    
    df_results = pd.DataFrame(results)
    algorithms = list(set(r["algorithm"] for r in results))
    
    # Plot 1: Runtime vs dataset size
    fig, ax = plt.subplots(figsize=(10, 6))
    for algo in algorithms:
        subset = df_results[df_results["algorithm"] == algo]
        grouped = subset.groupby("dataset_size")["avg_time_ms"].mean()
        ax.plot(grouped.index, grouped.values, marker="o", label=algo)
    ax.set_xlabel("Dataset Size")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Runtime Scaling by Dataset Size")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(report_dir / "runtime_scaling.png", dpi=100)
    print(f"Saved: {report_dir / 'runtime_scaling.png'}")
    plt.close()
    
    # Plot 2: Algorithm comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    bar_positions = []
    bar_labels = []
    bar_values = []
    
    for algo in algorithms:
        subset = df_results[df_results["algorithm"] == algo]
        grouped = subset.groupby("k")["avg_time_ms"].mean()
        for k in grouped.index:
            bar_labels.append(f"{k}_{algo}")
            bar_values.append(grouped[k])
    
    ax.bar(range(len(bar_labels)), bar_values)
    ax.set_xticks(range(len(bar_labels)))
    ax.set_xticklabels(bar_labels, rotation=45)
    ax.set_xlabel("K Value")
    ax.set_ylabel("Average Time (ms)")
    ax.set_title("Algorithm Comparison by K Value")
    plt.tight_layout()
    plt.savefig(report_dir / "algorithm_comparison.png", dpi=100)
    print(f"Saved: {report_dir / 'algorithm_comparison.png'}")
    plt.close()
