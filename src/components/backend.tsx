import React from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";

enum Operator {
    PLUS,
    MINUS,
    MULTIPLY,
    DEVIDED,
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

        default:
            throw new Error("unexpected operator");
    }
}

interface Value {
    val: any;
    calculate(op: Operator, other: Value): Value;
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
            this.toRelationships = new Array<Relationship>;
        }
        this.toRelationships.push(t);
    }
}

enum ElementType {
    CONST,
    RECTANGLE
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
}

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
        let newArgs = new Array<Attribute>();
        for (let i of argSequence) {
            newArgs.push(this.args[i]);
        }
        newRelationship.args = newArgs;
        return [newRelationship, argSequence];
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
                leftValue = args[pointer].val;
                pointer++;
            } else {
                leftValue = calSubTree(rootNode.leftNode as OperatorNode);
            }
            if (rootNode.rightNode == null) {
                rightValue = args[pointer].val;
                pointer++;
            } else {
                rightValue = calSubTree(rootNode.rightNode as OperatorNode);
            }
            return leftValue.calculate(rootNode.op, rightValue);
        }
        return calSubTree(this.root);
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

class Controller {
    elements: SingleElement[];
    idAllocator: number;
    constructor() {
        this.elements = new Array<SingleElement>();
        let constElement = new SingleElement(0, ElementType.CONST, "const");
        this.elements.push(constElement);
        this.idAllocator = 1;
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
}

export { Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller };