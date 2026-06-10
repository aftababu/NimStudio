import sys
import json
from markitdown import MarkItDown

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided."}))
        sys.exit(1)

    file_path = sys.argv[1]
    md = MarkItDown()

    try:
        # Convert local file to markdown
        result = md.convert(file_path)
        print(json.dumps({
            "success": True,
            "markdown": result.text_content
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
