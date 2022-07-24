import axios from 'axios';
import { e } from 'mathjs';
import {parseNewEquation} from './load_file'
import {getAllCase, count, getTs, floatEq} from './utility'
enum Operator {
    PLUS,
    MINUS,
    MULTIPLY,
    DEVIDED,
    EQ,
    REVERSED_MINUS,
    REVERSED_DEVIDED,
}

function OPString(op: Operator): string {
    switch (op) {
        case Operator.PLUS:
            return "+";

        case Operator.MINUS:
            return "-";

        case Operator.MULTIPLY:
            return "*";

        case Operator.DEVIDED:
            return "/";

        case Operator.REVERSED_MINUS:
            return "-";

        case Operator.REVERSED_DEVIDED:
            return "/";
        
        case Operator.EQ:
            return "";

        default:
            throw new Error("unexpected operator");
    }
}

function String2OP(opStr: string): Operator {
    switch (opStr) {
        case "+":
            return Operator.PLUS;

        case "-":
            return Operator.MINUS;

        case "*":
            return Operator.MULTIPLY;

        case "/":
            return Operator.DEVIDED;

        default:
            throw new Error("unexpected operator");
    }
}

function OPLevel(op: Operator): number {
    switch (op) {
        case Operator.PLUS:
            return 0;

        case Operator.MINUS:
            return 0;

        case Operator.MULTIPLY:
            return 1;

        case Operator.DEVIDED:
            return 1;

        case Operator.REVERSED_MINUS:
            return 0;

        case Operator.REVERSED_DEVIDED:
            return 1;

        default:
            throw new Error("unexpected operator");
    }
}

interface Value {
    val: any;
    calculate(op: Operator, other: Value): Value;
}

function assert(cond: boolean){
    if(!cond){
        throw 'assert failed';
    }
}

class RawNumber implements Value {
    val: number;
    constructor(_val: number) {
        this.val = _val;
    }
    calculate(op: Operator, other: Value): Value {
        switch (op) {
            case Operator.PLUS:
                return new RawNumber(this.val + other.val);

            case Operator.MINUS:
                return new RawNumber(this.val - other.val);

            case Operator.MULTIPLY:
                return new RawNumber(this.val * other.val);

            case Operator.DEVIDED:
                return new RawNumber(this.val / other.val);
            case Operator.EQ:
                return new RawNumber(this.val)

            case Operator.REVERSED_MINUS:
                return new RawNumber(other.val - this.val);

            case Operator.REVERSED_DEVIDED:
                return new RawNumber(other.val / this.val);

            default:
                return new RawNumber(0);
        }
    }
}

class Attribute {
    name: string;
    val: Value;
    element: SingleElement;
    timestamp: number;
    constructor(_name: string, _val: Value, _element: SingleElement) {
        this.name = _name;
        this.val = _val;
        this.element = _element;
        this.timestamp = getTs();
    }
    
    isSameAttribute(o:Attribute|undefined):boolean{
        return this.name === o?.name
    }
}

enum ElementType {
    CONST, // can not be edited, like two
    BASE, // can be edited, like alpha
    RECTANGLE,
    TMP
}

class SingleElement {
    id: number;
    name?: string;
    type: ElementType;
    attributes: Map<string, Attribute>;
    timestamp: number;
    constructor(_id: number, _type: ElementType, _name?: string) {
        this.id = _id;
        this.type = _type;
        this.name = _name;
        this.attributes = new Map<string, Attribute>();
        this.timestamp = getTs();
    }
    addAttribute(attr: Attribute) {
        this.attributes.set(attr.name, attr);
    }
    getAttribute(name:string):Attribute|undefined{
        return this.attributes.get(name);
    }

    getAttrOrDefault(name:string, dft: Attribute):Attribute{
        let res = this.attributes.get(name);
        if(res == null){
            return dft;
        }
        return res;
    }

    isConflictWithPoint(x: number, y:number):boolean{
        if(this.type === ElementType.CONST || this.type === ElementType.TMP || this.type === ElementType.BASE){
            return false;
        }
        if(this.type === ElementType.RECTANGLE){
            let centerX:number = this.getAttribute('x')?.val?.val;
            let centerY:number = this.getAttribute('y')?.val?.val;
            let w:number = this.getAttribute('w')?.val?.val || 50;
            let h:number = this.getAttribute('h')?.val?.val || 50;
            return Math.abs(centerX - x) <= w/2 && Math.abs(centerY - y) <= h/2;
        }
        return false;
    }
}

const TMP = new SingleElement(-1, ElementType.TMP);


enum AssignOp {
    eq,
    gt,
    lt,
    ge,
    le
}

function assignOpToStr(op: AssignOp): string{
    switch(op){
        case AssignOp.eq:
            return "=";
        case AssignOp.ge:
            return ">=";
        case AssignOp.le:
            return "<=";
        case AssignOp.gt:
            return ">";
        case AssignOp.lt:
            return "<"
    }

    return "??";
}

class Equation {
    leftFunc: FuncTree;
    rightFunc: FuncTree;
    leftArgs: Attribute[];
    rightArgs: Attribute[];
    assignOp: AssignOp;
    timestamp: number;

