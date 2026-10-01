import subprocess
import sys
import time
import os
from threading import Thread

# ANSI Colors for terminal output
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

processes = []

def stream_output(pipe, prefix, color):
    """Reads lines from a subprocess pipe and prints them with a colored prefix."""
    try:
        for line in iter(pipe.readline, b''):
            line_str = line.decode('utf-8', errors='replace').rstrip()
            print(f"{color}{prefix}{RESET} {line_str}")
    except ValueError:
        pass

def start_process(name, cmd, cwd, prefix, color):
    """Starts a subprocess and spawns a thread to stream its output."""
    print(f"{GREEN}Starting {name}...{RESET}")
    
    # npm requires shell=True on Windows
    is_win = sys.platform.startswith('win')
    use_shell = is_win and cmd[0] == 'npm'
    
    p = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=use_shell
    )
    processes.append(p)
    
    t = Thread(target=stream_output, args=(p.stdout, prefix, color), daemon=True)
    t.start()
    return p

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    print("================================================================")
    print(f" {CYAN}SourceSense — Complete City Simulator Launcher{RESET}")
    print("================================================================")
    print(f" This script runs the Backend, Frontend, and 25-Node Dhaka City")
    print(f" Simulator simultaneously in this console.\n")
    
    try:
        # 1. Start Backend API
        start_process(
            "Backend API (FastAPI)",
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
            backend_dir,
            "[API]",
            CYAN
        )
        
        # 2. Start Frontend UI
        start_process(
            "Frontend UI (Vite/React)",
            ["npm", "run", "dev"],
            frontend_dir,
            "[ UI]",
            MAGENTA
        )
        
        # Wait a few seconds to let the backend initialize its ML models
        print(f"\n{YELLOW}Waiting 7 seconds for the backend to start up...{RESET}\n")
        time.sleep(7)
        
        # 3. Start the Python City Sensor Simulator (25 nodes)
        start_process(
            "City Simulator (city_sensors.py)",
            [sys.executable, "city_sensors.py", "--loop", "--interval", "5"],
            backend_dir,
            "[SIM]",
            YELLOW
        )
        
        print(f"\n{GREEN}All services are running!{RESET}")
        print(f" - Dashboard: http://localhost:5173")
        print(f" - API Docs:  http://localhost:8000/docs")
        print(f"Press {YELLOW}Ctrl+C{RESET} to gracefully stop all services.\n")
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Stopping all services...{RESET}")
        for p in processes:
            p.terminate()
        for p in processes:
            p.wait()
        print(f"{GREEN}Shutdown complete.{RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
