import { parse, SymbolNode, AssignmentNode, ParenthesisNode, OperatorNode as MathOPNode, MathNode, OperatorNodeOp, OperatorNodeMap } from "mathjs";
import { Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller, Attribute, String2OP } from "./backend";

function loadFile(controller: Controller, fileInput: any) {
    console.log(fileInput);
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
                if (typeof (entry.func) == "string") {
                    let parsedFunc = parse(entry.func);
                    if (!(parsedFunc instanceof AssignmentNode)) {
                        throw Error("relationship func should be assignment");
                    }
                    console.log(parsedFunc);
                    let newArgs = new Array<Attribute>();
                    let convertToFuncTree = function (node: MathOPNode<OperatorNodeOp, keyof OperatorNodeMap, MathNode[]> | ParenthesisNode<MathNode>): OperatorNode {
                        if (node instanceof ParenthesisNode) {
                            return convertToFuncTree(node.content);
                        } else if (node instanceof MathOPNode) {
                            console.log(node.op);
                            let retNode = new OperatorNode(String2OP(node.op));
                            // process left child
                            let leftNode = node.args[0];
                            if (leftNode instanceof SymbolNode) {
                                argNum += 1;
                                let symbolName = leftNode.name.split("_");
                                let elementIdStr = symbolName.pop();
                                let elementId: number;
                                if (isNaN(Number(elementIdStr))) {
                                    symbolName.push(elementIdStr!);
                                    elementId = 0;
                                } else {
                                    elementId = Number(elementIdStr);
                                }
                                let attributeName = symbolName.join("_");
                                let newArg = controller.getAttribute(elementId, attributeName);
                                newArgs.push(newArg);
                                retNode.leftNode = undefined;
                            } else {
                                retNode.leftNode = convertToFuncTree(leftNode);
                            }
                            // process right child
                            let rightNode = node.args[1];
                            if (rightNode instanceof SymbolNode) {
                                argNum += 1;
                                let symbolName = rightNode.name.split("_");
                                let elementIdStr = symbolName.pop();
                                let elementId: number;
                                if (isNaN(Number(elementIdStr))) {
                                    symbolName.push(elementIdStr!);
                                    elementId = 0;
                                } else {
                                    elementId = Number(elementIdStr);
                                }
                                let attributeName = symbolName.join("_");
                                let newArg = controller.getAttribute(elementId, attributeName);
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
                        let symbolName = parsedFunc.object.name.split("_");
                        let elementIdStr = symbolName.pop();
                        let elementId: number;
                        if (isNaN(Number(elementIdStr))) {
                            symbolName.push(elementIdStr!);
                            elementId = 0;
                        } else {
                            elementId = Number(elementIdStr);
                        }
                        let attributeName = symbolName.join("_");
                        let newTarget = controller.getAttribute(elementId, attributeName);
                        controller.addRelationship(newFunc, newArgs, newTarget);
                    } else {
                        throw Error("unexpected type");
                    }
                } else {
                    throw Error("relationship func should be string");
                }
                break;

            default:
                throw Error("error type in loading file");
        }
    }
}

export { loadFile };