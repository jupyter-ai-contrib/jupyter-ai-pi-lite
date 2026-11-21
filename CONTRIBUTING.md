# Contributing

## Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Install all packages in development mode and link labextensions
python ./scripts/dev_install.py
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

## Developing with JupyterLite

The `demo/` folder contains a JupyterLite site, built with [uv](https://docs.astral.sh/uv/). The `pi` command of the terminal is only available in JupyterLite.

- Build the extensions and the site once.

```bash
# Build the extensions
jlpm build
# Install the demo environment and build the site in demo/dist
cd demo
uv sync
mkdir -p contents
uv run jupyter lite build
# Serve the site
uv run jupyter lite serve
```

- While keeping the server running, change the extension source, then rebuild the extensions in another terminal:

```bash
jlpm build && jlpm update:demo
```

Rebuild the whole site with `uv sync` and `uv run jupyter lite build` after changing the demo dependencies (`demo/pyproject.toml`), its configuration (`demo/jupyter-lite.json`, `demo/overrides.json`) or its contents.

## Contributing to documentation

The documentation is built using [MyST](https://mystmd.org/) and [Jupyter Book](https://jupyterbook.org/). The source files are located in the `docs/` folder.

To preview the documentation locally:

```bash
# Start a local development server with live reload
jlpm docs
```

To build the documentation as static HTML:

```bash
jlpm docs:build
```

## Development uninstall

```bash
pip uninstall jupyter-ai-pi-lite
pip uninstall jupyter-ai-pi-lite-terminal
```

In development mode, you will also need to remove the symlink created by `jupyter-builder develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlinks named `@jupyter-ai/pi-lite` and `@jupyter-ai/pi-lite-terminal`
within that folder.

## Packaging the extension

See [RELEASE](RELEASE.md)
