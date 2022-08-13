import { parse, SymbolNode, AssignmentNode, ParenthesisNode, OperatorNode as MathOPNode, MathNode, OperatorNodeOp, OperatorNodeMap, string } from "mathjs";
import { Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller, Attribute, String2OP, AssignOp, Equation, RawText, RawNumberNoCal } from "./backend";

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
                        case "CIRCLE":
                            elementType = ElementType.CIRCLE;
                            break;

                        case "ARROW":
                            elementType = ElementType.ARROW;
                            break;

                        default:
                            throw Error("error element type");
                    }
                } else {
                    throw Error("element type should be string");
                }
                // new an element
                let crtID = entry['id'];
                let id = controller.createElement(elementType, elementName, '', crtID);
                for (let [key, value] of Object.entries(entry)) {
                    switch (key) {
                        case "type":
                        case "name":
                        case "elementType":
                        case "id":
                            break;

                        default:
                            // add attributes to the new element
                            // accept number value now
                            if (typeof (key) == "string" && (typeof (value) == "number"
                                || typeof (value) == "boolean"
                            )) {
                                if (key === "x" || key === "y") {
                                    // 对于 x, y 坐标，可计算
                                    controller.addAttribute(id, key, new RawNumber(Number(value)));
                                } else {
                                    // 其余不可计算
                                    controller.addAttribute(id, key, new RawNumberNoCal(value));
                                }
                            } else if (typeof (key) == "string" && typeof (value) == "string") {
                                if (key === "text") {
                                    // 仅接受 text 为 string
                                    controller.addAttribute(id, key, new RawText(value));
                                }
                                if(key === "color") {
                                    controller.addAttribute(id, key, new RawText(value));
                                }
                            }
                    }
                }
                break;

            case "attribute":
                let baseElement: number;
                let attributeName: string;
                let attributeValue: number | string;
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
                    controller.addAttribute(baseElement, attributeName, new RawNumber(attributeValue as number));
                } else if (typeof (entry.val) == "string"){
                    attributeValue = entry.val;
                    controller.addAttribute(baseElement, attributeName, new RawText(attributeValue as string));
                } else {
                    throw Error("attribute value should be number");
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

function parseNewEquation(controller: Controller, expr: string): Equation {

    // 需要保证表达式内仅有一个符号
    let ops = ['>', '<', '>=', '<=']
    let opsAssign = [AssignOp.gt, AssignOp.lt, AssignOp.ge, AssignOp.le]
    let assignOp = AssignOp.eq;
    ops.forEach((op, idx) => {
        if (expr.includes(op)) {
            expr = expr.replace(op, '=');
            assignOp = opsAssign[idx];
        }
    })

    let exprs = expr.split("=");
    // console.log(exprs);
    let leftExpr: string = exprs[0];
    let rightExpr: string = exprs[1];

    let leftParsedFunc = parse(leftExpr);
    let rightParsedFunc = parse(rightExpr);

    // if (!(parsedFunc instanceof AssignmentNode)) {
    //     throw Error("relationship func should be assignment");
    // }
    // console.log(leftParsedFunc, rightParsedFunc);

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

export { loadFile, parseNewEquation };
