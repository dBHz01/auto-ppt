import assert from 'assert';
import { AssignOp, Attribute, Controller, FuncTree, SingleElement, str2AssignOp, String2OP, allPossibleShape, OperatorNode, Operator } from './components/backend'
class ElementPlaceholder {
    // 表示一个待定的元素
    // 如果不使用指点（useTrace === false），并且属性要求为空，说明用户简单地使用“它”、“这/那”指代
    // useTrace: boolean;
    attrRequires: Map<string, any>;
    actualEle?: SingleElement;
    ref: boolean;
    pos: number;
    end: number;
    constructor(ref: boolean, pos: number, end: number, attrRequires?: Map<string, any>) {
        // this.useTrace = false;
        this.ref = ref;
        this.pos = pos;
        this.end = end;
        if (attrRequires == undefined) {
            this.attrRequires = new Map();
        } else {
            this.attrRequires = new Map(attrRequires.entries())
        }

        this.actualEle = undefined; // 待定
    }

    addRequires(k: string, v: any): ElementPlaceholder {
        this.attrRequires.set(k, v);
        return this;
    }
}

class AttributePlaceholder {
    element?: ElementPlaceholder;
    name?: string;
    actualAttribute?: Attribute;
    constValue?: number;
    constructor(ele?: ElementPlaceholder, attrName?: string, constValue?: number) {
        // 通过判断constValue是否存在来判断类型
        this.element = ele;
        this.name = attrName;
        this.actualAttribute = undefined;
        this.constValue = constValue;
    }

    static constAttr(constValue: number): AttributePlaceholder {
        return new AttributePlaceholder(undefined, undefined, constValue);
    }
}

class EqPlaceholder {
    leftFunc: FuncTree;
    rightFunc: FuncTree;
    leftArgs: AttributePlaceholder[];
    rightArgs: AttributePlaceholder[];
    op: AssignOp;
    constructor(left: FuncTree, right: FuncTree,
        leftArgs: AttributePlaceholder[],
        rightArgs: AttributePlaceholder[], op: AssignOp) {
        this.leftFunc = left;
        this.rightFunc = right;
        this.leftArgs = leftArgs;
        this.rightArgs = rightArgs;
        this.op = op;
    }
}

class NLParser {
    constructor() {

    }

    convertObjToElement(obj: { [key: string]: any }): ElementPlaceholder {
        // console.log(obj);
        let ref: boolean;
        if (obj["type"] === "") {
            ref = false;
        } else if (obj["type"] === "ref") {
            ref = true;
        } else if (obj["type"] === "it") {
            return new ElementPlaceholder(false, obj["pos"], obj["end"]);
        } else {
            throw Error("unknown obj");
        }
        let ele = new ElementPlaceholder(ref, obj["pos"], obj["end"]);
        for (let adj of obj["adj"]) {
            if (adj["type"]) {
                ele.addRequires(adj["type"], adj["val"]);
            }
        }
        return ele;
    }


    convertObjToAttr(obj: { [key: string]: any }): AttributePlaceholder {
        // object D attribute
        // console.log(obj);
        let ele = this.convertObjToElement(obj["obj"]);
        return new AttributePlaceholder(ele, obj["val"]);
    }

    // convertObjToConst(obj: { [key: string]: any }): string {
    //     // 文字、颜色等
    //     // console.log(obj);
    //     switch (obj["adj"][0]["type"]) {
    //         case "color":
    //             return obj["adj"][0]["val"]
    //             break;
        
    //         default:
    //             break;
    //     } 
    // }

    convertValToFunc(val: { [key: string]: any }): [FuncTree, AttributePlaceholder[]] {
        // value: value D const TIME 等
        // object D attribute 此处转化为根节点为eq的functree
        // console.log(val);
        let valToNode = (val: { [key: string]: any }): [OperatorNode, AttributePlaceholder[]] => {
            let newArgs = new Array<AttributePlaceholder>();
            let ret: [OperatorNode, AttributePlaceholder[]];
            let ret_1: [OperatorNode, AttributePlaceholder[]];
            let ret_2: [OperatorNode, AttributePlaceholder[]];
            let newRoot: OperatorNode;
            switch (val["type"]) {
                case "double":
                    let obj_1 = this.convertObjToElement(val['obj_1']);
                    let obj_2 = this.convertObjToElement(val['obj_2']);
                    if (val["val"] === "horidist") {
                        return [new OperatorNode(Operator.MINUS), [new AttributePlaceholder(obj_1, "y"), new AttributePlaceholder(obj_2, "y")]];
                    } else if (val["val"] === "vertidist") {
                        return [new OperatorNode(Operator.MINUS), [new AttributePlaceholder(obj_1, "x"), new AttributePlaceholder(obj_2, "x")]];
                    } else {
                        throw Error("unknown double attribute")
                    }

                case "time":
                    newRoot = new OperatorNode(Operator.MULTIPLY);
                    if (val["val"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val"]["val"]));
                    } else {
                        ret = valToNode(val["val"]);
                        newRoot.leftNode = ret[0];
                        for (let i of ret[1]) {
                            newArgs.push(i);
                        }
                    }
                    newArgs.push(AttributePlaceholder.constAttr(val["const"]));
                    return [newRoot, newArgs];

                case "fraction":
                    newRoot = new OperatorNode(Operator.DEVIDED);
                    if (val["val"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val"]["val"]));
                    } else {
                        ret = valToNode(val["val"]);
                        newRoot.leftNode = ret[0];
                        for (let i of ret[1]) {
                            newArgs.push(i);
                        }
                    }
                    newArgs.push(AttributePlaceholder.constAttr(val["const"]));
                    return [newRoot, newArgs];

                case "diff":
                    newRoot = new OperatorNode(Operator.MINUS);
                    if (val["val_1"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val_1"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val_1"]["val"]));
                    } else {
                        ret_1 = valToNode(val["val_1"]);
                        newRoot.leftNode = ret_1[0];
                        for (let i of ret_1[1]) {
                            newArgs.push(i);
                        }
                    }
                    if (val["val_2"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val_2"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val_2"]["val"]));
                    } else {
                        ret_2 = valToNode(val["val_2"]);
                        newRoot.rightNode = ret_2[0];
                        for (let i of ret_2[1]) {
                            newArgs.push(i);
                        }
                    }
                    return [newRoot, newArgs];

                case "sum":
                    newRoot = new OperatorNode(Operator.PLUS);
                    if (val["val_1"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val_1"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val_1"]["val"]));
                    } else {
                        ret_1 = valToNode(val["val_1"]);
                        newRoot.leftNode = ret_1[0];
                        for (let i of ret_1[1]) {
                            newArgs.push(i);
                        }
                    }
                    if (val["val_2"]["type"] === "single") {
                        let obj = this.convertObjToElement(val["val_2"]["obj"]);
                        newArgs.push(new AttributePlaceholder(obj, val["val_2"]["val"]));
                    } else {
                        ret_2 = valToNode(val["val_2"]);
                        newRoot.rightNode = ret_2[0];
                        for (let i of ret_2[1]) {
                            newArgs.push(i);
                        }
                    }
                    return [newRoot, newArgs];

                default:
                    throw Error("unknown type");
            }
        }
        if (val["type"] === "single") {
            return [FuncTree.simpleEq(), [this.convertObjToAttr(val['obj'])]];
        } else {
            let retNode = valToNode(val);
            return [new FuncTree(retNode[0], retNode[1].length), retNode[1]];
        }
        // switch (val["type"]) {
        //     case "single":
        //         return [FuncTree.simpleEq(), [this.convertObjToAttr(val['obj'])]];

        //     case "double":
        //         if (val["val"] === "")
        //         return [FuncTree.simpleMinus(), [this.convertObjToAttr(val['obj'])]];

        //     default:
        //         break;
        // }
        // return [FuncTree.simpleEq(), [this.convertObjToAttr(val['tmp'])]]
    }

    convertRelationToEq(relation: { [key: string]: any }): EqPlaceholder {
        // relation: value EQUAL value 等
        // 可能会有多个eq
        // console.log(relation);
        if (relation["type"] === "equation") {
            let leftObj = this.convertValToFunc(relation['val_1']);
            let rightObj = this.convertValToFunc(relation['val_2']);
            let op = str2AssignOp(relation['op']) || AssignOp.eq;
            return new EqPlaceholder(
                leftObj[0], rightObj[0], leftObj[1], rightObj[1], op
            )
        } else if (relation["type"] === "direction") {
            switch (relation["direction"]) {
                case "left":
                    return new EqPlaceholder(
                        FuncTree.simpleEq(), FuncTree.simpleEq(),
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_1"]), "x")],
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_2"]), "x")],
                        AssignOp.lt
                    );

                case "right":
                    return new EqPlaceholder(
                        FuncTree.simpleEq(), FuncTree.simpleEq(),
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_1"]), "x")],
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_2"]), "x")],
                        AssignOp.gt
                    );

                case "up":
                    return new EqPlaceholder(
                        FuncTree.simpleEq(), FuncTree.simpleEq(),
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_1"]), "y")],
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_2"]), "y")],
                        AssignOp.lt
                    );

                case "down":
                    return new EqPlaceholder(
                        FuncTree.simpleEq(), FuncTree.simpleEq(),
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_1"]), "y")],
                        [new AttributePlaceholder(this.convertObjToElement(relation["obj_2"]), "y")],
                        AssignOp.gt
                    );

                default:
                    throw Error("error direction");
            }
        } else {
            throw Error("unknown type");
        }
    }

    convertRelationToMap(relation: { [key: string]: any }): Map<AttributePlaceholder, string> {
        console.log(relation);
        let ret = new Map<AttributePlaceholder, string>();
        let leftValue = this.convertObjToAttr(relation["left_value"]);
        let rightValue = relation["right_value"]["val"];
        ret.set(leftValue, rightValue);
        return ret;
    }

    conductOnController(con: Controller, uttrObj: { [key: string]: any }) {

    }
}

