import { abs, mean, min, sum } from 'mathjs';
import { Matrix, solve } from 'ml-matrix';
function getAllCase<T>(inputs: Array<T[]>): Array<T[]> {
    if(inputs.length === 0){
        return [];
    }
    let results:Array<T[]> = []
    let q: Array<T[]> = inputs[0].map((x)=>[x]);

    while(q.length > 0){
        let crt = q[0];
        q = q.slice(1);
        if(crt.length === inputs.length){
            results.push(crt);
        } else {
            for(let nextEle of inputs[crt.length]){
                let tmp = crt.slice();
                tmp.push(nextEle);
                q.push(tmp);
            }
        }
    }

    return results;
}

function count<T>(arr: Array<T>, cb: (item: T, idx: number, arr:T[]) => boolean):number{
    let res = 0;
    for(let i = 0; i < arr.length; ++ i){
        if(cb(arr[i], i, arr)){
            res += 1;
        }
    }
    return res;
}
let crtTs = 0;
function getTs():number{
    crtTs += 1000;
    return crtTs;
}

let EPSINON = 0.00001
function floatEq(f1: number, f2: number){
    return Math.abs(f1 - f2) <  EPSINON
}

function floatGt(f1: number, f2: number){
    return f1 > f2 && !floatEq(f1, f2);
}

function floatLt(f1: number, f2: number){
    return f1 < f2 && !floatEq(f1, f2);
}

function floatGe(f1: number, f2: number){
    return f1 > f2 || floatEq(f1, f2);
}

function floatLe(f1: number, f2: number){
    return f1 < f2 || floatEq(f1, f2);
}

function randomID(){
    return 'rand' + Math.random().toString(36).slice(2);
}

function range(start:number, end:number) {
    return [...Array(end-start).keys()].map(i => i + start);
}

function reduceRowJs(_mtrx: number[][]){
    let mtrx: number[][] = _mtrx.map((x)=>([...x]))

    let rowNum = mtrx.length
    let colNum = mtrx[0].length

    let row = 0
    for(let col = 0; col < colNum - 1; ++ col){
        if(row >= rowNum){
            continue;
        }

        let nonZero = true;
        if(mtrx[row][col] === 0){
            nonZero = false;
            for(let rIdx of range(row, rowNum)){
                if(!floatEq(0, mtrx[rIdx][col])){
                    let tmp = [...mtrx[row]];
                    mtrx[row] = mtrx[rIdx];
                    mtrx[rIdx] = tmp;
                    nonZero = true;
                    break
                }
            }
        }

        if(nonZero){
            if(!floatEq(mtrx[row][col], 1)){
                mtrx[row] = mtrx[row].map((x)=>(x / mtrx[row][col]))
            }
            for(let rIdx of range(0, rowNum)){
                if(row == rIdx){
                    continue;
                }
                if(floatEq(mtrx[rIdx][col], 0)){
                    continue;
                }

                // mtrx[rIdx] += (-mtrx[rIdx][col]) * mtrx[row]
                let tmp = mtrx[row].map((x)=>(x * -mtrx[rIdx][col]))
                mtrx[rIdx] = mtrx[rIdx].map((_, idx)=>{
                    return mtrx[rIdx][idx] + tmp[idx];
                })
            }
            row += 1
        }
    }

    return mtrx;
}

function listEq<T>(l1: T[], l2: T[]){
    if(l1.length !== l2.length){
        return false;
    }

    for(let i = 0; i < l1.length; ++ i){
        let item1 = l1[i];
        let item2 = l2[i];
        let isArr1 = Array.isArray(item1);
        let isArr2 = Array.isArray(item2);
        if(isArr1 !== isArr2){
            return false;
        }

        if(isArr1 && isArr2){
            if(!listEq(item1 as unknown as any[], item2 as unknown as any[])){
                return false;
            }
        } else {
            if(item1 !== item2){
                return false;
            }
        }
    }

    return true;
}

function uniquifyList<T0, T1>(l: T0[], func: undefined | ((arg0: T0)=>T1)):T0[]{
    if(func != undefined){
        let numSet: Set<T1> = new Set();
        let res: T0[] = [];
        
        for(let x of l){
                let v = func(x)!;
                if(numSet.has(v)){
                    continue;
                }
                res.push(x);
                numSet.add(v);
        }
        return res;
    } else {
        let set: Set<T0> = new Set();
        let res: T0[] = [];
        for(let x of l){
                if(set.has(x)){
                    continue;
                }
                res.push(x);
                set.add(x);
        }
        return res;
    }
    
}

function isSubsetOf<T>(larger: T[], smaller: T[]){
    let largerIdx = 0;
    let smallerIdx = 0;
    while(largerIdx < larger.length && smallerIdx < smaller.length){
        if(larger[largerIdx] === smaller[smallerIdx]){
            largerIdx += 1;
            smallerIdx += 1;
        } else {
            largerIdx += 1;
        }
    }

    return smallerIdx === smaller.length
}

function beamSolve(
    rel_coef: number[][],
    rel_res: number[],
    val_coef: number[][],
    val_res: number[],
    rel_keep_idx?: number[],
    rel_ignore_idx?: number[],
    val_keep_idx?: number[],
    val_ignore_idx?: number[]
){
    rel_keep_idx = rel_keep_idx || [];
    rel_ignore_idx = rel_ignore_idx || [];
    val_keep_idx = val_keep_idx || [];
    val_ignore_idx = val_ignore_idx || [];

    // 优化 val_ignore_idx，val取值为-1的自动加入ignore中
    val_res.forEach((x, idx)=>{
        if(x <= 0){
            val_ignore_idx?.push(idx);
        }
    })

    val_keep_idx = val_keep_idx.map((x)=>x+rel_coef.length)
    val_ignore_idx = val_ignore_idx.map((x)=>x+rel_coef.length)
    let keep_idx = [... rel_keep_idx, ... val_keep_idx]
    let ignore_idx = [... rel_ignore_idx, ... val_ignore_idx]

    let coef = [... rel_coef, ... val_coef]
    let val = [... rel_res, ... val_res]

    let A = new Matrix(coef)
    let B = Matrix.columnVector(val)

    let ID = range(0, val.length);

    // 对于取值 <= 0 的 vals 直接删除
    let ID_init = range(0, val.length).filter((idx)=>{
        if(idx < rel_res.length){
            return true;
        }
        if(val[idx] <= 0){
            return false;
        }
        return true;
    })

    let A_init = new Matrix(coef.filter((_, idx)=>{
        return ID_init.includes(idx);
    }));
    let B_init = Matrix.columnVector(val.filter((_, idx)=>{
        return ID_init.includes(idx)
    }));


    let visited: Set<string> = new Set(); // visited ids
    
    let resultIds: Array<number[]> = []; // 已经成功的，不允许是它的子集合
    
    let q: [Matrix, Matrix, number[]][] = [] // queue
    q.push([A_init.clone(), B_init.clone(), ID_init.slice()]);
    let queueIdx = 0;

    let result: [Matrix, Matrix, number[], number, number, number[]][] = [];

    function isVisited(crtId: number[]){
        for(let x of resultIds){
            if(isSubsetOf(x, crtId)){
                return true;
            }
        }
        return false;
    }

    while(queueIdx < q.length){
        let crt = q[queueIdx];
        queueIdx += 1
        let crtA = crt[0];
        let crtB = crt[1];
        let crtID = crt[2];
        if(isVisited(crtID)){
            continue;
        }

        if(crtA.rows < crtA.columns){
            continue
        }

        let crtIdStr = crtID.map(x=>x.toFixed(2)).join('-');
        if(visited.has(crtIdStr)){
            continue;
        }
        visited.add(crtIdStr);

        countTimeStart('beamSolve')
        let x = solve(crtA, crtB, true);
        countTimeEnd('beamSolve')
        let errors = Matrix.sub(crtB, crtA.mmul(x)).abs().to1DArray()

        let error = sum(errors);
        if(floatLt(error, 0.01)){
            let global_errors = Matrix.sub(B, A.mmul(x)).abs().to1DArray();
            let satisfied_IDs = global_errors.flatMap((n, idx)=>{
                if(n < 0.01){
                    return [idx]
                } 

                return []
            })
            resultIds.push(satisfied_IDs);
            let global_error = sum(global_errors);

            result.push([crtA, crtB, x.to1DArray(), error, global_error, satisfied_IDs]);
            continue
        }

        let keep_idx_in_crt = keep_idx.map((x)=>crtID.indexOf(x)).filter((x)=>x>=0);
        let ignore_idx_in_crt = ignore_idx.map((x)=>crtID.indexOf(x)).filter(x=>x>=0);

        let beam_size = min(keep_idx_in_crt.length + 2, crtID.length)

        let errors_sort = errors.slice();
        errors_sort.sort((a, b)=>(b-a)) // 从大到小
        let candidateIdx = 
            errors_sort.slice(0, beam_size).map((x)=>errors.indexOf(x)).filter((x)=>!keep_idx_in_crt.includes(x))
        ignore_idx_in_crt.reverse().forEach((x)=>{
            if(candidateIdx.includes(x)){
                return;
            }
            candidateIdx = [x, ... candidateIdx]
        })

        candidateIdx = candidateIdx.slice(0, 4);
        for(let max_error_idx of candidateIdx){
            let idx = range(0, crtA.rows);
            idx.splice(max_error_idx, 1);

            let crtAList = crtA.to2DArray();
            let nextA = new Matrix(idx.map((x)=>crtAList[x]));

            let crtBList = crtB.to1DArray();
            let nextB = Matrix.columnVector(idx.map((x)=>crtBList[x]));
            let nextID = idx.map((x)=>crtID[x]);
            q.push([nextA, nextB, nextID]);
        }
    }

    result.sort((a, b)=>(a[4] - b[4]))
    return {
        data: { // 和 网络请求类似
            res: result.map((x)=>x[2]),
            err: result.map((x)=>x[4]),
            ids: result.map((x)=>x[5])
        }
    }
}


