import React from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";

enum Operator {
    PLUS,
    MINUS,
    MULTIPLY,
    DEVIDED,
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
                leftValue = calSubTree(rootNode.leftNode);
            }
            if (rootNode.rightNode == null) {
                rightValue = args[pointer].val;
                pointer++;
            } else {
                rightValue = calSubTree(rootNode.rightNode);
            }
            return leftValue.calculate(rootNode.op, rightValue);
        }
        return calSubTree(this.root);
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

export {Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller};