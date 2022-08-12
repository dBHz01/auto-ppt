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

    convertObjToController(obj: {[key: string]: any}) {

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
    inc?: boolean;
    dec?: boolean;

    // 赋成的值
    assignValue?: [FuncTree, AttributePlaceholder[]];

    // 附加条件，仅仅支持对位置属性的运算
    extraEqs?: EqPlaceholder[];
    extraRanges?: EqPlaceholder[];

    constructor(){}
}

export{ NLParser }