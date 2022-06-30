enum Operator {
    PLUS,
    MINUS,
    MULTIPLY,
    DEVIDED,
    EQ,
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
}

class OperatorNode {
    op: Operator;
    leftNode: OperatorNode | undefined;
    rightNode: OperatorNode | undefined;
    constructor(_op: Operator, _leftNode?: OperatorNode, _rightNode?: OperatorNode) {
        this.op = _op;
        this.leftNode = _leftNode;
        this.rightNode = _rightNode;
    }
    clone():OperatorNode{
        let c_res = new OperatorNode(this.op, 
            this.leftNode == undefined? undefined: this.leftNode.clone(),
            this.rightNode == undefined? undefined: this.rightNode.clone());
        return c_res;
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
                leftValue = calSubTree(rootNode.leftNode);
            }
            if (rootNode.rightNode == null) {
                if(pointer < args.length){
                    rightValue = args[pointer].val;
                } else {
                    rightValue = new RawNumber(0);
                }
                pointer++;
            } else {
                rightValue = calSubTree(rootNode.rightNode);
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
    argsInOri: Array<Attribute>; // 
    tgtInOri: Attribute; // newArgs 和 newTgt会直接应用于原来的relationship中
    tgt: Attribute // 这个tgt是目标
    newRel: Relationship;
    val: Value;
    constructor(_oriRel: Relationship, _argsInOri: Array<Attribute>, _tgtInOri: Attribute, _tgt: Attribute){
        this.oriRel = _oriRel;
        this.argsInOri = _argsInOri.slice();
        this.tgtInOri = _tgtInOri;
        this.tgt = _tgt;
        assert(this.tgtInOri === this.tgt || this.argsInOri.includes(this.tgt));
        this.newRel = this.oriRel;  // todo: 解方程函数；在relation中已经存储了args
        this.val = this.newRel.func.calculate(this.newRel.args);
    }
}

class Controller {
    elements: SingleElement[];
    idAllocator: number;
    constAllocator: number;

    nextValid:Array<[PrioResultCandidate, PrioResultCandidate, Number]>;
    nextInvalid:Array<[PrioResultCandidate, PrioResultCandidate, Number]>;

    constructor() {
        this.elements = new Array<SingleElement>();
        let constElement = new SingleElement(0, ElementType.CONST, "const");
        this.elements.push(constElement);
        this.idAllocator = 1;
        this.constAllocator = 0;
        this.nextValid = [];
        this.nextInvalid = [];
        this.addAttribute(0, 'const_dis', new RawNumber(PREDEFINE_DIS));
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

        let xysTuple: Array<[PrioResultCandidate, PrioResultCandidate, Number]> = []; // x, y and score
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
        let newEle = this.createElement(ElementType.RECTANGLE, `newEle-${Date.now()}`);
        this.addAttribute(newEle, "x", new RawNumber(0));
        this.addAttribute(newEle, "y", new RawNumber(0));
        this.addRelationship(mostPossible[0].rel.func, mostPossible[0].rel.args, this.getAttribute(newEle, 'x'));
        this.addRelationship(mostPossible[1].rel.func, mostPossible[1].rel.args, this.getAttribute(newEle, 'y'));
        // todo：做一些数据清理的工作，
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
}

export {Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller};