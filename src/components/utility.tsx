function getAllCase<T>(inputs: Array<T[]>): Array<T[]> {
    let results:Array<T[]> = []
    let q: Array<T[]> = inputs[0].map((x)=>[x]);

    while(q.length > 0){
        let crt = q[0];
        q = q.slice(1);
        if(crt.length == inputs.length){
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

export {getAllCase, count}