    constructor(_leftFunc: FuncTree, _rightFunc: FuncTree, _leftArgs: Attribute[], _rightArgs: Attribute[]) {
        this.leftFunc = _leftFunc;
        this.rightFunc = _rightFunc;
        this.leftArgs = _leftArgs;
        this.rightArgs = _rightArgs;
        this.assignOp = AssignOp.eq;

        this.timestamp = getTs();
    }
    // TODO
    judgeEquality() {
    }
    transform(pos: number, target: Attribute): Equation {
        // replace args[pos] with target and return a new Equation
        assert(pos < this.leftArgs.length + this.rightArgs.length);
        // copy args
        let newleftArgs = new Array<Attribute>();
        let newrightArgs = new Array<Attribute>();
        for (let i of this.leftArgs) {
            newleftArgs.push(i)
        }
        for (let i of this.rightArgs) {
            newrightArgs.push(i)
        }
        // choose one side to replace
        let chooseLeftArgs = true;
        if (pos >= this.leftArgs.length) {
            pos -= this.leftArgs.length;
            chooseLeftArgs = false;
        }
        // replace
        let args = chooseLeftArgs ? newleftArgs : newrightArgs;
        args[pos] = target;
        return new Equation(this.leftFunc.deepCopy(), this.rightFunc.deepCopy(), newleftArgs, newrightArgs);
    }
    debug(): string {
        let debugAtFunc = (func: FuncTree, args: Attribute[]): string => {
            let pointer = 0;
            let debugAtNode = (node: OperatorNode): string => {
                let leftout = "";
                let rightout = "";
                if (node.leftNode == null || typeof node.leftNode === "number") {
                    if (args[pointer].element.name != null) {
                        leftout = args[pointer].element.name + "." + args[pointer].name;
                    } else {
                        leftout = args[pointer].name;
                    }
                    pointer++;
                } else {
                    leftout = debugAtNode(node.leftNode);
                    if (OPLevel(node.op) > OPLevel(node.leftNode.op)) {
                        leftout = "(" + leftout + ")";
                    }
                }
                if (node.rightNode == null || typeof node.rightNode === "number") {
                    if(args[pointer] == null){
                        rightout = ""
                    } else if (args[pointer].element.name != null) {
                        rightout = args[pointer].element.name + "." + args[pointer].name;
                    } else {
                        rightout = args[pointer].name;
                    }
                    pointer++;
                } else {
                    rightout = debugAtNode(node.rightNode);
                    if (OPLevel(node.op) > OPLevel(node.rightNode.op)) {
                        rightout = "(" + rightout + ")";
                    }
                }
                if (node.op === Operator.REVERSED_DEVIDED || node.op === Operator.REVERSED_MINUS) {
                    return rightout + " " + OPString(node.op) + " " + leftout;
                } else {
                    return leftout + " " + OPString(node.op) + " " + rightout;
                }
            }
            return debugAtNode(func.root);
        }

        return debugAtFunc(this.leftFunc, this.leftArgs) + assignOpToStr(this.assignOp) + debugAtFunc(this.rightFunc, this.rightArgs);
    }
    convertToVector(attrList: Attribute[]): number[] {
        let leftRes = this.leftFunc.convertToVector(this.leftArgs, attrList);
        let rightRes = this.rightFunc.convertToVector(this.rightArgs, attrList);
        for (let i in leftRes) {
            leftRes[i] -= rightRes[i];
        }
        return leftRes;
    }
    cal_arg_depth(pos: number, side: string): number{
        if(pos < 0){
            return 1;
        }
        let func: FuncTree;
        if (side == "left") {
            func = this.leftFunc;
        } else if (side == "right") {
            func = this.rightFunc;
        } else {
            throw Error("error side");
        }
        let stack: [OperatorNode|undefined, number][] = [];
        this._node_into_stack(func.root, stack, 0);
        let max_depth = 0;
        while(stack.length > 0){
            let crt:[OperatorNode|undefined, number] = stack.pop()!
            if(crt[0] == null){
                if(pos === 0)
                    return crt[1];
                else{
                    pos -= 1;
                    if(crt[1] > max_depth){
                        max_depth += 1;
                    }
                }
            } else {
                this._node_into_stack(crt[0].rightNode, stack, crt[1] + 1);
            }
        }

        return max_depth + 1;

    }
    _node_into_stack(node: OperatorNode|number|undefined, stack: Array<[OperatorNode|undefined, number]>, init_depth: number){
        while(node == null || node instanceof OperatorNode){
            stack.push([node, init_depth]);
            init_depth += 1
            if(node == null){
                break
            }
            node = node.leftNode;
        }
        if(node != null){
            assert(false)
        }
    }
    isAmbiguous(){
        return this.assignOp != AssignOp.eq;
    }
}

class OperatorNode {
    op: Operator;
    leftNode: OperatorNode | number | undefined;
    rightNode: OperatorNode | number | undefined;
    parentNode: OperatorNode | number | undefined; // only for transformation
    constructor(_op: Operator, _leftNode?: OperatorNode, _rightNode?: OperatorNode, _parentNonde?: OperatorNode) {
        this.op = _op;
        this.leftNode = _leftNode;
        this.rightNode = _rightNode;
        this.parentNode = _parentNonde;
    }
}

class FuncTree {
    root: OperatorNode;
    argNum: number;
    constructor(_root: OperatorNode, _argNum: number) {
        this.root = _root;
        this.argNum = _argNum;
    }

