from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/solve', methods=['POST'])
def solve():
    rel_coef = request.json.get('rel_coef')
    rel_res = request.json.get('rel_res')
    val_coef = request.json.get('val_coef')
    val_res = request.json.get('val_res')

    coef = []
    coef.extend(rel_coef)
    coef.extend(val_coef)

    val = []
    val.extend(rel_res)
    val.extend(val_res)

    A = np.array(coef)
    B = np.array(val).T
    x = np.linalg.lstsq(A, B, rcond=None)

    res = x[0].tolist()
    error = x[1].tolist()[0]

    return jsonify({
        'res': res,
        'err': error
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=12345)