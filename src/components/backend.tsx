import axios from 'axios';
import { e } from 'mathjs';
import {parseNewRelation} from './load_file'
import {getAllCase, count, getTs} from './utility'
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

function LOP(op: Operator): Operator {
    switch (op) {
        case Operator.PLUS:
            return Operator.REVERSED_MINUS;

        case Operator.MINUS:
            return Operator.MINUS;

        case Operator.MULTIPLY:
            return Operator.REVERSED_DEVIDED;

        case Operator.DEVIDED:
            return Operator.DEVIDED;

        case Operator.REVERSED_MINUS:
            return Operator.PLUS;

        case Operator.REVERSED_DEVIDED:
            return Operator.MULTIPLY;

        default:
            throw new Error("unexpected operator");
    }
}

function ROP(op: Operator): Operator {
    switch (op) {
        case Operator.PLUS:
            return Operator.MINUS;

        case Operator.MINUS:
            return Operator.PLUS;

        case Operator.MULTIPLY:
            return Operator.DEVIDED;

        case Operator.DEVIDED:
            return Operator.MULTIPLY;

        case Operator.REVERSED_MINUS:
            return Operator.REVERSED_MINUS;

        case Operator.REVERSED_DEVIDED:
            return Operator.REVERSED_DEVIDED;
        
        case Operator.EQ:
            return Operator.EQ;

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
    fromRelationship?: Relationship;
    toRelationships?: Relationship[];
    constructor(_name: string, _val: Value, _element: SingleElement, _fromRelationship?: Relationship, _toRelationships?: Relationship[]) {
        this.name = _name;
        this.val = _val;
        this.element = _element;
        this.fromRelationship = _fromRelationship;
        this.toRelationships = _toRelationships;
        this.timestamp = getTs();
    }
    setFromRelationship(f: Relationship) {
        this.fromRelationship = f;
        this.val = this.fromRelationship.func.calculate(this.fromRelationship.args);
    }
    addToRelationship(t: Relationship) {
        if (this.toRelationships == null) {
            this.toRelationships = new Array<Relationship>();
        }
        this.toRelationships.push(t);
    }
    isSameAttribute(o:Attribute|undefined):boolean{
        return this.name == o?.name
    }
}

class TmpConstAttribute extends Attribute {
    constructor(_val: RawNumber){
        super("const", _val, TMP);
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

enum RelationshipType {
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

class Relationship {
    func: FuncTree;
    args: Attribute[];
    target: Attribute;
    type?: RelationshipType;
    level?: number;
    timestamp: number;
    assignOp: AssignOp;
    constructor(_func: FuncTree, _args: Attribute[], _target: Attribute, _type?: RelationshipType, _level?: number) {
        this.func = _func;
        this.args = _args;
        this.target = _target;
        this.type = _type;
        this.level = _level;
        this.timestamp = getTs();
        this.assignOp = AssignOp.eq;
    }

    transform(pos: number): [Relationship, Array<number>] {
        // change target with args[pos], recalculate the func and args, return a new Relationship and the sequence of args
        // attention: the args in the new Relationship are shallow copied
        if (pos >= this.args.length) {
            throw new Error("error position in transformation");
        }
        let newRelationship = new Relationship(this.func.deepCopy(), this.args, this.target, this.type, this.level);
        let rootNode = newRelationship.func.root;
        let pointer = 0;
        let posNode = new OperatorNode(Operator.PLUS); // Node at pos
        // 这里为FuncTree设置子节点number以及维护parent
        let setNumberAndParent = function (node: OperatorNode) {
            if (node.leftNode == null || typeof node.leftNode === "number") {
                if (pointer == pos) {
                    posNode = node;
                    node.leftNode = undefined;
                    pointer++;
                } else {
                    node.leftNode = pointer;
                    pointer++;
                }
            } else {
                node.leftNode.parentNode = node;
                setNumberAndParent(node.leftNode as OperatorNode);
            }
            if (node.rightNode == null || typeof node.rightNode === "number") {
                if (pointer == pos) {
                    posNode = node;
                    node.rightNode = undefined;
                    pointer++;
                } else {
                    node.rightNode = pointer;
                    pointer++;
                }
            } else {
                node.rightNode.parentNode = node;
                setNumberAndParent(node.rightNode as OperatorNode);
            }
        }
        setNumberAndParent(rootNode);
        rootNode.parentNode = pos;
        let transformAtNode = function (node: OperatorNode) {
            // must have one child null
            if (node.parentNode == null || typeof node.parentNode === "number") {
                if (node.parentNode == null) {
                    throw new Error("parent node should not be null");
                } else {
                    if (node.leftNode == null) {
                        node.leftNode = node.parentNode;
                        node.parentNode = undefined;
                        node.op = ROP(node.op);
                    } else if (node.rightNode == null) {
                        node.rightNode = node.parentNode;
                        node.parentNode = undefined;
                        node.op = LOP(node.op);
                    } else {
                        throw new Error("must have one child null");
                    }
                }
            } else {
                if (node.parentNode.leftNode == node) {
                    node.parentNode.leftNode = undefined;
                } else {
                    node.parentNode.rightNode = undefined;
                }
                transformAtNode(node.parentNode);
                if (node.leftNode == null) {
                    node.leftNode = node.parentNode;
                    node.parentNode.parentNode = node;
                    node.op = ROP(node.op);
                    node.parentNode = undefined;
                } else if (node.rightNode == null) {
                    node.rightNode = node.parentNode;
                    node.parentNode.parentNode = node;
                    node.op = LOP(node.op);
                    node.parentNode = undefined;
                } else {
                    throw new Error("must have one child null");
                }
            }
        }
        transformAtNode(posNode);
        newRelationship.func.root = posNode;
        let argSequence = new Array<number>();
        let getArgsSequence = function (node: OperatorNode) {
            if (node.leftNode == null || typeof node.leftNode === "number") {
                if (node.leftNode == null) {
                    throw new Error("should not contain null after transform");
                } else {
                    argSequence.push(node.leftNode);
                }
            } else {
                getArgsSequence(node.leftNode);
            }
            if (node.rightNode == null || typeof node.rightNode === "number") {
                if (node.rightNode == null) {
                    throw new Error("should not contain null after transform");
                } else {
                    argSequence.push(node.rightNode);
                }
            } else {
                getArgsSequence(node.rightNode);
            }
        }
        getArgsSequence(posNode);
        // 清除number节点以及parent, 正常使用时候的relationship不应该包含number节点或者parent
        let cleanNumberAndParent = function (node: OperatorNode) {
            if (typeof node.leftNode === "number") {
                node.leftNode = undefined;
            } else if (node.leftNode != null) {
                cleanNumberAndParent(node.leftNode);
            }
            if (typeof node.rightNode === "number") {
                node.rightNode = undefined;
            } else if (node.rightNode != null) {
                cleanNumberAndParent(node.rightNode);
            }
            node.parentNode = undefined;
        }
        cleanNumberAndParent(posNode);
        let newArgs = new Array<Attribute>();
        argSequence[pos] = -1 // added
        let newArgSequence = []
        for(let idx of argSequence){
            if(idx >= 0 && this.args[idx] == undefined){
                continue;
            }
            newArgSequence.push(idx);
        }
        
        for (let i of newArgSequence) {
            if(i >= 0){
                newArgs.push(this.args[i]);
            } else {
                newArgs.push(this.target); // added
            }
        }
        newRelationship.args = newArgs;
        newRelationship.target = this.args[pos]; // added
        
        
        return [newRelationship, [pos, ...newArgSequence]];
    }
    debug(): string {
        let pointer = 0;
        let debugAtNode = (node: OperatorNode): string => {
            let leftout = "";
            let rightout = "";
            if (node.leftNode == null || typeof node.leftNode === "number") {
                if (this.args[pointer].element.name != null) {
                    leftout = this.args[pointer].element.name + "." + this.args[pointer].name;
                } else {
                    leftout = this.args[pointer].name;
                }
                pointer++;
            } else {
                leftout = debugAtNode(node.leftNode);
                if (OPLevel(node.op) > OPLevel(node.leftNode.op)) {
                    leftout = "(" + leftout + ")";
                }
            }
            if (node.rightNode == null || typeof node.rightNode === "number") {
                if(this.args[pointer] == null){
                    rightout = ""
                } else if (this.args[pointer].element.name != null) {
                    rightout = this.args[pointer].element.name + "." + this.args[pointer].name;
                } else {
                    rightout = this.args[pointer].name;
                }
                pointer++;
            } else {
                rightout = debugAtNode(node.rightNode);
                if (OPLevel(node.op) > OPLevel(node.rightNode.op)) {
                    rightout = "(" + rightout + ")";
                }
            }
            if (node.op == Operator.REVERSED_DEVIDED || node.op == Operator.REVERSED_MINUS) {
                return rightout + " " + OPString(node.op) + " " + leftout;
            } else {
                return leftout + " " + OPString(node.op) + " " + rightout;
            }
        }

        return `${this.target.name}_${this.target.element.id} ` + assignOpToStr(this.assignOp) + debugAtNode(this.func.root);
    }

    calculate(): Value {
        return this.func.calculate(this.args);
    }
    convertToVector(attrList: Attribute[]): number[] {
        let mat = this.func.convertToVector(this.args, attrList);
        mat[attrList.indexOf(this.target)] -= 1;
        let coefLength = Math.sqrt(mat.reduce((pv, cv)=>(pv + cv * cv), 0));
        mat = mat.map(x=>x/coefLength);
        return mat;
    }

    cal_arg_depth(pos: number): number{
        if(pos < 0){
            return 1;
        }

        let stack: [OperatorNode|undefined, number][] = [];
        this._node_into_stack(this.func.root, stack, 0);
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

class Equation {
    leftFunc: FuncTree;
    rightFunc: FuncTree;
    leftArgs: Attribute[];
    rightArgs: Attribute[];
    assignOp: AssignOp;
    constructor(_leftFunc: FuncTree, _rightFunc: FuncTree, _leftArgs: Attribute[], _rightArgs: Attribute[]) {
        this.leftFunc = _leftFunc;
        this.rightFunc = _rightFunc;
        this.leftArgs = _leftArgs;
        this.rightArgs = _rightArgs;
        this.assignOp = AssignOp.eq;
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
                if (node.op == Operator.REVERSED_DEVIDED || node.op == Operator.REVERSED_MINUS) {
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
    rel: Relationship;
    type: PrioType;
    ref: Array<Attribute>;
    val: Value;
    tgt:Attribute;
    constructor(ref:Array<Attribute>, type: PrioType, tgtAttribute:Attribute, con:Controller){
        this.type = type;
        this.ref = [];
        this.tgt = tgtAttribute;
        switch(type){
            case PrioType.ALIGN:
                this.rel = new Relationship(FuncTree.simpleEq(), [ref[0]], tgtAttribute);
                this.ref.push(ref[0]);
                break;
            case PrioType.CONST_DIS_ADD:
                let constAttr = con.getAttribute(0, 'const_dis');
                this.rel = new Relationship(FuncTree.simpleAdd(), [ref[0], constAttr], tgtAttribute);
                this.ref.push(ref[0]);
                break;
            case PrioType.CONST_DIS_MINUS:
                let constAttr2 = con.getAttribute(0, 'const_dis');
                this.rel = new Relationship(FuncTree.simpleMinus(), [ref[0], constAttr2], tgtAttribute);
                this.ref.push(ref[0]);
                break;
            default:
                this.rel = new Relationship(FuncTree.simpleEq(), [ref[0]], tgtAttribute);
                this.ref.push(ref[0]);
                assert(false);
        }
        this.val = this.rel.func.calculate(this.rel.args);
    }

    isInvalid():boolean {
        return this.val.val < 0;
    }
}
const MAX_POST_DEPTH = 1
class PostResultCandidate {
    oriRel:Relationship;
    newRel: Relationship;
    oriAttributes: Attribute[];
    newAttributesInOriOrder: Attribute[];  // 根据原始关系中的顺序，所对应的新关系中的顺序；
    // 可以更加方便地计算相似度
    indexMapping: number[];
    val: Value;
    keepLeft: boolean;
    constructor(_oriRel: Relationship, _newRel: Relationship, _indexMapping: number[], keepLeft: boolean){
        this.oriRel = _oriRel;
        this.newRel = _newRel;
        this.indexMapping = _indexMapping;
        assert(this.indexMapping.length === this.oriRel.args.length + 1);
        this.oriAttributes = [this.oriRel.target];
        this.oriAttributes.push(... this.oriRel.args)
        this.newAttributesInOriOrder = [];
        for(let i = -1; i < this.oriRel.args.length; ++ i){
            let indexInNewArgs = this.indexMapping.indexOf(i) - 1;
            if(indexInNewArgs < 0){
                this.newAttributesInOriOrder.push(this.newRel.target);
            } else {
                this.newAttributesInOriOrder.push(this.newRel.args[indexInNewArgs]);
            }
            
        }
        this.val = this.newRel.func.calculate(this.newRel.args);
        this.keepLeft = keepLeft;
    }

    isInvalid():boolean {
        return this.val.val < 0;
    }

    calDis(){
        // 与之前联合考虑的误差不同，仅仅考虑单属性的误差
        // 缺少交叉项的误差
        let avgArgTimeY = this.newRel.args.map((x)=>(x.timestamp)).reduce((pv, cv)=>(pv+cv)) / this.newRel.args.length;
        let deltaT = Math.abs(this.newRel.target.timestamp - avgArgTimeY);
        deltaT /= 1000;

        let deltaRelT = Math.abs(this.oriRel.timestamp - this.newRel.target.timestamp);
        deltaRelT /= 1000;
        
        let nonConstArgsNum = count(this.newRel.args, (item)=>(item.element.id != 0));
        let tgtAttrName = this.newRel.target.name;
        let avgAttrInArgs = nonConstArgsNum === 0? 0:this.newRel.args
                    .flatMap((attr)=>(!attr.element.attributes.has(tgtAttrName)? []: [attr.element.getAttribute(tgtAttrName)!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNum;
        
        let dis = Math.abs(avgAttrInArgs - this.val.val) / 100;

        // 没有拓扑距离

        let factor = 1; // 没有多元素关系应用到同一个元素带来的惩罚

        // 仍有前后使用元素数量带来的误差
        let oriRelEle:Set<SingleElement> = new Set(this.oriRel.args.map(x=>x.element));
        let newRelEle: Set<SingleElement> = new Set(this.newRel.args.map(x=>x.element));
        factor *= (1 + Math.abs(oriRelEle.size - newRelEle.size) / Math.min(oriRelEle.size, newRelEle.size))

        return factor * (deltaT + deltaRelT + dis);
    }
}

class Controller {
    elements: Map<number, SingleElement>;
    idAllocator: number;
    constAllocator: number;

    nextValid:Array<[PrioResultCandidate, PrioResultCandidate, number]>;
    nextInvalid:Array<[PrioResultCandidate, PrioResultCandidate, number]>;

    nextValidPost:Array<[PostResultCandidate, PostResultCandidate, number, number, number, number, number, number]>;
    nextInvalidPost:Array<[PostResultCandidate, PostResultCandidate, number, number, number, number, number, number]>;

    crtPostPos: number;
    crtPrioPos: number;
    crtPostEle: SingleElement|undefined;
    crtPrioEle: SingleElement|undefined;

    candidateValues: number[][];
    crtCdtIdx: number;
    attrList: Attribute[];

    constructor() {
        this.elements = new Map<number, SingleElement>();
        let constElement = new SingleElement(-2, ElementType.CONST, "const");
        this.elements.set(-2, constElement);
        let baseElement = new SingleElement(0, ElementType.BASE, "base");
        this.elements.set(0, baseElement);
        this.idAllocator = 1;
        this.constAllocator = 0;
        this.nextValid = [];
        this.nextInvalid = [];
        this.addAttribute(0, 'const_dis', new RawNumber(PREDEFINE_DIS));
        this.nextValidPost = [];
        this.nextInvalidPost = [];

        this.crtPostPos = -1;
        this.crtPrioPos = -1;
        this.crtPostEle = undefined;
        this.crtPrioEle = undefined;

        this.candidateValues = [[]];
        this.crtCdtIdx = -1
        this.attrList = []
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
        let ele = this.getElement(id);
        let noAttributeUsed = true;
        ele.attributes.forEach((attr)=>{
            if(attr.toRelationships != null && attr.toRelationships.length > 0){
                noAttributeUsed = false;
            }
        })
        if(!noAttributeUsed){
            return false;
        }

        ele.attributes.forEach((attr)=>{
            if(attr.fromRelationship == null){
                return;
            }

            attr.fromRelationship.args.forEach((attr2)=>{
                attr2.toRelationships?.splice(attr2.toRelationships.indexOf(attr.fromRelationship!), 1)
            })
        })
        this.elements.delete(ele.id);
        return true;
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

    getAttributeByStr(s:string): Attribute{
        // x_2 
        let splitRes = s.trim().split('_');
        let _id = parseInt(splitRes[1]);
        let _name = splitRes[0].trim();
        return this.getAttribute(_id, _name);
    }

    addRelationship(_func: FuncTree, _args: Attribute[], _target: Attribute) {
        let newRelationship = new Relationship(_func, _args, _target);
        _target.setFromRelationship(newRelationship);
        for (let i of _args) {
            i.addToRelationship(newRelationship);
        }
    }

    estimate_next_prio(){
        this.nextValid = [];
        this.nextInvalid = [];
        this.nextValidPost = [];
        this.nextInvalidPost = [];
        this.crtPostPos = -1;
        this.crtPrioPos = -1;
        this.crtPostEle = undefined;
        this.crtPrioEle = undefined;
        // let nextElementID = this.createElement(ElementType.RECTANGLE);
        // let nextElement = this.getElement(nextElementID);
        let nextElement = new SingleElement(-1, ElementType.RECTANGLE);
        // this.addAttribute(nextElementID, 'x', new RawNumber(0));
        // this.addAttribute(nextElementID, 'y', new RawNumber(0));
        nextElement.attributes.set('x', new Attribute('x', new RawNumber(0), nextElement));
        nextElement.attributes.set('y', new Attribute('y', new RawNumber(0), nextElement));

        let uniPriorOp:Array<PrioType> = [PrioType.ALIGN, PrioType.CONST_DIS_ADD, PrioType.CONST_DIS_MINUS];
        let xCandidates:Array<PrioResultCandidate> = [];
        let yCandidates:Array<PrioResultCandidate> = [];
        for(let crtOp of uniPriorOp){
            for(let crtElement of this.elements.values()){
                if(crtElement.id === 0){
                    continue;
                }

                let crtXAttr = crtElement.getAttribute('x');
                let crtYAttr = crtElement.getAttribute('y');
                let nextXAttr = nextElement.getAttribute('x');
                let nextYAttr = nextElement.getAttribute('y');
                if(crtXAttr == null || crtYAttr == null || nextXAttr == null || nextYAttr == null){
                    continue;
                }
                let crtCdtX = new PrioResultCandidate([crtXAttr], crtOp, nextXAttr, this);
                let crtCdtY = new PrioResultCandidate([crtYAttr], crtOp, nextYAttr, this);
                if(!crtCdtX.isInvalid()){
                    xCandidates.push(crtCdtX);
                }
                if(!crtCdtY.isInvalid()){
                    yCandidates.push(crtCdtY);
                }
            }
        }

        let xysTuple: Array<[PrioResultCandidate, PrioResultCandidate, number]> = []; // x, y and score
        for(let xCdt of xCandidates){
            let avgTimeX = xCdt.ref.map((x)=>x.element.timestamp).reduce((p, c)=>(p+c), 0) / xCdt.ref.length;
            let avgXX = xCdt.ref.map((x)=>x.element.getAttribute('x')).reduce((p, c)=>(p+c?.val.val), 0) / xCdt.ref.length;
            let avgYX = xCdt.ref.map((x)=>x.element.getAttribute('y')).reduce((p, c)=>(p+c?.val.val), 0) / xCdt.ref.length;
            
            for(let yCdt of yCandidates){
                let score = -1;
                let avgTimeY = yCdt.ref.map((x)=>x.timestamp).reduce((p, c)=>(p+c), 0) / yCdt.ref.length;
                let avgXY = yCdt.ref.map((x)=>x.element.getAttribute('x')).reduce((p, c)=>(p+c?.val.val), 0) / yCdt.ref.length;
                let avgYY = yCdt.ref.map((x)=>x.element.getAttribute('y')).reduce((p, c)=>(p+c?.val.val), 0) / yCdt.ref.length;

                let deltaT = Math.abs(xCdt.tgt.timestamp - avgTimeX) + Math.abs(yCdt.tgt.timestamp - avgTimeY);
                deltaT /= 1000;

                let dis = Math.sqrt((avgXX - xCdt.val.val) ** 2 + (avgYX - yCdt.val.val) ** 2);
                dis += Math.sqrt((avgXY - xCdt.val.val) ** 2 + (avgYY - yCdt.val.val) ** 2);

                dis /= 100

                // 计算两个refs 之间的平均距离
                let topoDis = 0;
                for(let xRef of xCdt.ref){
                    for(let yRef of yCdt.ref){
                        topoDis += this.calculateAttributeDis(xRef, yRef);
                    }
                }
                topoDis /= (xCdt.ref.length * yCdt.ref.length)

                let factor = 0;
                factor += (prioType2Factor.get(xCdt.type) || 0);
                factor += (prioType2Factor.get(yCdt.type) || 0);

                // score，根据deltaT、dis、topoDis 
                score = (deltaT + dis + topoDis) * factor
                xysTuple.push([xCdt, yCdt, score]);
            }
        }

        xysTuple.sort((a, b)=>{
            if(a[2] == b[2]){
                return 0;
            }
            if(a[2] < b[2]){
                return -1;
            }
            return 1;
        })
        console.log(xysTuple)
        for(let tp of xysTuple){
            console.log(`${tp[0].val.val}-${tp[0].type}-${tp[0].ref[0].element.name} ${tp[1].val.val}-${tp[1].type}-${tp[1].ref[0].element.name} ${tp[2]}`)
        }

        let posSet:Set<number> = new Set();
        for(let tp of xysTuple){
            let posId:number = tp[0].val.val * 10000 + tp[1].val.val;
            if(posSet.has(posId)){
                continue;
            }
            posSet.add(posId);
            let invalid:boolean = false;
            for(let ele of this.elements.values()){
                if(ele.isConflictWithPoint(tp[0].val.val, tp[1].val.val)){
                    this.nextInvalid.push(tp);
                    invalid = true;
                    break;
                }
            }
            if(!invalid){
                this.nextValid.push(tp);
            }
        }
        // 选择score最大的位置进行绘制
        let mostPossible = this.nextValid[0];
        this.addElementByPrio(mostPossible[0], mostPossible[1]);
        this.crtPrioPos = 0;
    }

    addElementByPrio(xpc: PrioResultCandidate, ypc: PrioResultCandidate){
        let newEle = this.createElement(ElementType.RECTANGLE, `newEle-${Date.now()}`);
        this.crtPrioEle = this.getElement(newEle);
        this.addAttribute(newEle, "x", new RawNumber(0));
        this.addAttribute(newEle, "y", new RawNumber(0));
        let xArgs = [];
        for(let attrX of xpc.rel.args){
            if(attrX.element == TMP){
                this.addAttribute(0, attrX.name, attrX.val);
                xArgs.push(this.getAttribute(0, attrX.name));
            } else {
                xArgs.push(attrX);
            }
        }
        let yArgs = [];
        for(let attrY of ypc.rel.args){
            if(attrY.element == TMP){
                this.addAttribute(0, attrY.name, attrY.val);
                yArgs.push(this.getAttribute(0, attrY.name));
            } else {
                yArgs.push(attrY);
            }
        }
        this.addRelationship(xpc.rel.func.deepCopy(), xArgs, this.getAttribute(newEle, 'x'));
        this.addRelationship(ypc.rel.func.deepCopy(), yArgs, this.getAttribute(newEle, 'y'));
    }

    calculateAttributeDis(attr1: Attribute, attr2:Attribute):number{
        let score = 1000000;
        let visitedAttrSet: Set<Attribute> = new Set();
        visitedAttrSet.add(attr1);
        let queue:Array<[Attribute, number]> = [[attr1, 0]];  // 当前的attribute及其距离
        for(let i = 0; i < queue.length; ++ i){
            let crt = queue[i];
            let crtAttr = crt[0];
            let crtDis = crt[1];
            if(crtAttr === attr2){
                return crtDis;
            }

            // 每个单位的dis有3种可能：1）从属于同一个element；2）from/to的关系；
            // 可能可以考虑使用：3）作为相同的输入
            // 1）
            let crtElement = crtAttr.element;
            crtElement.attributes.forEach((v) => {
                if(visitedAttrSet.has(v)){
                    return;
                }
                visitedAttrSet.add(v);
                queue.push([v, crtDis + 1]);
            });
            // 2)
            let fromRel = crtAttr.fromRelationship;
            if(fromRel != undefined){
                for(let inputAttr of fromRel.args){
                    if(visitedAttrSet.has(inputAttr)){
                        continue;
                    }
                    visitedAttrSet.add(inputAttr);
                    queue.push([inputAttr, crtDis + 1]);
                }
            }

            let toRels = crtAttr.toRelationships;
            if(toRels != undefined){
                for(let toRel of toRels){
                    let tgtAttr = toRel.target;
                    if(visitedAttrSet.has(tgtAttr)){
                        continue;
                    }
                    visitedAttrSet.add(tgtAttr);
                    queue.push([tgtAttr, crtDis + 1]);
                }
            }
        }
        // 没有找到，则是最远距离+1
        return queue[queue.length - 1][1] + 1;
    }

    estimate_next_post(){
        this.nextValid = [];
        this.nextInvalid = [];
        this.nextValidPost = [];
        this.nextInvalidPost = [];
        this.crtPostPos = -1;
        this.crtPrioPos = -1;
        this.crtPostEle = undefined;
        this.crtPrioEle = undefined;

        let nextElement = new SingleElement(-1, ElementType.RECTANGLE);
        nextElement.attributes.set('x', new Attribute('x', new RawNumber(0), nextElement));
        nextElement.attributes.set('y', new Attribute('y', new RawNumber(0), nextElement));
        /*
        对于某一个待定的属性，找到其中包含它的所有的关系
        */
        let pcXs = this.genPostCandidate(nextElement.getAttribute('x')!);
        let pcYs = this.genPostCandidate(nextElement.getAttribute('y')!);

        let positionPool = this.generateBestPostComb(nextElement, pcXs, pcYs);

        console.log(positionPool);
        let posSet: Set<number> = new Set();
        for(let tp of positionPool){
            let posId:number = tp[0].val.val * 10000 + tp[1].val.val;
            if(posSet.has(posId)){
                continue;
            }

            posSet.add(posId);

            let invalid:boolean = false;
            for(let ele of this.elements.values()){
                if(ele.isConflictWithPoint(tp[0].val.val, tp[1].val.val)){
                    this.nextInvalidPost.push(tp);
                    invalid = true;
                    break;
                }
            }
            if(!invalid){
                this.nextValidPost.push(tp);
            }
        }

        this.crtPostPos = 0;
        this.addElementByPost(this.nextValidPost[0][0], this.nextValidPost[0][1]);
    }

    generateBestPostComb(nextElement: SingleElement, pcXs: PostResultCandidate[], pcYs: PostResultCandidate[]){
        let positionPool: Array<[PostResultCandidate, PostResultCandidate, number, number, number, number, number, number]> = [];
        for(let pcX of pcXs){
            let nonConstArgsNumInX = count(pcX.newRel.args, (item)=>(item.element.id != 0));
            let avgArgTimeX = pcX.newRel.args.map((x)=>(x.timestamp)).reduce((pv, cv)=>(pv+cv)) / pcX.newRel.args.length;
            let avgXInXArgs = nonConstArgsNumInX === 0? 0:pcX.newRel.args
                    .flatMap((attr)=>(!attr.element.attributes.has('x')? []: [attr.element.getAttribute('x')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInX;
                
            let avgYInXArgs = nonConstArgsNumInX === 0? 0:pcX.newRel.args
                .flatMap((attr)=>(!attr.element.attributes.has('y')? []: [attr.element.getAttribute('y')!.val.val]))
                .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInX;
            
            for(let pcY of pcYs){
                // 计算当前的分数
                let nonConstArgsNumInY = count(pcY.newRel.args, (item)=>(item.element.id != 0));
                let score = -1;
                // 时间，也就是新加入的元素和所有被用来计算的元素直接时间差小
                let avgArgTimeY = pcY.newRel.args.map((x)=>(x.timestamp)).reduce((pv, cv)=>(pv+cv)) / pcY.newRel.args.length;
                let deltaT = Math.abs(pcX.newRel.target.timestamp - avgArgTimeX) + Math.abs(pcY.newRel.target.timestamp - avgArgTimeY);
                deltaT /= 1000;

                // 对于后验关系，关系本身的时间也是很重要的
                let deltaRelT = Math.abs(pcX.oriRel.timestamp - nextElement.timestamp);
                deltaRelT += Math.abs(pcY.oriRel.timestamp - nextElement.timestamp);
                deltaRelT /= 1000;

                let avgXInYArgs = nonConstArgsNumInY === 0? 0:pcY.newRel.args
                    .flatMap((attr)=>(!attr.element.attributes.has('x')? []: [attr.element.getAttribute('x')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;
                
                let avgYInYArgs = nonConstArgsNumInY === 0? 0:pcY.newRel.args
                    .flatMap((attr)=>(!attr.element.attributes.has('y')? []: [attr.element.getAttribute('y')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;

                let dis = Math.sqrt((avgXInXArgs - pcX.val.val) ** 2 + (avgYInXArgs - pcY.val.val) ** 2) 
                    + Math.sqrt((avgXInYArgs - pcX.val.val) ** 2 + (avgYInYArgs - pcY.val.val) ** 2);
                
                dis /= 100

                let topoDis = 0;
                for(let xRef of pcX.newRel.args){
                    for(let yRef of pcY.newRel.args){
                        topoDis += this.calculateAttributeDis(xRef, yRef);
                    }
                }
                topoDis /= (pcX.newRel.args.length * pcX.newRel.args.length)
                // 如果本来这两个relationship就是为同一个对象服务的，可以有认为更加可能
                let factor = 1;
                if(pcX.oriRel.target.element !== pcY.oriRel.target.element){
                    factor = 2;
                }

                // 不希望涉及过多的元素
                let oriRelType:Set<SingleElement> = new Set(pcX.oriRel.args.map(x=>x.element));
                pcY.oriRel.args.forEach((a)=>{oriRelType.add(a.element)});

                let newRelType:Set<SingleElement> = new Set(pcX.newRel.args.map(x=>x.element));
                pcY.newRel.args.forEach((a)=>{newRelType.add(a.element)});

                factor *= (1 + Math.abs(oriRelType.size - newRelType.size) / Math.min(oriRelType.size, newRelType.size))
                factor *= (pcX.keepLeft === pcY.keepLeft? 1: 2);

                score = (deltaT + dis + topoDis + deltaRelT) * factor;
                positionPool.push([pcX, pcY, score, factor, deltaT, dis, topoDis, deltaRelT]);
           }
        }

        positionPool.sort((a, b)=>{
            if(a[2] == b[2]){
                return 0;
            }

            if(a[2] < b[2]){
                return -1;
            }
            return 1;
        })

        return positionPool;
    }

    addElementByPost(xpc: PostResultCandidate, ypc: PostResultCandidate){
        let newEle = this.createElement(ElementType.RECTANGLE, `newEle-${Date.now()}`);
        this.crtPostEle = this.getElement(newEle);
        this.addAttribute(newEle, "x", new RawNumber(0));
        this.addAttribute(newEle, "y", new RawNumber(0));
        let xArgs = [... xpc.newRel.args];
        let yArgs = [... ypc.newRel.args];
        this.addRelationship(xpc.newRel.func.deepCopy(), xArgs, this.getAttribute(newEle, 'x'));
        this.addRelationship(ypc.newRel.func.deepCopy(), yArgs, this.getAttribute(newEle, 'y'));
    }

    genPostCandidate(tgtAttr: Attribute):PostResultCandidate[]{
        let allRels = this.getAllRelations();
        let results:[Relationship, number[]][] = [];
        let genRes:PostResultCandidate[] = [];
        for(let rel of allRels){
            let pos = [];
            if(tgtAttr.isSameAttribute(rel.target)){
                pos.push(-1)
            }

            rel.args.forEach((a, idx)=>{
                if(tgtAttr.isSameAttribute(a)){
                    pos.push(idx);
                }
            })
            if(pos.length > 0){
                results.push([rel, pos])
            }
        }

        for(let info of results){
            // info：relation，目标属性在relation中可能的位置
            for(let tgtPos of info[1]){
                if(tgtPos == -1){
                    // 目标属性在等号的左侧
                    let candidateArgs:Array<Attribute[]> = info[0].args.map((crtAttr, idx)=>{
                        if(info[0].cal_arg_depth(idx) > MAX_POST_DEPTH){
                            return [crtAttr] // 过于深的位置就不允许替换
                        }
                        return this.getAllSameAttr(crtAttr, [tgtAttr]);
                    })

                    let allArgSeq = getAllCase(candidateArgs);
                    let indexMapping = [-1];
                    for(let i = 0; i < info[0].args.length; ++ i){
                        indexMapping.push(i);   // 没有调整，恒等映射
                    }
                    for(let argList of allArgSeq){
                        let newRel = new Relationship(info[0].func.deepCopy(), argList, tgtAttr);
                        let crtCandidate = new PostResultCandidate(info[0], newRel, indexMapping, true);
                        if(!crtCandidate.isInvalid()){
                            genRes.push(crtCandidate);
                        }
                    }
                } else {
                    let depth = info[0].cal_arg_depth(tgtPos)
                    if(depth > MAX_POST_DEPTH){
                        continue
                    }
                    let [newRel, indexMap] = info[0].transform(tgtPos);
                    let candidateArgs:Array<Attribute[]> = newRel.args.map((crtAttr, idx)=>{
                        if(newRel.cal_arg_depth(idx) > MAX_POST_DEPTH){
                            return [crtAttr] // 过于深的位置不替换
                        }
                        return this.getAllSameAttr(crtAttr, [tgtAttr]);
                    });
                    let allArgSeq = getAllCase(candidateArgs);
                    for(let argList of allArgSeq){
                        let newRelCopied = new Relationship(newRel.func.deepCopy(), argList, tgtAttr);
                        let crtCandidate = new PostResultCandidate(info[0], newRelCopied, indexMap, false)
                        if(!crtCandidate.isInvalid()){
                            genRes.push(crtCandidate);
                        }
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

        let addedValues: Set<number> = new Set();
        let uniqueRes: PostResultCandidate[] = [];
        genRes.forEach(pc=>{
            if(addedValues.has(pc.val.val)){
                return;
            }

            uniqueRes.push(pc);
            addedValues.add(pc.val.val);
        })

        return uniqueRes;
    }

    getAllRelations():Array<Relationship>{
        let result: Relationship[] = [];
        for(let ele of this.elements.values()){
            if(ele.id === 0){
                continue;
            }
            ele.attributes.forEach((attr, _attrName)=>{
                if(attr.fromRelationship != null){
                    result.push(attr.fromRelationship);
                }
            })
        }
        return result;
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

    moveToNextPrio(){
        if(this.crtPrioPos < 0 || this.crtPrioEle == null){
            return;
        }
        if(!this.deleteElement(this.crtPrioEle.id)){
            return;
        }

        this.crtPrioPos = (this.crtPrioPos + 1) % 10;
        this.addElementByPrio(this.nextValid[this.crtPrioPos][0], this.nextValid[this.crtPrioPos][1])
    }

    moveToNextPost(){
        if(this.crtPostPos < 0 || this.crtPostEle == null){
            return;
        }
        if(!this.deleteElement(this.crtPostEle.id)){
            return;
        }
        this.crtPostPos = (this.crtPostPos + 1) % Math.min(10, this.nextValidPost.length);
        this.addElementByPost(this.nextValidPost[this.crtPostPos][0], this.nextValidPost[this.crtPostPos][1])
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

    generate_relation_matrix(attrList: Attribute[], new_relations: Relationship[]):[number[][], number[], Relationship[]]{
        // 仅仅对新关系进行了加权
        let rel_matrix: number[][] = [];
        let rel_val: number[] = [];

        let modified_tgts = new_relations.map(x=>x.target);
        let relation_list: Relationship[] = [];
        for(let attr of attrList){
            if(attr.fromRelationship == null){
                // console.log(`null from result for ${attr.element.name}.${attr.name}`)
                continue;
            }

            // if(modified_tgts.includes(attr)){
            //     continue
            // }

            let mat = attr.fromRelationship.convertToVector(attrList)

            // todo：计算矩阵系数

            rel_matrix.push(mat.slice(0, -1))
            rel_val.push(- mat[mat.length - 1])
            relation_list.push(attr.fromRelationship)
        }

        for(let newRel of new_relations){
            let mat = newRel.convertToVector(attrList);
            // 加权
            mat = mat.map(x=>x * 10000);
            rel_matrix.push(mat.slice(0, -1))
            rel_val.push(- mat[mat.length - 1])
        }

        return [rel_matrix, rel_val, relation_list]
    }

    generate_value_matrix(attrList: Attribute[], new_attr_values: Map<Attribute, number>|null): [number[][], number[]]{
        let A: number[][] = []; // 系数
        let B: number[] = []; // 值

        for(let attr of attrList){
            if(new_attr_values!.has(attr)){
                let crtA = attrList.map((attr1)=>(attr === attr1? 1000000: 0));
                A.push(crtA);
                B.push(new_attr_values!.get(attr)! * 1000000)
            } else {
                // let l = Math.sqrt(1 + attr.val.val ** 2)
                let l = 1;
                let crtA = attrList.map((attr1)=>(attr === attr1? 1 / l:0));
                
                A.push(crtA);
                B.push(attr.val.val / l)
            }
        }
        // let A_weighted = A.map(x=>{
        //     return x.map(xx=>xx*0.01);
        // });

        // let B_weighted = B.map(x=>x*0.01);
        // return [A_weighted, B_weighted];
        return [A, B]
    }

    async cal_contents(new_attr_values: Map<Attribute, number>, 
        new_relations: Relationship[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[]): Promise<[Attribute[], number[][], number[]]>{

        let attrList = this.get_all_attributes();
        let rel_res = this.generate_relation_matrix(attrList, new_relations);
        let val_res = this.generate_value_matrix(attrList, new_attr_values);

        let changedAttrs = new Set(inferChangedAttr);

        let unchangedAttrs = new Set(unchangedAttr);

        let inferUnchangedConst = new Set();

        rel_res[2].forEach((rel, idx)=>{
            let involved_attrs = [rel.target];
            involved_attrs.push(... rel.args);


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
                rel_res[0][idx] = rel_res[0][idx].map(x=>x * 100);
                rel_res[1][idx] *= 100;
                
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
                rel_res[0][idx] = rel_res[0][idx].map(x=>x * 100);
                rel_res[1][idx] *= 100;
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

        
        let res = await axios.post('http://localhost:12345/solve', {
            attr_number: attrList.length,
            rel_coef: rel_res[0],
            rel_res: rel_res[1],
            val_coef: val_res[0],
            val_res: val_res[1]
        })
        console.log(res.data)
        let err: number[] = res.data['err'];
        let newVals: number[][] = res.data['res'];

        // 对 newVals去重
        let candidateValues = [];
        let candidateErrors = [];
        let addedValues: Set<string> = new Set();
        for(let i = 0; i < newVals.length; ++ i){
            let oneGroup = newVals[i];
            let crtErr = err[i];
            let eleAttrVals: number[] = [];
            let element_to_pos:Map<SingleElement, [number, number]> = new Map();
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
                continue;
            }

            addedValues.add(valsId);
            candidateValues.push(oneGroup.slice());
            candidateErrors.push(crtErr);
        }
        
        return [attrList, candidateValues, candidateErrors];
    }

    async update_contents(new_attr_values: Map<Attribute, number>, 
        new_relations: Relationship[],
        unchangedAttr: Attribute[], 
        inferChangedAttr: Attribute[]){
        
        let res = await this.cal_contents(new_attr_values, new_relations, unchangedAttr, inferChangedAttr);
        this.attrList = res[0].slice()
        this.candidateValues = res[1].slice();
        this.crtCdtIdx = 0;
        
        // 更新基础的取值
        this.update_attr()
        // todo: 对整体的取值进行更新
        
    }

    update_attr(){
        // todo: 判断哪些关系发生了改变？？？
        let newVals = this.candidateValues[this.crtCdtIdx]
        this.attrList.forEach((attr, idx)=>{
            let newVal = newVals[idx];
            attr.val.val = newVal;
        })
    }

    nextSolution(){
        this.crtCdtIdx = (this.crtCdtIdx + 1) % this.candidateValues.length;
        this.update_attr()
    }

    async handleUserCommand(trace: Array<Array<[number, number]>>, traceEleRelation: string, newEleRel: string){
        if(traceEleRelation.includes('new') || newEleRel.includes('new')){
            await this.handleUserAdd(trace, traceEleRelation, newEleRel);
        }
    }

    async handleUserAdd(RawTraces: Array<Array<[number, number]>>, traceEleRelation: string, newEleRel?: string){
        if(newEleRel == null){
            newEleRel = "";
        }
        
        let nextElementId = this.createElement(ElementType.RECTANGLE);
        this.addAttribute(nextElementId, 'x', new RawNumber(0));
        this.addAttribute(nextElementId, 'y', new RawNumber(0));
        
        let nextElement = this.getElement(nextElementId);
        let xAttr = nextElement.getAttribute('x')!;
        let yAttr = nextElement.getAttribute('y')!;
        
        newEleRel = newEleRel.replaceAll('new', `${nextElementId}`)

        let newRelInExpr = newEleRel.length === 0? []: newEleRel.split(';').map((oneExprStr)=>{
            return parseNewRelation(this, oneExprStr);
        })

        // 判断哪个属性是需要进行推测的，也就是找到用户已经实际给出的内容
        // 暂时先仅考虑后验概率
        let pcXs: Array<PostResultCandidate|undefined> = [];
        let pcYs: Array<PostResultCandidate|undefined> = [];

        if(traceEleRelation.includes('x_new')){
            pcXs = this.genPostCandidate(nextElement.getAttribute('x')!);
        } else {
            pcXs = [undefined];
        }

        if(traceEleRelation.includes('y_new')) {
            pcYs = this.genPostCandidate(nextElement.getAttribute('y')!);
        } else {
            pcYs = [undefined];
        }


        let combCandidate: Array<[Attribute[], number[], number]> = []; // 属性列表、属性取值、误差

        for(let pcX of pcXs){
            for(let pcY of pcYs){
                let new_attr_values: Map<Attribute, number> = new Map();
                let new_relations: Relationship[] = [];
                let unchangedAttr: Attribute[] = [];
                let inferChangedAttr: Attribute[] = [xAttr, yAttr]; // 
                if(pcX != null){
                    new_relations.push(pcX.newRel);
                }

                if(pcY != null){
                    new_relations.push(pcY.newRel);
                }

                new_relations.push(...newRelInExpr);
                // calculate
                let cal_res = await this.cal_contents(new_attr_values, new_relations, unchangedAttr, inferChangedAttr);
                let attrList = cal_res[0];
                let attrValues = cal_res[1];
                let errors = cal_res[2];
                // todo: 进一步调整errors，根据pc的dis
                // 很有可能在这里增加一些交叉项
                errors = errors.map((e)=>{
                    if(pcX != null){
                        e += pcX.calDis();
                    }

                    if(pcY != null){
                        e += pcY.calDis();
                    }
                    return e;
                })

                assert(attrValues.length === errors.length);
                for(let i = 0; i < attrValues.length; i ++){
                    combCandidate.push([attrList, attrValues[i], errors[i]]);
                }
            }
        }

        // let positionPool = this.generateBestPostComb(nextElement, pcXs, pcYs);
        
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
                let attrList = onePosCandidate[0];
                let attrV = onePosCandidate[1];
                // let error = onePosCandidate[2];
                onePosCandidate[2] *= (1 + Math.abs(trace.center[tgtAttrIdx] - attrV[attrList.indexOf(tgtAttr)]));
            }
        }

        combCandidate = combCandidate.sort((a, b)=>{
            if(a[2] < b[2]){
                return -1;
            } else if(a[2] === b[2]){
                return 0;
            }
            return 1;
        })

        
        this.attrList = combCandidate[0][0];
        this.candidateValues = combCandidate.map(x=>x[1]);
        this.crtCdtIdx = 0;
        
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

export { String2OP, Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Attribute, Controller, Relationship, AssignOp};