    calculate(args: Attribute[]): Value {
        if (args.length < this.argNum) {
            throw new Error("args not enough");
        }
        let pointer = 0;
        let calSubTree = function (rootNode: OperatorNode): Value {
            let leftValue: Value;
            let rightValue: Value;
            if (rootNode.leftNode == null) {
                if(pointer < args.length){
                    leftValue = args[pointer].val;
                } else {
                    leftValue = new RawNumber(0);
                }
                
                pointer++;
            } else {
                leftValue = calSubTree(rootNode.leftNode as OperatorNode);
            }
            if (rootNode.rightNode == null) {
                if(pointer < args.length){
                    rightValue = args[pointer].val;
                } else {
                    rightValue = new RawNumber(0);
                }
                pointer++;
            } else {
                rightValue = calSubTree(rootNode.rightNode as OperatorNode);
            }
            return leftValue.calculate(rootNode.op, rightValue);
        }
        return calSubTree(this.root);
    }

    convertToVector(args: Attribute[], attrList: Attribute[]): number[] {
        // args = [x_1, x_2, y_1, y_2]...
        // attrList = [x_1, y_1, x_2, y_2, alpha]... 返回向量的顺序
        // return [1, 0, ...] len = len(attrList) + 1 最后一位是常数
        // O(len(args) * len(attrList))
        if (args.length < this.argNum) {
            throw new Error("args not enough");
        }
        const retListLength = attrList.length + 1; // 增广矩阵
        let pointer = 0;
        let convertSubTree = function (rootNode: OperatorNode): number[] {
            let leftArray: number[];
            let rightArray: number[];
            if (rootNode.leftNode == null) {
                leftArray = new Array<number>(retListLength).fill(0);
                let leftAttr = args[pointer];
                if (leftAttr.element.type == ElementType.CONST) {
                    leftArray[leftArray.length - 1] = leftAttr.val.val;
                } else {
                    let pos = attrList.indexOf(leftAttr);
                    if (pos >= 0) {
                        leftArray[pos] = 1;
                    }
                }
                pointer++;
            } else {
                leftArray = convertSubTree(rootNode.leftNode as OperatorNode);
            }
            if (rootNode.rightNode == null) {
                rightArray = new Array<number>(retListLength).fill(0);
                let rightAttr = args[pointer];
                if(rightAttr == null){
                    assert(rootNode.op === Operator.EQ)
                } else {
                    if (rightAttr.element.type == ElementType.CONST) {
                        rightArray[rightArray.length - 1] = rightAttr.val.val;
                    } else {
                        let pos = attrList.indexOf(rightAttr);
                        if (pos >= 0) {
                            rightArray[pos] = 1;
                        }
                    }
                    pointer++;
                }
            } else {
                rightArray = convertSubTree(rootNode.rightNode as OperatorNode);
            }
            let containOther = false;
            switch (rootNode.op) {
                case Operator.PLUS:
                    assert(leftArray.length == rightArray.length);
                    for (let i in leftArray) {
                        leftArray[i] += rightArray[i];
                    }
                    return leftArray;
                    
                case Operator.MINUS:
                    assert(leftArray.length == rightArray.length);
                    for (let i in leftArray) {
                        leftArray[i] -= rightArray[i];
                    }
                    return leftArray;
                    
                case Operator.MULTIPLY:
                    assert(leftArray.length == rightArray.length);
                    // rightArray only contain const
                    containOther = false;
                    for (let i = 0; i < rightArray.length - 1; i++) {
                        if (rightArray[i] != 0) {
                            containOther = true;
                            break;
                        }
                    }
                    assert(!containOther);
                    for (let i in leftArray) {
                        leftArray[i] *= rightArray[rightArray.length - 1];
                    }
                    return leftArray;
                    
                case Operator.DEVIDED:
                    assert(leftArray.length == rightArray.length);
                    // rightArray only contain const
                    containOther = false;
                    for (let i = 0; i < rightArray.length - 1; i++) {
                        if (rightArray[i] != 0) {
                            containOther = true;
                            break;
                        }
                    }
                    assert(!containOther);
                    for (let i in leftArray) {
                        leftArray[i] /= rightArray[rightArray.length - 1];
                    }
                    return leftArray;

                case Operator.EQ:
                    return leftArray;

                default:
                    throw Error("should not reach here");
            }
        }
        return convertSubTree(this.root);
    }

    static simpleEq(): FuncTree{
        let opRoot = new OperatorNode(Operator.EQ);
        return new FuncTree(opRoot, 1);
    }

    static simpleAdd(): FuncTree{
        let opRoot = new OperatorNode(Operator.PLUS);
        return new FuncTree(opRoot, 2);
    }

    static simpleMinus(): FuncTree{
        let opRoot = new OperatorNode(Operator.MINUS);
        return new FuncTree(opRoot, 2);
    }

    deepCopy(): FuncTree {
        let newRoot = new OperatorNode(this.root.op);
        let deepCopyAtNode = function (node: OperatorNode): OperatorNode {
            let newNode = new OperatorNode(node.op);
            if (node.leftNode != null) {
                newNode.leftNode = deepCopyAtNode(node.leftNode as OperatorNode);
            }
            if (node.rightNode != null) {
                newNode.rightNode = deepCopyAtNode(node.rightNode as OperatorNode);
            }
            return newNode
        }
        newRoot = deepCopyAtNode(this.root);
        return new FuncTree(newRoot, this.argNum);
    }
}

