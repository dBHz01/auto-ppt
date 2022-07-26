import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle } from "react-konva";
import './App.css';
import { Attribute, Controller, ElementType, FuncTree, Operator, OperatorNode, RawNumber, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { loadFile, parseNewEquation} from "./components/load_file";
import { Button } from 'antd';
import Konva from 'konva';

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

    async componentDidMount(){
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

    traceRelationRef: React.RefObject<HTMLInputElement>;
    elemRelationRef: React.RefObject<HTMLInputElement>;

    static colors:string[] = ['red', 'green', 'blue', 'orange', 'magenta', 'cyan', 'purple'];
    constructor(props: any) {
        super(props);
        this.allComponentsRef = React.createRef<AllComponents>();
        testBackend();
        this.traces = [];
        this.isDown = false;

        this.newRelRef = React.createRef();
        this.forceUnchangedRef = React.createRef();
        this.inferChangedRef = React.createRef();

        // new stage
        this.traceRelationRef = React.createRef(); 
        this.elemRelationRef = React.createRef();

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

        let newEquation = exprList.map((expr)=>parseNewEquation(this.allComponentsRef.current!.controller, expr));
        console.log(newEquation)
        
        let forceUnchange: string = this.forceUnchangedRef.current?.value || '';
        let unchangedAttr: Attribute[] = forceUnchange.split(';')
            .filter(s=>s.length > 0)
            .map((s)=>this.allComponentsRef.current!.controller.getAttributeByStr(s));
        
        let inferChange: string = this.inferChangedRef.current?.value || '';
        let inferChangedAttr: Attribute[] = inferChange.split(';')
            .filter(s=>s.length > 0)
            .map((s)=>this.allComponentsRef.current!.controller.getAttributeByStr(s));

        await this.allComponentsRef.current!.controller!
            .update_contents(new Map(), newEquation, unchangedAttr, inferChangedAttr)
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
        this.forceUpdate()
    }

    async applyCmd(){
        let traceEleRelationStr = this.traceRelationRef.current!.value;
        let elemRelStr = this.elemRelationRef.current!.value;
        await this.allComponentsRef.current!.controller.handleUserCommand(this.traces, traceEleRelationStr, elemRelStr);

        this.traces = [];
        this.forceUpdate();
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
                        {this.traces.flatMap((points, traceId)=>{
                            return points.map((p, pid)=>{
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
                <hr/>
                路径与元素的关系：<input type="text" ref={this.traceRelationRef}/>
                元素之间的关系：<input type="text" ref={this.elemRelationRef}/>

                <button onClick={this.applyCmd.bind(this)}>应用用户指令</button>
                <hr/>
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
