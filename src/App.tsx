import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group , Circle} from "react-konva";
import './App.css';
import { Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { Button } from 'antd';

function delay(ms: number) {
    let crt = Date.now();
    while(Date.now() - crt < ms){}
}

class AllComponents extends React.Component {
    controller: Controller;
    constructor(props: any) {
        super(props);
        this.controller = new Controller();
        this.controller.addAttribute(0, "alpha", new RawNumber(140));
        this.controller.addAttribute(0, "two", new RawNumber(1.3));

        let id_1 = this.controller.createElement(ElementType.RECTANGLE, "first");
        this.controller.addAttribute(id_1, "x", new RawNumber(230 + 25));
        this.controller.addAttribute(id_1, "y", new RawNumber(230 + 25));

        let id_2 = this.controller.createElement(ElementType.RECTANGLE, "second");
        this.controller.addAttribute(id_2, "x", new RawNumber(0));
        this.controller.addAttribute(id_2, "y", new RawNumber(0));
        
        let func_0 = new FuncTree(new OperatorNode(Operator.EQ), 1);
        let func_1 = new FuncTree(new OperatorNode(Operator.PLUS), 2);
        this.controller.addRelationship(func_0, [this.controller.getAttribute(id_1, "y")], this.controller.getAttribute(id_2, "y"));
        this.controller.addRelationship(func_1, [this.controller.getAttribute(id_1, "x"), this.controller.getAttribute(0, "alpha")], this.controller.getAttribute(id_2, "x"));

        let id_3 = this.controller.createElement(ElementType.RECTANGLE, "third");
        this.controller.addAttribute(id_3, "x", new RawNumber(0));
        this.controller.addAttribute(id_3, "y", new RawNumber(0));

        let r = new OperatorNode(Operator.PLUS);
        let d = new OperatorNode(Operator.DEVIDED);
        r.rightNode = d;
        let func_2 = new FuncTree(r, 3);

        this.controller.addRelationship(func_2, [this.controller.getAttribute(id_1, "y"), this.controller.getAttribute(0, "alpha"), this.controller.getAttribute(0, "two")], this.controller.getAttribute(id_3, "y"));
        this.controller.addRelationship(func_2, [this.controller.getAttribute(id_1, "x"), this.controller.getAttribute(0, "alpha"), this.controller.getAttribute(0, "two")], this.controller.getAttribute(id_3, "x"));
        console.log(this.controller.getAttribute(id_2, "x").val);
    }

    render() {
        console.log("render all");
        let elements = [];
        for (let i of this.controller.elements.values()) {
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
        let drawed:Set<number> = new Set();
        console.log(this.controller.nextValid[0])
        this.controller.nextValid.slice(0, 100).forEach((tp, idx)=>{
            if(drawed.has(tp[0].val.val * 10000 + tp[1].val.val)){
                return;
            }
            drawed.add(tp[0].val.val * 10000 + tp[1].val.val)
            elements.push(<Group key={`valid-${idx}`}>
                <Rect
                    x={tp[0].val.val-2.5}
                    y={tp[1].val.val-2.5}
                    width={5}
                    height={5}
                    fill={"red"}
                />
                <Text
                    x={tp[0].val.val}
                    y={tp[1].val.val}
                    text={`${drawed.size}`}
                    fontSize={10}
                />
            </Group>
            )
        })

        let drawedPost:Set<number> = new Set();
        this.controller.nextValidPost.slice(0, 100).forEach((tp, idx)=>{
            if(drawedPost.has(tp[0].val.val * 10000 + tp[1].val.val)){
                return;
            }
            drawedPost.add(tp[0].val.val * 10000 + tp[1].val.val)
            elements.push(<Group key={`valid-${idx}`}>
                <Rect
                    x={tp[0].val.val-2.5}
                    y={tp[1].val.val-2.5}
                    width={5}
                    height={5}
                    fill={"blue"}
                />
                <Text
                    x={tp[0].val.val}
                    y={tp[1].val.val}
                    text={`${drawedPost.size}`}
                    fontSize={10}
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

    onNextPrio(){
        this.allComponentsRef.current?.controller.estimate_next_prio();
        this.forceUpdate();
    }

    onNextPost(){
        this.allComponentsRef.current?.controller.estimate_next_post();
        this.forceUpdate();
    }

    moveToNextPost(){
        this.allComponentsRef.current?.controller.moveToNextPost();
        this.forceUpdate();
    }

    moveToNextPrio(){
        this.allComponentsRef.current?.controller.moveToNextPrio();
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
                    onClick={this.moveToNextPrio.bind(this)}
                >移动到下一个先验结果</Button>
                <Button
                    type="primary"
                    onClick={this.onNextPost.bind(this)}
                >Next后验推测</Button>
                <Button
                    type="primary"
                    onClick={this.moveToNextPost.bind(this)}
                >移动到下一个后验结果</Button>
            </div>
        );
    }
}

export default App;
