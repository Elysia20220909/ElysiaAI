#!/usr/bin/env python3
import sys
import io
import contextlib
import traceback
import signal
from typing import Dict, Any

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("Code execution timed out (forced termination).")

def execute_code(code: str, timeout: int = 5) -> Dict[str, Any]:
    """Execute Python code in a restricted local scope and capture output."""
    output_buffer = io.StringIO()
    error = ""
    result = None
    
    # Simple security: block built-ins that are very dangerous
    # Note: For true security, use gVisor, Docker, or e2b.
    restricted_globals = {
        "__builtins__": {
            k: v for k, v in __builtins__.items() 
            if k not in ["eval", "exec", "open", "input", "exit", "quit", "help"]
        },
        "print": lambda *args, **kwargs: print(*args, file=output_buffer, **kwargs),
        "import": __import__
    }
    
    # Set timeout
    if sys.platform != "win32":
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout)
        
    try:
        with contextlib.redirect_stdout(output_buffer):
            # We use a local dict for variables created during execution
            exec_locals = {}
            exec(code, restricted_globals, exec_locals)
            result = exec_locals
    except TimeoutException as te:
        error = str(te)
    except Exception:
        error = traceback.format_exc()
    finally:
        if sys.platform != "win32":
            signal.alarm(0)
            
    return {
        "stdout": output_buffer.getvalue(),
        "error": error,
        "locals": str(result) if result else ""
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        res = execute_code(sys.argv[1])
        print(res)
