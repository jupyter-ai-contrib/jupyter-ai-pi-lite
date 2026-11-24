"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
from pathlib import Path

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

# Add the extension that gives a model provider to pi (see `extension`).
c.LabServerApp.extra_labextensions_path = [
    c.LabServerApp.extra_labextensions_path,
    str(Path(__file__).parent / "labextensions"),
]

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
