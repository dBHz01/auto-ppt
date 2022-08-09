import assert from "assert";
import { Attribute, Controller, ElementType, Equation, SingleElement } from "./backend"

class ControllerCloner{
    eleCloner: Map<SingleElement, SingleElement>;
    attrCloner: Map<Attribute, Attribute>;
    eqCloner: Map<Equation, Equation>;
    tmpEle: SingleElement;

    elements: Map<number, SingleElement>;
    equations: Equation[];
    idAllocator: number;
    constAllocator: number;

    candidates: Array<[Equation[], Attribute[], number[], number]>;
    crtCdtIdx: number;

    tmpElement: SingleElement;
    constElement: SingleElement;
    baseElement: SingleElement;

    eventLisnter: Map<string, ((...arg0: any[])=>void)[]>;

    nextPosCdtCache?: [number, number, number][];
    attrNameToDefault: Map<string, any>;

    oriCon?: Controller;

    constructor(input: Controller|ControllerCloner){
        this.oriCon = (input instanceof Controller)? input: undefined;

        this.eleCloner = new Map();
        this.attrCloner = new Map();
        this.tmpEle = new SingleElement(-100000, ElementType.TMP, "CLONE_TMP")
        this.eqCloner = new Map();

        this.elements = this.cloneObj(input.elements);
        this.equations = this.cloneObj(input.equations);
        assert(this.eleCloner.has(input.constElement));
        this.constElement = this.cloneObj(input.constElement);
        assert(this.eleCloner.has(input.baseElement));
        this.baseElement = this.cloneObj(input.baseElement);
        this.idAllocator = this.cloneObj(input.idAllocator);
        this.constAllocator = this.cloneObj(input.constAllocator);
        this.candidates = this.cloneObj(input.candidates);
        this.crtCdtIdx = this.cloneObj(input.crtCdtIdx);
        this.equations = this.cloneObj(input.equations);

        this.tmpElement = this.cloneObj(input.tmpElement);
        this.nextPosCdtCache = this.cloneObj(this.nextPosCdtCache);
        this.eventLisnter = this.cloneObj(input.eventLisnter);
        this.attrNameToDefault = this.cloneObj(input.attrNameToDefault);
    }

    assign(con?:Controller){
        if(con == undefined){
            con = this.oriCon;
        }
        if(con == null){
            return;
        }
        let tmpCopy = new ControllerCloner(this);

        con.elements = tmpCopy.elements;
        con.equations = tmpCopy.equations;
        con.idAllocator = tmpCopy.idAllocator;
        con.constAllocator = tmpCopy.constAllocator;
        con.candidates = tmpCopy.candidates;
        con.crtCdtIdx = tmpCopy.crtCdtIdx;
        con.tmpElement = tmpCopy.tmpElement;
        con.constElement = tmpCopy.constElement;
        con.baseElement = tmpCopy.baseElement;
        con.eventLisnter = tmpCopy.eventLisnter;
        con.nextPosCdtCache = tmpCopy.nextPosCdtCache;
        con.attrNameToDefault = tmpCopy.attrNameToDefault;
    }

    cloneObj<T>(input: T):T{
        if(input instanceof SingleElement){
            return this.cloneEle(input) as any as T;
        }
        if(input instanceof Attribute){
            return this.cloneAttr(input)  as any as T
        }
        if(input instanceof Equation){
            return this.cloneEq(input) as any as T;
        }
        if(input instanceof Array){
            return input.map(x=>this.cloneObj(x)) as any as T;
        }
        if(input instanceof Set){
            let res = new Set();
            input.forEach(x=>{
                res.add(this.cloneObj(x))
            })
            return res as any as T;
        }
        if(input instanceof Map){
            let res = new Map();
            input.forEach((v, k)=>{
                res.set(this.cloneObj(k), this.cloneObj(v));
            })

            return res as any as T;
        }
        if(input == undefined){
            return input;
        }
        if((typeof input) === 'object'){
            throw Error('未知的数据类型')
        }

        return input; // 基本类型 + function
    }

    addPair<T>(x1: T, x2: T){
        if(x1 instanceof SingleElement && x2 instanceof SingleElement){
            if(this.eleCloner.has(x1)){
                console.warn('元素重复克隆')
            }
            this.eleCloner.set(x1, x2);
        } else if(x1 instanceof Attribute && x2 instanceof Attribute){
            if(this.attrCloner.has(x1)){
                console.warn('属性重复克隆')
            }
            this.attrCloner.set(x1, x2);
        } else if(x1 instanceof Equation && x2 instanceof Equation){
            if(this.eqCloner.has(x1)){
                console.warn('关系重复克隆')
            }
            this.eqCloner.set(x1, x2);
        } else {
            throw Error('错误的类型')
        }
    }

    cloneEle(input: SingleElement):SingleElement{
        if(this.eleCloner.has(input)){
            return this.eleCloner.get(input)!;
        }
        let output = new SingleElement(
            input.id, input.type, input.name
        );

        this.addPair(input, output);

        output.timestamp = input.timestamp;
        input.attributes.forEach((attr, key)=>{
            output.attributes.set(key, this.cloneAttr(attr));
        })

        return output;
    }

    cloneAttr(input: Attribute): Attribute{
        if(this.attrCloner.has(input)){
            return this.attrCloner.get(input)!;
        }

        // 小心重复克隆的问题
        let output = new Attribute(input.name, input.val.clone(), this.tmpEle);
        this.addPair(input, output);
        output.element = this.cloneEle(input.element);
        output.timestamp = input.timestamp;
        return output;

    }

    cloneEq(input: Equation): Equation{
        if(this.eqCloner.has(input)){
            return this.eqCloner.get(input)!;
        }

        let output = new Equation(
            input.leftFunc.deepCopy(),
            input.rightFunc.deepCopy(),
            input.leftArgs.map((x)=>this.cloneAttr(x)),
            input.rightArgs.map((x)=>this.cloneAttr(x))
        )
        this.addPair(input, output);
        return output;
    }

}

export {ControllerCloner}