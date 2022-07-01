import {Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller} from "./backend";

function testBackend() {
    let controller = new Controller();
    controller.addAttribute(0, "alpha", new RawNumber(140));
    controller.addAttribute(0, "two", new RawNumber(2));
    let id_1 = controller.createElement(ElementType.RECTANGLE, "first");
    controller.addAttribute(id_1, "x", new RawNumber(30));
    controller.addAttribute(id_1, "y", new RawNumber(30));
    let id_2 = controller.createElement(ElementType.RECTANGLE, "second");
    controller.addAttribute(id_2, "x", new RawNumber(170));
    controller.addAttribute(id_2, "y", new RawNumber(30));
    let id_3 = controller.createElement(ElementType.RECTANGLE, "third");
    controller.addAttribute(id_3, "x", new RawNumber(100));
    controller.addAttribute(id_3, "y", new RawNumber(100));
    let func_1 = new FuncTree(new OperatorNode(Operator.PLUS), 2);
    let r = new OperatorNode(Operator.PLUS);
    let d = new OperatorNode(Operator.DEVIDED);
    r.rightNode = d;
    let func_2 = new FuncTree(r, 3);
    controller.addRelationship(func_1, [controller.getAttribute(id_1, "x"), controller.getAttribute(0, "alpha")], controller.getAttribute(id_2, "x"));
    controller.addRelationship(func_2, [controller.getAttribute(id_1, "y"), controller.getAttribute(0, "alpha"), controller.getAttribute(0, "two")], controller.getAttribute(id_3, "y"));
    controller.addRelationship(func_2, [controller.getAttribute(id_1, "x"), controller.getAttribute(0, "alpha"), controller.getAttribute(0, "two")], controller.getAttribute(id_3, "x"));
     
    console.log(controller.getAttribute(id_3, "x").val);

    console.log(controller.getAttribute(id_3, "x").fromRelationship?.transform(0))
    console.log(controller.getAttribute(id_3, "x").fromRelationship?.transform(1))
    console.log(controller.getAttribute(id_3, "x").fromRelationship?.transform(2))

}
export {testBackend};