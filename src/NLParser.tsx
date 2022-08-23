import assert, { throws } from 'assert';
import { arg, max, min } from 'mathjs';
import { AssignOp, Attribute, Controller, FuncTree, SingleElement, str2AssignOp, String2OP, allPossibleShape, OperatorNode, Operator, Trace, ElementType, RawNumber, Equation } from './components/backend'
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
        if(k === 'shape' || k === 'type'){
            let eleType = ElementType.RECTANGLE;
            if(v === 'circle'){
                eleType = ElementType.CIRCLE;
            }
            this.attrRequires.set('type', eleType);
        }
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

    getActualAttr(){
        return this.element?.actualEle?.getAttribute(this.name!);
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

    toString(){
        let args = [...this.leftArgs, ...this.rightArgs].map((aPh)=>{
            if(aPh.constValue == undefined){
                return aPh.element!.actualEle!.getAttribute(aPh.name!)!;
            } else {
                return Controller.getInstance().searchOrCreateConstByVal(aPh.constValue);
            }
        })
        let actualLeft = args.slice(0, this.leftArgs.length);
        let actualRight = args.slice(this.leftArgs.length);

        let actualEq = new Equation(this.leftFunc, this.rightFunc, actualLeft, actualRight);
        actualEq.assignOp = this.op;
        return actualEq.debug().replaceAll(`${ControllerOp.specialIDForTmpNew}`, 'new');
    }
}

class NLParser {
    allElements: ElementPlaceholder[];

    constructor(_allElements: ElementPlaceholder[]) {
        this.allElements = _allElements;
    }

    convertObjToElement(obj: { [key: string]: any }): ElementPlaceholder {
        // console.log(obj);
        let ref: boolean;
        if (obj["type"] === "") {
            ref = false;
        } else if (obj["type"] === "ref") {
            ref = true;
        } else if (obj["type"] === "it") {
            let ele = new ElementPlaceholder(false, obj["pos"], obj["end"]);
            this.allElements.push(ele);
            return ele;
        } else {
            throw Error("unknown obj");
        }
        let ele = new ElementPlaceholder(ref, obj["pos"], obj["end"]);
        for (let adj of obj["adj"]) {
            if (adj["type"]) {
                ele.addRequires(adj["type"], adj["val"]);
            }
        }
        this.allElements.push(ele);
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
                        return [new OperatorNode(Operator.MINUS), [new AttributePlaceholder(obj_1, "x"), new AttributePlaceholder(obj_2, "x")]];
                    } else if (val["val"] === "vertidist") {
                        return [new OperatorNode(Operator.MINUS), [new AttributePlaceholder(obj_1, "y"), new AttributePlaceholder(obj_2, "y")]];
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
            return [FuncTree.simpleEq(), [this.convertObjToAttr(val)]];
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
    
    toStringExprForEle(tgtEle: ElementPlaceholder, 
        ele2id: Map<ElementPlaceholder, string>, 
        traceUseInfo: Map<ElementPlaceholder| PosToElement, [number, Trace]>){
        if(this.posAtSentence != undefined){
            // 暂时都是等于
            let crtTraceInfo = traceUseInfo.get(this)!;
            let strX = `x_${ele2id.get(tgtEle)} = trace_${crtTraceInfo[0]}`
            let strY = `y_${ele2id.get(tgtEle)} = trace_${crtTraceInfo[0]}`

            return `${strX}; ${strY}`;
        }
        
        if(this.pos === PosToElement.CENTER){
            assert(this.elements?.length === 2);
            // x 和 y 都应该是中点
            let strX = `x_${ele2id.get(this.elements[0])} - x_${ele2id.get(tgtEle)} = x_${ele2id.get(tgtEle)} - x_${ele2id.get(this.elements[1])}`;
            let strY = `y_${ele2id.get(this.elements[0])} - y_${ele2id.get(tgtEle)} = y_${ele2id.get(tgtEle)} - y_${ele2id.get(this.elements[1])}`;
            return `${strX}; ${strY}`;
        }
        assert(this.elements?.length === 1);
        if(this.pos === PosToElement.LEFT){
            return `x_${ele2id.get(tgtEle)} < x_${ele2id.get(this.elements[0])}`;
        }

        if(this.pos === PosToElement.RIGHT){
            return `x_${ele2id.get(tgtEle)} > x_${ele2id.get(this.elements[0])}`;
        }

        if(this.pos === PosToElement.UP){
            return `y_${ele2id.get(tgtEle)} < y_${ele2id.get(this.elements[0])}`;
        }

        if(this.pos === PosToElement.DOWN){
            return `y_${ele2id.get(tgtEle)} > y_${ele2id.get(this.elements[0])}`;
        }

        throw Error('未知的元素-位置类型');
    }
}

class ControllerOp {
    isCreate: boolean = false; // 是否新建元素

    allElements: ElementPlaceholder[];
    targetElement?: ElementPlaceholder;
    targetAttr?: AttributePlaceholder;
    targetRelation?: [FuncTree, AttributePlaceholder[]]; // 比如 A 和 B 之间的水平距离

    // 在/到<位置>; <对象> 和 <对象> 的中点
    pos?: PosToElement;

    // 往<方位>，表示位置的移动
    // 深、浅、大、小，表示非位置属性的变化
    inc: boolean = false;
    dec: boolean = false;

    // 赋成的值（运算）
    assignValue?: [FuncTree, AttributePlaceholder[]];

    // 赋成的属性
    assignAttr?: AttributePlaceholder;

    // 赋成的常值(当前仅为string)
    assignConst?: string;

    // 附加条件，仅仅支持对位置属性的运算
    extraEqs?: EqPlaceholder[];
    extraRanges?: EqPlaceholder[];
    extraMap?: Map<AttributePlaceholder, string>;



    static POSSIBLE_ATTRS = ['size', 'height', 'width', 'color', 'text', 'horiloc', 'vertiloc'];
    static POSSIBLE_BI_ATTRS = ['horidist', 'vertidist'/*, 'dist'*/];
    static specialIDForTmpNew = 65535;
    static tmpNew = new SingleElement(ControllerOp.specialIDForTmpNew, ElementType.RECTANGLE, 'tmpNew');
    
    obj2trace: Map<ElementPlaceholder | PosToElement, [number, Trace]>;
    rawTraces: Array<Array<[number, number]>>;
    traces: Array<Trace>;
    
    constructor(obj: { [key: string]: any }, rawTraces: Array<Array<[number, number]>>) {
        this.allElements = new Array<ElementPlaceholder>();
        let nlParser = new NLParser(this.allElements)

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

        // 解析修改为xx色
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'color') {
            this.assignConst = obj['adverbial']['value'];
        }

        // 解析修改为xxx（文字）
        if (obj['adverbial'] != undefined && obj['adverbial']['type'] === 'text') {
            this.assignConst = obj['adverbial']['value'];
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

        this.rawTraces = rawTraces.map(x=>{
            return [... x];
        })

        this.traces = this.rawTraces.map((x)=>new Trace(x));
        this.obj2trace = this.calObj2trace(this.traces);
    }

    mapPlaceholderToActual(con: Controller, traceUseInfo: Map<ElementPlaceholder|PosToElement, [number, Trace]>){
        // 存储新建元素，用于后续处理
        let createElePh: ElementPlaceholder | undefined = undefined;

        let elePh2id: Map<ElementPlaceholder, string> = new Map();
        let elePhSet: Set<ElementPlaceholder> = new Set();
        let lastIt: string | undefined = undefined;
        if(this.targetElement != undefined){
            if(this.isCreate){
                createElePh = this.targetElement;
                lastIt = 'new';
            }
            elePhSet.add(this.targetElement);
        }

        if(this.targetAttr != undefined && this.targetAttr.element != undefined){
            if(this.isCreate){
                console.warn("是否支持在新建的时候 target 是一个属性？？？");
                createElePh = this.targetAttr.element;
            }
            elePhSet.add(this.targetAttr.element);
        }

        if(this.targetRelation != undefined){
            let attrs = this.targetRelation[1];
            attrs.forEach((attr)=>{
                if(attr.element != undefined){
                    elePhSet.add(attr.element);
                }
            })
        }

        if(this.pos != undefined && this.pos.elements != undefined){
            this.pos.elements.forEach((x)=>{
                elePhSet.add(x);
            })
        }

        if(this.assignValue != undefined){
            let args = this.assignValue[1];
            args.forEach((arg)=>{
                if(arg.element != undefined){
                    elePhSet.add(arg.element);
                }
            })
        }

        if(this.assignAttr != undefined){
            if(this.assignAttr.element != undefined){
                elePhSet.add(this.assignAttr.element);
            }
        }

        let eqs = [];

        if(this.extraEqs != undefined){
            eqs.push(... this.extraEqs);
        }

        if(this.extraRanges != undefined){
            eqs.push(... this.extraRanges);
        }

        eqs.forEach((eq)=>{
            [... eq.leftArgs, ... eq.rightArgs].forEach((arg)=>{
                if(arg.element != undefined){
                    elePhSet.add(arg.element);
                }
            })
        })

        if(this.extraMap != undefined){
            this.extraMap.forEach((_, attrPh)=>{
                if(attrPh.element != undefined){
                    elePhSet.add(attrPh.element);
                }
            })
        }

        let elePhs = [... elePhSet].sort((e1, e2)=>e1.pos - e2.pos);
        let eleIds: string[] = [];
        elePhs.forEach((elePh, idx)=>{
            if(elePh === createElePh){
                eleIds.push('new');
                return;
            }

            let allElements = [... con.elements.values()].filter((ele)=>ele.id > 0);
            // 根据requires筛选所有的元素
            allElements =  allElements.filter((ele)=>this.elementSatisfyRequires(ele, elePh.attrRequires));
            if(allElements.length === 0){
                eleIds.push('UNKNOWN');
                console.warn("没有找到满足条件的元素，具体信息如下：");
                console.warn(elePh);
                return;
            }
            if(! elePh.ref){ // 没有使用路径
                if(elePh.attrRequires.size === 0 && lastIt != undefined){
                    eleIds.push(lastIt);
                    return;
                }

                let possibleNewCreate = createElePh;
                if(possibleNewCreate != undefined){
                    // 检查新生成的元素是否满足
                    if(!this.elementPhSatisfyRequires(possibleNewCreate, elePh.attrRequires)){
                        possibleNewCreate = undefined;
                    }
                }
                if(allElements.length === 1){
                    if(elePh.attrRequires.size === 0){
                        lastIt = `${allElements[0].id}`;
                    }

                    eleIds.push(`${allElements[0].id}`);
                    return;
                }
                // 如果历史指代的和这个表里有重叠，找到最后一个历史指代的
                let allIds = allElements.map((ele)=>`${ele.id}`);
                if(possibleNewCreate != undefined){
                    allIds.push('new');
                }
                for(let refferedId of [... eleIds].reverse()){
                    if(allIds.includes(refferedId)){
                        if(elePh.attrRequires.size === 0){
                            lastIt = refferedId;
                        }

                        eleIds.push(refferedId);
                        return;
                    }
                }
                // 所有找到元素中ts最大的那一个
                if(allIds.includes('new')){
                    // 存在新建的话，必然是最大的
                    eleIds.push('new');
                    if(elePh.attrRequires.size === 0){
                        lastIt = `new`;
                    }
                    return;
                }
                allElements.sort((ele1, ele2)=>ele2.timestamp - ele1.timestamp);
                if(elePh.attrRequires.size === 0){
                    lastIt = `${allElements[0].id}`;
                }
                eleIds.push(`${allElements[0].id}`);
                return;
            } else {
                // 使用路径进行额外的处理
                // 找到与路径中点最近的元素
                // 如果使用路径的话，不可能去指代一个还没有出现的元素
                let crtTrace: Trace = traceUseInfo.get(elePh)![1];
                allElements.sort((ele1, ele2)=>{
                    let dis1 = (ele1.getAttrVal('x', 0) - crtTrace.center[0]) ** 2
                        + (ele1.getAttrVal('y', 0) - crtTrace.center[1]) ** 2;
                    let dis2 = (ele2.getAttrVal('x', 0) - crtTrace.center[0]) ** 2
                    + (ele2.getAttrVal('y', 0) - crtTrace.center[1]) ** 2;

                    return dis1 - dis2;
                })

                eleIds.push(`${allElements[0].id}`)
                return;
            }
        })

        assert(elePhs.length === eleIds.length);
        let phs2id: Map<ElementPlaceholder, string> = new Map();
        elePhs.forEach((ph, idx)=>{
            phs2id.set(ph, eleIds[idx]);

            ph.actualEle = ControllerOp.tmpNew;
            if(!isNaN(Number(eleIds[idx]))){
                ph.actualEle = con.getElement(Number(eleIds[idx]));
            }
        })

        return phs2id;
    }

    elementSatisfyRequires(element: SingleElement, requires: Map<string, any>){
        for(let req of requires){
            let attrName = req[0];
            let attrValue = req[1];
            if(attrName === 'name'){
                attrName = 'text';
            }

            // 做更多的输入文本和内部取值的映射；
            // 也可能是在另外地方处理
            if(element.attributes.get(attrName)?.val.val !== attrValue){
                return false; // 支持模糊筛选？
            }
        }

        return true;
    }

    elementPhSatisfyRequires(element: ElementPlaceholder, requires: Map<string, any>){
        for(let req of requires){
            let attrName = req[0];
            let attrValue = req[1];
            if(attrName === 'name'){
                attrName = 'text';
            }

            // 做更多的输入文本和内部取值的映射；
            // 也可能是在另外地方处理
            if(element.attrRequires.get(attrName) !== attrValue){
                return false; // 支持模糊筛选？
            }
        }

        return true;
    }

    calObj2trace(traces: Trace[]){
        let res: Map<ElementPlaceholder| PosToElement, [number, Trace]> = new Map();
        
        // 将使用路径的元素和具体的路径映射
        let toUseTraceObj: Array<ElementPlaceholder| PosToElement> = [];
        if(this.targetElement?.ref){
            toUseTraceObj.push(this.targetElement);
        }

        if(this.targetAttr?.element?.ref){
            toUseTraceObj.push(this.targetAttr.element);
        }

        if(this.targetRelation != undefined){
            this.targetRelation[1].forEach((attrPh)=>{
                if(attrPh.element?.ref){
                    toUseTraceObj.push(attrPh.element);
                }
            })
        }

        if(this.pos?.posAtSentence){
            toUseTraceObj.push(this.pos);
        }

        if(this.pos?.elements){
            this.pos.elements.forEach((elePh)=>{
                if(elePh.ref){
                    toUseTraceObj.push(elePh);
                }
            })
        }

        if(this.assignValue != undefined){
            this.assignValue[1].forEach((attrPh)=>{
                if(attrPh.element?.ref){
                    toUseTraceObj.push(attrPh.element);
                }
            })
        }

        if(this.assignAttr != undefined){
            if(this.assignAttr.element?.ref){
                toUseTraceObj.push(this.assignAttr.element);
            }
        }

        let eqs = [... (this.extraEqs || []), ... (this.extraRanges || [])];
        eqs.forEach((eq)=>{
            [... eq.leftArgs, ... eq.rightArgs].forEach((arg)=>{
                if(arg.element?.ref){
                    toUseTraceObj.push(arg.element);
                }
            })
        })

        if(this.extraMap != undefined){
            this.extraMap.forEach((_, attrPh)=>{
                if(attrPh.element?.ref){
                    toUseTraceObj.push(attrPh.element);
                }
            })
        }

        assert(toUseTraceObj.length <= traces.length);
        toUseTraceObj.sort((a, b)=>{
            let pos1 = 0;
            if(a instanceof ElementPlaceholder){
                pos1 = a.pos;
            } else {
                pos1 = a.posAtSentence!;
            }

            let pos2 = 0;
            if(b instanceof ElementPlaceholder){
                pos2 = b.pos;
            } else {
                pos2 = b.posAtSentence!;
            }

            return pos1 - pos2;
        })

        toUseTraceObj.forEach((v, idx)=>{
            res.set(v, [idx, traces[idx]]);
        })

        return res
    }

    executeOnControllerNewEle(con: Controller){
        if(!this.isCreate){
            throw Error('期望元素创建指令');
        }

        // 分离指代路径和绘制路径
        let traceUseInfo = this.obj2trace;
        let elePh2id = this.mapPlaceholderToActual(con, traceUseInfo);

        let eqStrings: string[] = [];
        let rangeStrings: string[] = []; 
        let traceEleStrings: string[] = []; // 元素与绘制路径的位置
        let newEleAttrs: Map<string, any> = new Map();

        if(this.targetElement != undefined){
            // 创建元素的初始属性
            this.targetElement.attrRequires.forEach((attrV, attrName)=>{
                if(attrName === 'name'){
                    attrName = 'text';
                }
                newEleAttrs.set(attrName, attrV);
            })

            // 元素位置
            if(this.pos != undefined){
                // 处理位置相关的
                if(this.pos.posAtSentence != undefined){
                    // 描述的是元素和绘制路径之间的关系
                    traceEleStrings.push(this.pos.toStringExprForEle(
                        this.targetElement, elePh2id, traceUseInfo
                    ))
                } else if(this.pos.pos === PosToElement.CENTER){
                    // 说明是属性之间的等于关系
                    eqStrings.push(this.pos.toStringExprForEle(this.targetElement, elePh2id, traceUseInfo));
                } else {
                    // 说明是属性之间的偏序关系
                    rangeStrings.push(this.pos.toStringExprForEle(this.targetElement, elePh2id, traceUseInfo));
                }
            }

            assert(this.inc === false && this.dec === false);

            // 元素不支持直接赋值
            assert(this.assignValue === undefined);
            assert(this.assignAttr === undefined);
            assert(this.assignConst === undefined); 

            if(this.extraEqs != undefined){
                this.extraEqs.forEach((eq)=>{
                    eqStrings.push(eq.toString());
                })
            }

            if(this.extraRanges != undefined){
                this.extraRanges.forEach((eq)=>{
                    rangeStrings.push(eq.toString());
                })
            }

            if(this.extraMap != undefined){
                this.extraMap.forEach((attrVal, attrPh)=>{
                    if(elePh2id.get(attrPh.element!) != 'new'){
                        console.warn("新建过程中仅允许额外调整新建元素的属性");
                        return;
                    }
                    newEleAttrs.set(attrPh.name!, attrVal);
                })
            }
        } else {
            throw Error('新建指令的目标必然要是一个element');
        }

        // 调用controller 对应的函数
        con.handleUserAdd(
            this.rawTraces, traceEleStrings.join(';'), eqStrings.join(';'), rangeStrings.join(';'), newEleAttrs
        );

    }

    executeOnControllerModify(con: Controller){
        if(this.isCreate){
            throw Error('期望元素修改指令');
        }
        // 分离指代路径和绘制路径
        let traceUseInfo = this.obj2trace;
        let elePh2id = this.mapPlaceholderToActual(con, traceUseInfo);
        let eqStrings: string[] = [];
        let rangeStrings: string[] = []; 
        let traceEleStrings: string[] = []; // 元素与绘制路径的位置
        let eleAttrMod: Map<Attribute, any> = new Map(); // attr 必然已经存在
        let elePosMod: Map<Attribute, any> = new Map();

        let forceUnchanged: string[] = [];
        let inferChanged: string[] = [];
        if(this.targetElement != undefined){
            // 位置
            if(this.pos != undefined){
                // 处理位置相关的
                if(this.pos.posAtSentence != undefined){
                    // 描述的是元素和绘制路径之间的关系
                    traceEleStrings.push(this.pos.toStringExprForEle(
                        this.targetElement, elePh2id, traceUseInfo
                    ))
                } else if(this.pos.pos === PosToElement.CENTER){
                    // 说明是属性之间的等于关系
                    eqStrings.push(this.pos.toStringExprForEle(this.targetElement, elePh2id, traceUseInfo));
                } else {
                    // 说明是属性之间的偏序关系
                    rangeStrings.push(this.pos.toStringExprForEle(this.targetElement, elePh2id, traceUseInfo));
                }
            }

            // 一下，必须存在targetAttr时生效
            assert(this.inc === false);
            assert(this.dec === false); 
            assert(this.assignValue == undefined);
            assert(this.assignAttr == undefined);
            assert(this.assignConst == undefined);
        } else if(this.targetAttr != undefined){
            assert(this.pos == undefined); // 
            let actualTgt = this.targetAttr.element!.actualEle!.getAttribute(this.targetAttr.name!)!;
            if(this.inc || this.dec){

                let tgtVal = this.genValForStepChange(actualTgt, this.inc);
                if(actualTgt.name === 'x' || actualTgt.name === 'y'){
                    elePosMod.set(actualTgt, tgtVal);
                } else {
                    eleAttrMod.set(actualTgt, tgtVal);
                }
            }

            if(this.assignValue != undefined){
                assert(this.targetAttr.name === 'x' || this.targetAttr.name === 'y');
                
                let eqPh = new EqPlaceholder(FuncTree.simpleEq(), this.assignValue[0], 
                    [this.targetAttr], this.assignValue[1], AssignOp.eq);
                eqStrings.push(eqPh.toString());
            }

            if(this.assignAttr != undefined){
                assert(this.targetAttr.name !== 'x' && this.targetAttr.name !== 'y');
                let tgtVal = this.assignAttr.getActualAttr()!.val.val;
                eleAttrMod.set(actualTgt, tgtVal);
            }

            if(this.assignConst != undefined){
                assert(this.targetAttr.name === 'text');
                eleAttrMod.set(actualTgt, this.assignConst);
            }
        } else if(this.targetRelation != undefined){
            assert(this.pos = undefined);
            assert(this.inc === false && this.dec === false);
            
            if(this.assignValue != undefined){
                let eqPh = new EqPlaceholder(this.targetRelation[0], this.assignValue[0], 
                        this.targetRelation[1], this.assignValue[1], AssignOp.eq);
                eqStrings.push(eqPh.toString());
            }

            assert(this.assignAttr == undefined);
            assert(this.assignConst == undefined);
        }

        if(this.extraEqs != undefined){
            this.extraEqs.forEach((eq)=>{
                eqStrings.push(eq.toString());
            })
        }

        if(this.extraRanges != undefined){
            this.extraRanges.forEach((eq)=>{
                rangeStrings.push(eq.toString());
            })
        }

        if(this.extraMap != undefined){
            this.extraMap.forEach((val, attrPh)=>{
                eleAttrMod.set(attrPh.getActualAttr()!, val);
            })
        }


        con.handleUserModify(
            eqStrings.join(';'), forceUnchanged.join(';'), inferChanged.join(';'), 
            rangeStrings.join(';'), this.rawTraces, traceEleStrings.join(';'), 
            eleAttrMod, elePosMod
        )
    }

    genValForStepChange(attr:Attribute, inc:boolean): any{
        if(['w', 'h', 'x', 'y'].includes(attr.name)){
            return attr.val.val + (inc? 10: -10);
        }

        if(attr.name === 'lightness'){
            if(inc){
                return min(900, attr.val.val + 100);
            } else {
                return max(0, attr.val.val - 100)
            }
        }

        throw Error('不支持的微调属性')
    }
}

ControllerOp.tmpNew.addAttribute(new Attribute('x', new RawNumber(0), ControllerOp.tmpNew));
ControllerOp.tmpNew.addAttribute(new Attribute('y', new RawNumber(0), ControllerOp.tmpNew));


export { ControllerOp }