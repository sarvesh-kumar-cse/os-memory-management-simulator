from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import threading
import webbrowser

app = Flask(__name__)
CORS(app)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# FIFO Algorithm
def fifo(pages, capacity):
    frames = []
    queue = []
    steps = []
    faults = 0

    for page in pages:
        hit = page in frames

        if not hit:
            faults += 1

            if len(frames) < capacity:
                frames.append(page)
                queue.append(page)
            else:
                removed = queue.pop(0)
                index = frames.index(removed)
                frames[index] = page
                queue.append(page)

        steps.append({
            "page": page,
            "frames": frames.copy(),
            "hit": hit
          })

    return {"steps": steps, "faults": faults}


def lru(pages, capacity):
    frames = []
    recent = {}

    steps = []
    faults = 0

    for i, page in enumerate(pages):
        hit = page in frames

        if not hit:
            faults += 1

            if len(frames) < capacity:
                frames.append(page)
            else:
                lru_page = min(recent, key=recent.get)
                index = frames.index(lru_page)
                frames[index] = page
                del recent[lru_page]

        recent[page] = i

        steps.append({
            "page": page,
            "frames": frames.copy(),
            "hit": hit
        })

    return {"steps": steps, "faults": faults}


# API Route
@app.route("/fifo", methods=["POST"])
def run_fifo():
    data = request.json
    pages = data["pages"]
    capacity = data["capacity"]

    result = fifo(pages, capacity)
    return jsonify(result)



@app.route("/test")
def test():
    pages = [1, 2, 3, 1, 4, 5]
    capacity = 3
    return fifo(pages, capacity)


@app.route("/lru", methods=["POST"])
def run_lru():
    data = request.json
    pages = data["pages"]
    capacity = data["capacity"]

    return jsonify(lru(pages, capacity))


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    allowed_files = {"script.js", "styles.css", "settings.json"}
    if filename in allowed_files:
        return send_from_directory(BASE_DIR, filename)

    return jsonify({"error": "Not found"}), 404


def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")


if __name__ == "__main__":
     threading.Timer(1.0, open_browser).start()
     app.run(debug=True, use_reloader=False)
