# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Povolit požadavky z Reactu

@app.route("/")
def home():
    return jsonify({"message": "Timmy"})

if __name__ == "__main__":
    app.run(debug=True)
