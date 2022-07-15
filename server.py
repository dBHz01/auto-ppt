import queue
from unittest import result
from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import math
app = Flask(__name__)
CORS(app)

@app.route('/solve2', methods=['POST'])
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

def convert_to_str(n):
    return '-'.join([str(x) for x in n.tolist()])

@app.route('/solve', methods=['POST'])
def solve2():
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
    ID = np.array(list(range(A.shape[0])))
    visited = set()
    q:queue.Queue = queue.Queue()
    q.put((A, B, ID))

    result = []

    while not q.empty():
        crtA, crtB, crtID = q.get()
        if convert_to_str(crtID) in visited:
            continue
        visited.add(convert_to_str(crtID))
        
        x = np.linalg.lstsq(crtA, crtB, rcond=None)

        res = x[0].tolist()
        error = 0
        if len(x[1].tolist()) > 0:
            error = x[1].tolist()[0]

        # if error == 0:
        if error < 1e-5:
            overall_error = np.sum((np.matmul(A, x[0]) - B) ** 2).item()
            result.append((crtA, crtB, res, error, overall_error))
            continue
        
        errors = (np.abs(np.matmul(crtA, x[0]) - crtB))
        candidateIdx = np.argpartition(errors, -4)[-4:].tolist()
        for max_error_idx in candidateIdx:
            idx = list(range(crtA.shape[0]))
            del idx[max_error_idx]

            nextA = crtA[idx, :]
            nextB = crtB[idx, ]
            nextID = crtID[idx, ]
            q.put((nextA, nextB, nextID))

    result.sort(key=lambda x: x[-1])
    # res = result[0][2]
    # error = result[0][-1]
    return jsonify({
        'res': [x[2] for x in result],
        'err': [x[-1] for x in result]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=12345)