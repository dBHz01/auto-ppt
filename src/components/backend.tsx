import { typeList } from 'antd/lib/message';
import axios from 'axios';
import { abs, e, max, min, number, sqrt } from 'mathjs';
import { ControllerCloner } from './ControllerCloner';
import {loadFile, parseNewEquation} from './load_file'
import {getAllCase, count, getTs, floatEq, randomID, reduceRowJs, listEq, floatGt, floatGe, floatLe, floatLt, uniquifyList, beamSolve, countTimeStart, countTimeEnd, countTimeFinish} from './utility'

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
    clone(): Value;
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
    clone(): Value {
        return new RawNumber(this.val);
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

class RawText implements Value {
    val: string;
    constructor(_val: string) {
        this.val = _val;
    }
    clone(): Value {
        return new RawText(this.val);
    }
    calculate(op: Operator, other: Value): Value {
        switch (op) {
            case Operator.PLUS:
                return new RawText(this.val + other.val);

            default:
                throw Error("can not calculate raw text.")
        }
    }
}

class RawNumberNoCal implements Value {
    val: any;
    constructor(_val: any) {
        this.val = _val;
    }
    clone(): Value {
        return new RawNumberNoCal(this.val);
    }
    calculate(op: Operator, other: Value): Value {
        throw Error("can not calculate")
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
    CIRCLE,
    ARROW,
    TMP
}



let eleTypeToStr = new Map();
eleTypeToStr.set(ElementType.RECTANGLE, 'RECTANGLE')
eleTypeToStr.set(ElementType.CIRCLE, 'CIRCLE')
eleTypeToStr.set(ElementType.ARROW, 'ARROW')

let str2eleType = new Map();
str2eleType.set('CIRCLE', ElementType.CIRCLE);
str2eleType.set('RECTANGLE', ElementType.RECTANGLE);

const displayElementTypes = [ElementType.RECTANGLE, ElementType.CIRCLE];

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

    copyAttrMap(){
        let res: Map<string, any> =  new Map();
        this.attributes.forEach((v, k)=>{
            res.set(k, v.val.val);
        })

        return res;
    }

    addAttribute(attr: Attribute) {
        this.attributes.set(attr.name, attr);
    }
    getAttribute(name:string):Attribute|undefined{
        return this.attributes.get(name);
    }

    getAttrVal(name: string, dft: any){
        if(this.attributes.has(name)){
            return this.attributes.get(name)?.val.val;
        }
        return dft;
    }
    
    getCertainAttribute(name:string): Attribute {
        let ans = this.attributes.get(name);
        if (ans) {
            return ans;
        } else {
            throw Error("attr not exist");
        }
    }
    
    changeCertainAttribute<T>(name: string, val: T) {
        if(!this.attributes.has(name)){
            this.addAttribute(new Attribute(
                name, new RawNumberNoCal(val), this
            ))
        } else {
            this.getAttribute(name)!.val.val = val;
        }

        if(Controller.getInstance().attrNameToDefault.has(name)){
            Controller.getInstance().attrNameToDefault.set(name, val);
        }
    }

    changeElementType(type: ElementType){
        this.type = type;
        Controller.getInstance().attrNameToDefault.set('elementType', type);
    }

    getAttrOrDefault(name:string, dft: Attribute | null):Attribute|null{
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

    getCorner(): Array<[number, number]> {
        // 从上顺时针8个方向
        switch (this.type) {
            case ElementType.RECTANGLE:
                {let corners: Array<[number, number]> = new Array<[number, number]>();
                let x = this.getAttribute("x")!.val.val;
                let y = this.getAttribute("y")!.val.val;
                let w = this.getAttribute("w")!.val.val;
                let h = this.getAttribute("h")!.val.val;
                corners.push([x, y - h / 2]);
                corners.push([x + w / 2, y - h / 2]);
                corners.push([x + w / 2, y]);
                corners.push([x + w / 2, y + h / 2]);
                corners.push([x, y + h / 2]);
                corners.push([x - w / 2, y + h / 2]);
                corners.push([x - w / 2, y]);
                corners.push([x - w / 2, y - h / 2]);
                return corners;}
            case ElementType.CIRCLE:
                {let corners: Array<[number, number]> = new Array<[number, number]>();
                let x = this.getAttribute("x")!.val.val;
                let y = this.getAttribute("y")!.val.val;
                let w = this.getAttribute("w")!.val.val;
                let h = this.getAttribute("h")!.val.val;
                corners.push([x, y - h / 2]);
                corners.push([x + w / 2 / sqrt(2), y - h / 2/ sqrt(2)]);
                corners.push([x + w / 2, y]);
                corners.push([x + w / 2/ sqrt(2), y + h / 2/ sqrt(2)]);
                corners.push([x, y + h / 2]);
                corners.push([x - w / 2/ sqrt(2), y + h / 2/ sqrt(2)]);
                corners.push([x - w / 2, y]);
                corners.push([x - w / 2/ sqrt(2), y - h / 2/ sqrt(2)]);
                return corners;}
        
            default:
                throw Error("error type");
        }
    }

    changeColor(color: string) {
        // red pink purple blue cyan teal green yellow orange brown grey bluegrey
        assert(displayElementTypes.indexOf(this.type) >= 0);
        this.changeCertainAttribute<String>("color", color);
    }

    changeLightness(lightness: number) {
        // 相对变化 例如 1 表示 +100; -2 表示 -200
        assert(displayElementTypes.indexOf(this.type) >= 0);
        let oriLightness = this.getAttribute("lightness")!.val.val;
        let newLightness = oriLightness + lightness * 100;
        newLightness = newLightness < 0 ? 0 : (newLightness > 900 ? 900 : newLightness);
        this.changeCertainAttribute<String>("lightness", newLightness);
    }

}

const TMP = new SingleElement(-1, ElementType.TMP);


function str2AssignOp(s: string){
    s = s.trim()
    if(s === '='){
        return AssignOp.eq;
    }

    if(s === '>'){
        return AssignOp.gt;
    }

    if(s === '>='){
        return AssignOp.ge;
    }

    if(s === '<'){
        return AssignOp.lt;
    }

    if(s === '<='){
        return AssignOp.le;
    }
}

function sideSwap(op: AssignOp){
    let ops1 = [AssignOp.eq, AssignOp.ge, AssignOp.le, AssignOp.gt, AssignOp.lt]
    let ops2 = [AssignOp.eq, AssignOp.le, AssignOp.ge, AssignOp.lt, AssignOp.gt]

    return ops2[ops1.indexOf(op)];
}

function op2func(op: AssignOp){
    switch(op){
        case AssignOp.eq:
            return (n1: number, n2: number)=>floatEq(n1, n2)
        case AssignOp.gt:
            return (n1: number, n2: number)=>floatGt(n1, n2)
        case AssignOp.ge:
            return (n1: number, n2: number)=>floatGe(n1, n2)
        case AssignOp.lt:
            return (n1: number, n2: number)=>floatLt(n1, n2)
        case AssignOp.le:
            return (n1: number, n2: number)=>floatLe(n1, n2)
    }
}

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

    judgeEquality(attrList: Attribute[], attrVals: number[]):boolean {
        let coef = this.convertToVector(attrList);
        let res = 0;
        for(let i = 0; i < attrVals.length; ++ i){
            res += (coef[i] * attrVals[i])
        }
        switch(this.assignOp){
            case AssignOp.eq:
                return floatEq(res, 0);
            case AssignOp.gt:
                return floatGt(res, 0);
            case AssignOp.ge:
                return floatGe(res, 0);
            case AssignOp.le:
                return floatLe(res, 0);
            case AssignOp.lt:
                return floatLt(res, 0);
        }
        return floatEq(res, 0);
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
                    /*if (args[pointer].element.name != null) {
                        leftout = args[pointer].element.name + "." + args[pointer].name;
                    } else {
                        leftout = args[pointer].name;
                    }*/
                    leftout = args[pointer].name;
                    if(args[pointer].element.id >= 0){
                        leftout += `_${args[pointer].element.id}`
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
                    } /*else if (args[pointer].element.name != null) {
                        rightout = args[pointer].element.name + "." + args[pointer].name;
                    } else {
                        rightout = args[pointer].name;
                    }*/
                    else {
                        rightout = args[pointer].name;
                        if(args[pointer].element.id >= 0){
                            rightout += `_${args[pointer].element.id}`
                        }
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
        return leftRes.slice(0, -1);
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

    clone(){
        let left = this.leftFunc.deepCopy();
        let right = this.rightFunc.deepCopy();
        let leftArgs = [... this.leftArgs];
        let rightArgs = [... this.rightArgs];
        return new Equation(left, right, leftArgs, rightArgs);
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

enum EstimateType {
    CONST_DIS, // 固定距离
    SAME_DIS, // 等距
    HISTORY_EQ, // 历史
    VAL_EQ, // 对齐
}
const estType2Factor:Map<EstimateType, number> = new Map();
estType2Factor.set(EstimateType.CONST_DIS, 4);
estType2Factor.set(EstimateType.HISTORY_EQ, 2);
estType2Factor.set(EstimateType.SAME_DIS, 1);
estType2Factor.set(EstimateType.VAL_EQ, 0.5);

const MAX_POST_DEPTH = 1
class PostResultCandidate {
    oriEq:Equation;
    newEq: Equation;
    target: Attribute;  // 这一个新增的

    val: number;
    type: EstimateType
 
    constructor(oriEq: Equation, newEq: Equation, tgtAttr: Attribute, type?: EstimateType){
        this.oriEq = oriEq;
        this.newEq = newEq;
        this.target = tgtAttr;
        this.val = -1;
        if(type == null){
            this.type = EstimateType.HISTORY_EQ;
        } else {
            this.type = type;
        }
    }

    calDis(tgt_val: number){ // 所有的属性都需要计算之后才能够确定，需要额外提供位置
        if(tgt_val === -1 && this.val > 0){
            tgt_val = this.val;
        }
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
        if(tgt_val>= 0){
            let nonConstArgsNum = count(allArgs, (item)=>(item.element.id != 0));
            let tgtAttrName = this.target.name;
            let avgAttrInArgs = nonConstArgsNum === 0? 0:allArgs
                        .flatMap((attr)=>(!attr.element.attributes.has(tgtAttrName)? []: [attr.element.getAttribute(tgtAttrName)!.val.val]))
                        .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNum;
            
            dis = Math.abs(avgAttrInArgs - tgt_val) / 100;
        }
        // 没有拓扑距离

        let factor = 1; // 没有多元素关系应用到同一个元素带来的惩罚

        let oriArgs = [...this.oriEq.leftArgs, ...this.oriEq.rightArgs];
        let newArgs = [...this.newEq.leftArgs, ...this.newEq.rightArgs];

        // 仍有前后使用元素数量带来的误差
        let oriEqEle: Set<SingleElement> = new Set(oriArgs.map(x=>x.element));
        let newEqEle: Set<SingleElement> = new Set(newArgs.map(x=>x.element));
        factor *= (1 + Math.abs(oriEqEle.size - newEqEle.size) / Math.min(oriEqEle.size, newEqEle.size))
        factor *= (1 + estType2Factor.get(this.type)!); // 后验经验的优先性
        return factor * (deltaT + deltaRelT + dis);
    }

    calValByNewEqOnly(con: Controller){
        let attrList = con.get_all_attributes();
        if(!attrList.includes(this.target)){
            attrList.push(this.target);
        }

        let eqVec = this.newEq.convertToVector(attrList);
        let sum = 0;
        let tgtConf = 0;
        attrList.forEach((attr, idx)=>{
            if(attr === this.target){
                tgtConf = eqVec[idx];
            } else {
                sum += (eqVec[idx] * attr.val.val);
            }
        })

        assert(tgtConf !== 0)
        return - sum / tgtConf;
    }

    calValue(newEquation: Equation[], con: Controller):number{
        if(this.val >= 0){
            return this.val;
        }
        if(newEquation.length === 0){
            this.val = this.calValByNewEqOnly(con)
            return this.val;
        }

        let new_attr_values: Map<Attribute, number> = new Map();
        let new_equations: Equation[] = [...newEquation];
        let unchangedAttr: Attribute[] = 
            [... this.newEq.leftArgs, ... this.newEq.rightArgs].filter((x)=>(x!=this.target));
        let inferChangedAttr: Attribute[] = []; 
        
        
        inferChangedAttr.push(this.target);
        new_equations.push(this.newEq);

        let cal_res = con.cal_contents(new_attr_values, 
            new_equations, unchangedAttr, inferChangedAttr
            , false, false, [this.target]);
        // if(cal_res.length > 1){
        //     console.warn('理论上推测的内容应该可以直接求解')
        // }

        let firstRes = cal_res[0];
        this.val = firstRes[2][firstRes[1].indexOf(this.target)];
        // if(newEquation.length === 0){
        //     assert(floatEq(this.val, this.calValByNewEqOnly(con)))
        // }
        return this.val;

    }
}

class Controller {
    elements: Map<number, SingleElement>;
    equations: Equation[];
    idAllocator: number;
    constAllocator: number;

    candidates: Array<[Equation[], Attribute[], number[], number]>;
    crtCdtIdx: number;

    tmpElement: SingleElement;
    constElement: SingleElement;
    baseElement: SingleElement;

    // constDisAttr: Attribute;

    eventLisnter: Map<string, ((...arg0: any[])=>void)[]>;

    static instance?: Controller = undefined;
    static TYPE_SWITCH_CDT_IDX = 'TYPE_SWITCH_CDT_IDX';
    static clonerStack: ControllerCloner[] = [];
    static crtPointer: number = -1;
    static PREDEFINE_DIS: number = 65;

    nextPosCdtCache?: [number, number, number][];
    attrNameToDefault: Map<string, any>;

    static getInstance(): Controller{
        if(Controller.instance != undefined){
            return Controller.instance;
        }

        Controller.instance = new Controller();
        Controller.saveToStack()

        // loadFile(Controller.instance!, require("./diagram_data/content.json"));
        // Controller.saveToStack()
        
        return Controller.instance!;
    }

    static saveIfSuccess(func:()=>boolean){        
        let res = func();
        if(res){
            Controller.saveToStack()
        }
    }

    static async saveIfSuccessAsync(func:()=>Promise<boolean>){        
        let res = await func();
        if(res){
            Controller.saveToStack()
        }
    }

    static saveToStack(){
        Controller.clonerStack = Controller.clonerStack.slice(0, Controller.crtPointer + 1)
        assert(Controller.crtPointer + 1 === Controller.clonerStack.length)
        Controller.clonerStack.push(new ControllerCloner(Controller.instance!));
        Controller.crtPointer += 1;
    }

    static canUndo(): boolean{
        return Controller.crtPointer > 0;
    }

    static undo(): boolean {
        if(Controller.crtPointer <= 0){
            return false;
        }
        Controller.crtPointer -= 1;
        Controller.clonerStack[Controller.crtPointer].assign();
        return true;
    }

    static canRedo(): boolean{
        return Controller.crtPointer < Controller.clonerStack.length - 1;
    }

    static redo(): boolean{
        if(!Controller.canRedo){
            return false;
        }
        Controller.crtPointer += 1;
        Controller.clonerStack[Controller.crtPointer].assign();
        return true;
    }

    loadDefaultFromFile(task?:string){
        let conf: any = {};
        if(task != undefined){
            conf = require('./default_conf.json')[task] || {};
        }
        this.attrNameToDefault.set('w', conf['w'] || 100)
        this.attrNameToDefault.set('h', conf['h'] || 30)
        this.attrNameToDefault.set('pointerAtBeginning', conf['pointerAtBeginning'] || false)
        this.attrNameToDefault.set('pointerAtEnding', conf['pointerAtEnding'] || true)
        this.attrNameToDefault.set('dashEnabled', conf['dashEnabled'] || false)
        this.attrNameToDefault.set('color', conf['color'] || 'red')
        this.attrNameToDefault.set('lightness', conf['lightness'] || 400)
        this.attrNameToDefault.set('elementType', str2eleType.get(conf['elementType']) || ElementType.RECTANGLE)

        Controller.PREDEFINE_DIS = conf['const_dis'] || 65;
    }

    constructor() {
        this.attrNameToDefault = new Map();
        // this.loadDefaultFromFile('matrix')
        this.loadDefaultFromFile('cube')


        this.elements = new Map<number, SingleElement>();
        this.equations = [];
        this.constElement = new SingleElement(-2, ElementType.CONST, "const");
        this.elements.set(-2, this.constElement);
        this.baseElement = new SingleElement(0, ElementType.BASE, "base");
        this.elements.set(0, this.baseElement);
        this.idAllocator = 1;
        this.constAllocator = 0;
        this.addAttribute(0, 'const_dis', new RawNumber(Controller.PREDEFINE_DIS));
        // this.constDisAttr = this.getAttribute(0, 'const_dis');

        this.candidates = [];
        this.crtCdtIdx = -1

        this.equations = [];

        this.tmpElement = new SingleElement(-3, ElementType.TMP, 'tmp');  // 用于存储一些临时的attribute
        this.eventLisnter = new Map();

        this.nextPosCdtCache = undefined;
    }

    getConstDisAttr(){
        return this.getAttribute(0, 'const_dis');
    }

    getAttributeByStr(s:string): Attribute{
        // x_2 
        let splitRes = s.trim().split('_');
        let _id = parseInt(splitRes[1]);
        let _name = splitRes[0].trim();
        return this.getAttribute(_id, _name);
    }

    parseAttrListByStr(s?: string) : Attribute[]{
        if(s == undefined || s.trim().length === 0){
            return [];
        }

        return s.split(';').map((x)=>this.getAttributeByStr(x));
    }

    getConstAttr(name: string): Attribute{
        return this.getAttribute(0, name);
    }

    searchSimilarByHistory(_type: ElementType, _inAttrs: Attribute[]): SingleElement{
        let ele2SameAttrNum: Map<SingleElement, number> = new Map();
        function getSameValAttrNum(ele: SingleElement): number{
            if(ele2SameAttrNum.has(ele)){
                return ele2SameAttrNum.get(ele)!;
            }
            let count = 0;
            for(let inAttr of _inAttrs){
                let eleAttr = ele.getAttribute(inAttr.name);
                if(eleAttr == undefined){
                    continue;
                }
                if(eleAttr.val.val === inAttr.val.val){
                    count += 1;
                }
            }
            ele2SameAttrNum.set(ele, count);
            return count;
        }
        // 完全根据时间
        let eles = [... this.elements.values()].filter((x)=>x.id > 0 && x.type != ElementType.ARROW && (_type == null || x.type === _type)).sort((ele1, ele2)=>{
            let s1 = getSameValAttrNum(ele1);
            let s2 = getSameValAttrNum(ele2);
            if(s1 != s2){
                return s2 - s1;
            }
            return ele2.timestamp - ele1.timestamp;
        })
        return eles[0];
        
    }

    createElement(_type: ElementType, _name?: string, _text?: string): number {
        // return element id
        let newElement = new SingleElement(this.idAllocator, _type, _name);
        // 如果是实际元素需要建立坐标、长宽、颜色
        if (displayElementTypes.indexOf(_type) >= 0){
            newElement.addAttribute(new Attribute("x", new RawNumber(100), newElement));
            newElement.addAttribute(new Attribute("y", new RawNumber(100), newElement));
            let searchAttr = [];
            if(_text != undefined){
                let textAttr = new Attribute("text", new RawText(_text), newElement)
                newElement.addAttribute(textAttr);
                searchAttr.push(textAttr);
            }
            let mostSimilarEle = this.searchSimilarByHistory(_type, searchAttr);
            
            for(let attrName of ["w", "h", "color", "lightness"]){
                if(newElement.getAttribute(attrName) !== undefined){
                    continue;
                }
                if(mostSimilarEle == undefined || mostSimilarEle.getAttribute(attrName) == undefined){
                    let attrVal = this.attrNameToDefault.get(attrName);
                    if(typeof(attrVal) === 'number'){
                        newElement.addAttribute(new Attribute(attrName, new RawNumberNoCal(attrVal), newElement));
                    } else {
                        newElement.addAttribute(new Attribute(attrName, new RawText(attrVal), newElement));
                    }
                } else {
                    newElement.addAttribute(new Attribute(attrName, mostSimilarEle.getAttribute(attrName)!.val.clone(), newElement));
                }
            }

        }
        if(_type === ElementType.ARROW){
            newElement.addAttribute(new Attribute('pointerAtBeginning', new RawNumberNoCal(this.attrNameToDefault.get('pointerAtBeginning')), newElement));
            newElement.addAttribute(new Attribute('pointerAtBeginning', new RawNumberNoCal(this.attrNameToDefault.get('pointerAtEnding')), newElement));
            newElement.addAttribute(new Attribute('dashEnabled', new RawNumberNoCal(this.attrNameToDefault.get('dashEnabled')), newElement));
        }
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
        if(this.attrNameToDefault.has(_name)){
            this.attrNameToDefault.set(_name, _val.val);
        }
    }

    getAttribute(_id: number, _name: string): Attribute {
        let attr = this.elements.get(_id)!.attributes.get(_name);
        if (attr != undefined) {
            return attr;
        } else {
            throw Error("not this attribute");
        }
    }

    addArrow(_from: number, _to: number, _text?: string) {
        let fromElement = this.getElement(_from);
        let toElement = this.getElement(_to);
        let newArrow = this.getElement(this.createElement(ElementType.ARROW, `arrow-${fromElement.name}-${toElement.name}`));
        newArrow.addAttribute(new Attribute("startElement", new RawNumberNoCal(_from), newArrow));
        newArrow.addAttribute(new Attribute("endElement", new RawNumberNoCal(_to), newArrow));
        newArrow.addAttribute(new Attribute('pointerAtBeginning', new RawNumberNoCal(this.attrNameToDefault.get('pointerAtBeginning')), newArrow));
        newArrow.addAttribute(new Attribute('pointerAtEnding', new RawNumberNoCal(this.attrNameToDefault.get('pointerAtEnding')), newArrow));
        newArrow.addAttribute(new Attribute('dashEnabled', new RawNumberNoCal(this.attrNameToDefault.get('dashEnabled')), newArrow));
        if (_text) {
            newArrow.addAttribute(new Attribute("text", new RawText(_text), newArrow));
        }
    }

    deleteArrow(eleId: number){
        let ele = this.getElement(eleId);
        if(ele.type !== ElementType.ARROW){
            return false;
        }

        this.elements.delete(eleId);
        return true;
    }

    addTextToEle(tgt: number, text: string){
        let tgtEle = this.elements.get(tgt);
        tgtEle?.attributes.set("text", 
            new Attribute("text", new RawText(text), tgtEle));

    }
    
    addEquation(_eq: Equation){
        this.equations.push(_eq);
    }

    updateValsByEquations(){
        let attrList = this.get_all_attributes()
        let eq_mat = this.generate_equation_matrix(attrList, []);
        // console.log(eq_mat);
        // console.log(attrList);
        // console.log(this.equations);
        let eq_coef = eq_mat[0];
        let eq_v = eq_mat[1];
        let baseAttrs = attrList.filter((x)=>(x.element.id <= 0));
        let v_coef: number[][] = [];
        let v_v: number[] = [];
        for(let baseAttr of baseAttrs){
            v_coef.push(attrList.map((attr)=>{
                return attr === baseAttr? 1: 0;
            }))
            v_v.push(baseAttr.val.val);
        }

        // let res = await axios.post(`http://${IP}:12345/solve`, {
        //     attr_number: attrList.length,
        //     rel_coef: eq_coef,
        //     rel_res: eq_v,
        //     val_coef: v_coef,
        //     val_res: v_v
        // })

        let res = beamSolve(eq_coef, eq_v, v_coef, v_v);

        if(res.data['res'].length > 1){
            console.warn('错误！方程应该可以直接求解')
        }

        let attrValues: number[] = res.data['res'][0];
        attrList.forEach((attr, idx)=>{
            attr.val.val = attrValues[idx];
        })
    }

    anyEleBetween(val1: number, val2: number, allAttrs: Attribute[], isX: boolean){
        let attrName = isX? 'x': 'y';
        
        let vals = allAttrs.flatMap((attr)=>{
            if(attr.name === attrName){
                return [attr.val.val];
            }
            return [];
        })

        let min_val = min(val1, val2);
        let max_val = max(val1, val2);

        for(let val of vals){
            if(floatLe(val, min_val) || floatGe(val, max_val)){
                continue;
            } else
                return true;
        }

        return false;
    }

    genPrioCandidate(tgtAttr: Attribute, canDependAttr:Attribute[]):PostResultCandidate[]{
        // 先验经验
        // 1. 对齐
        // 2. 等距。仅考虑跨模态（x/y）的等距关系
        // 3. 给定的距离。
        let genRes:PostResultCandidate[] = [];
        // 对齐，直接和相同属性的attr进行相等
        canDependAttr.forEach((oneAttr)=>{
            if(oneAttr.name !== tgtAttr.name){
                return;
            }

            let eq = new Equation(FuncTree.simpleEq(), FuncTree.simpleEq(),
                [tgtAttr], [oneAttr])
            let pc = new PostResultCandidate(eq, eq, tgtAttr, EstimateType.VAL_EQ);
            pc.val = oneAttr.val.val;
            genRes.push(pc); // 之后可以再进行去重的
        })

        // 确定可用的等距方案：元素之间没有任何其他的属性
        let xAttrs = canDependAttr.filter((x)=>(x.name==='x'))
            .sort((a, b)=>(a.element.id - b.element.id));

        xAttrs = uniquifyList(xAttrs, x=>x.val.val.toFixed(2));
        xAttrs.sort((a, b)=>(b.val.val-a.val.val));  // 大小逆序排序
        

        let yAttrs = canDependAttr.filter((x)=>(x.name==='y'))
            .sort((a, b)=>(a.element.id - b.element.id));
        yAttrs = uniquifyList(yAttrs, x=>x.val.val.toFixed(2));
        yAttrs.sort((a, b)=>(b.val.val-a.val.val));

        let xAttrPairs: [Attribute, Attribute][] = [];
        for(let i = 0; i < xAttrs.length; ++ i){
            for(let j = i + 1; j < xAttrs.length; ++ j){
                if(this.anyEleBetween(xAttrs[i].val.val, xAttrs[j].val.val, canDependAttr, true)){
                    continue;
                }

                xAttrPairs.push([xAttrs[i], xAttrs[j]]);
                xAttrPairs.push([xAttrs[j], xAttrs[i]]); // 两种顺序
            }
        }

        let yAttrPairs: [Attribute, Attribute][] = [];
        for(let i = 0; i < yAttrs.length; ++ i){
            for(let j = i + 1; j < yAttrs.length; ++ j){
                if(this.anyEleBetween(yAttrs[i].val.val, yAttrs[j].val.val, canDependAttr, false)){
                    continue;
                }
                yAttrPairs.push([yAttrs[i], yAttrs[j]]); 
                yAttrPairs.push([yAttrs[j], yAttrs[i]]); // 两种顺序
            }
        }

        // 等距，其实是居中
        let candidatePairs = tgtAttr.name === 'x'? xAttrPairs: yAttrPairs;
        for(let pair of candidatePairs){
            let attr1 = pair[0];
            let attr2 = pair[1];
            // tgt - attr1 = attr2 - tgt
            let nextVal = (attr1.val.val + attr2.val.val) / 2;
            let eq = new Equation(FuncTree.simpleMinus(), 
                    FuncTree.simpleMinus(), [tgtAttr, attr1], [attr2, tgtAttr]);
            let crtPrio = new PostResultCandidate(eq, eq, tgtAttr, EstimateType.SAME_DIS);
            crtPrio.val = nextVal;

            genRes.push(crtPrio);
        }

        for(let pair of [... xAttrPairs, ... yAttrPairs]){
            let attr1 = pair[0];
            let attr2 = pair[1];

            for(let dependAttr of canDependAttr){
                if(dependAttr.name !== tgtAttr.name){
                    continue;
                }

                // tgt - depend  = attr1 - attr2  1 & 2 的顺序在前面已经处理过了
                let nextVal = attr1.val.val - attr2.val.val + dependAttr.val.val;
                if(nextVal < 0){
                    continue;
                }

                // 剪枝1：必须有重叠的元素，或者depend attr至少和两个元素中的一个是没有中间元素的
                if(dependAttr.element !== attr1.element && dependAttr.element !== attr2.element
                    && tgtAttr.element !== attr1.element && tgtAttr.element !== attr2.element){
                    if(dependAttr.name !== attr1.name){
                        continue; // 属性不同要求必须有重复的元素
                    }
                    let anyBetweenD1 = this.anyEleBetween(dependAttr.val.val, attr1.val.val, canDependAttr, dependAttr.name === 'x');
                    let anyBetweenD2 = this.anyEleBetween(dependAttr.val.val, attr2.val.val, canDependAttr, dependAttr.name === 'x');
                    if(anyBetweenD1 && anyBetweenD2){
                        continue;
                    }
                }

                // 剪枝2：中间不能有新的元素（否则大概率可以用其他方法完成）
                if(this.anyEleBetween(nextVal, dependAttr.val.val, canDependAttr, tgtAttr.name === 'x')){
                    continue;
                }

                // 剪枝3，排除简单的相等情况
                if(dependAttr === attr2){
                    continue
                }

                let eq = new Equation(FuncTree.simpleMinus(), 
                    FuncTree.simpleMinus(), [tgtAttr, dependAttr], [attr1, attr2]);
                let crtPrio = new PostResultCandidate(eq, eq, tgtAttr, EstimateType.SAME_DIS);
                crtPrio.val = nextVal;

                genRes.push(crtPrio);
            }
        }


        // 设置一些给定的距离
        // 只有在边缘的元素才会被使用（加上给定距离之后，超过所有的现有元素）
        let dependAttrSameName = canDependAttr.filter((x)=>(x.name === tgtAttr.name))
        if(dependAttrSameName.length > 0){
                let dependValSameName = dependAttrSameName.map((x)=>x.val.val);
            let crtMin = min(dependValSameName)
            let crtMax = max(dependValSameName);
            for(let dependAttr of dependAttrSameName){
                let minusRes = dependAttr.val.val - this.getConstDisAttr().val.val;
                if(minusRes > 0 && minusRes < crtMin){
                    let minusEq = new Equation(FuncTree.simpleEq(), FuncTree.simpleMinus(), 
                        [tgtAttr], [dependAttr, this.getConstDisAttr()]);
                    let minusCdt = new PostResultCandidate(minusEq, minusEq, tgtAttr, EstimateType.CONST_DIS);
                    minusCdt.val = minusRes;
                    genRes.push(minusCdt);
                }

                let plusRes = dependAttr.val.val + this.getConstDisAttr().val.val;
                if(plusRes > crtMax){
                    let plusEq = new Equation(FuncTree.simpleEq(), FuncTree.simpleAdd(), 
                        [tgtAttr], [dependAttr, this.getConstDisAttr()]);
                    let plusCdt = new PostResultCandidate(plusEq, plusEq, tgtAttr, EstimateType.CONST_DIS);
                    plusCdt.val = plusRes;
                    genRes.push(plusCdt);
                }
            }
        }

        genRes.sort((a, b)=>(a.calDis(-1)-b.calDis(-1)))
        genRes = uniquifyList(genRes, (x)=>x.val);
        return genRes;
    }
    
    genPostCandidate(tgtAttr: Attribute, canDependAttr:Attribute[], userGivenNewEq: Equation[]):PostResultCandidate[]{
        countTimeFinish('beamSolve')
        let genRes:PostResultCandidate[] = [];
        for(let equation of this.equations){
            let possibleTgtIdxLeft: number[] = [];
            equation.leftArgs.forEach((leftAttr, idx)=>{
                if(tgtAttr.isSameAttribute(leftAttr)){
                    if(equation.cal_arg_depth(idx, 'left') > MAX_POST_DEPTH){
                        return;
                    }
                    possibleTgtIdxLeft.push(idx);
                }
            })
            let possibleTgtIdxRight: number[] = [];
            equation.rightArgs.forEach((rightAttr, idx)=>{
                if(tgtAttr.isSameAttribute(rightAttr)){
                    if(equation.cal_arg_depth(idx, 'right') > MAX_POST_DEPTH){
                        return;
                    }
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

                let allOriAttrs: Set<Attribute> = new Set([... equation.leftArgs, ... equation.rightArgs]);

                for(let leftArgList of newLeftArgs){
                    for(let rightArgList of newRightArgs){
                        // 生成对应的equation
                        let allNewAttrs = new Set([... leftArgList, ...rightArgList]);
                        if(allOriAttrs.size != allNewAttrs.size){
                            continue;
                        }
                        let newEq = new Equation(equation.leftFunc, equation.rightFunc, leftArgList, rightArgList)
                        let pc = new PostResultCandidate(equation, newEq, tgtAttr);
                        pc.calValue(userGivenNewEq, this);
                        genRes.push(pc);
                    }
                }

            }
        }

        let timeResultSolve = countTimeFinish('beamSolve')
        console.log(timeResultSolve)

        genRes = genRes.sort((pc1, pc2)=>{
            let dis1 = pc1.calDis(-1);
            let dis2 = pc2.calDis(-1);
            if(dis1 < dis1){
                return -1;
            } else if(dis1 === dis2){
                return 0;
            }
            return -1;
        })

        let vals:Set<string> = new Set();
        let finalRes: PostResultCandidate[] = [];
        for(let pc of genRes){
            if(!vals.has(pc.val.toFixed(2))){
                finalRes.push(pc);
                vals.add(pc.val.toFixed(2));
            }
        }

        // 去重需要后续再去了
        return finalRes;
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
            if(id < 0){ // const or tmp
                return
            }

            for(let attr of ele.attributes.values()){
                // skip text
                if (attr.val instanceof RawText || attr.val instanceof RawNumberNoCal) {
                    continue;
                }
                allAttrs.push(attr);
            }
        })

        return allAttrs;
    }


    get_all_val_const_attr():Attribute[] {
        let allAttrs: Attribute[] = [];
        this.elements.forEach((ele, id)=>{
            if(id >= 0){ // const
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
            eq_matrix.push(mat)
            eq_val.push(0)
        }

        return [eq_matrix, eq_val, [... this.equations, ... new_equations]]
    }

    generate_value_matrix(attrList: Attribute[], 
        new_attr_values: Map<Attribute, number>|null,
        inferChangedAttr: Attribute[]|null): [number[][], number[]]{
        if(inferChangedAttr == null){
            inferChangedAttr = [];
        }
        
            // 仅对显式给定取值的进行加权
        let A: number[][] = []; // 系数
        let B: number[] = []; // 值

        for(let attr of attrList){
            if(new_attr_values!.has(attr)){
                let crtA = attrList.map((attr1)=>(attr === attr1? 1000000: 0));
                A.push(crtA);
                B.push(new_attr_values!.get(attr)! * 1000000)
            } else {
                if(inferChangedAttr.includes(attr)){
                    // continue;
                }
                let l = inferChangedAttr.includes(attr)? 1000000: 1;
                let crtA = attrList.map((attr1)=>(attr === attr1? (1 / l):0));
                
                A.push(crtA);
                B.push(attr.val.val / l)
            }
        }
        return [A, B]
    }

    cal_contents(new_attr_values: Map<Attribute, number>, 
        new_equations: Equation[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[],
        applyFilter=true,
        outputEq=true,
        extra_attrs: Attribute[]=[])
        : Array<[Equation[], Attribute[], number[], number]>{
        // 返回的内容：每一个元素都是一个可能的选项，分别对应于
        // 满足的方程、属性列表、属性取值、误差

        let attrList = this.get_all_attributes();
        for(let a of extra_attrs){
            if(!attrList.includes(a)){
                attrList.push(a);
            }
        }
        attrList.forEach((attr)=>{
            if(attr.val.val <= 0 && !inferChangedAttr.includes(attr)){
                inferChangedAttr.push(attr)
            }
        })

        let eq_res = this.generate_equation_matrix(attrList, new_equations);
        let val_res = this.generate_value_matrix(attrList, new_attr_values, inferChangedAttr);
        let rel_keep_idx = new_equations.map((x)=>eq_res[2].indexOf(x));
        let rel_ignore_idx: number[] = [] // 暂时不包含
        let val_keep_idx = unchangedAttr.map((x)=>attrList.indexOf(x));
        let val_ignore_idx = inferChangedAttr.map((x)=>attrList.indexOf(x));

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
                // val_res[0][idx] = val_res[0][idx].map(x=>x*0.00001);
                // val_res[1][idx] = val_res[1][idx] * 0.00001;
                // 在生成向量的时候，已经将对应的删除了
            } else if(inferUnchangedConst.has(attr)){
                // 如果我们倾向于保持关系，也要倾向于保持关系中出现的常量
                val_res[0][idx] = val_res[0][idx].map(x=>x*100);
                val_res[1][idx] = val_res[1][idx] * 100;
            } else if (new_attr_values.size > 0){
                val_res[0][idx] = val_res[0][idx].map(x=>x*0.01);
                val_res[1][idx] = val_res[1][idx] * 0.01;
            }
        })

        
        /*let res = await axios.post(`http://${IP}:12345/solve`, {
            attr_number: attrList.length,
            rel_coef: eq_res[0],
            rel_res: eq_res[1],
            val_coef: val_res[0],
            val_res: val_res[1],
            rel_keep_idx,
            rel_ignore_idx,
            val_keep_idx,
            val_ignore_idx,
        })*/

        
        let res = beamSolve(eq_res[0], eq_res[1],val_res[0],val_res[1],
            rel_keep_idx, rel_ignore_idx, val_keep_idx, val_ignore_idx)
        // console.log(res.data)
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

            let posInvalid = false;
            attrList.forEach((attr, idx)=>{
                if(attr.element.id > 0){
                    eleAttrVals.push(oneGroup[idx]);
                    if(!element_to_pos.has(attr.element)){
                        element_to_pos.set(attr.element, [-1, -1]);
                    }
                    if(attr.name === 'x'){
                        element_to_pos.get(attr.element)![0] = oneGroup[idx];
                        if(oneGroup[idx] < 0){
                            posInvalid = true;
                        }
                    }

                    if(attr.name === 'y'){
                        element_to_pos.get(attr.element)![1] = oneGroup[idx];
                        if(oneGroup[idx] < 0){
                            posInvalid = true;
                        }
                    }
                }
            })

            if(posInvalid && applyFilter){
                continue;
            }

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

            if(applyFilter && !noPosConflict){
                continue;
            }
            
            let valsId = eleAttrVals.map(v=>v.toFixed(0).toString()).join('-');
            if(applyFilter && addedValues.has(valsId)){
                continue;  // 去重：所有元素的属性相同
            }

            addedValues.add(valsId);

            let newEquations: Equation[] = [];
            if(outputEq) {
                newEquations = [... this.equations, ...new_equations].filter((eq)=>{
                    return eq.judgeEquality(attrList, oneGroup);
                })
                let freeAttrInfo = this.getFreeAttrInfo(attrList, newEquations);
                freeAttrInfo[1].forEach((attr)=>{
                    let v = oneGroup[attrList.indexOf(attr)];
                    let tmpAttr = new Attribute(randomID(), new RawNumber(v), this.tmpElement);
                    this.tmpElement.addAttribute(tmpAttr);
    
                    let newEq = new Equation(FuncTree.simpleEq(), FuncTree.simpleEq(), 
                        [attr], [tmpAttr])
                    newEquations.push(newEq);
                })
            }

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

        return finalResult;

        if(finalResult.length === 0){
            return finalResult;
        }

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

    rowReduce(mat: number[][]): number[][]{
        // let resPy = await axios.post('http://localhost:12345/row_reduction', {
        //     coef: mat
        // })

        // let res = resPy.data['res'];
        let resJS = reduceRowJs(mat);
        // if(!listEq(res, resJS)){
        //     console.warn('js 版本的行消去是错误的。。。')
        // }

        // return res;
        return resJS;
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

    update_contents(new_attr_values: Map<Attribute, number>, 
        new_equations: Equation[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[]){
        
        let res = this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
        this.candidates = res;
        this.crtCdtIdx = 0;
        // 更新基础的取值
        this.update_attr()
        return true;
        // todo: 对整体的取值进行更新
    }

    update_attr(){
        this.equations = this.candidates[this.crtCdtIdx][0].map((eq)=>(eq.clone()));
        // 将所有的equation中的临时内容全部替换
        for(let i = 0; i < this.equations.length; ++ i){
            let crtEq = this.equations[i];
            let attrInfo: Array<[Attribute, number, boolean]> = 
                [... crtEq.leftArgs.map((x, idx):[Attribute, number, boolean]=>([x, idx, true])),
                ... crtEq.rightArgs.map((x, idx):[Attribute, number, boolean]=>([x, idx, false]))]
            attrInfo.forEach((attrInfo)=>{
                let attr = attrInfo[0];
                let idx = attrInfo[1];
                let isLeft = attrInfo[2];

                if(attr.element === this.tmpElement){
                    let attr_name = attr.name;
                    let attrInBase = this.baseElement.getAttrOrDefault(attr_name, null);
                    if(attrInBase == null){
                        attrInBase = new Attribute(attr_name, new RawNumber(attr.val.val), this.baseElement);
                        this.baseElement.addAttribute(attrInBase);
                    }

                    if(isLeft){
                        crtEq.leftArgs[idx] = attrInBase; // 替换成实际的attr
                    } else {
                        crtEq.rightArgs[idx] = attrInBase;
                    }
                } else if(attr.element === this.baseElement){
                    // 检查对应的element是否存在于主内容中
                    if(attr !== this.baseElement.getAttrOrDefault(attr.name, null)){
                        console.warn("baseElement的属性不在它的属性列表里。");
                        this.baseElement.addAttribute(attr);
                    }
                }
            })
            
        }
        
        // 检查现在的baseAttr中不再在equation中使用的；并将其删除
        let usedBaseAttrNames: Set<string> = new Set([this.getConstDisAttr().name]);
        this.equations.forEach((eq)=>{
            [... eq.leftArgs, ...eq.rightArgs].forEach((attr)=>{
                if(attr.element === this.baseElement){
                    usedBaseAttrNames.add(attr.name)
                }
                if(attr.element === this.tmpElement){
                    console.warn("为什么还有临时元素呢？？");
                }
            })
        })

        let attr_name_to_delete = [];
        for(let one_name of this.baseElement.attributes.keys()){
            if(!usedBaseAttrNames.has(one_name)){
                attr_name_to_delete.push(one_name);
            }
        }

        attr_name_to_delete.forEach((attrName)=>{
            this.baseElement.attributes.delete(attrName); // 删除不再使用的baseAttr
        })
        
        let attrList = this.candidates[this.crtCdtIdx][1]; 
        // 新增的attr不在这里面；已经在上面添加的时候设置属性了
        // 已经被删除attr会在这里面，但是重新赋值也没有影响
        let newVals = this.candidates[this.crtCdtIdx][2];
        attrList.forEach((attr, idx)=>{
            let newVal = newVals[idx];
            attr.val.val = newVal;
        })


        this.eventLisnter.get(Controller.TYPE_SWITCH_CDT_IDX)?.forEach((cb)=>{
            cb(this.crtCdtIdx); 
        })

        this.nextPosCdtCache = undefined;
    }

    add_switch_cdt_idx_listener(cb: (idx:number)=>void){
        if(!this.eventLisnter.has(Controller.TYPE_SWITCH_CDT_IDX)){
            this.eventLisnter.set(Controller.TYPE_SWITCH_CDT_IDX, []);
        }

        this.eventLisnter.get(Controller.TYPE_SWITCH_CDT_IDX)!.push(cb);
    }

    nextSolution(){
        // 计算下一步中所有baseAttr的名字
        this.crtCdtIdx = (this.crtCdtIdx + 1) % this.candidates.length;
        this.update_attr()
    }

    handleUserCommand(
        trace: Array<Array<[number, number]>>, 
        traceEleRelation: string, 
        newEleRel: string,
        newEleRange: string,
        forceUnchangeStr:string,
        inferChangeStr:string,
        newEleText: string): boolean{
        
        if(traceEleRelation.includes('new') 
            || newEleRel.includes('new')
            || newEleRange.includes('new') || 
            (traceEleRelation.length + newEleRel.length + newEleRange.length === 0 )){
            return this.handleUserAdd(trace, traceEleRelation, newEleRel, newEleRange, newEleText);
        }

        return this.handleUserModify(newEleRel, forceUnchangeStr, inferChangeStr, 
            newEleRange, trace, traceEleRelation);
    }

    isValid(attrList: Attribute[], attrValues:  number[]){
        let ele2pos: Map<SingleElement, [number, number]> = new Map();
        attrList.forEach((attr, idx)=>{
            let ele = attr.element;
            if(ele.id <= 0){
                return;
            }

            if(!ele2pos.has(ele)){
                ele2pos.set(ele, [-1, -1])
            }

            if(attr.name === 'x'){
                ele2pos.get(ele)![0] = attrValues[idx];
            }

            if(attr.name === 'y'){
                ele2pos.get(ele)![1] = attrValues[idx];
            }
        })

        let posOccupy = new Set();
        ele2pos.forEach((v)=>{
            posOccupy.add(`${v[0].toFixed(0)}-${v[1].toFixed(1)}`);
        })

        return ele2pos.size === posOccupy.size;
    }

    getFreeAttrInfo(attrList: Attribute[], equations: Equation[]):
     [Attribute[], Attribute[], Attribute[]]{
        let coef_matrix: number[][] = equations.map((eqt)=>{
            return eqt.convertToVector(attrList);
        })

        coef_matrix = coef_matrix.map((coef)=>{
            return coef.filter((_, idx)=>{
                return attrList[idx].element.id > 0;
            })
        })

        let elementAttrList = attrList.filter((attr)=>{
            return attr.element.id > 0;
        })

        if(coef_matrix.length === 0){
            return [[], elementAttrList, []]
        }

        let reducedRes = this.rowReduce(coef_matrix);
        let freeIndexInfo = this.getFreeIndex(reducedRes);

        return [
            freeIndexInfo[0].map((x)=>(elementAttrList[x])),
            freeIndexInfo[1].map((x)=>(elementAttrList[x])),
            freeIndexInfo[2].map((x)=>(elementAttrList[x])),
        ]
    }

    handleUserAdd(RawTraces: Array<Array<[number, number]>>, 
        traceEleRelation: string, newEleEq: string,
        newEleRange:string, newEleText: string): boolean{

        let traces = RawTraces.map(rt=>new Trace(rt));

        let nextElementId = this.createElement(
            this.attrNameToDefault.get('elementType'),
            undefined, newEleText
            ); // 后续接受更多内容
        this.addAttribute(nextElementId, 'x', new RawNumber(-1));
        this.addAttribute(nextElementId, 'y', new RawNumber(-1));
        
        let nextElement = this.getElement(nextElementId);
        nextElement.name = `${nextElementId}`
        let xAttr = nextElement.getAttribute('x')!;
        let yAttr = nextElement.getAttribute('y')!;
        
        newEleEq = newEleEq.replaceAll('new', `${nextElementId}`)
        newEleRange = newEleRange.replaceAll('new', `${nextElementId}`)
        traceEleRelation = traceEleRelation.replaceAll('new', `${nextElementId}`)
        
        let traceRelations: TraceAttrRelation[] = [];
        if(traceEleRelation.length > 0){
            traceRelations = traceEleRelation.split(';').map((x)=>{
                return new TraceAttrRelation(this, traces, x);
            })
        }
        
        
        let newEqInExpr = newEleEq.length === 0? []: newEleEq.split(';').map((oneEqStr)=>{
            return parseNewEquation(this, oneEqStr);
        })

        let newRangeInExpr = newEleRange.length === 0? []: newEleRange.split(';').map((oneRangeStr)=>{
            return parseNewEquation(this, oneRangeStr);
        }).filter((range)=>{
            if(range.assignOp === AssignOp.eq){
                console.warn('忽略等于关系')
                return false;
            }

            let newAttrInvolved = [... range.leftArgs, ... range.rightArgs].filter((attr)=>(attr === xAttr || attr === yAttr));
            if(newAttrInvolved.length === 0){
                console.warn("给定关系与创建的元素无关")
                return false;
            }

            return true;
        })

        let attrList = this.get_all_attributes()
        // 判断哪些元素需要进行推测，结合现在所有的关系进行判断

        let freeAttrInfo = this.getFreeAttrInfo(attrList, [...this.equations, ...newEqInExpr])
        
        let freeAttrs = freeAttrInfo[1];
        let canDependAttr = freeAttrInfo[2];

        canDependAttr.push(... attrList.filter((x)=>(x.element.id <= 0)))
        canDependAttr.push(... this.get_all_val_const_attr())

        let postCandidates: Array<PostResultCandidate[]> = []
        

        // 根据用户指令进行的调整可以在此进行
        for(let attr of freeAttrs){
            // 对 canDependAttr 进行去重复
            let uniquifyMap: Map<string, Attribute> = new Map(); // name-val to attr
            for(let attrDpd of canDependAttr){
                let info = `${attrDpd.name}=${attrDpd.val.val.toFixed(2)}`;
                if(!uniquifyMap.has(info)){
                    uniquifyMap.set(info, attrDpd);
                    continue;
                }

                let ts1 = uniquifyMap.get(info)!.timestamp;
                let ts2 = attrDpd.timestamp;
                if(abs(ts2 - attr.timestamp) < abs(ts1 - attr.timestamp)){
                    uniquifyMap.set(info, attrDpd);
                }
            }

            let canDependAttr_ = [... uniquifyMap.values()]

            let pcList = this.genPostCandidate(attr, canDependAttr_, newEqInExpr);
            pcList.push(... this.genPrioCandidate(attr, canDependAttr_))
            pcList.sort((a, b)=>(a.calDis(-1)-b.calDis(-1)))
            pcList = uniquifyList(pcList, (x)=>{
                if(x.val !== -1){
                    return x.val.toFixed(2);
                } 
                return randomID();
            })
            // 检查是否满足
            // 只能局部检查的，因为可能会包含多个attr
            for(let rangeExpr of newRangeInExpr){
                let involvedFreeAttr = new Set([...rangeExpr.leftArgs, ... rangeExpr.rightArgs]
                    .filter((x)=>(!canDependAttr.includes(x))));
                if(involvedFreeAttr.size != 1 || !involvedFreeAttr.has(attr)){
                    continue;
                }
                pcList = pcList.filter((pc)=>{
                    if(pc.val === -1){
                        return true; // 留后处理
                    }
                    // 只有除了当前之外都是 can depend才行
                    let attrVal = attrList.map((x)=>{
                        if(x === attr){
                            return pc.val;
                        }
                        return x.val.val; 
                    })
                    return rangeExpr.judgeEquality(attrList, attrVal);
                })
            }

            for(let traceRel of traceRelations){
                // 删除不满足路径要求的
                if(traceRel.atttibute !== attr){
                    continue;
                }

                pcList = pcList.filter((pc)=>{
                    return traceRel.satisfy(pc.val)
                })
            }

            postCandidates.push(pcList);
        }

        let new_attr_values: Map<Attribute, number> = new Map(); // 在创建过程中的固定值只能是在trace相关的过程中出现的
        // todo：检查，如果存在某个属性的pc是空的，但是它是free的
        // 直接根据trace确定位置
        postCandidates.forEach((pcList, idx)=>{
            if(pcList.length > 0){
                return;
            }
            let missedInferAttr = freeAttrs[idx];
            for(let traceRel of traceRelations){
                if(traceRel.atttibute !== missedInferAttr){
                    continue;
                }

                if(traceRel.op === AssignOp.eq || !new_attr_values.has(missedInferAttr)){
                    new_attr_values.set(missedInferAttr, traceRel.isX? traceRel.trace.center[0]:traceRel.trace.center[1]);
                }
            }

            if(!new_attr_values.has(missedInferAttr)){
                console.warn(
                    `属性${missedInferAttr.name}_${missedInferAttr.element.id}没有符合要求的推荐。`
                );

                new_attr_values.set(missedInferAttr, 300); //predefined
            }
        })

        postCandidates = postCandidates.filter((x)=>(x.length>0))
        
        let allCandidateComb = getAllCase(postCandidates);

        let combCandidate:[Equation[], Attribute[], number[], number][] = []; // 属性列表、属性取值、误差

        if(allCandidateComb.length > 0){
            for(let candidateComb of allCandidateComb){
                let new_equations: Equation[] = [...newEqInExpr];
                let unchangedAttr: Attribute[] = [];
                let inferChangedAttr: Attribute[] = [xAttr, yAttr]; 
                
                for(let oneNewCandidate of candidateComb){
                    inferChangedAttr.push(oneNewCandidate.target);
                    new_equations.push(oneNewCandidate.newEq);
                }
    
                let cal_res = this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
                if(cal_res.length > 1){
                    console.warn('理论上在推测过程中应该直接求解')
                }

                cal_res = cal_res.filter((one_res)=>{
                    //  不需要再进行trace的筛选
                    // 因为trace仅仅涉及单属性，在前面已经筛选过了
                    let attrList = one_res[1];
                    let attrVals = one_res[2];
                    for(let rangeExpr of newRangeInExpr){
                        if(!rangeExpr.judgeEquality(attrList, attrVals)){
                            return false;
                        }
                    }

                    return true;
                })

                cal_res.forEach((v)=>{
                    // v[3] += combErrors;
                    for(let oneNewCandidate of candidateComb){
                        let tgt = oneNewCandidate.target;
                        let idx = v[1].indexOf(tgt);
                        let tgt_val = v[2][idx];
                        v[3] += oneNewCandidate.calDis(tgt_val);
                    }
                    let attrList = v[1];
                    let attrVals = v[2];
                    // 距离权重1：和路径之间的距离
                    for(let attrTraceRel of traceRelations){
                        let val = attrVals[attrList.indexOf(attrTraceRel.atttibute)]
                        let cmpDis = 50;
                        if(attrTraceRel.atttibute.name === 'x'){
                            cmpDis = attrTraceRel.atttibute.element.getAttribute('w')?.val.val || cmpDis;
                        } else if(attrTraceRel.atttibute.name === 'y'){
                            cmpDis = attrTraceRel.atttibute.element.getAttribute('h')?.val.val || cmpDis;
                        }
                        v[3] *= (1 + attrTraceRel.calDis(val) / cmpDis);
                    }
                    // 距离权重2：所有freeAttr和关系中最近的非freeAttr之间的距离
                    let disRange = 0;
                    newRangeInExpr.forEach((range)=>{
                        disRange += this.calAttrRangeDistance(range, attrList, attrVals, freeAttrs);
                    })

                    v[3] *= (1 + disRange / 1);
                })
                combCandidate.push(... cal_res)
            }
        } else {
            // 除了用户指令本身就充分之外，也可能是通过路径推测的结果
            let new_equations: Equation[] = [...newEqInExpr];
            let unchangedAttr: Attribute[] = [];
            let inferChangedAttr: Attribute[] =  [xAttr, yAttr]; 

            let cal_res = this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
            combCandidate.push(... cal_res)

            // 指令本身充分的情况下需要筛选吗？
            // 不需要，因为这里只会增加条件，不会有冲突
        }

        combCandidate = combCandidate.sort((a, b)=>{
            if(a[3] < b[3]){
                return -1;
            } else if(a[3] === b[3]){
                return 0;
            }
            return 1;
        })
        
        if(combCandidate.length === 0){
            alert('无法创建，请检查给出的指令是否合理')
            return false;
        }

        // this.attrList = combCandidate[0][0];
        // this.candidateValues = combCandidate.map(x=>x[1]);
        this.crtCdtIdx = 0;
        this.candidates = [];
        let drawed_pos_set: Set<string> = new Set();
        for(let oneCdt of combCandidate){
            let ids = oneCdt[2].map(x=>x.toFixed(0)).join('-');
            if(!drawed_pos_set.has(ids)){
                this.candidates.push(oneCdt);
                drawed_pos_set.add(ids);
            }
        }

        console.log(drawed_pos_set);
        
        // 更新基础的取值
        this.update_attr()
        // todo: 对整体的取值进行更新

        return true;
    }

    calAttrRangeDistance(range: Equation, attrList: Attribute[], 
        attrVals: number[], freeAttrs: Attribute[]){
        // 用户描述了一个属性之间的偏序关系
        // 新生成的元素和涉及的元素应该尽量接近
        if(range.assignOp === AssignOp.eq){
            return 0; // 
        }

        let involvedElements = new Set([... range.leftArgs, ... range.rightArgs].flatMap((attr)=>{
            let ele = attr.element;
            if(ele.id > 0){
                return [ele];
            }
            return []
        }));

        let eleToPos: Map<SingleElement, [number,  number]> = new Map();
        involvedElements.forEach((ele)=>{
            eleToPos.set(ele, [-1, -1]);
        })

        attrList.forEach((attr, idx)=>{
            if(!eleToPos.has(attr.element)){
                return;
            }
            if(attr.name === 'x'){
                eleToPos.get(attr.element)![0] = attrVals[idx];
            } else if(attr.name === 'y'){
                eleToPos.get(attr.element)![1] = attrVals[idx];
            }
        })

        let involvedFreeEle = new Set(freeAttrs.map((x)=>x.element).filter((x)=>involvedElements.has(x)));
        let baseEle = [... involvedElements].filter((x)=>(!involvedFreeEle.has(x)))
        if(baseEle.length === 0){
            return 0;
        }
        let allAttrs = [... range.leftArgs, ... range.rightArgs];
        let involveFreeAttrs = allAttrs.filter((x)=>{
            return freeAttrs.includes(x);
        })

        let minDis = 0;
        let count = 0;
        for(let attr of involveFreeAttrs){
            if(attr.name !== 'x' && attr.name !== 'y'){
                continue;
            }
            count += 1;
            let pos = attr.name === 'y'? 0:1; // 主元素已经比较了，使用次元素
            minDis += min(baseEle.map((ele)=>{
                let dis = abs(eleToPos.get(ele)![pos] - eleToPos.get(attr.element)![pos]);
                return dis;
            }))
        }

        return minDis / involvedFreeEle.size;

    }

    handleUserModify(newEleEq: string, 
        forceUnchangeStr: string, 
        inferChangeStr: string, 
        newEleRange: string, 
        RawTraces: Array<Array<[number, number]>>, 
        traceEleRelation: string): boolean{
        
        let traces = RawTraces.map(rt=>new Trace(rt));
        let unchangedAttr: Attribute[] = [];
        let inferChangedAttr: Attribute[] = [];

        if(forceUnchangeStr.length > 0){
            forceUnchangeStr.split(';').forEach((s)=>{
                s = s.trim();
                let attr = this.getAttributeByStr(s);
                unchangedAttr.push(attr);
            })
        }

        if(inferChangeStr.length > 0){
            inferChangeStr.split(';').forEach((s)=>{
                s = s.trim();
                let attr = this.getAttributeByStr(s);
                inferChangedAttr.push(attr);
            })
        }
        
        // todo 先仅仅考虑关系发生改变的情况
        let newEqInExpr = newEleEq.length === 0? []: newEleEq.split(';').filter(x=>x.length > 0).map((oneEqStr)=>{
            return parseNewEquation(this, oneEqStr);
        })

        let newRangeInExpr = newEleRange.length === 0? []: newEleRange.split(';').filter(x=>x.length > 0).map((oneRangeStr)=>{
            return parseNewEquation(this, oneRangeStr);
        }).filter((x)=>(x.assignOp !== AssignOp.eq));

        let traceRelations: TraceAttrRelation[] = [];
        if(traceEleRelation.length > 0){
            traceRelations = traceEleRelation.split(';').map((x)=>{
                return new TraceAttrRelation(this, traces, x);
            })
        }

        traceRelations.forEach((tr)=>{
            if(!inferChangedAttr.includes(tr.atttibute)){
                inferChangedAttr.push(tr.atttibute)
            }
        })

        // 在 range中，如果所有的属性都没有被列为inferchange
        // 那么所有的都预期它会修改
        let attrToExprs: Map<Attribute, [Attribute, Equation[]]> = new Map();
        let noInferChangeEqs: Equation[] = [];
        [... newRangeInExpr].forEach((x)=>{
            let allArgs = [...x.leftArgs, ...x.rightArgs].filter((x)=>x.element.id>0);
            let changedArgs = allArgs.filter((x)=>(inferChangedAttr.includes(x)));
            
            if(changedArgs.length === 0){ // 强制最后加入的元素是需要修改的
                noInferChangeEqs.push(x);
                allArgs.forEach((arg)=>{
                    if(!attrToExprs.has(arg)){
                        attrToExprs.set(arg, [arg, []]);
                    }
                    attrToExprs.get(arg)?.[1].push(x);
                })    
            }
        })
        
        let attrExprTuples = [...attrToExprs.values()]

        while(noInferChangeEqs.length > 0){
            attrExprTuples.sort((attrTp1, attrTp2)=>{
                if(attrTp1.length > attrTp2.length){
                    return -1;
                } else if(attrTp1.length < attrTp2.length){
                    return 1;
                } else {
                    if(attrTp1[0].timestamp > attrTp2[0].timestamp){
                        return -1;
                    } else if(attrTp1[0].timestamp < attrTp2[0].timestamp){
                        return 1;
                    }
                }

                return 0;
            })

            let firstEle = attrExprTuples[0];
            inferChangedAttr.push(firstEle[0]);
            noInferChangeEqs = noInferChangeEqs.filter((x)=>{
                return !firstEle[1].includes(x);
            })

            attrExprTuples = attrExprTuples.slice(1);
            attrExprTuples = attrExprTuples.map((tp)=>{
                let res :[Attribute, Equation[]] = [tp[0], tp[1].filter((x)=>noInferChangeEqs.includes(x))];
                return res;
            }).filter((x)=>x[1].length > 0);
        }


        if(newEqInExpr.length === 0 && newRangeInExpr.length === 0 && traceRelations.length === 0){
            alert('没有识别出任何操作意图')
            return false;
        }

        // 检查：所有的inferChanges都有对应的newEleEq；筛选出那些没有对应的
        let allAttrInEqs: Set<Attribute> = new Set([... newEqInExpr.flatMap((eq)=>([... eq.leftArgs, ...eq.rightArgs]))]);
        let inferChangeWithoutNewEq = inferChangedAttr.filter((x)=>(!allAttrInEqs.has(x)));
        
        let attrList = this.get_all_attributes();
        let canDependAttr = [...attrList, ... this.get_all_val_const_attr()]
            .filter((attr)=>!inferChangedAttr.includes(attr));
        
        let pcComb: Array<PostResultCandidate[]> = [];
        for(let attr of inferChangeWithoutNewEq){
            let pcList = this.genPostCandidate(attr, canDependAttr, newEqInExpr);
            pcList.push(... this.genPrioCandidate(attr, canDependAttr));
            pcList.sort((a, b)=>(a.calDis(-1)-b.calDis(-1)))
            pcList = uniquifyList(pcList, (x)=>{
                if(x.val !== -1){
                    return x.val.toFixed(2);
                } 
                return randomID();
            })
            // pcComb.push(pcList);
            // continue;
            for(let rangeExpr of newRangeInExpr){
                let involvedFreeAttr = new Set([...rangeExpr.leftArgs, ... rangeExpr.rightArgs]
                    .filter((x)=>(!canDependAttr.includes(x))));
                if(involvedFreeAttr.size != 1 || !involvedFreeAttr.has(attr)){
                    continue;
                }
                pcList = pcList.filter((pc)=>{
                    // 这里的处理只能是一个近似处理了
                    if(pc.val === -1){
                        return true; // 留后处理
                    }
                    // 只有除了当前之外都是 can depend才行
                    let attrVal = attrList.map((x)=>{
                        if(x === attr){
                            return pc.val;
                        }
                        return x.val.val; 
                    })
                    return rangeExpr.judgeEquality(attrList, attrVal);
                })
            }

            for(let traceRel of traceRelations){
                // 删除不满足路径要求的
                if(traceRel.atttibute !== attr){
                    continue;
                }

                pcList = pcList.filter((pc)=>{
                    return traceRel.satisfy(pc.val)
                })
            }
            
            pcComb.push(pcList);
        }

        let new_attr_values: Map<Attribute, number> = new Map(); // 用户会主动输入取值吗

        pcComb.forEach((pcList, idx)=>{
            if(pcList.length > 0){
                return;
            }
            let missedInferAttr = inferChangedAttr[idx];
            for(let traceRel of traceRelations){
                if(traceRel.atttibute !== missedInferAttr){
                    continue;
                }

                if(traceRel.op === AssignOp.eq || !new_attr_values.has(missedInferAttr)){
                    new_attr_values.set(missedInferAttr, traceRel.isX? traceRel.trace.center[0]:traceRel.trace.center[1]);
                }
            }

            if(!new_attr_values.has(missedInferAttr)){
                console.warn(
                    `属性${missedInferAttr.name}_${missedInferAttr.element.id}没有符合要求的推荐。`
                )
            }
        })

        let allCandidateComb = getAllCase(pcComb);

        let combCandidate:[Equation[], Attribute[], number[], number][] = []; // 属性列表、属性取值、误差
        if(allCandidateComb.length > 0){
            for(let candidateComb of allCandidateComb){
                let new_equations: Equation[] = [...newEqInExpr];
                let unchangedAttr: Attribute[] = [];
                // let inferChangedAttr: Attribute[] = [xAttr, yAttr]; 
                
                for(let oneNewCandidate of candidateComb){
                    new_equations.push(oneNewCandidate.newEq);
                }
    
                let cal_res = this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);

                cal_res.forEach((v)=>{
                    // v[3] += combErrors;
                    for(let oneNewCandidate of candidateComb){
                        let tgt = oneNewCandidate.target;
                        let idx = v[1].indexOf(tgt);
                        let tgt_val = v[2][idx];
                        v[3] += oneNewCandidate.calDis(tgt_val);
                    }
                })
                combCandidate.push(... cal_res)
            }
        } else {
            let new_attr_values: Map<Attribute, number> = new Map();
            let new_equations: Equation[] = [...newEqInExpr];

            let cal_res = this.cal_contents(new_attr_values, new_equations, unchangedAttr, inferChangedAttr);
            combCandidate.push(... cal_res)
        }

        // 筛选位置
        // trace 筛选可能需要进行，因为不排除额外的解
        combCandidate = combCandidate.filter((one_res)=>{
            for(let traceRange of traceRelations){
                let attrVal = one_res[2][one_res[1].indexOf(traceRange.atttibute)];
                if(!traceRange.satisfy(attrVal)){
                    return false;
                }
            }

            return true;
        })


        combCandidate = combCandidate.filter((one_res)=>{
            let attrList = one_res[1];
            let attrVals = one_res[2];
            for(let rangeExpr of newRangeInExpr){
                if(!rangeExpr.judgeEquality(attrList, attrVals)){
                    return false;
                }
            }
            return true;
        });

        // 更新权重
        combCandidate.forEach((v)=>{
            let attrList = v[1];
            let attrVals = v[2];
            // 距离权重1：和路径之间的距离
            for(let attrTraceRel of traceRelations){
                let val = attrVals[attrList.indexOf(attrTraceRel.atttibute)]
                
                let cmpDis = 50;
                if(attrTraceRel.atttibute.name === 'x'){
                    cmpDis = attrTraceRel.atttibute.element.getAttribute('w')?.val.val || cmpDis;
                } else if(attrTraceRel.atttibute.name === 'y'){
                    cmpDis = attrTraceRel.atttibute.element.getAttribute('h')?.val.val || cmpDis;
                }
                v[3] *= (1 + attrTraceRel.calDis(val) / cmpDis);
            }
            // 距离权重2：所有freeAttr和关系中最近的非freeAttr之间的距离
            let disRange = 0;
            newRangeInExpr.forEach((range)=>{
                disRange += this.calAttrRangeDistance(range, attrList, attrVals, inferChangedAttr);
            })

            v[3] *= (1 + disRange / 1);
        })

        // 排序
        combCandidate = combCandidate.sort((a, b)=>{
            if(a[3] < b[3]){
                return -1;
            } else if(a[3] === b[3]){
                return 0;
            }
            return 1;
        })

        if(combCandidate.length > 0){
            this.candidates = [... combCandidate];
            this.crtCdtIdx = 0;
            this.update_attr()
        } else {
            if(newEleRange.length > 0){
                let newRangeStr = newEleRange.replaceAll(/[><]/g, '=').replaceAll('==', '=')
                let newEqStr = `${newEleEq};${newRangeStr}`;
                return this.handleUserModify(newEqStr, forceUnchangeStr, inferChangeStr, "", RawTraces, traceEleRelation);
            } else {
                alert('没有计算出给出指令的合适结果！请检查')
                return false;
            }
        }

        return true;
    }

    recommandNext(){
        if(this.nextPosCdtCache != undefined){
            return this.nextPosCdtCache.slice();
        }
        // 推荐下一个元素位置
        let tmpNextEle = new SingleElement(-100, ElementType.RECTANGLE);
        let nextXAttr = new Attribute('x', new RawNumber(0), tmpNextEle);
        let nextYAttr = new Attribute('y', new RawNumber(0), tmpNextEle);
        tmpNextEle.addAttribute(nextXAttr);
        tmpNextEle.addAttribute(nextYAttr);
        let canDependAttr = [... new Set([... this.get_all_attributes(), ... this.get_all_val_const_attr()])];
        let freeAttrs = [nextXAttr, nextYAttr];

        let postCandidates: Array<PostResultCandidate[]> = []

        for(let attr of freeAttrs){
            let pcList = this.genPostCandidate(attr, canDependAttr, []);
            pcList.push(... this.genPrioCandidate(attr, canDependAttr))
            pcList = uniquifyList(pcList, (x)=>{
                if(x.val !== -1){
                    return x.val.toFixed(2);
                } 
                return randomID();
            })

            postCandidates.push(pcList);
        }

        let allCandidateComb = getAllCase(postCandidates);
        let nextPosCdt: [number, number, number][] = []; // x坐标、y坐标、损失
        
        let crtPosSet: Set<string> = new Set();
        this.elements.forEach((ele)=>{ // 当前新建的tmp并没有加入到elements中
            if(ele.id <= 0){
                return;
            }
            crtPosSet.add(`${ele.getAttribute('x')?.val.val.toFixed(2)}-${ele.getAttribute('y')?.val.val.toFixed(2)}`);
        })

        for(let oneComb of allCandidateComb){
            let x = 0;
            let y = 0;
            let err = 0;
            for(let pc of oneComb){
                if(pc.target.name === 'x'){
                    x = pc.calValue([], this);
                    err += pc.calDis(-1);
                }

                if(pc.target.name === 'y'){
                    y = pc.calValue([], this);
                    err += pc.calDis(-1);
                }
            }

            let posStr = `${x.toFixed(2)}-${y.toFixed(2)}`;
            if(crtPosSet.has(posStr)){
                continue;
            }
            if(x <= 0 || y <= 0){
                continue;
            }
            nextPosCdt.push([x, y, err]);
        }

        nextPosCdt.sort((a, b)=>a[2]-b[2]);

        return nextPosCdt;
    }

    addArrowByStr(s: string){
        if(s.length === 0){
            return;
        }
        s.split(';').forEach((ss)=>{
            let ss_split = ss.split(' ').map((x)=>x.trim()).filter((x)=>x.length>0);
            let source = Number(ss_split[0]);
            let target = Number(ss_split[1]);
            let text = ss_split[2];
            this.addArrow(source, target, text);
        })
    }

    exportAsJson(){
        let result = [];
        for(let ele of this.elements.values()){
            if(ele.id <= 0){
                continue;
            }
            if(!eleTypeToStr.has(ele.type)){
                continue;
            }
            let crtObj: any = {
                "type": "element",
                "name": ele.name,
                "elementType": eleTypeToStr.get(ele.type)
            }

            for(let attr of ele.attributes){
                crtObj[attr[0]] = attr[1].val.val;
            }

            result.push(crtObj);
        }


        // attr
        [this.constElement, this.baseElement].map((ele)=>ele.attributes).forEach((mp)=>{
            mp.forEach((attr, key)=>{
                let crtObj: any = {
                    "type": "attribute",
                    "name": key,
                    "element": attr.element.id,
                    'val': attr.val.val
                }
                result.push(crtObj);
            })
        })

        // eq
        this.equations.forEach((x)=>{
            result.push({
                "type": "equation",
                "equation": x.debug()
            })
        })

        return result;
    }
}

class Trace{
    rawTrace: Array<[number, number]>;
    center: [number, number];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    static ALLOW_DELTA = 25;
    constructor(trace: Array<[number, number]>){
        this.rawTrace = trace.map(x=>[x[0], x[1]]);
        this.center = [
            trace.map(x=>x[0]).reduce((p, c)=>(p+c), 0) / trace.length,
            trace.map(x=>x[1]).reduce((p, c)=>(p+c), 0) / trace.length
        ];

        this.minX = min(this.rawTrace.map((x)=>x[0]));
        this.minY = min(this.rawTrace.map((x)=>x[1]));
        this.maxX = max(this.rawTrace.map((x)=>x[0]));
        this.maxY = max(this.rawTrace.map((x)=>x[1]));
    }

    isInside(p: number, isX:boolean, tgtAttr: Attribute){
        let delta = Trace.ALLOW_DELTA;
        if(tgtAttr.name === 'x'){
            delta = tgtAttr.element.getAttribute('w')?.val.val || delta;
        }

        if(tgtAttr.name === 'y'){
            delta = tgtAttr.element.getAttribute('h')?.val.val || delta;
        }

        if(isX){
            return (p >= this.minX - delta) && (p <= this.maxX + delta);
        } else {
            return (p >= this.minY - delta) && (p <= this.maxY + delta);
        }
    }
}

class TraceAttrRelation {
    trace: Trace;
    atttibute: Attribute;
    op: AssignOp;
    isX: boolean;
    constructor(con: Controller, traces: Trace[], expr: string){
        let re = /\s*(.*_\d+)\s*([><=]*)\s*(.*_\d+)\s*/;
        let execRes = re.exec(expr);
        let left = execRes![1];
        this.op = str2AssignOp(execRes![2])!
        let right = execRes![3];

        if(left.includes('trace')){
            let tmp = left;
            left = right;
            right = tmp;
            this.op = sideSwap(this.op);
        }

        // left 是 attr，right 是 trace
        this.atttibute = con.getAttributeByStr(left);
        this.isX = this.atttibute.name !== 'y';
        let traceIdx = Number(right.split('_')[1]);
        this.trace = traces[traceIdx];
    }

    satisfy(val:number|undefined){
        if(val == undefined){
            val = this.atttibute.val.val;
        }
        switch(this.op){
            case AssignOp.eq:
                return this.trace.isInside(val!, this.isX, this.atttibute);
            case AssignOp.ge:
            case AssignOp.gt:
                return op2func(this.op)(val!, this.isX?this.trace.minX: this.trace.minY);
            case AssignOp.le:
            case AssignOp.lt:
                return op2func(this.op)(val!, this.isX?this.trace.maxX: this.trace.maxY);
        }
    }

    calDis(val: number|undefined):number{
        if(val == undefined){
            val = this.atttibute.val.val;
        }

        if(this.op == AssignOp.eq){
            return abs((this.isX? this.trace.center[0]: this.trace.center[1]) - val!)
        }

        return this.satisfy(val)? 0: 1;
        
    }
}

export { String2OP, Operator, OperatorNode, FuncTree, RawNumber, RawText, RawNumberNoCal, ElementType, SingleElement, Attribute, Controller, Equation, AssignOp};
