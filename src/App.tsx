import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Shape } from "react-konva";
import './App.css';
import './toggle.css'
import { Attribute, Controller, ElementType, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { Button } from 'antd';
import Konva from 'konva';


class AllComponents extends React.Component {
    controller: Controller;
    state: {showCdt: boolean, nextCdt: [number, number, number][]};
    static cdtColors = [
        '#144125', '#1e5f36', '#277d47', '#309b58', '#3ab969', '#51c97e'
    ]
    constructor(props: any) {
        super(props);
        this.controller = Controller.getInstance();
        this.controller.add_switch_cdt_idx_listener((idx)=>{
            this.forceUpdate()
        })

        this.state = {
            nextCdt: [],
            showCdt: false
        }

        this.controller.add_switch_cdt_idx_listener(async (idx)=>{
            await this.updateCdt();
        })
    }

    async updateCdt(showCdt? : boolean){
        if(showCdt == undefined){
            showCdt = this.state.showCdt;
        }

        if(showCdt){
            this.setState({
                nextCdt: await this.controller.recommandNext(),
                showCdt: true
            })
        } else {
            this.setState({
                nextCdt: [],
                showCdt: false
            })
        }
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

        let nextCdts = this.state.nextCdt.map((v, idx)=>{
            return <Circle
                key={`cdt${idx}-${v[0]}-${v[1]}`} 
                x={v[0]}
                y={v[1]}
                width={15}
                height={15}
                fill={idx >= AllComponents.cdtColors.length - 1?AllComponents.cdtColors[AllComponents.cdtColors.length - 1]: AllComponents.cdtColors[idx]}
            />
        })

        return (
            <Group>
                {elements}
                {nextCdts}
            </Group>
        );
    }
}

class HelperGUI extends React.Component {
    controller: Controller;
    static TAG_DISP_CDT = 'TAG_DISP_CDT'  // 展示候选内容
    static TAG_DISP_RCM = 'TAG_DISP_RCM' // 展示推荐内容
    static ratio = 1.0 / 3.0
    state: {cdtIdx: number, selectedTag: string};

    showCdtRef: React.RefObject<HTMLInputElement>;
    constructor(props: any){
        super(props);
        this.controller = Controller.getInstance();
        this.state = {
            cdtIdx: 0,
            selectedTag: HelperGUI.TAG_DISP_CDT
        }

        this.controller.add_switch_cdt_idx_listener((idx)=>{
            this.setState({
                cdtIdx: idx
            })
        })

        this.showCdtRef = React.createRef()
    }

    update(){
        this.setState({
            pageNum: 0
        }, ()=>{
            this.forceUpdate()
        })
    }

    genShapes(attrList: Attribute[], values: number[]){
        let ele2AttrVals: Map<SingleElement, Map<string, number>> = new Map();
        let focusAttrNames = ['x', 'y'] // w, h
        for(let i = 0; i < attrList.length; ++ i){
            let attr = attrList[i];
            if(!focusAttrNames.includes(attr.name)){
                continue;
            }

            if(attr.element.id <= 0){
                continue;
            }

            if(!ele2AttrVals.has(attr.element)){
                ele2AttrVals.set(attr.element, new Map([
                    ['x', 0], ['y', 0], ['w', 50], ['h', 50]
                ]))
            }
            ele2AttrVals.get(attr.element)!.set(attr.name, values[i]);
        }
        
        return [... ele2AttrVals.entries()].map((v)=>{
            let ele: SingleElement = v[0];
            let attrVMap: Map<string, number> = v[1];
            return <Rect
                x={(attrVMap.get('x')! - attrVMap.get('w')!) * HelperGUI.ratio}
                y={(attrVMap.get('y')! - attrVMap.get('h')!) *  HelperGUI.ratio }
                width={attrVMap.get('w')!  * HelperGUI.ratio}
                height={attrVMap.get('h')!  * HelperGUI.ratio}
                fill={"green"}
                shadowBlur={5}
                key={`${ele.id}-cdt`}
            />
        })

    }

    genCdtDispClicked(idx:number){
        return ()=>{
            this.controller.crtCdtIdx = idx;
            this.controller.update_attr();
        }
    }

    async handleShowCdtClicked(e: React.ChangeEvent<HTMLInputElement>){
        await App.instance.allComponentsRef.current?.updateCdt(e.target.checked);
    }

    renderTools(){
        return <div>
            <div>
                <span style={{verticalAlign: '-webkit-baseline-middle'}}>显示后续位置？</span>
                <label className="switch">
                    <input ref={this.showCdtRef} 
                        onChange={this.handleShowCdtClicked.bind(this)}
                        type="checkbox"/>
                    <span className="slider round"></span>
                </label>
            </div>
        </div>
    }

    renderMain(){
        if(this.state['selectedTag'] === HelperGUI.TAG_DISP_CDT){
            return <div style={{height: '100vh', overflow: 'scroll'}}>
            {this.controller.candidates.map((cdt, idx)=>{
                return [<div  key={`${idx}-div`}
                    style={{backgroundColor: idx === this.state.cdtIdx? "#47bbf755": "#00000000"}}
                    onClick={this.genCdtDispClicked(idx).bind(this)}
                ><Stage key={`${idx}-stage`}
                    width={window.innerWidth / 4.0} 
                    height={window.innerHeight / 4.0}>
                    <Layer>
                        <Group>
                            {this.genShapes(cdt[1], cdt[2])}
                        </Group>
                    </Layer>
                </Stage></div>, <hr key={`${idx}-hr`}/>]
            })}
        </div>
        }
    }

    render(){
        return <div>
            {this.renderTools()}
            {this.renderMain()}
        </div>
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

    static colors:string[] = ['red', 'green', 'blue', 'orange', 'magenta', 'cyan', 'purple'];
    elemRangeRef: React.RefObject<HTMLInputElement>;
    static instance: App;
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
        App.instance = this;
    }

    nextSolution(){
        this.allComponentsRef.current?.controller.nextSolution()
        // this.forceUpdate();
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
        if(crtTrace == null){
            return;
        }
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
    }

    handlePointerUp(event:Konva.KonvaEventObject<MouseEvent>){
        if(!this.isDown){
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        crtTrace.push([event.evt.clientX, event.evt.clientY]);
        this.isDown = false;
        // console.log(crtTrace)
        this.forceUpdate()
    }

    async applyCmd(){
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
            <div style={{display: 'flex', flexDirection: 'row'}}>
                <div style={{flex: '3', backgroundColor: '#f0f0f0'}}>
                    <Stage width={window.innerWidth / 4.0 * 3.0} height={window.innerHeight - 200}
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
                    元素之间的相等关系：<input type="text" ref={this.elemRelationRef}/>
                    元素之间的比较关系：<input type="text" ref={this.elemRangeRef}/>
                    <hr/>
                    推测发生变化（;分隔）：<input ref={this.inferChangedRef} type='text'/>
                    强制保持不变（;分隔）：<input ref={this.forceUnchangedRef} type='text'/>
                    <hr/>
                    <button onClick={this.applyCmd.bind(this)}>应用用户指令</button>
                    <Button
                    type="primary"
                    onClick={this.nextSolution.bind(this)}
                    >下一个解</Button>
                </div>
                <div style={{flex: '1'}}>
                    <HelperGUI/>
                </div>
            </div>
        );
    }
}

export default App;
