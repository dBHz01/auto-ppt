import {parse} from "mathjs";
import {Operator, OperatorNode, FuncTree, RawNumber, ElementType, SingleElement, Controller} from "./backend";
import {loadFile} from "./load_file";

function testBackend() {
    let controller = new Controller();
    // controller.addAttribute(0, "alpha", new RawNumber(140));
    // controller.addAttribute(0, "two", new RawNumber(2));
    // let id_1 = controller.createElement(ElementType.RECTANGLE, "first");
    // controller.addAttribute(id_1, "x", new RawNumber(30));
    // controller.addAttribute(id_1, "y", new RawNumber(30));
    // let id_2 = controller.createElement(ElementType.RECTANGLE, "second");
    // controller.addAttribute(id_2, "x", new RawNumber(170));
    // controller.addAttribute(id_2, "y", new RawNumber(30));
    // let id_3 = controller.createElement(ElementType.RECTANGLE, "third");
    // controller.addAttribute(id_3, "x", new RawNumber(100));
    // controller.addAttribute(id_3, "y", new RawNumber(100));
    // let func_1 = new FuncTree(new OperatorNode(Operator.PLUS), 2);
    // let r = new OperatorNode(Operator.PLUS);
    // let d = new OperatorNode(Operator.DEVIDED);
    // r.rightNode = d;
    // let func_2 = new FuncTree(r, 3);
    // controller.addRelationship(func_1, [controller.getAttribute(id_1, "x"), controller.getAttribute(0, "alpha")], controller.getAttribute(id_2, "x"));
    // controller.addRelationship(func_2, [controller.getAttribute(id_1, "y"), controller.getAttribute(0, "alpha"), controller.getAttribute(0, "two")], controller.getAttribute(id_3, "y"));
    // controller.addRelationship(func_2, [controller.getAttribute(id_1, "x"), controller.getAttribute(0, "alpha"), controller.getAttribute(0, "two")], controller.getAttribute(id_3, "x"));
     
    // console.log(controller.getAttribute(id_3, "x").val);

    // let oldRelationship = controller.getAttribute(id_3, "x").fromRelationship

    // console.log(oldRelationship?.debug());

    // console.log(oldRelationship?.transform(0)[0].debug());
    // console.log(oldRelationship?.transform(1)[0].debug());
    // console.log(oldRelationship?.transform(2)[0].debug());

    // console.log(oldRelationship?.transform(0)[0].func.calculate(oldRelationship?.transform(0)[0].args));

    // console.log(parse('sqrt(2 + x_0)'));

    const fileInput = require("./sample-input.json");
    // console.log(fileInput);
    loadFile(controller, fileInput);
    // "x_2 = x_1 + alpha_0" return [1, 1, 0]
    let testArray = [controller.getAttribute(1, "x"), controller.getAttribute(0, "alpha")]
    console.log(controller.getAttribute(2, "x").fromRelationship?.debug());
    console.log(controller.getAttribute(2, "x").fromRelationship?.convertToVector(testArray));
    // "y_3 = y_1 + alpha_0 / two" return [1, 0.5, 0]
    testArray = [controller.getAttribute(1, "y"), controller.getAttribute(0, "alpha")]
    console.log(controller.getAttribute(3, "y").fromRelationship?.debug());
    console.log(controller.getAttribute(3, "y").fromRelationship?.convertToVector(testArray));
    // "x_3 = (x_1 + alpha_0) / two + two" return [0.5, 0.5, 2]
    testArray = [controller.getAttribute(1, "x"), controller.getAttribute(0, "alpha")]
    console.log(controller.getAttribute(3, "x").fromRelationship?.debug());
    console.log(controller.getAttribute(3, "x").fromRelationship?.convertToVector(testArray));
    
    console.log(controller);

}
export {testBackend};