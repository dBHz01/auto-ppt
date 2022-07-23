import { parse, SymbolNode, AssignmentNode, ParenthesisNode, OperatorNode as MathOPNode, MathNode, OperatorNodeOp, OperatorNodeMap, string } from "mathjs";
import { Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller, Attribute, String2OP, Relationship, AssignOp, Equation } from "./backend";

function name2Attribute(controller: Controller, name: string): Attribute {
    // if (str2Attr?.has(name)) {
    //     return str2Attr.get(name)!;
    // }
    // from "y_1" to element[1].y
    let symbolName = name.split("_");
    let elementIdStr = symbolName.pop();
    let elementId: number;
    if (isNaN(Number(elementIdStr))) {
        symbolName.push(elementIdStr!);
        elementId = -2;
    } else {
        elementId = Number(elementIdStr);
    }
    let attributeName = symbolName.join("_");
    return controller.getAttribute(elementId, attributeName);
}

function convertToOperatorNode(controller: Controller, node: MathOPNode<OperatorNodeOp, keyof OperatorNodeMap, MathNode[]> | ParenthesisNode<MathNode>): [OperatorNode, Array<Attribute>] {
    let newArgs = new Array<Attribute>();
    if (node instanceof ParenthesisNode) {
        return convertToOperatorNode(controller, node.content);
    } else if (node instanceof MathOPNode) {
        let retNode = new OperatorNode(String2OP(node.op));
        // process left child
        let leftNode = node.args[0];
        if (leftNode instanceof SymbolNode) {
            let newArg = name2Attribute(controller, leftNode.name);
            newArgs.push(newArg);
            retNode.leftNode = undefined;
        } else {
            let ans = convertToOperatorNode(controller, leftNode);
            retNode.leftNode = ans[0];
            for (let i of ans[1]) {
                newArgs.push(i);
            }
        }
        // process right child
        let rightNode = node.args[1];
        if (rightNode instanceof SymbolNode) {
            let newArg = name2Attribute(controller, rightNode.name);
            newArgs.push(newArg);
            retNode.rightNode = undefined;
        } else {
            let ans = convertToOperatorNode(controller, rightNode)
            retNode.rightNode = ans[0];
            for (let i of ans[1]) {
                newArgs.push(i);
            }
        }
        return [retNode, newArgs];
    } else {
        throw Error("error type");
    }
}

function loadFile(controller: Controller, fileInput: any) {
    // console.log(fileInput);
    for (let entry of fileInput) {
        if (entry.type == undefined) {
            continue;
        }
        switch (entry.type) {
            case "element":
                // get element name and type
                let elementName: string;
                let elementType: ElementType;
                if (typeof (entry.name) == "string") {
                    elementName = entry.name;
                } else {
                    throw Error("name should be string");
                }
                if (typeof (entry.elementType) == "string") {
                    switch (entry.elementType) {
                        case "RECTANGLE":
                            elementType = ElementType.RECTANGLE;
                            break;

                        default:
                            throw Error("error element type");
                    }
                } else {
                    throw Error("element type should be string");
                }
                // new an element
                let id = controller.createElement(elementType, elementName);
                for (let [key, value] of Object.entries(entry)) {
                    switch (key) {
                        case "type":
                        case "name":
                        case "elementType":
                            break;

                        default:
                            // add attributes to the new element
                            // only accept number value now
                            if (typeof (key) == "string" && typeof (value) == "number") {
                                controller.addAttribute(id, key, new RawNumber(value));
                            }
                            break;
                    }
                }
                break;

            case "attribute":
                let baseElement: number;
                let attributeName: string;
                let attributeValue: number;
                if (typeof (entry.element) == "number") {
                    baseElement = entry.element;
                } else {
                    throw Error("element id should be number");
                }
                if (typeof (entry.name) == "string") {
                    attributeName = entry.name;
                } else {
                    throw Error("attribute name should be string");
                }
                if (typeof (entry.val) == "number") {
                    attributeValue = entry.val;
                } else {
                    throw Error("attribute value should be number");
                }
                controller.addAttribute(baseElement, attributeName, new RawNumber(attributeValue));
                break;

            case "relationship":
                let newFunc: FuncTree;
                let rootNode: OperatorNode;
                let argNum = 0;
                let name2Attribute = function (name: string): Attribute {
                    // from "y_1" to element[1].y
                    let symbolName = name.split("_");
                    let elementIdStr = symbolName.pop();
                    let elementId: number;
                    if (isNaN(Number(elementIdStr))) {
                        symbolName.push(elementIdStr!);
                        elementId = -2;
                    } else {
                        elementId = Number(elementIdStr);
                    }
                    let attributeName = symbolName.join("_");
                    return controller.getAttribute(elementId, attributeName);
                }
                if (typeof (entry.func) == "string") {
                    let parsedFunc = parse(entry.func);
                    if (!(parsedFunc instanceof AssignmentNode)) {
                        throw Error("relationship func should be assignment");
                    }
                    // console.log(parsedFunc);
                    let newArgs = new Array<Attribute>();
                    let convertToFuncTree = function (node: MathOPNode<OperatorNodeOp, keyof OperatorNodeMap, MathNode[]> | ParenthesisNode<MathNode>): OperatorNode {
                        if (node instanceof ParenthesisNode) {
                            return convertToFuncTree(node.content);
                        } else if (node instanceof MathOPNode) {
                            let retNode = new OperatorNode(String2OP(node.op));
                            // process left child
                            let leftNode = node.args[0];
                            if (leftNode instanceof SymbolNode) {
                                argNum += 1;
                                let newArg = name2Attribute(leftNode.name);
                                newArgs.push(newArg);
                                retNode.leftNode = undefined;
                            } else {
                                retNode.leftNode = convertToFuncTree(leftNode);
                            }
                            // process right child
                            let rightNode = node.args[1];
                            if (rightNode instanceof SymbolNode) {
                                argNum += 1;
                                let newArg = name2Attribute(rightNode.name);
                                newArgs.push(newArg);
                                retNode.rightNode = undefined;
                            } else {
                                retNode.rightNode = convertToFuncTree(rightNode);
                            }
                            return retNode;
                        } else {
                            throw Error("error type");
                        }
                    }
                    if (parsedFunc.value instanceof MathOPNode || parsedFunc.value instanceof ParenthesisNode) {
                        rootNode = convertToFuncTree(parsedFunc.value);
                        newFunc = new FuncTree(rootNode, argNum);
                        let newTarget = name2Attribute(parsedFunc.object.name);
                        controller.addRelationship(newFunc, newArgs, newTarget);
                    } else if (parsedFunc.value instanceof SymbolNode) {
                        rootNode = new OperatorNode(Operator.EQ);
                        newFunc = new FuncTree(rootNode, 1);
                        newArgs = [name2Attribute(parsedFunc.value.name)];
                        let newTarget = name2Attribute(parsedFunc.object.name);
                        controller.addRelationship(newFunc, newArgs, newTarget);
                    } else {
                        throw Error("unexpected type");
                    }
                } else {
                    throw Error("relationship func should be string");
                }
                break;

            case "equation":
                let newEquation = parseNewEquation(controller, entry.equation);
                controller.addEquation(newEquation);
                break;
            default:
                throw Error("error type in loading file");
        }
    }
}

