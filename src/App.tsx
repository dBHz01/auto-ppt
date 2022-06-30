import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import './App.css';
import { Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { Button } from 'antd';

class AllComponents extends React.Component {
    controller: Controller;
    constructor(props: any) {
        super(props);
        this.controller = new Controller();
        this.controller.addAttribute(0, "alpha", new RawNumber(140));
        this.controller.addAttribute(0, "two", new RawNumber(2));
        let id_1 = this.controller.createElement(ElementType.RECTANGLE, "first");
        this.controller.addAttribute(id_1, "x", new RawNumber(30));
        this.controller.addAttribute(id_1, "y", new RawNumber(30));
        let id_2 = this.controller.createElement(ElementType.RECTANGLE, "second");
        this.controller.addAttribute(id_2, "x", new RawNumber(170));
        this.controller.addAttribute(id_2, "y", new RawNumber(30));
        let id_3 = this.controller.createElement(ElementType.RECTANGLE, "third");
        this.controller.addAttribute(id_3, "x", new RawNumber(100));
        this.controller.addAttribute(id_3, "y", new RawNumber(100));
        let func_1 = new FuncTree(new OperatorNode(Operator.PLUS), 2);
        let r = new OperatorNode(Operator.PLUS);
        let d = new OperatorNode(Operator.DEVIDED);
        r.rightNode = d;
        let func_2 = new FuncTree(r, 3);
        this.controller.addRelationship(func_1, [this.controller.getAttribute(id_1, "x"), this.controller.getAttribute(0, "alpha")], this.controller.getAttribute(id_2, "x"));
        this.controller.addRelationship(func_2, [this.controller.getAttribute(id_1, "y"), this.controller.getAttribute(0, "alpha"), this.controller.getAttribute(0, "two")], this.controller.getAttribute(id_3, "y"));
        this.controller.addRelationship(func_2, [this.controller.getAttribute(id_1, "x"), this.controller.getAttribute(0, "alpha"), this.controller.getAttribute(0, "two")], this.controller.getAttribute(id_3, "x"));
        // console.log(this.controller.getAttribute(id_2, "x").val);
    }
    render() {
        console.log("render all");
        let elements = [];
        for (let i of this.controller.elements) {
            switch (i.type) {
                case ElementType.RECTANGLE:
                    let x_val = i.attributes.get("x")?.val.val;
                    let y_val = i.attributes.get("y")?.val.val;
                    if (x_val != undefined && y_val != undefined) {
                        elements.push(
                            <Rect
                                x={x_val}
                                y={y_val}
                                width={50}
                                height={50}
                                fill={"green"}
                                shadowBlur={5}
                                key={i.id}
                            />
                        );
                    }
                    break;
                default:
                    break;
            }
        }
        return (
            <Group>
                {elements}
            </Group>
        );
    }
}

class App extends Component {
    allComponentsRef: React.RefObject<AllComponents>;
    constructor(props: any) {
        super(props);
        this.allComponentsRef = React.createRef<AllComponents>();
        this.clickButton = this.clickButton.bind(this);
        testBackend();
    }
    clickButton() {
        console.log(this.allComponentsRef);
        let alpha = this.allComponentsRef.current?.controller.getAttribute(0, "alpha");
        if (alpha != undefined) {
            alpha.val.val = alpha.val.val * 2;
            for (let i of alpha.toRelationships!) {
                i.target.val = i.func.calculate(i.args);
            }
        }
        this.forceUpdate();
        // this.allComponentsRef.current?.controller.update();
        // this.allComponents.controller.getElement(0).attributes.set("alpha", alpha * 2);
        console.log(this.allComponentsRef.current?.controller.getElement(0))
        console.log(this.allComponentsRef.current?.controller.getElement(1))
        console.log(this.allComponentsRef.current?.controller.getElement(2))
        console.log(this.allComponentsRef.current?.controller.getElement(3))
    }
    render() {
        return (
            <div>
                <Stage width={window.innerWidth - 300} height={window.innerHeight - 300}>
                    <Layer>
                        <AllComponents ref={this.allComponentsRef}></AllComponents>
                    </Layer>
                </Stage>
                <Button
                    type="primary"
                    onClick={this.clickButton}
                >click</Button>
            </div>
        );
    }
}

export default App;
