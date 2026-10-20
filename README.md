# jupyter-ai-pi

[![Github Actions Status](https://github.com/jtpio/jupyter-ai-pi-lite/workflows/Build/badge.svg)](https://github.com/jtpio/jupyter-ai-pi-lite/actions/workflows/build.yml)

The [pi coding agent](https://pi.dev) as an in-browser persona of [Jupyter AI](https://github.com/jupyterlab/jupyter-ai), for JupyterLab, Notebook 7 and JupyterLite.

Pi is available in two places, with the same tools, settings, credentials and sessions:

- in the chats, as a persona (`jupyter-ai-pi`);
- in the JupyterLite terminal, as the `pi` command, with the interactive interface of pi itself (`jupyter-ai-pi-terminal`).

Pi reads and writes the files of JupyterLab; in JupyterLite, it runs shell commands in the in-browser `cockle` shell.

The packages are built on [`jupyter-ai-agent-lite`](https://github.com/jupyterlab/jupyter-ai-lite), the building blocks of in-browser personas.

## Requirements

- JupyterLab >= 4.5.0 or Notebook >= 7.5.0
- JupyterLite >= 0.8.6 for the terminal command

## Install

```bash
pip install jupyter-ai-pi
```

For the `pi` command in the JupyterLite terminal:

```bash
pip install jupyter-ai-pi-terminal
```

## Documentation

See the [documentation](docs/index.md).

## Uninstall

```bash
pip uninstall jupyter-ai-pi jupyter-ai-pi-terminal
```

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md)
