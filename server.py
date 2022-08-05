# from crypt import methods
import queue
from unittest import result
from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import math

from GE import RowReduce
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

    rel_keep_idx = request.json.get('rel_keep_idx', [])
    rel_ignore_idx = request.json.get('rel_ignore_idx', [])
    
    val_keep_idx = request.json.get('val_keep_idx', [])
    val_ignore_idx = request.json.get('val_ignore_idx', [])

    val_keep_idx = [x + len(rel_coef) for x in val_keep_idx]
    val_ignore_idx = [x + len(rel_coef) for x in val_ignore_idx]

    keep_idx = rel_keep_idx + val_keep_idx
    ignore_idx = rel_ignore_idx + val_ignore_idx

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
        if crtA.shape[0] < crtA.shape[1]:
            continue
        visited.add(convert_to_str(crtID))
        
        x = np.linalg.lstsq(crtA, crtB, rcond=None)

        res = x[0].tolist()
        errors = np.abs(np.matmul(crtA, x[0]) - crtB)
        error = np.sqrt(np.sum(errors ** 2))

        # if error == 0:
        if error < 0.01:
            overall_error = np.sum(np.abs(np.matmul(A, x[0]) - B)).item()
            result.append((crtA, crtB, res, error, overall_error, crtID))
            continue
        
        crtID_list = crtID.tolist()

        keep_idx_in_crt = [crtID_list.index(x) for x in keep_idx if x in crtID_list]
        ignore_idx_in_crt = [crtID_list.index(x) for x in ignore_idx if x in crtID_list]
        
        beam_size = min(len(keep_idx_in_crt) + 2, len(crtID_list)) # keep 是经过加权的，所以很可能error会大
        
        candidateIdx = np.argpartition(errors, -beam_size)[-beam_size:].tolist() # 优先不考虑error小的

        candidateIdx = [x for x in candidateIdx if x not in keep_idx_in_crt]
        ignore_exclude = [x for x in ignore_idx_in_crt if x not in candidateIdx]
        ignore_exclude.extend(candidateIdx)

        candidateIdx = ignore_exclude
        if len(candidateIdx) > 4:
            candidateIdx = candidateIdx[:4]
        
        for max_error_idx in candidateIdx:
            idx = list(range(crtA.shape[0]))
            del idx[max_error_idx]

            nextA = crtA[idx, :]
            nextB = crtB[idx, ]
            nextID = crtID[idx, ]
            q.put((nextA, nextB, nextID))

    result.sort(key=lambda x: x[4])
    # res = result[0][2]
    # error = result[0][-1]
    return jsonify({
        'res': [x[2] for x in result],
        'err': [x[-2] for x in result],
        'ids': [x[-1].tolist() for x in result]
    })

@app.route('/row_reduction', methods=['POST'])
def row_reduction():
    coef = request.json.get('coef')
    mat = np.array(coef, dtype=np.double)
    reduced_mat = RowReduce(mat)
    return jsonify({
        'res': reduced_mat.tolist()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=12345, threaded=True)