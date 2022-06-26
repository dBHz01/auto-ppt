import {Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller} from "./backend";

let controller = new Controller();
controller.addAttribute(0, "alpha", new RawNumber(40));
let id_1 = controller.createElement(ElementType.RECTANGLE, "first");
controller.addAttribute(id_1, "x", new RawNumber(30));
controller.addAttribute(id_1, "y", new RawNumber(30));
let id_2 = controller.createElement(ElementType.RECTANGLE, "second");
controller.addAttribute(id_2, "x", new RawNumber(20));
let func = new FuncTree(new OperatorNode(Operator.PLUS), 2);
controller.addRelationship(func, [controller.getAttribute(id_1, "x"), controller.getAttribute(0, "alpha")], controller.getAttribute(id_2, "x"));

console.log(controller.getAttribute(id_2, "x").val);