import assert from 'assert';
import {AssignOp, Attribute, FuncTree, SingleElement, str2AssignOp, String2OP} from './components/backend'
class ElementPlaceholder {
    // 表示一个待定的元素
    // 如果不使用指点（useTrace === false），并且属性要求为空，说明用户简单地使用“它”、“这/那”指代
    useTrace: boolean;
    attrRequires: Map<string, any>;
    actualEle?: SingleElement;
    constructor(useTrace: boolean, attrRequires?: Map<string, any>){
        this.useTrace = useTrace;
        if(attrRequires == undefined){
            this.attrRequires = new Map();
        } else {
            this.attrRequires = new Map(attrRequires.entries())
        } 

        this.actualEle = undefined; // 待定
    }

    addRequires(k: string, v: any): ElementPlaceholder{
        this.attrRequires.set(k, v);
        return this;
    }
}

class AttributePlaceholder{
    element: ElementPlaceholder;
    name: string;
    actualAttribute?: Attribute;
    constructor(ele: ElementPlaceholder, attrName: string){
        this.element = ele;
        this.name = attrName;
        this.actualAttribute = undefined;
    }
}

class EqPlaceholder{
    leftFunc: FuncTree;
    rightFunc: FuncTree;
    leftArgs: AttributePlaceholder[];
    rightArgs: AttributePlaceholder[];
    op: AssignOp;
    constructor(left: FuncTree, right: FuncTree, 
        leftArgs: AttributePlaceholder[], 
        rightArgs: AttributePlaceholder[], op: AssignOp){
            this.leftFunc = left;
            this.rightFunc = right;
            this.leftArgs = leftArgs;
            this.rightArgs = rightArgs;
            this.op = op;
        }
}

class NLParser {
    constructor(){

    }

    convertObjToElement(obj:object): ElementPlaceholder{
        // todo
        return new ElementPlaceholder(false);
    }


    convertObjToAttr(obj: object): AttributePlaceholder{
        // object D attribute
        // todo
        return new AttributePlaceholder(new ElementPlaceholder(false), "tmp");
    }

    convertObjToFunc(obj: {[key: string]: any}) : [FuncTree, AttributePlaceholder[]] {
        // todo
        // value: value D const TIME 等
        // object D attribute 应该转化为一个Attribute，还是根节点为eq的functree？
        return [FuncTree.simpleEq(), [this.convertObjToAttr(obj['tmp'])]]
    }

    convertObjToEq(obj: {[key: string]: any}): EqPlaceholder[]{
        // todo
        // relation: value EQUAL value 等
        // 可能会有多个eq
        let leftObj = this.convertObjToFunc(obj['tmp-left']);
        let rightObj = this.convertObjToFunc(obj['tmp-right']);
        let op = str2AssignOp(obj['op']) || AssignOp.eq;
        return [new EqPlaceholder(
            leftObj[0], rightObj[0], leftObj[1], rightObj[1], op
        )]
    }
}

class PosToElement {
    static LEFT = 'left';
    static RIGHT = 'right';
    static UP = 'up';
    static DOWN = 'down';
    static CENTER = 'center';
    elements: ElementPlaceholder[] = [];
    pos?: string;
}

class ControllerOp {
    isCreate: boolean = false;
    
    targetElement?: ElementPlaceholder;
    targetAttr?: AttributePlaceholder;
    targetRelation? : [FuncTree, AttributePlaceholder[]]; // 比如 A 和 B 之间的水平距离

    // 在/到<位置>; <对象> 和 <对象> 的中点
    pos?: PosToElement;

    // 往<方位>，表示位置的移动
    // 深、浅、大、小，表示非位置属性的变化
    inc: boolean = false;
    dec: boolean = false;

    // 赋成的值
    assignValue?: [FuncTree, AttributePlaceholder[]];

    // 附加条件，仅仅支持对位置属性的运算
    extraEqs?: EqPlaceholder[];
    extraRanges?: EqPlaceholder[];

    static POSSIBLE_ATTRS = ['size', 'height', 'width', 'color', 'text', 'horiloc', 'vertiloc'];
    static POSSIBLE_BI_ATTRS = ['horidist', 'vertidist'/*, 'dist'*/];
    constructor(obj: {[key: string]: any}){
        let nlParser = new NLParser()

        // 解析整体操作类型
        assert(obj['predicate'] != undefined);
        this.isCreate = obj['predicate'] === 'new';
        
        // 解析操作目标
        assert(obj['target'] != undefined);
        if(obj['target']['val'] === 'loc'){
            this.targetElement = nlParser.convertObjToElement(obj['target']['obj']);
        } else if(ControllerOp.POSSIBLE_ATTRS.includes(obj['target']['val'])){
            this.targetAttr = nlParser.convertObjToAttr(obj['target'])
        } else if(ControllerOp.POSSIBLE_BI_ATTRS.includes(obj['target']['val'])){
            this.targetRelation = nlParser.convertObjToFunc(obj['target'])
        } else {
            throw Error(`未知的target类型 ${obj['target']['val']}`);
        }

        // 解析元素的目标新建/移动到的位置
        if(obj['adverbial'] != undefined && obj['adverbial']['type'] === 'loc'){
            this.pos = new PosToElement();
            let locObj = obj['adverbial']['loc'];
            if(locObj['type'] === 'single'){
                this.pos.elements = [nlParser.convertObjToElement(locObj['obj'])];
                this.pos.pos = locObj['direction'];
            } else {
                assert(locObj['type'] === 'double' && locObj['loc'] === 'middle');
                this.pos.elements = [
                    nlParser.convertObjToElement(locObj['obj_1']), 
                    nlParser.convertObjToElement(locObj['obj_2'])]
                this.pos.pos = PosToElement.CENTER;
            }
        }

        // 解析元素的上下左右的微调
        if(obj['adverbial'] != undefined && obj['adverbial']['type'] === "direction"){
            this.inc = obj['adverbial']['direction'] === 'right' || obj['adverbial']['direction'] === 'down';
            this.dec = obj['adverbial']['direction'] === 'left' || obj['adverbial']['direction'] === 'up';
        }

        // 解析副词
        if(obj['adverbial'] != undefined && obj['adverbial']['type'] === 'adverb'){
            this.inc = obj['adverbial']['value'] === 'big' || obj['adverbial']['value'] === 'deep';
            this.dec = obj['adverbial']['value'] === 'small' || obj['adverbial']['value'] === 'shallow';
        }

        // 解析修改为xxx
        if(obj['adverbial'] != undefined && obj['adverbial']['type'] === 'value'){
            this.assignValue = nlParser.convertObjToFunc(obj['adverbial']['value']);
        }

        // 解析附加条件
        if(obj['conditions'] != undefined){
            obj['conditions'].foreach((condObj: { [key: string]: any; })=>{
                let eqList = nlParser.convertObjToEq(condObj);
                eqList.forEach((eq)=>{
                    if(eq.op === AssignOp.eq){
                        if(this.extraEqs == undefined){
                            this.extraEqs = [];
                        }
                        this.extraEqs.push(eq);
                    } else {
                        if(this.extraRanges == undefined){
                            this.extraRanges = [];
                        }
                        this.extraRanges.push(eq);
                    }
                })
            })
        }
    }
}

export{ NLParser }