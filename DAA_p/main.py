import subprocess
import sys
import socket

import typer
from Src.benchmark import run_benchmarks


app = typer.Typer(help="E-Commerce Product Ranking CLI: Run benchmarks or start the ranking API server.")


def _is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


def _find_next_available_port(host: str, start_port: int, max_attempts: int = 100) -> int | None:
    for candidate_port in range(start_port, start_port + max_attempts):
        if _is_port_available(host, candidate_port):
            return candidate_port
    return None


@app.command()
def benchmark(
    full: bool = typer.Option(False, "--full", help="Run full benchmarks (1K, 5K, 10K, 42K) instead of smoke tests (1K, 5K)"),
):
    """
    Run the benchmarking suite for Merge Sort and Quick Sort algorithms.
    By default, runs a quick smoke test on smaller dataset sizes. Use --full for all sizes.
    """
    run_benchmarks(smoke=not full)


@app.command()
def api(
    host: str = typer.Option("0.0.0.0", "--host", help="Host address to bind the API server to"),
    port: int = typer.Option(5000, "--port", help="Port number to bind the API server to"),
):
    """
    Start the FastAPI server providing the /rank and /health endpoints.
    """
    resolved_port = port
    if not _is_port_available(host, port):
        fallback_port = _find_next_available_port(host, port + 1)
        if fallback_port is None:
            typer.secho(
                f"Port {port} is in use and no free fallback port was found in the scan range.",
                fg=typer.colors.RED,
            )
            raise typer.Exit(code=1)

        resolved_port = fallback_port
        typer.secho(
            f"Port {port} is already in use. Falling back to port {resolved_port}.",
            fg=typer.colors.YELLOW,
        )

    typer.echo(f"Starting API server on {host}:{resolved_port}...")
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "Src.app:app",
        f"--host={host}",
        f"--port={resolved_port}",
        "--reload"
    ], check=True)


if __name__ == "__main__":
    app()