function parseNewRelation(controller: Controller, expr: string, str2Attr?: Map<string, Attribute>): Relationship {
    if (str2Attr == null) {
        str2Attr = new Map();
    }

    let ops = ['>', '<', '>=', '<=']
    let opsAssign = [AssignOp.gt, AssignOp.lt, AssignOp.ge, AssignOp.le]
    let assignOp = AssignOp.eq;
    ops.forEach((op, idx) => {
        if (expr.includes(op)) {
            expr.replace(op, '=');
            assignOp = opsAssign[idx];
        }
    })

    let newFunc: FuncTree;
    let rootNode: OperatorNode;
    let argNum = 0;
    let name2Attribute = function (name: string): Attribute {
        if (str2Attr?.has(name)) {
            return str2Attr.get(name)!;
        }
        // from "y_1" to element[1].y
        let symbolName = name.split("_");
        let elementIdStr = symbolName.pop();
        let elementId: number;
        if (isNaN(Number(elementIdStr))) {
            symbolName.push(elementIdStr!);
            elementId = -2;
        } else {
            elementId = Number(elementIdStr);
        }
        let attributeName = symbolName.join("_");
        return controller.getAttribute(elementId, attributeName);
    }
    let parsedFunc = parse(expr);
    if (!(parsedFunc instanceof AssignmentNode)) {
        throw Error("relationship func should be assignment");
    }
    // console.log(parsedFunc);
    let newArgs = new Array<Attribute>();
    let convertToFuncTree = function (node: MathOPNode<OperatorNodeOp, keyof OperatorNodeMap, MathNode[]> | ParenthesisNode<MathNode>): OperatorNode {
        if (node instanceof ParenthesisNode) {
            return convertToFuncTree(node.content);
        } else if (node instanceof MathOPNode) {
            let retNode = new OperatorNode(String2OP(node.op));
            // process left child
            let leftNode = node.args[0];
            if (leftNode instanceof SymbolNode) {
                argNum += 1;
                let newArg = name2Attribute(leftNode.name);
                newArgs.push(newArg);
                retNode.leftNode = undefined;
            } else {
                retNode.leftNode = convertToFuncTree(leftNode);
            }
            // process right child
            let rightNode = node.args[1];
            if (rightNode instanceof SymbolNode) {
                argNum += 1;
                let newArg = name2Attribute(rightNode.name);
                newArgs.push(newArg);
                retNode.rightNode = undefined;
            } else {
                retNode.rightNode = convertToFuncTree(rightNode);
            }
            return retNode;
        } else {
            throw Error("error type");
        }
    }

    if (parsedFunc.value instanceof MathOPNode || parsedFunc.value instanceof ParenthesisNode) {
        rootNode = convertToFuncTree(parsedFunc.value);
        newFunc = new FuncTree(rootNode, argNum);
        let newTarget = name2Attribute(parsedFunc.object.name);
        // controller.addRelationship(newFunc, newArgs, newTarget);
        let toReturn = new Relationship(newFunc, newArgs, newTarget);
        toReturn.assignOp = assignOp;
        return toReturn;
    } else if (parsedFunc.value instanceof SymbolNode) {
        rootNode = new OperatorNode(Operator.EQ);
        newFunc = new FuncTree(rootNode, 1);
        newArgs = [name2Attribute(parsedFunc.value.name)];
        let newTarget = name2Attribute(parsedFunc.object.name);
        // controller.addRelationship(newFunc, newArgs, newTarget);
        let toReturn = new Relationship(newFunc, newArgs, newTarget);
        toReturn.assignOp = assignOp;
        return toReturn;
    } else {
        throw Error("unexpected type");
    }
}

function parseNewEquation(controller: Controller, expr: string): Equation {

    // 需要保证表达式内仅有一个符号
    let ops = ['>=', '<=', '>', '<']
    let opsAssign = [AssignOp.gt, AssignOp.lt, AssignOp.ge, AssignOp.le]
    let assignOp = AssignOp.eq;
    ops.forEach((op, idx) => {
        if (expr.includes(op)) {
            expr.replace(op, '=');
            assignOp = opsAssign[idx];
        }
    })

    let exprs = expr.split("=");
    console.log(exprs);
    let leftExpr: string = exprs[0];
    let rightExpr: string = exprs[1];

    let leftParsedFunc = parse(leftExpr);
    let rightParsedFunc = parse(rightExpr);

    // if (!(parsedFunc instanceof AssignmentNode)) {
    //     throw Error("relationship func should be assignment");
    // }
    console.log(leftParsedFunc, rightParsedFunc);

    let MathNode2FuncTreeAndArgs = function(parsedFunc: MathNode): [FuncTree, Array<Attribute>] {
        let rootNode: OperatorNode;
        let newArgs: Array<Attribute>;
        if (parsedFunc instanceof MathOPNode || parsedFunc instanceof ParenthesisNode) {
            [rootNode, newArgs] = convertToOperatorNode(controller, parsedFunc);
            return [new FuncTree(rootNode, newArgs.length), newArgs];
        } else if (parsedFunc instanceof SymbolNode) {
            rootNode = new OperatorNode(Operator.EQ);
            let newFunc = new FuncTree(rootNode, 1);
            newArgs = [name2Attribute(controller, parsedFunc.name)];
            // controller.addRelationship(newFunc, newArgs, newTarget);
            return [newFunc, newArgs];
        } else {
            throw Error("unexpected type");
        }
    }
    let [newLeftFunc, newLeftArgs] = MathNode2FuncTreeAndArgs(leftParsedFunc);
    let [newRightFunc, newRightArgs] = MathNode2FuncTreeAndArgs(rightParsedFunc);
    let toReturn = new Equation(newLeftFunc, newRightFunc, newLeftArgs, newRightArgs);
    toReturn.assignOp = assignOp;
    return toReturn;
}

export { loadFile, parseNewRelation };