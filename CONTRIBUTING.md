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
pip uninstall jupyter-ai-pi
pip uninstall jupyter-ai-pi-terminal
```

In development mode, you will also need to remove the symlink created by `jupyter-builder develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlinks named `@jupyter-ai/pi` and `@jupyter-ai/pi-terminal`
within that folder.

## Packaging the extension

See [RELEASE](RELEASE.md)