enum PrioType {
    ALIGN,
    CONST_DIS_ADD,
    CONST_DIS_MINUS,
}
const prioType2Factor:Map<PrioType, number> = new Map();
prioType2Factor.set(PrioType.ALIGN, 1);
prioType2Factor.set(PrioType.CONST_DIS_ADD, 2);
prioType2Factor.set(PrioType.CONST_DIS_MINUS, 2);

const PREDEFINE_DIS = 15+50; // 预设的先验距离。
class PrioResultCandidate{
    eq: Equation;
    type: PrioType;
    ref: Array<Attribute>;
    tgt:Attribute;
    constructor(ref:Array<Attribute>, type: PrioType, tgtAttribute:Attribute, con:Controller){
        this.type = type;
        this.ref = [];
        this.tgt = tgtAttribute;
        switch(type){
            // 这里的写法可能还有问题
            case PrioType.ALIGN:
                this.eq = new Equation(FuncTree.simpleEq(), FuncTree.simpleEq(), [tgtAttribute], [ref[0]]);
                this.ref.push(ref[0]);
                break;
            case PrioType.CONST_DIS_ADD:
                let constAttr = con.getAttribute(0, 'const_dis');
                this.eq = new Equation(FuncTree.simpleEq(), FuncTree.simpleAdd(), [tgtAttribute], [ref[0], constAttr]);
                this.ref.push(ref[0]);
                break;
            case PrioType.CONST_DIS_MINUS:
                let constAttr2 = con.getAttribute(0, 'const_dis');
                this.eq = new Equation(FuncTree.simpleEq(), FuncTree.simpleMinus(), [tgtAttribute], [ref[0], constAttr2]);
                this.ref.push(ref[0]);
                break;
            default:
                this.eq = new Equation(FuncTree.simpleEq(), FuncTree.simpleEq(), [tgtAttribute], [ref[0]]);
                this.ref.push(ref[0]);
                assert(false);
        }
        // this.val = this.rel.func.calculate(this.rel.args);
    }
}
const MAX_POST_DEPTH = 1
class PostResultCandidate {
    oriEq:Equation;
    newEq: Equation
    target: Attribute;  // 这一个新增的
 
    constructor(oriEq: Equation, newEq: Equation, tgtAttr: Attribute){
        this.oriEq = oriEq;
        this.newEq = newEq;
        this.target = tgtAttr;
    }

    calDis(solvedValue=-1){ // 所有的属性都需要计算之后才能够确定，需要额外提供位置
        // 与之前联合考虑的误差不同，仅仅考虑单属性的误差
        // 缺少交叉项的误差
        let allArgs: Attribute[] = [...this.newEq.leftArgs.filter((x)=>(x !== this.target))];
        allArgs.push(... this.newEq.rightArgs.filter((x)=>(x !== this.target)));

        let avgArgTime = allArgs.map((x)=>(x.timestamp)).reduce((pv, cv)=>(pv+cv), 0) / allArgs.length;
        let deltaT = Math.abs(this.target.timestamp - avgArgTime);
        deltaT /= 1000;

        let deltaRelT = Math.abs(this.oriEq.timestamp - this.target.timestamp);
        deltaRelT /= 1000;
        
        let dis = 0;
        if(solvedValue >= 0){
            let nonConstArgsNum = count(allArgs, (item)=>(item.element.id != 0));
            let tgtAttrName = this.target.name;
            let avgAttrInArgs = nonConstArgsNum === 0? 0:allArgs
                        .flatMap((attr)=>(!attr.element.attributes.has(tgtAttrName)? []: [attr.element.getAttribute(tgtAttrName)!.val.val]))
                        .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNum;
            
            dis = Math.abs(avgAttrInArgs - solvedValue) / 100;
        }
        // 没有拓扑距离

        let factor = 1; // 没有多元素关系应用到同一个元素带来的惩罚

        let oriArgs = [...this.oriEq.leftArgs, ...this.oriEq.rightArgs];
        let newArgs = [...this.newEq.leftArgs, ...this.newEq.rightArgs];

        // 仍有前后使用元素数量带来的误差
        let oriEqEle:Set<SingleElement> = new Set(oriArgs.map(x=>x.element));
        let newEqEle: Set<SingleElement> = new Set(newArgs.map(x=>x.element));
        factor *= (1 + Math.abs(oriEqEle.size - newEqEle.size) / Math.min(oriEqEle.size, newEqEle.size))
        return factor * (deltaT + deltaRelT + dis);
    }
}

class Controller {
    elements: Map<number, SingleElement>;
    equations: Equation[];
    idAllocator: number;
    constAllocator: number;

    candidates: Array<[Equation[], Attribute[], number[], number]>;
    crtCdtIdx: number;

    constructor() {
        this.elements = new Map<number, SingleElement>();
        this.equations = [];
        let constElement = new SingleElement(-2, ElementType.CONST, "const");
        this.elements.set(-2, constElement);
        let baseElement = new SingleElement(0, ElementType.BASE, "base");
        this.elements.set(0, baseElement);
        this.idAllocator = 1;
        this.constAllocator = 0;
        this.addAttribute(0, 'const_dis', new RawNumber(PREDEFINE_DIS));

        this.candidates = [];
        this.crtCdtIdx = -1

        this.equations = [];
    }