class PosToElement {
    static LEFT = 'left';
    static RIGHT = 'right';
    static UP = 'up';
    static DOWN = 'down';
    static CENTER = 'center';
    elements?: ElementPlaceholder[] = [];
    pos?: string;
    posAtSentence?: number; // 只有ref有这一条属性表示在句子中的位置
    endAtSentence?: number; // 只有ref有这一条属性表示在句子中的结尾
}

class ControllerOp {
    isCreate: boolean = false; // 是否新建元素

    targetElement?: ElementPlaceholder;
    targetAttr?: AttributePlaceholder;
    targetRelation?: [FuncTree, AttributePlaceholder[]]; // 比如 A 和 B 之间的水平距离

    // 在/到<位置>; <对象> 和 <对象> 的中点
    pos?: PosToElement;

    // 往<方位>，表示位置的移动
    // 深、浅、大、小，表示非位置属性的变化
    inc: boolean = false;
    dec: boolean = false;

    // 赋成的值
    assignValue?: [FuncTree, AttributePlaceholder[]];

    // 赋成的属性
    assignAttr?: AttributePlaceholder;

    // 赋成的常值(当前仅为string)
    assignConst?: string;

    // 附加条件，仅仅支持对位置属性的运算
    extraEqs?: EqPlaceholder[];
    extraRanges?: EqPlaceholder[];
    extraMap?: Map<AttributePlaceholder, string>;