let nameToStartTime: Map<string, number> = new Map();
let nameToSpentTimeList: Map<string, number[]> = new Map();

function countTimeStart(name: string){
    nameToStartTime.set(name, new Date().getTime())
}

function countTimeEnd(name: string){
    let endTime = new Date().getTime();
    let startTime = nameToStartTime.get(name)!;

    if(!nameToSpentTimeList.has(name)){
        nameToSpentTimeList.set(name, []);
    }
    nameToSpentTimeList.get(name)?.push(endTime - startTime);
}

function countTimeFinish(name: string){
    let timeList = nameToSpentTimeList.get(name);
    nameToStartTime.delete(name)
    nameToSpentTimeList.delete(name)
    if(timeList == undefined || timeList.length == 0){
        return [0, 0]
    }

    return [timeList.length, mean(timeList)];
}

function getOrDefault<T1, T2>(mp: Map<T1, T2>, key: T1, dft: T2){
    if(mp.has(key)){
        return mp.get(key);
    }
    return dft;
}

function reader(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            var reader = new FileReader()
            if (file) {
                reader.onloadend = function(e) {
                    resolve(reader.result as any as string)
                }
                reader.onerror = function() {
                   reject("load file error")
                }
                reader.readAsText(file)
            } else {
                reject("file not found")
            }
        } catch (e) {
            reject("file not found")
        }
    })
}

export {getAllCase, count, getTs, floatEq, 
    randomID, reduceRowJs, listEq, floatGe, 
    floatLe, floatGt, floatLt, uniquifyList, 
    beamSolve, countTimeStart, countTimeEnd, countTimeFinish, getOrDefault, reader}