    getAttributeByStr(s:string): Attribute{
        // x_2 
        let splitRes = s.trim().split('_');
        let _id = parseInt(splitRes[1]);
        let _name = splitRes[0].trim();
        return this.getAttribute(_id, _name);
    }

    getConstAttr(name: string): Attribute{
        return this.getAttribute(0, name);
    }

    createElement(_type: ElementType, _name?: string): number {
        // return element id
        let newElement = new SingleElement(this.idAllocator, _type, _name);
        this.idAllocator++;
        this.elements.set(this.idAllocator - 1, newElement);
        return this.idAllocator - 1;
    }

    deleteElement(id: number):boolean{
        // todo
        return false;
    }

    getElement(_id: number): SingleElement {
        for(let ele of this.elements.values()){
            if(ele.id === _id){
                return ele;
            }
        }
        throw Error("error element");
    }
    
    addAttribute(_id: number, _name: string, _val: Value) {
        let newAttribute = new Attribute(_name, _val, this.elements.get(_id)!);
        this.elements.get(_id)!.addAttribute(newAttribute);
    }

    getAttribute(_id: number, _name: string): Attribute {
        let attr = this.elements.get(_id)!.attributes.get(_name);
        if (attr != undefined) {
            return attr;
        } else {
            throw Error("not this attribute");
        }
    }
    
    addEquation(_eq: Equation){
        this.equations.push(_eq);
    }
    

    genPostCandidate(tgtAttr: Attribute, canDependAttr:Attribute[]):PostResultCandidate[]{
        let genRes:PostResultCandidate[] = [];
        for(let equation of this.equations){
            let possibleTgtIdxLeft: number[] = [];
            equation.leftArgs.forEach((leftAttr, idx)=>{
                if(tgtAttr.isSameAttribute(leftAttr)){
                    possibleTgtIdxLeft.push(idx);
                }
            })
            let possibleTgtIdxRight: number[] = [];
            equation.rightArgs.forEach((rightAttr, idx)=>{
                if(tgtAttr.isSameAttribute(rightAttr)){
                    possibleTgtIdxRight.push(idx);
                }
            })


            let possileReplaceIndex: Array<[number, boolean]> = [];  // idx, isLeft
            
            possileReplaceIndex.push(... possibleTgtIdxLeft.map((x):[number, boolean]=>{return [x, true]}));
            possileReplaceIndex.push(... possibleTgtIdxRight.map((x):[number, boolean]=>{return [x, false]}));
            
            
            // 替换等号左边的某个部分
            for(let tgtAttrPos of possileReplaceIndex){
                let posIndex = tgtAttrPos[0];
                let isLeftPos = tgtAttrPos[1];

                // 左侧的每个位置，可能可以替换成的属性类型
                let leftRes: Array<Attribute[]> = equation.leftArgs.map((oriArg, idx)=>{
                    if(idx === posIndex && isLeftPos){
                        return [tgtAttr];
                    }
                    if(equation.cal_arg_depth(idx, 'left') > MAX_POST_DEPTH){
                        if(canDependAttr.includes(oriArg)){
                            return [oriArg];
                        }

                        return [];
                    }

                    // 返回所有可以替换的属性
                    return canDependAttr.filter((candidateAttr)=>{
                        return candidateAttr.isSameAttribute(oriArg);
                    })
                });

                let rightRes: Array<Attribute[]> = equation.rightArgs.map((oriArg, idx)=>{
                    if(idx === posIndex && !isLeftPos){
                        return [tgtAttr];
                    }
                    if(equation.cal_arg_depth(idx, 'right') > MAX_POST_DEPTH){
                        if(canDependAttr.includes(oriArg)){
                            return [oriArg];
                        }

                        return [];
                    }
                    // 返回所有可以替换的属性
                    return canDependAttr.filter((candidateAttr)=>{
                        return candidateAttr.isSameAttribute(oriArg);
                    })
                })


                let newLeftArgs = getAllCase<Attribute>(leftRes);
                let newRightArgs = getAllCase<Attribute>(rightRes);

                for(let leftArgList of newLeftArgs){
                    for(let rightArgList of newRightArgs){
                        // 生成对应的equation
                        let newEq = new Equation(equation.leftFunc, equation.rightFunc, leftArgList, rightArgList)
                        let pc = new PostResultCandidate(equation, newEq, tgtAttr);
                        genRes.push(pc);
                    }
                }

            }
        }

        genRes = genRes.sort((pc1, pc2)=>{
            let dis1 = pc1.calDis();
            let dis2 = pc2.calDis();
            if(dis1 < dis1){
                return -1;
            } else if(dis1 === dis2){
                return 0;
            }
            return -1;
        })

        // 去重需要后续再去了
        return genRes;
    }

    getAllSameAttr(tgtAttr: Attribute, exceptAttrs: Attribute[]):Attribute[]{
        let res:Attribute[] = [];
        for(let ele of this.elements.values()){ // const 相关也要处理
            ele.attributes.forEach((attr, _name)=>{
                if(tgtAttr.isSameAttribute(attr) && !exceptAttrs.includes(attr)){
                    res.push(attr);
                }
            })
        }
        return res;
    }

