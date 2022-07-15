import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle } from "react-konva";
import './App.css';
import { Attribute, Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { loadFile, parseNewRelation} from "./components/load_file";
import { Button } from 'antd';
import Konva from 'konva';

const FILEINPUT = require("./components/sample-input1.json");

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

    create_drag_end_handler(ele: SingleElement){
        return async (evt: Konva.KonvaEventObject<DragEvent>)=>{
            console.log(evt)
            console.log(ele)

            let newX = evt.target.attrs['x'] + evt.target.attrs['width'] / 2;
            let newY = evt.target.attrs['y'] + evt.target.attrs['height'] / 2; 

            let newAttrs:Map<Attribute, number> = new Map();

            newAttrs.set(ele.getAttribute('x')!, newX);
            newAttrs.set(ele.getAttribute('y')!, newY);
            await this.controller.update_contents(newAttrs, [], [], []);
            this.forceUpdate()
        }
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
                        />)
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
                    x={tp[0].val.val - 2.5}
                    y={tp[1].val.val - 2.5}
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
                    x={tp[0].val.val - 2.5}
                    y={tp[1].val.val - 2.5}
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
    newRelRef: React.RefObject<HTMLInputElement>;
    forceUnchangedRef: React.RefObject<HTMLInputElement>;
    inferChangedRef: React.RefObject<HTMLInputElement>;
    traces: Array<Array<[number, number]>>;
    isDown: boolean;
    constructor(props: any) {
        super(props);
        this.allComponentsRef = React.createRef<AllComponents>();
        this.clickButton = this.clickButton.bind(this);
        testBackend();

        this.newRelRef = React.createRef();
        this.forceUnchangedRef = React.createRef();
        this.inferChangedRef = React.createRef();
        this.traces = [];
        this.isDown = false;
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

    moveToNextPost(){
        this.allComponentsRef.current?.controller.moveToNextPost();
        this.forceUpdate();
    }

    moveToNextPrio(){
        this.allComponentsRef.current?.controller.moveToNextPrio();
        this.forceUpdate();
    }

    nextSolution(){
        this.allComponentsRef.current?.controller.nextSolution()
        this.forceUpdate();
    }

    async applyChange(){
        let exprs:string = this.newRelRef.current?.value || "";
        if(exprs.length == 0){
            return;
        }

        let exprList = exprs.split(';');

        let newRelation = exprList.map((expr)=>parseNewRelation(this.allComponentsRef.current!.controller, expr));
        console.log(newRelation)
        
        let forceUnchange: string = this.forceUnchangedRef.current?.value || '';
        let unchangedAttr: Attribute[] = forceUnchange.split(';')
            .filter(s=>s.length > 0)
            .map((s)=>this.allComponentsRef.current!.controller.getAttributeByStr(s));
        
        let inferChange: string = this.inferChangedRef.current?.value || '';
        let inferChangedAttr: Attribute[] = inferChange.split(';')
            .filter(s=>s.length > 0)
            .map((s)=>this.allComponentsRef.current!.controller.getAttributeByStr(s));

        await this.allComponentsRef.current!.controller!
            .update_contents(new Map(), newRelation, unchangedAttr, inferChangedAttr)
        this.forceUpdate()
        this.newRelRef.current!.value = "ok✅"
    }

    handlePointerDown(event:Konva.KonvaEventObject<MouseEvent>){
        this.isDown = true;
        let crtTrace:Array<[number, number]> = [[event.evt.clientX, event.evt.clientY]];
        this.traces.push(crtTrace);
    }

    handlePointerMove(event:Konva.KonvaEventObject<MouseEvent>){
        if(!this.isDown){
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
    }

    handlePointerUp(event:Konva.KonvaEventObject<MouseEvent>){
        if(!this.isDown){
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
        this.isDown = false;
        console.log(crtTrace)
    }



    render() {
        return (
            <div>
                <Stage width={window.innerWidth} height={window.innerHeight - 100}
                    onMouseDown={this.handlePointerDown.bind(this)}
                    onMouseMove={this.handlePointerMove.bind(this)}
                    onMouseUp={this.handlePointerUp.bind(this)}
                    listening={true}
                >
                    <Layer >
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
                <br/>
                新关系（;分隔）：<input ref={this.newRelRef} type='text'/>
                推测发生变化（;分隔）：<input ref={this.inferChangedRef} type='text'/>
                强制保持不变（;分隔）：<input ref={this.forceUnchangedRef} type='text'/>
                
                <Button
                type="primary"
                onClick={this.applyChange.bind(this)}
                >确定修改</Button>

                <Button
                type="primary"
                onClick={this.nextSolution.bind(this)}
                >下一个解</Button>
            </div>
        );
    }
}

export default App;
