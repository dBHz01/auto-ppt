import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle } from "react-konva";
import './App.css';
import { Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { loadFile } from "./components/load_file";
import { Button } from 'antd';

const FILEINPUT = require("./components/sample-input.json");

function delay(ms: number) {
    let crt = Date.now();
    while (Date.now() - crt < ms) { }
}

class AllComponents extends React.Component {
    controller: Controller;
    constructor(props: any) {
        super(props);
        this.controller = new Controller();
        loadFile(this.controller, FILEINPUT);
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
                                x={x_val - 25}
                                y={y_val - 25}
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
        // this.controller.nextInvalid.forEach((tp, idx)=>{
        //     elements.push(<Circle
        //         x={tp[0].val.val}
        //         y={tp[1].val.val}
        //         width={5}
        //         height={5}
        //         key={`invalid-${idx}`}
        //     />)
        // })
        console.log(this.controller.nextValid[0])
        this.controller.nextValid.slice(0, 10).forEach((tp, idx) => {
            elements.push(<Group key={`valid-${idx}`}>
                <Rect
                    x={tp[0].val.val - 2.5}
                    y={tp[1].val.val - 2.5}
                    width={5}
                    height={5}
                    fill={"red"}
                />
                <Text
                    x={tp[0].val.val}
                    y={tp[1].val.val}
                    text={`${idx}`}
                    fontSize={5}
                />
            </Group>
            )
        })

        this.controller.nextValidPost.slice(0, 10).forEach((tp, idx) => {
            elements.push(<Group key={`valid-${idx}`}>
                <Rect
                    x={tp[0].val.val - 2.5}
                    y={tp[1].val.val - 2.5}
                    width={5}
                    height={5}
                    fill={"blue"}
                />
                <Text
                    x={tp[0].val.val}
                    y={tp[1].val.val}
                    text={`${idx}`}
                    fontSize={5}
                />
            </Group>
            )
        })

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

    onNextPrio() {
        this.allComponentsRef.current?.controller.estimate_next_prio();
        this.forceUpdate();
    }

    onNextPost() {
        this.allComponentsRef.current?.controller.estimate_next_post();
        this.forceUpdate();
    }

    render() {
        return (
            <div>
                <Stage width={window.innerWidth} height={window.innerHeight}>
                    <Layer>
                        <AllComponents ref={this.allComponentsRef}></AllComponents>
                    </Layer>
                </Stage>
                <Button
                    type="primary"
                    onClick={this.clickButton}
                >click</Button>
                <Button
                    type="primary"
                    onClick={this.onNextPrio.bind(this)}
                >Next先验推测</Button>
                <Button
                    type="primary"
                    onClick={this.onNextPost.bind(this)}
                >Next后验推测</Button>
            </div>
        );
    }
}

export default App;