    get_all_attributes():Attribute[]{
        let allAttrs: Attribute[] = [];
        this.elements.forEach((ele, id)=>{
            if(id < 0){ // const
                return
            }

            for(let attr of ele.attributes.values()){
                allAttrs.push(attr);
            }
        })

        return allAttrs;
    }

    generate_equation_matrix(attrList: Attribute[], new_equations: Equation[])
    :[number[][], number[], Equation[]]{
        
        // 仅仅对新关系进行了加权
        let eq_matrix: number[][] = [];
        let eq_val: number[] = [];

        for(let equation of this.equations){
            eq_matrix.push(equation.convertToVector(attrList));
            eq_val.push(0); // equation的右侧必然是0
        }

        for(let newEq of new_equations){
            let mat = newEq.convertToVector(attrList);
            // 加权
            mat = mat.map(x=>x * 10000);
            eq_matrix.push(mat.slice(0, -1))
            eq_val.push(0)
        }

        return [eq_matrix, eq_val, [... this.equations, ... new_equations]]
    }

    generate_value_matrix(attrList: Attribute[], 
        new_attr_values: Map<Attribute, number>|null): [number[][], number[]]{
        // 仅对显式给定取值的进行加权
        let A: number[][] = []; // 系数
        let B: number[] = []; // 值

        for(let attr of attrList){
            if(new_attr_values!.has(attr)){
                let crtA = attrList.map((attr1)=>(attr === attr1? 1000000: 0));
                A.push(crtA);
                B.push(new_attr_values!.get(attr)! * 1000000)
            } else {
                let l = 1;
                let crtA = attrList.map((attr1)=>(attr === attr1? 1 / l:0));
                
                A.push(crtA);
                B.push(attr.val.val / l)
            }
        }
        return [A, B]
    }

