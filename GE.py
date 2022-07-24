import numpy as np
import copy

def RowReduce(mtrx, showSteps = False):
    """
    Row reduces a matrix in the form of a 2d numpy array and return resulting array
    can also shows steps
    """
    
    if showSteps: print(mtrx, "\n")
    
    rowNum = mtrx.shape[0]
    colNum = mtrx.shape[1]

    row = 0

    for col in range(colNum - 1):
        if row >= rowNum: continue#stop if all rows solved
            
        nonZero = True
        if a[row][col] == 0:
            nonZero = False
            for rIdx in range(row, rowNum):
                if mtrx[rIdx][col] != 0:
                    #tries to swap rows if col is 0
                    temp = copy.deepcopy(mtrx[row])
                    mtrx[row] = mtrx[rIdx]
                    mtrx[rIdx] = temp                 
                    nonZero = True
                    if showSteps: print(f"R{row} <-> R{rIdx}")
                    if showSteps: print(mtrx, "\n")
                    break

        if nonZero:
            if mtrx[row][col] != 1:
                if showSteps: print(f"R{row}/{mtrx[row][col]} -> R{row}")
                mtrx[row] *= 1/mtrx[row][col] # normalize to 1
                if showSteps: print(mtrx, "\n")
            for rIdx in range(rowNum):
                if row == rIdx: continue
                if mtrx[rIdx][col] == 0: continue
                if showSteps: print(f"R{rIdx} + ({(-mtrx[rIdx][col])} * R{row}) -> R{rIdx}")
                mtrx[rIdx] += (-mtrx[rIdx][col]) * a[row]#subtract or add until zero
                if showSteps: print(mtrx, "\n")
            row += 1
        
    return mtrx

if __name__ == '__main__':
    a_attr = np.array([
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, -1, 0, 0, 0, 0, 0, 0],
            [ 0, 1, 0, -1, 0, 0, 0, 0],
            [ 1, 0, -1, 0, 0, 0, 0, 0],
            [ 1, 0, 1, 0, -2, 0, 0, 0],
            [ 0.5, -1, -0.5, 0, 0, 1, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 1, -1],
            [ 0, 0, 0, 0, 0, 0, 1, -1]
        ], dtype = np.longdouble)
    a_const = np.array([
            [1, 0, 0,],
            [0, 1, 0,],
            [0, 0, 0,],
            [0, 0, 1,],
            [0, 0, 0,],
            [0, 0, 0,],
            [0, 0, 0,],
            [0, 1, 0,],
        ])
    a = np.concatenate((a_attr, -a_const), axis=1)
    RowReduce(a, True)