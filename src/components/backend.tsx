import {getAllCase, count} from './utility'
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
    timestamp: Date;
    fromRelationship?: Relationship;
    toRelationships?: Relationship[];
    constructor(_name: string, _val: Value, _element: SingleElement, _fromRelationship?: Relationship, _toRelationships?: Relationship[]) {
        this.name = _name;
        this.val = _val;
        this.element = _element;
        this.fromRelationship = _fromRelationship;
        this.toRelationships = _toRelationships;
        this.timestamp = new Date();
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
    CONST,
    RECTANGLE,
    TMP
}

class SingleElement {
    id: number;
    name?: string;
    type: ElementType;
    attributes: Map<string, Attribute>;
    timestamp: Date;
    constructor(_id: number, _type: ElementType, _name?: string) {
        this.id = _id;
        this.type = _type;
        this.name = _name;
        this.attributes = new Map<string, Attribute>();
        this.timestamp = new Date();
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
        if(this.type === ElementType.CONST || this.type === ElementType.TMP){
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

class Relationship {
    func: FuncTree;
    args: Attribute[];
    target: Attribute;
    type?: RelationshipType;
    level?: number;
    timestamp: Date;
    constructor(_func: FuncTree, _args: Attribute[], _target: Attribute, _type?: RelationshipType, _level?: number) {
        this.func = _func;
        this.args = _args;
        this.target = _target;
        this.type = _type;
        this.level = _level;
        this.timestamp = new Date();
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
                if (this.args[pointer].element.name != null) {
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
        return debugAtNode(this.func.root);
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

class PostResultCandidate {
    oriRel:Relationship;
    newRel: Relationship;
    oriAttributes: Attribute[];
    newAttributesInOriOrder: Attribute[];  // 根据原始关系中的顺序，所对应的新关系中的顺序；
    // 可以更加方便地计算相似度
    indexMapping: number[];
    val: Value;
    constructor(_oriRel: Relationship, _newRel: Relationship, _indexMapping: number[]){
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
    }

    isInvalid():boolean {
        return this.val.val < 0;
    }
}

class Controller {
    elements: SingleElement[];
    idAllocator: number;
    constAllocator: number;

    nextValid:Array<[PrioResultCandidate, PrioResultCandidate, number]>;
    nextInvalid:Array<[PrioResultCandidate, PrioResultCandidate, number]>;

    nextValidPost:Array<[PostResultCandidate, PostResultCandidate, number]>;
    nextInvalidPost:Array<[PostResultCandidate, PostResultCandidate, number]>;

    constructor() {
        this.elements = new Array<SingleElement>();
        let constElement = new SingleElement(0, ElementType.CONST, "const");
        this.elements.push(constElement);
        this.idAllocator = 1;
        this.constAllocator = 0;
        this.nextValid = [];
        this.nextInvalid = [];
        this.addAttribute(0, 'const_dis', new RawNumber(PREDEFINE_DIS));
        this.nextValidPost = [];
        this.nextInvalidPost = [];
    }

    getConstAttr(name: string): Attribute{
        return this.getAttribute(0, name);
    }

    createElement(_type: ElementType, _name?: string): number {
        // return element id
        let newElement = new SingleElement(this.idAllocator, _type, _name);
        this.idAllocator++;
        this.elements.push(newElement);
        return this.idAllocator - 1;
    }
    getElement(_id: number): SingleElement {
        if (this.elements.length > _id) {
            return this.elements[_id];
        } else {
            throw Error("error element");
        }
    }
    addAttribute(_id: number, _name: string, _val: Value) {
        let newAttribute = new Attribute(_name, _val, this.elements[_id]);
        this.elements[_id].addAttribute(newAttribute);
    }
    getAttribute(_id: number, _name: string): Attribute {
        let attr = this.elements[_id].attributes.get(_name);
        if (attr != undefined) {
            return attr;
        } else {
            throw Error("not this attribute");
        }
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
            for(let i = 1; i < this.elements.length; ++ i){
                let crtElement = this.elements[i];

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
            let avgTimeX = xCdt.ref.map((x)=>x.element.timestamp).reduce((p, c)=>(p+c.getTime()), 0) / xCdt.ref.length;
            let avgXX = xCdt.ref.map((x)=>x.element.getAttribute('x')).reduce((p, c)=>(p+c?.val.val), 0) / xCdt.ref.length;
            let avgYX = xCdt.ref.map((x)=>x.element.getAttribute('y')).reduce((p, c)=>(p+c?.val.val), 0) / xCdt.ref.length;
            
            for(let yCdt of yCandidates){
                let score = -1;
                let avgTimeY = yCdt.ref.map((x)=>x.timestamp).reduce((p, c)=>(p+c.getTime()), 0) / yCdt.ref.length;
                let avgXY = yCdt.ref.map((x)=>x.element.getAttribute('x')).reduce((p, c)=>(p+c?.val.val), 0) / yCdt.ref.length;
                let avgYY = yCdt.ref.map((x)=>x.element.getAttribute('y')).reduce((p, c)=>(p+c?.val.val), 0) / yCdt.ref.length;

                let deltaT = Math.abs(xCdt.tgt.timestamp.getTime() - avgTimeX) + Math.abs(yCdt.tgt.timestamp.getTime() - avgTimeY);
                deltaT /= 1000;

                let dis = Math.sqrt((avgXX - xCdt.val.val) ** 2 + (avgYX - yCdt.val.val) ** 2);
                dis += Math.sqrt((avgXY - xCdt.val.val) ** 2 + (avgYY - yCdt.val.val) ** 2);

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

        this.nextValid = [];
        this.nextInvalid = [];
        for(let tp of xysTuple){
            let invalid:boolean = false;
            for(let ele of this.elements){
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
    }

    addElementByPrio(xpc: PrioResultCandidate, ypc: PrioResultCandidate){
        let newEle = this.createElement(ElementType.RECTANGLE, `newEle-${Date.now()}`);
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

        let nextElement = new SingleElement(-1, ElementType.RECTANGLE);
        nextElement.attributes.set('x', new Attribute('x', new RawNumber(0), nextElement));
        nextElement.attributes.set('y', new Attribute('y', new RawNumber(0), nextElement));
        /*
        对于某一个待定的属性，找到其中包含它的所有的关系
        */
        let pcXs = this.genPostCandidate(nextElement.getAttribute('x')!);
        let pcYs = this.genPostCandidate(nextElement.getAttribute('y')!);

        let positionPool: Array<[PostResultCandidate, PostResultCandidate, number]> = [];
        for(let pcX of pcXs){
            let nonConstArgsNumInY = count(pcX.newRel.args, (item)=>(item.element.id != 0));
            let avgArgTimeX = pcX.newRel.args.map((x)=>(x.timestamp.getTime())).reduce((pv, cv)=>(pv+cv)) / pcX.newRel.args.length;
            let avgXInXArgs = nonConstArgsNumInY === 0? 0:pcX.newRel.args
                    .flatMap((attr)=>(attr.element.id === 0? []: [attr.element.getAttribute('x')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;
                
            let avgYInXArgs = nonConstArgsNumInY === 0? 0:pcX.newRel.args
                .flatMap((attr)=>(attr.element.id === 0? []: [attr.element.getAttribute('y')!.val.val]))
                .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;
            
            for(let pcY of pcYs){
                // 计算当前的分数
                let nonConstArgsNumInY = count(pcY.newRel.args, (item)=>(item.element.id != 0));
                let score = -1;
                // 时间，也就是新加入的元素和所有被用来计算的元素直接时间差小
                let avgArgTimeY = pcY.newRel.args.map((x)=>(x.timestamp.getTime())).reduce((pv, cv)=>(pv+cv)) / pcY.newRel.args.length;
                let deltaT = Math.abs(pcX.newRel.target.timestamp.getTime() - avgArgTimeX) + Math.abs(pcY.newRel.target.timestamp.getTime() - avgArgTimeY);
                deltaT /= 1000;

               
                let avgXInYArgs = nonConstArgsNumInY === 0? 0:pcY.newRel.args
                    .flatMap((attr)=>(attr.element.id === 0? []: [attr.element.getAttribute('x')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;
                
                let avgYInYArgs = nonConstArgsNumInY === 0? 0:pcY.newRel.args
                    .flatMap((attr)=>(attr.element.id === 0? []: [attr.element.getAttribute('y')!.val.val]))
                    .reduce((pv, cv)=>(pv+cv), 0) / nonConstArgsNumInY;

                let dis = Math.sqrt((avgXInXArgs - pcX.val.val) ** 2 + (avgYInXArgs - pcY.val.val) ** 2) 
                    + Math.sqrt((avgXInYArgs - pcX.val.val) ** 2 + (avgYInYArgs - pcY.val.val) ** 2);
                
                let topoDis = 0;
                for(let xRef of pcX.newRel.args){
                    for(let yRef of pcY.newRel.args){
                        topoDis += this.calculateAttributeDis(xRef, yRef);
                    }
                }
                topoDis /= (pcX.newRel.args.length * pcX.newRel.args.length)
                score = deltaT + dis + topoDis;
                positionPool.push([pcX, pcY, score]);
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

        console.log(positionPool);
        for(let tp of positionPool){
            let invalid:boolean = false;
            for(let ele of this.elements){
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

        this.addElementByPost(this.nextValidPost[0][0], this.nextValidPost[0][1]);
    }

    addElementByPost(xpc: PostResultCandidate, ypc: PostResultCandidate){
        let newEle = this.createElement(ElementType.RECTANGLE, `newEle-${Date.now()}`);
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
                    let candidateArgs:Array<Attribute[]> = info[0].args.map((crtAttr)=>{
                        return this.getAllSameAttr(crtAttr);
                    })

                    let allArgSeq = getAllCase(candidateArgs);
                    let indexMapping = [-1];
                    for(let i = 0; i < info[0].args.length; ++ i){
                        indexMapping.push(i);   // 没有调整，恒等映射
                    }
                    for(let argList of allArgSeq){
                        let newRel = new Relationship(info[0].func.deepCopy(), argList, tgtAttr);
                        let crtCandidate = new PostResultCandidate(info[0], newRel, indexMapping);
                        if(!crtCandidate.isInvalid()){
                            genRes.push(crtCandidate);
                        }
                    }
                } else {
                    let [newRel, indexMap] = info[0].transform(tgtPos);
                    let candidateArgs:Array<Attribute[]> = newRel.args.map((crtAttr)=>{
                        return this.getAllSameAttr(crtAttr);
                    });
                    let allArgSeq = getAllCase(candidateArgs);
                    for(let argList of allArgSeq){
                        let newRelCopied = new Relationship(newRel.func.deepCopy(), argList, tgtAttr);
                        let crtCandidate = new PostResultCandidate(info[0], newRelCopied, indexMap)
                        if(!crtCandidate.isInvalid()){
                            genRes.push(crtCandidate);
                        }
                    }
                }

            }
        }

        return genRes;
    }

    getAllRelations():Array<Relationship>{
        let result: Relationship[] = [];
        for(let i = 1; i < this.elements.length; ++ i){
            let ele = this.elements[i];
            ele.attributes.forEach((attr, _attrName)=>{
                if(attr.fromRelationship != null){
                    result.push(attr.fromRelationship);
                }
            })
        }
        return result;
    }

    getAllSameAttr(tgtAttr: Attribute):Attribute[]{
        let res:Attribute[] = [];
        for(let ele of this.elements){ // const 相关也要处理
            ele.attributes.forEach((attr, _name)=>{
                if(tgtAttr.isSameAttribute(attr)){
                    res.push(attr);
                }
            })
        }
        return res;
    }
}

export { Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller };