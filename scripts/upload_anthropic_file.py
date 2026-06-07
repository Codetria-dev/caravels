import argparse
import os
from pathlib import Path

import anthropic


def upload_file(file_path: str) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("Set ANTHROPIC_API_KEY before running this script.")

    path = Path(file_path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    client = anthropic.Anthropic(api_key=api_key)

    with path.open("rb") as file_handle:
        result = client.beta.files.upload(
            file=(path.name, file_handle, "application/pdf"),
        )

    print(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload a PDF to Anthropic Files API.")
    parser.add_argument("file", help="Path to a PDF file")
    args = parser.parse_args()

    upload_file(args.file)


if __name__ == "__main__":
    main()
