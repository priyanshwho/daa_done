from .benchmarks.runner import run_benchmarks as _run_benchmarks
from .benchmarks.plots import generate_benchmark_plots
from .benchmarks.reports import generate_benchmark_report


def run_benchmarks(smoke: bool = False):
    """
    Run full benchmark suite: execute benchmarks, generate plots and reports.
    
    Args:
        smoke: If True, run minimal benchmark; if False, run full suite.
    
    Returns:
        Tuple of (results, bench_dir, report_dir)
    """
    # Run benchmarks
    results, bench_dir, report_dir = _run_benchmarks(smoke)
    
    # Generate visualizations
    generate_benchmark_plots(results, report_dir)
    
    # Generate summary report
    generate_benchmark_report(results, report_dir)
    
    return results, bench_dir, report_dir
