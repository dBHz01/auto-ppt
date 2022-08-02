
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
    return Math.random().toString(36).slice(-6);
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

export {getAllCase, count, getTs, floatEq, 
    randomID, reduceRowJs, listEq, floatGe, floatLe, floatGt, floatLt}