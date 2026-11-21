import json
import shutil
from pathlib import Path

HERE = Path(__file__).parent.parent.resolve()
DIST = HERE / "demo" / "dist"

EXTENSIONS = {
    "@jupyter-ai/pi-lite": HERE / "python/jupyter-ai-pi-lite/jupyter_ai_pi_lite/labextension",
    "@jupyter-ai/pi-lite-terminal": HERE
    / "python/jupyter-ai-pi-lite-terminal/jupyter_ai_pi_lite_terminal/labextension",
}


def update_demo():
    config_path = DIST / "jupyter-lite.json"
    config = json.loads(config_path.read_text())
    federated = config["jupyter-config-data"]["federated_extensions"]

    for name, source in EXTENSIONS.items():
        remote_entry = next(source.glob("static/remoteEntry.*.js"))
        entry = next(ext for ext in federated if ext["name"] == name)
        entry["load"] = f"static/{remote_entry.name}"
        print(f"{name}: load set to static/{remote_entry.name}")

        target = DIST / "extensions" / name
        shutil.rmtree(target, ignore_errors=True)
        shutil.copytree(source, target)
        print(f"{name}: copied {source.relative_to(HERE)} to {target.relative_to(HERE)}")

    config_path.write_text(json.dumps(config, indent=2))
    print(f"Updated {config_path.relative_to(HERE)}")


if __name__ == "__main__":
    update_demo()