    static POSSIBLE_ATTRS = ['size', 'height', 'width', 'color', 'text', 'horiloc', 'vertiloc', 'shape'];
    static POSSIBLE_BI_ATTRS = ['horidist', 'vertidist'/*, 'dist'*/];
    constructor(obj: { [key: string]: any }) {
        let nlParser = new NLParser()

        // 解析整体操作类型
        assert(obj['predicate'] != undefined);
        this.isCreate = obj['predicate'] === 'new';

        // 解析操作目标
        assert(obj['target'] != undefined);
        if (obj['target']['val'] === 'loc') {
            this.targetElement = nlParser.convertObjToElement(obj['target']['obj']);
        } else if (ControllerOp.POSSIBLE_ATTRS.includes(obj['target']['val'])) {
            this.targetAttr = nlParser.convertObjToAttr(obj['target'])
        } else if (ControllerOp.POSSIBLE_BI_ATTRS.includes(obj['target']['val'])) {
            this.targetRelation = nlParser.convertValToFunc(obj['target'])
        } else {
            throw Error(`未知的target类型 ${obj['target']['val']}`);
        }

        // 解析元素的目标新建/移动到的位置
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'loc') {
            this.pos = new PosToElement();
            let locObj = obj['adverbial']['loc'];
            if (locObj['type'] === 'single') {
                this.pos.elements = [nlParser.convertObjToElement(locObj['obj'])];
                this.pos.pos = locObj['direction'];
            } else if (locObj['type'] === 'ref') {
                this.pos.posAtSentence = locObj['pos'];
                this.pos.endAtSentence = locObj['end'];
            } else {
                assert(locObj['type'] === 'double' && locObj['loc'] === 'middle');
                this.pos.elements = [
                    nlParser.convertObjToElement(locObj['obj_1']),
                    nlParser.convertObjToElement(locObj['obj_2'])]
                this.pos.pos = PosToElement.CENTER;
            }
        }

        // 解析元素的上下左右的微调
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === "direction") {
            this.inc = obj['adverbial']['direction'] === 'right' || obj['adverbial']['direction'] === 'down';
            this.dec = obj['adverbial']['direction'] === 'left' || obj['adverbial']['direction'] === 'up';
        }

        // 解析副词
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'adverb') {
            this.inc = obj['adverbial']['value'] === 'big' || obj['adverbial']['value'] === 'deep';
            this.dec = obj['adverbial']['value'] === 'small' || obj['adverbial']['value'] === 'shallow';
        }

        // 解析修改为可计算的值
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'computable') {
            this.assignValue = nlParser.convertValToFunc(obj['adverbial']['value']);
        }

        // 解析修改为不可计算的值
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'uncomputable') {
            this.assignAttr = nlParser.convertObjToAttr(obj['adverbial']['value']);
        }

        // 解析修改为xxx（例如：红色）
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'const_value') {
            this.assignValue = obj['adverbial']['value']['adj'][0]['val'];
        }

        // 解析附加条件
        if (obj['conditions'] != undefined) {
            let eqList = new Array<EqPlaceholder>();
            for (let condition of obj['conditions']) {
                if (condition["type"] === "assignment") {
                    if (this.extraMap === undefined) {
                        this.extraMap = new Map<AttributePlaceholder, string>();
                    }
                    let newMap = nlParser.convertRelationToMap(condition);
                    for (let i of newMap.entries()) {
                        this.extraMap.set(i[0], i[1]);
                    }
                    // console.log(this.extraMap);
                } else {
                    eqList.push(nlParser.convertRelationToEq(condition));
                }
            }
            eqList.forEach((eq) => {
                if (eq.op === AssignOp.eq) {
                    if (this.extraEqs == undefined) {
                        this.extraEqs = [];
                    }
                    this.extraEqs.push(eq);
                } else {
                    if (this.extraRanges == undefined) {
                        this.extraRanges = [];
                    }
                    this.extraRanges.push(eq);
                }
            })
        }
    }
}

export { ControllerOp }