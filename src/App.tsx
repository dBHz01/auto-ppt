import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow } from "react-konva";
import './App.css';
import { Attribute, Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { loadFile, parseNewEquation } from "./components/load_file";
import { Button } from 'antd';
import Konva from 'konva';
import { getValue } from '@testing-library/user-event/dist/utils';
import { abs, sqrt } from 'mathjs';

const FILEINPUT = require("./components/sample-input.json");
const ALLCOLORS = require("./components/colors.json");

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
        // this.controller.update_contents(new Map(), []);
    }

    create_drag_end_handler(ele: SingleElement) {
        return async (evt: Konva.KonvaEventObject<DragEvent>) => {
            console.log(evt)
            console.log(ele)

            let newX = evt.target.attrs['x'] + evt.target.attrs['width'] / 2;
            let newY = evt.target.attrs['y'] + evt.target.attrs['height'] / 2;

            let newAttrs: Map<Attribute, number> = new Map();

            newAttrs.set(ele.getAttribute('x')!, newX);
            newAttrs.set(ele.getAttribute('y')!, newY);
            await this.controller.update_contents(newAttrs, [], [], []);
            this.forceUpdate()
        }
    }

    async componentDidMount() {
        await this.controller.updateValsByEquations();
        this.forceUpdate()
    }


    render() {
        console.log("render all");
        let elements = [];
        for (let i of this.controller.elements.values()) {
            switch (i.type) {
                case ElementType.RECTANGLE:
                    let x_val = i.attributes.get("x")?.val.val;
                    let y_val = i.attributes.get("y")?.val.val;
                    let w_val = i.attributes.get("w")?.val.val;
                    let h_val = i.attributes.get("h")?.val.val;
                    let text = i.attributes.get("text")?.val.val;
                    let color = i.getCertainAttribute("color").val.val + "-" + i.getCertainAttribute("lightness").val.val.toString()
                    if (x_val && y_val && w_val && h_val) {
                        elements.push(
                            <Rect
                                x={x_val - w_val / 2}
                                y={y_val - h_val / 2}
                                width={w_val}
                                height={h_val}
                                fill={ALLCOLORS[color]}
                                shadowBlur={5}
                                key={i.id}
                                draggable={true}
                                onDragEnd={this.create_drag_end_handler(i).bind(this)}
                            />
                        );

                        elements.push(<Text
                            x={x_val}
                            y={y_val}
                            key={`pos-${i.id}`}
                            text={`${i.id}\n${Math.round(x_val)},${Math.round(y_val)}`}
                            fontSize={10}
                            listening={false}
                        />);
                    }
                    if (text) {
                        elements.push(<Text
                            x={x_val - w_val / 2}
                            y={y_val - h_val / 2}
                            width={w_val}
                            height={h_val}
                            key={`text-${i.id}`}
                            text={text}
                            fontSize={14}
                            listening={false}
                            align={'center'}
                            verticalAlign={'middle'}
                        />);
                    }
                    break;

                case ElementType.ARROW:
                    // console.log(i);
                    let startElemet = this.controller.getElement(Number(i.getCertainAttribute("startElement").val.val));
                    let endElemet = this.controller.getElement(Number(i.getCertainAttribute("endElement").val.val));
                    let startCenter = [startElemet.getAttribute("x")!.val.val, startElemet.getAttribute("y")!.val.val];
                    let endCenter = [endElemet.getAttribute("x")!.val.val, endElemet.getAttribute("y")!.val.val];
                    let startCornerIndex = 0;
                    if (endCenter[0] - startCenter[0] === 0) {
                        startCornerIndex = endCenter[1] < startCenter[1] ? 0 : 4;
                    } else {
                        let angle = (endCenter[1] - startCenter[1]) / abs(endCenter[0] - startCenter[0]);
                        if (angle < -2) {
                            startCornerIndex = 0;
                        } else if (angle < -1 / 2) {
                            startCornerIndex = 1;
                        } else if (angle < 1 / 2) {
                            startCornerIndex = 2;
                        } else if (angle < 2) {
                            startCornerIndex = 3;
                        } else {
                            startCornerIndex = 4;
                        }
                        if (endCenter[0] - startCenter[0] < 0) {
                            startCornerIndex = (8 - startCornerIndex) % 8;
                        }
                    }
                    let endCornerIndex = (startCornerIndex + 4) % 8
                    let startCorners = startElemet.getCorner();
                    let endCorners = endElemet.getCorner();
                    let width = endCorners[endCornerIndex][0] - startCorners[startCornerIndex][0];
                    let height = endCorners[endCornerIndex][1] - startCorners[startCornerIndex][1];
                    let padding = abs(height) < 1e-4 ? 5 : 0; // 水平状态下箭头文字需要轻微下移
                    elements.push(<Arrow
                        x={startCorners[startCornerIndex][0]}
                        y={startCorners[startCornerIndex][1]}
                        points={[0, 0, width, height]}
                        pointerLength={5}
                        pointerWidth={5}
                        fill={'black'}
                        stroke={'black'}
                        strokeWidth={3}
                        key={i.id}
                    ></Arrow>);
                    let arrowText = i.getAttribute("text");
                    if (arrowText) {
                        elements.push(<Rect
                            x={startCorners[startCornerIndex][0] + width / 20}
                            y={startCorners[startCornerIndex][1] + height / 2 + padding}
                            width={width * 9 / 10}
                            height={14}
                            fill={"white"}
                            shadowBlur={5}
                            key={`text-rect-${i.id}`}
                            draggable={false}
                            shadowEnabled={false}
                        />);
                        elements.push(<Text
                            x={startCorners[startCornerIndex][0] + width / 20}
                            y={startCorners[startCornerIndex][1] + height / 2 + padding}
                            width={width * 9 / 10}
                            key={`text-${i.id}`}
                            text={arrowText.val.val}
                            fontSize={14}
                            listening={false}
                            align={'center'}
                        />);
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
    forceUnchangedRef: React.RefObject<HTMLInputElement>;
    inferChangedRef: React.RefObject<HTMLInputElement>;
    traces: Array<Array<[number, number]>>;
    isDown: boolean;

    traceRelationRef: React.RefObject<HTMLInputElement>;
    elemRelationRef: React.RefObject<HTMLInputElement>;

    static colors: string[] = ['red', 'green', 'blue', 'orange', 'magenta', 'cyan', 'purple'];
    elemRangeRef: React.RefObject<HTMLInputElement>;
    constructor(props: any) {
        super(props);
        this.allComponentsRef = React.createRef<AllComponents>();
        testBackend();
        this.traces = [];
        this.isDown = false;

        this.forceUnchangedRef = React.createRef();
        this.inferChangedRef = React.createRef();

        // new stage
        this.traceRelationRef = React.createRef();
        this.elemRelationRef = React.createRef();
        this.elemRangeRef = React.createRef();
    }

    nextSolution() {
        this.allComponentsRef.current?.controller.nextSolution()
        this.forceUpdate();
    }

    handlePointerDown(event: Konva.KonvaEventObject<MouseEvent>) {
        this.isDown = true;
        let crtTrace: Array<[number, number]> = [[event.evt.clientX, event.evt.clientY]];
        this.traces.push(crtTrace);
    }

    handlePointerMove(event: Konva.KonvaEventObject<MouseEvent>) {
        if (!this.isDown) {
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        if (crtTrace == null) {
            return;
        }
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
    }

    handlePointerUp(event: Konva.KonvaEventObject<MouseEvent>) {
        if (!this.isDown) {
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
        this.isDown = false;
        // console.log(crtTrace)
        this.forceUpdate()
    }

    async applyCmd() {
        let traceEleRelationStr = this.traceRelationRef.current!.value;
        let elemRelStr = this.elemRelationRef.current!.value;
        let unchangedStr = this.forceUnchangedRef.current!.value;
        let inferChangeStr = this.inferChangedRef.current!.value;
        let eleRangeStr = this.elemRangeRef.current!.value;
        await this.allComponentsRef.current!.
            controller.handleUserCommand(
                this.traces, traceEleRelationStr, elemRelStr, eleRangeStr, unchangedStr, inferChangeStr
            );

        this.traces = [];
        this.forceUpdate();
    }

    render() {
        return (
            <div>
                <Stage width={window.innerWidth} height={window.innerHeight - 200}
                    onMouseDown={this.handlePointerDown.bind(this)}
                    onMouseMove={this.handlePointerMove.bind(this)}
                    onMouseUp={this.handlePointerUp.bind(this)}
                    listening={true}
                >
                    <Layer >
                        <AllComponents ref={this.allComponentsRef}></AllComponents>
                        {this.traces.flatMap((points, traceId) => {
                            return points.map((p, pid) => {
                                return <Circle
                                    key={`${traceId}-${pid}`}
                                    x={p[0]}
                                    y={p[1]}
                                    width={5}
                                    height={5}
                                    fill={App.colors[traceId % App.colors.length]}
                                />
                            })
                        })}
                    </Layer>
                </Stage>
                <hr />
                路径与元素的关系：<input type="text" ref={this.traceRelationRef} />
                元素之间的相等关系：<input type="text" ref={this.elemRelationRef} />
                元素之间的比较关系：<input type="text" ref={this.elemRangeRef} />
                <hr />
                推测发生变化（;分隔）：<input ref={this.inferChangedRef} type='text' />
                强制保持不变（;分隔）：<input ref={this.forceUnchangedRef} type='text' />
                <hr />
                <button onClick={this.applyCmd.bind(this)}>应用用户指令</button>
                <Button
                    type="primary"
                    onClick={this.nextSolution.bind(this)}
                >下一个解</Button>
            </div>
        );
    }
}

export default App;