    async cal_contents(new_attr_values: Map<Attribute, number>, 
        new_equations: Equation[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[])
        : Promise<Array<[Equation[], Attribute[], number[], number]>>{
        // 返回的内容：每一个元素都是一个可能的选项，分别对应于
        // 满足的方程、属性列表、属性取值、误差

        let attrList = this.get_all_attributes();
        let eq_res = this.generate_equation_matrix(attrList, new_equations);
        let val_res = this.generate_value_matrix(attrList, new_attr_values);

        let changedAttrs = new Set(inferChangedAttr);
        let unchangedAttrs = new Set(unchangedAttr);
        let inferUnchangedConst = new Set();

        eq_res[2].forEach((eq, idx)=>{
            // 计算加权内容，根据方程中包含的属性的可变化性来确定
            let involved_attrs = [...eq.leftArgs, ...eq.rightArgs];

            let involve_const = involved_attrs.filter((v)=>{
                return v.element.id <= 0;
            })
            involved_attrs = involved_attrs.filter((v)=>{
                return v.element.id > 0;
            })
            let allChanged = true;
            for(let attr of involved_attrs){
                if(!changedAttrs.has(attr)){
                    allChanged = false;
                    break;
                }
            }

            if(allChanged && involved_attrs.length > 1){ 
                // 简单的赋值关系、赋值常数不会被保留；
                // 只有多属性之间的“关系”才会被保留

                eq_res[0][idx] = eq_res[0][idx].map(x=>x * 100);
                eq_res[1][idx] *= 100;
                involve_const.forEach((v)=>{
                    inferUnchangedConst.add(v);
                })
                return;
            }
            // not all changed 
            let allUnchanged = true;
            for(let attr of involved_attrs){
                if(!unchangedAttrs.has(attr)){
                    allUnchanged = false;
                    break;
                }
            }

            if(allUnchanged  && involved_attrs.length > 1){
                eq_res[0][idx] = eq_res[0][idx].map(x=>x * 100);
                eq_res[1][idx] *= 100;
                involve_const.forEach((v)=>{
                    inferUnchangedConst.add(v);
                })

                return;
            }

        })

        attrList.forEach((attr, idx)=>{
            if(new_attr_values.has(attr)){
                return;
            }

            if(new_attr_values.has(attr)){
                // 用户显式指定已经加权了
                return;
            }

            if(unchangedAttr.includes(attr)){
                val_res[0][idx] = val_res[0][idx].map(x=>x*10000);
                val_res[1][idx] = val_res[1][idx] * 10000;
            } else if(inferChangedAttr.includes(attr)){
                val_res[0][idx] = val_res[0][idx].map(x=>x*0.00001);
                val_res[1][idx] = val_res[1][idx] * 0.00001;
            } else if(inferUnchangedConst.has(attr)){
                // 如果我们倾向于保持关系，也要倾向于保持关系中出现的常量
                val_res[0][idx] = val_res[0][idx].map(x=>x*100);
                val_res[1][idx] = val_res[1][idx] * 100;
            } else if (new_attr_values.size > 0){
                val_res[0][idx] = val_res[0][idx].map(x=>x*0.01);
                val_res[1][idx] = val_res[1][idx] * 0.01;
            }
        })

        
        let res = await axios.post("http://localhost:12345/solve", {
            attr_number: attrList.length,
            rel_coef: eq_res[0],
            rel_res: eq_res[1],
            val_coef: val_res[0],
            val_res: val_res[1]
        })

        console.log(res.data)
        let err: number[] = res.data['err'];
        let newVals: number[][] = res.data['res'];

        let finalResult: [Equation[], Attribute[], number[], number][] = [];

        // 对 newVals去重
        let addedValues: Set<string> = new Set();
        for(let i = 0; i < newVals.length; ++ i){
            let oneGroup = newVals[i];
            let crtErr = err[i];
            let eleAttrVals: number[] = [];
            let element_to_pos:Map<SingleElement, [number, number]> = new Map();
            // 不支持位置的重复
            attrList.forEach((attr, idx)=>{
                if(attr.element.id > 0){
                    eleAttrVals.push(oneGroup[idx]);
                    if(!element_to_pos.has(attr.element)){
                        element_to_pos.set(attr.element, [-1, -1]);
                    }
                    if(attr.name === 'x'){
                        element_to_pos.get(attr.element)![0] = oneGroup[idx];
                    }

                    if(attr.name === 'y'){
                        element_to_pos.get(attr.element)![1] = oneGroup[idx];
                    }
                }
            })

            let occupiedPos: Set<string> = new Set();
            let noPosConflict = true;
            for(let eleInfo of element_to_pos.entries()){
                let pos = eleInfo[1];
                let posId = pos.map(x=>x.toFixed(0)).join('-');
                if(occupiedPos.has(posId)){
                    noPosConflict = false;
                    break;
                }
                occupiedPos.add(posId);
            }

            if(!noPosConflict){
                continue;
            }
            
            let valsId = eleAttrVals.map(v=>v.toFixed(0).toString()).join('-');
            if(addedValues.has(valsId)){
                continue;  // 去重：所有元素的属性相同
            }

            addedValues.add(valsId);

            let newEquations: Equation[] = []; // todo

            finalResult.push([
                newEquations, attrList, oneGroup, crtErr
            ])
        }

        finalResult.sort((x, y)=>{
            if(x[3] < y[3]){
                return -1;
            } else if(x[3] > y[3]){
                return 1;
            }
            return 0;
        })

        let allowGapFactor = 5;

        let resultToKeep = [finalResult[0]];
        let crtError = finalResult[0][3];
        for(let i = 1; i < finalResult.length; ++ i){
            let next = finalResult[i];
            if(next[3] < crtError * allowGapFactor){
                resultToKeep.push(next);
                // crtError = next[3];
            }
        }
        
        return resultToKeep;
    }

    async rowReduce(mat: number[][]): Promise<number[][]>{
        let res = await axios.post('http://localhost:12345/solve', {
            coef: mat
        })

        return res.data['res']
    }

    getFreeIndex(mat: number[][]): [number[], number[], number[]]{
        // constrained：第idx个元素是受限的，当且仅当它是某一行的第一个非0元素
        let allIndexes = [...Array(mat[0].length).keys()];

        let constrained_idx = mat.flatMap((row)=>{
            for(let i = 0; i < row.length; ++ i){
                if(!floatEq(row[i], 0)){
                    return [i];
                }
            }
            return [] // 全0行
        })

        let free_idx = allIndexes.filter((idx)=>{
            for(let cidx of constrained_idx){
                if(floatEq(cidx, idx)){
                    return false;
                }
            }
            return true;
        })

        let canDependIndex = mat.flatMap((row)=>{
            // flatMap 是为了可以返回 []
            // 如果这一行中存在多个非0元素，或者不存在非0元素，都返回空
            let nonZeroIndex = -1;
            for(let i = 0; i < row.length; ++ i){
                let n = row[i];
                if(!floatEq(n, 0)){
                    if(nonZeroIndex >= 0){
                        return []
                    }
                    nonZeroIndex = i;
                }
            }
            if(nonZeroIndex >= 0){
                return [nonZeroIndex];
            }

            return [];
        });  
        // 只有一个元素非0的行中，非0元素所对应的index。
        // 理论上不应该这么严格，但是也可以看作是一种剪枝

        return [constrained_idx, free_idx, canDependIndex];

    }

    async update_contents(new_attr_values: Map<Attribute, number>, 
        new_equations: Equation[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[]){
        
        let res = await this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
        this.candidates = res;
        this.crtCdtIdx = 0;
        // 更新基础的取值
        this.update_attr()
        // todo: 对整体的取值进行更新
        
    }

    update_attr(){
        this.equations = this.candidates[this.crtCdtIdx][0].slice();
        let attrList = this.candidates[this.crtCdtIdx][1];
        let newVals = this.candidates[this.crtCdtIdx][2];
        attrList.forEach((attr, idx)=>{
            let newVal = newVals[idx];
            attr.val.val = newVal;
        })
    }

    nextSolution(){
        this.crtCdtIdx = (this.crtCdtIdx + 1) % this.candidates.length;
        this.update_attr()
    }

    async handleUserCommand(trace: Array<Array<[number, number]>>, traceEleRelation: string, newEleRel: string){
        if(traceEleRelation.includes('new') || newEleRel.includes('new')){
            await this.handleUserAdd(trace, traceEleRelation, newEleRel);
            return;
        }
    }

    async handleUserAdd(RawTraces: Array<Array<[number, number]>>, traceEleRelation: string, newEleEq?: string){
        if(newEleEq == null){
            newEleEq = "";
        }
        
        let nextElementId = this.createElement(ElementType.RECTANGLE);
        this.addAttribute(nextElementId, 'x', new RawNumber(0));
        this.addAttribute(nextElementId, 'y', new RawNumber(0));
        
        let nextElement = this.getElement(nextElementId);
        let xAttr = nextElement.getAttribute('x')!;
        let yAttr = nextElement.getAttribute('y')!;
        
        newEleEq = newEleEq.replaceAll('new', `${nextElementId}`)

        let newEqInExpr = newEleEq.length === 0? []: newEleEq.split(';').map((oneEqStr)=>{
            return parseNewEquation(this, oneEqStr);
        })

        let attrList = this.get_all_attributes()
        // 判断哪些元素需要进行推测，结合现在所有的关系进行判断

        let coef_matrix: number[][] = this.equations.map((eqt)=>{
            return eqt.convertToVector(attrList);
        })

        for(let oneNewEq of newEqInExpr){
            coef_matrix.push(oneNewEq.convertToVector(attrList));
        }

        // 删除其中的基变量
        coef_matrix = coef_matrix.map((coef)=>{
            return coef.filter((_, idx)=>{
                return attrList[idx].element.id > 0;
            })
        })

        let elementAttrList = attrList.filter((attr)=>{
            return attr.element.id > 0;
        })

        let reducedRes = await this.rowReduce(coef_matrix);
        let freeIndexInfo = this.getFreeIndex(reducedRes);
        let freeIndexes = freeIndexInfo[1];
        let canDependentIndexes = freeIndexInfo[2];
        let freeAttrs = freeIndexes.map(idx=>elementAttrList[idx]);
        let canDependAttr = canDependentIndexes.map(idx=>elementAttrList[idx]);

        let postCandidates: Array<PostResultCandidate[]> = freeAttrs.map((attr)=>{
            return  this.genPostCandidate(attr, canDependAttr);  // 
        })

        let allCandidateComb = getAllCase(postCandidates);

        let combCandidate:[Equation[], Attribute[], number[], number][] = []; // 属性列表、属性取值、误差

        for(let candidateComb of allCandidateComb){
            let new_attr_values: Map<Attribute, number> = new Map();
            let new_equations: Equation[] = [...newEqInExpr];
            let unchangedAttr: Attribute[] = [];
            let inferChangedAttr: Attribute[] = []; 
            
            let combErrors = 0;
            for(let oneNewCandidate of candidateComb){
                inferChangedAttr.push(oneNewCandidate.target);
                new_equations.push(oneNewCandidate.newEq);
                combErrors += oneNewCandidate.calDis();
            }

            let cal_res = await this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
            cal_res.forEach((v)=>{
                v[3] += combErrors;
            })

            combCandidate.push(... cal_res)
        }

        
        // 根据模糊的条件来检测最佳的位置
        
        // trace大概有三种形态：点、形状、线。
        
        // x_new = trace0
        let traces = RawTraces.map(rt=>new Trace(rt));

        // 根据预测位置和trace的距离来对距离进行重新加权
        // loss *= (1 + dis)，单次只考虑一个坐标
        for(let oneTraceRel of traceEleRelation.split(';')){
            oneTraceRel = oneTraceRel.trim();
            let splitRes = oneTraceRel.split('='); // 目前先仅考虑通过trace给定位置的
            if(splitRes.length !== 2){
                console.log('不合法的表达 ' + oneTraceRel);
                continue;
            }

            if(!['x_new', 'y_new'].includes(splitRes[0].trim())){
                console.log('不合法的左侧 ' + oneTraceRel);
                continue;
            }

            let tgtAttrIdx = (splitRes[0].trim() === 'x_new')? 0:1;
            let tgtAttr = (splitRes[0].trim() === 'x_new')? xAttr: yAttr;

            let traceIdx = Number(splitRes[1].trim().split('_')[1]);
            if(traceIdx !== traceIdx){
                console.log('不合法的右侧 ' + oneTraceRel);
                continue;
            }

            let trace = traces[traceIdx];
            for(let onePosCandidate of combCandidate){
                let attrList = onePosCandidate[1];
                let attrV = onePosCandidate[2];
                // 加上error的内容
                onePosCandidate[3] *= (1 + Math.abs(trace.center[tgtAttrIdx] - attrV[attrList.indexOf(tgtAttr)]));
            }
        }

        combCandidate = combCandidate.sort((a, b)=>{
            if(a[3] < b[3]){
                return -1;
            } else if(a[3] === b[3]){
                return 0;
            }
            return 1;
        })

        
        // this.attrList = combCandidate[0][0];
        // this.candidateValues = combCandidate.map(x=>x[1]);
        this.crtCdtIdx = 0;

        this.candidates = combCandidate;
        
        // 更新基础的取值
        this.update_attr()
        // todo: 对整体的取值进行更新
    }
}

class Trace{
    rawTrace: Array<[number, number]>;
    center: [number, number];
    constructor(trace: Array<[number, number]>){
        this.rawTrace = trace.map(x=>[x[0], x[1]]);
        this.center = [
            trace.map(x=>x[0]).reduce((p, c)=>(p+c), 0) / trace.length,
            trace.map(x=>x[1]).reduce((p, c)=>(p+c), 0) / trace.length
        ];
    }
}

export { String2OP, Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Attribute, Controller, Equation, AssignOp};
