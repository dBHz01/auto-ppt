import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow, Label, Tag, Ellipse} from "react-konva";
import './App.css';
import './toggle.css'
import { Attribute, Controller, ElementType, SingleElement } from './components/backend';
import { testBackend } from './components/test_backend';
import { Parser } from './jison/inputParser';
import { Button } from 'antd';
import Konva from 'konva';

import { abs, max, min, number, sqrt } from 'mathjs';
import { KonvaEventObject } from 'konva/lib/Node';
import { getOrDefault, reader } from './components/utility';
import { loadFile } from './components/load_file';

const ALLCOLORS = require("./components/colors.json");
const ColorNames = 'red pink purple blue cyan teal green yellow orange brown grey bluegrey'.split(' ');
const ColorNamesCN = '红 粉 紫 蓝 青 青绿 绿 黄 橙 棕 灰 蓝灰'.split(' ');

function delay(ms: number) {
    let crt = Date.now();
    while (Date.now() - crt < ms) { }
}


class AllComponents extends React.Component {
    controller: Controller;
    state: {
        showCdt: boolean, 
        nextCdt: [number, number, number][],
        selectedItemId: number,
        showDebug: boolean
    };
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
            showCdt: false,
            selectedItemId: -1,
            showDebug: true
        }

        this.controller.add_switch_cdt_idx_listener( (idx)=>{
             this.updateCdt();
        })
    }

     updateCdt(showCdt? : boolean){
        if(showCdt == undefined){
            showCdt = this.state.showCdt;
        }

        if(showCdt){
            this.setState({
                nextCdt:  this.controller.recommandNext(),
                showCdt: true
            })
        } else {
            this.setState({
                nextCdt: [],
                showCdt: false
            })
        }
    }

    updateDebug(showDebug=true){
        this.setState({
            showDebug,
        })
    }

    create_drag_end_handler(ele: SingleElement) {
        return  (evt: Konva.KonvaEventObject<DragEvent>) => {
            console.log(evt)
            console.log(ele)

            let newX = evt.target.attrs['x']
            let newY = evt.target.attrs['y']
            if(ele.type === ElementType.RECTANGLE){
                newX += evt.target.attrs['width'] / 2;
                newY += evt.target.attrs['height'] / 2;
            }

            let newAttrs: Map<Attribute, number> = new Map();

            newAttrs.set(ele.getAttribute('x')!, newX);
            newAttrs.set(ele.getAttribute('y')!, newY);
            
            let inferChangedStr = App.instance.inferChangedRef.current!.value;
            let inferChangedAttr = this.controller.parseAttrListByStr(inferChangedStr);
            
            let forceUnchangStr = App.instance.forceUnchangedRef.current!.value;
            let forceUnchangAttr = this.controller.parseAttrListByStr(forceUnchangStr);


            Controller.saveIfSuccess(()=>{
                let res = this.controller.update_contents(newAttrs, [], forceUnchangAttr, inferChangedAttr);
                if(res){
                    this.forceUpdate()
                }
                return res;
            })
            
        }
    }

     componentDidMount() {
         this.controller.updateValsByEquations();
        this.forceUpdate()
    }


    render() {
        console.log("render all");
        let elements = [];
        for (let it of this.controller.elements.entries()) {
            let i = it[1];
            let idx = it[0];
            switch (i.type) {
                case ElementType.RECTANGLE:
                case ElementType.CIRCLE:
                    let x_val = i.attributes.get("x")?.val.val;
                    let y_val = i.attributes.get("y")?.val.val;
                    let w_val = i.attributes.get("w")?.val.val;
                    let h_val = i.attributes.get("h")?.val.val;
                    let text = i.attributes.get("text")?.val.val;
                    let color = i.getCertainAttribute("color").val.val + "-" + i.getCertainAttribute("lightness").val.val.toString()
                    if (x_val && y_val && w_val && h_val) {
                        // if(i.type === ElementType.RECTANGLE){
                        //     x_val -= w_val / 2;
                        //     y_val -= h_val / 2
                        // }
                        if(i.type === ElementType.CIRCLE){
                            w_val /= 2;
                            h_val /= 2;
                        }
                        if(i.type === ElementType.RECTANGLE){
                            elements.push(
                                <Rect
                                    x={x_val - w_val / 2}
                                    y={y_val - h_val / 2}
                                    width={w_val}
                                    height={h_val}
                                    fill={ALLCOLORS[color]}
                                    shadowBlur={this.state.selectedItemId === idx? 15:0}
                                    key={i.id}
                                    draggable={true}
                                    onDragEnd={this.create_drag_end_handler(i).bind(this)}
                                    idInController={`${idx}`}
                                    strokeWidth={0}
                                />
                            );
                        } else if(i.type === ElementType.CIRCLE){
                            elements.push(
                                <Ellipse
                                    x={x_val}
                                    y={y_val}
                                    radiusX={w_val}
                                    radiusY={h_val}
                                    fill={ALLCOLORS[color]}
                                    shadowBlur={this.state.selectedItemId === idx? 15:0}
                                    key={i.id}
                                    draggable={true}
                                    onDragEnd={this.create_drag_end_handler(i).bind(this)}
                                    idInController={`${idx}`}
                                    strokeWidth={0}
                                />
                            );
                        }
                        
                        if(this.state.showDebug){
                            elements.push(<Text
                                x={x_val + w_val / 4}
                                y={y_val + h_val / 4}
                                key={`pos-${i.id}`}
                                text={`${i.id}\n${Math.round(x_val)},${Math.round(y_val)}`}
                                fontSize={10}
                                listening={false}
                            />);
                        }
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
                    let slightHeight = 3; // 矩形框需要上移一定高度

                    let pointerAtBeginning = i.getAttrVal('pointerAtBeginning', this.controller.attrNameToDefault.get('pointerAtBeginning'));
                    let pointerAtEnding = i.getAttrVal('pointerAtEnding', this.controller.attrNameToDefault.get('pointerAtEnding'));
                    let dashEnabled = i.getAttrVal('dashEnabled', this.controller.attrNameToDefault.get('dashEnabled'));

                    elements.push(<Arrow
                        x={startCorners[startCornerIndex][0]}
                        y={startCorners[startCornerIndex][1]}
                        points={[0, 0, width, height]}
                        pointerLength={5}
                        pointerWidth={5}
                        fill={'black'}
                        stroke={this.state.selectedItemId === idx? 'red': 'black'}
                        strokeWidth={3}
                        key={i.id}
                        idInController={`${idx}`}
                        pointerAtBeginning={pointerAtBeginning}
                        pointerAtEnding={pointerAtEnding}
                        dashEnabled={dashEnabled}
                        dash={[3, 3]}
                        
                        />);
                    let arrowText = i.getAttribute("text");
                    if (arrowText && arrowText.val.val.length > 0) {
                        // elements.push(<Rect
                        //     x={min(startCorners[startCornerIndex][0], endCorners[endCornerIndex][0]) + abs(width) / 20}
                        //     y={min(startCorners[startCornerIndex][1], endCorners[endCornerIndex][1]) + abs(height) / 2 + padding - slightHeight}
                        //     width={abs(width) * 9 / 10}
                        //     height={14}
                        //     fill={"#f0f0f0"}
                        //     shadowBlur={5}
                        //     key={`text-rect-${i.id}`}
                        //     draggable={false}
                        //     shadowEnabled={false}
                        //     idInController={`${idx}`}
                        // />);
                        /*elements.push(<Text
                            x={min(startCorners[startCornerIndex][0], endCorners[endCornerIndex][0]) + abs(width) / 2 - max(abs(width), 100) * 9 / 20}
                            y={min(startCorners[startCornerIndex][1], endCorners[endCornerIndex][1]) + abs(height) / 2 + padding}
                            width={max(abs(width), 100) * 9 / 10}
                            key={`text-${i.id}`}
                            text={arrowText.val.val}
                            fontSize={14}
                            listening={false}
                            align={'center'}
                            // fill={'#f0f0f0'}
                        />);*/
                        elements.push(<Label
                            key={`text-${i.id}`}
                            x={min(startCorners[startCornerIndex][0], endCorners[endCornerIndex][0]) + abs(width) / 2 - max(abs(width), 100) * 9 / 20}
                            y={min(startCorners[startCornerIndex][1], endCorners[endCornerIndex][1]) + abs(height) / 2 + padding}>
                            
                            <Tag fill={"#f0f0f0"}></Tag>
                            <Text
                                text={arrowText.val.val}
                                fontSize={14}
                                align={'center'}
                            />
                        </Label>)
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
    static TAG_DISP_SET = 'TAG_DISP_SET' // 展示推荐内容
    static ratio = 1.0 / 3.0
    state: {cdtIdx: number, selectedTag: string, 
        selectedItemId: number,
        itemAttrObj: Map<string, any>};

    showCdtRef: React.RefObject<HTMLInputElement>;
    editTextRef: React.RefObject<HTMLInputElement>;
    showDebugInfoRef: React.RefObject<HTMLInputElement>;
    uploadFileRef: React.RefObject<HTMLInputElement>;
    constructor(props: any){
        super(props);
        this.controller = Controller.getInstance();
        this.state = {
            cdtIdx: 0,
            selectedTag: HelperGUI.TAG_DISP_CDT,
            selectedItemId: -1,
            itemAttrObj: new Map(),
        }

        this.controller.add_switch_cdt_idx_listener((idx)=>{
            this.setState({
                cdtIdx: idx
            })
        })

        this.showCdtRef = React.createRef()
        this.editTextRef = React.createRef()
        this.showDebugInfoRef = React.createRef();
        this.uploadFileRef = React.createRef();
    }

    updateSelectedItem(itemId?: number){
        if(itemId == undefined){
            itemId = this.state.selectedItemId;
        }
        if(itemId < 0){
            this.setState({
                selectedItemId: -1,
                itemAttrObj: new Map(),
            })
            return;
        }

        let ele = this.controller.getElement(itemId);
        this.setState({
            selectedItemId: itemId,
            itemAttrObj: ele.copyAttrMap(),
        })
        return;
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
            Controller.saveIfSuccess(()=>{
                this.controller.crtCdtIdx = idx;
                this.controller.update_attr();
                return true;
            })
        }
    }

    genCdtDispClickedKonva(idx:number){
        return (e: KonvaEventObject<MouseEvent>)=>{
            this.controller.crtCdtIdx = idx;
            this.controller.update_attr();
        }
    }

    handleShowCdtClicked(e: React.ChangeEvent<HTMLInputElement>){
        App.instance.allComponentsRef.current?.updateCdt(e.target.checked);
    }

    handleShowDebugInfoClicked(e: React.ChangeEvent<HTMLInputElement>){
        App.instance.allComponentsRef.current?.updateDebug(e.target.checked);
    }

    genPointerClicked(start: boolean){
        let attrName = start? 'pointerAtBeginning': 'pointerAtEnding'
        return (e: React.ChangeEvent<HTMLInputElement>)=>{
            this.controller.getElement(this.state.selectedItemId)
                .changeCertainAttribute<boolean>(attrName, e.target.checked);
            App.instance.allComponentsRef.current?.forceUpdate();
            this.updateSelectedItem();
        }
    }

    handleDeleteArrow(){
        Controller.saveIfSuccess(()=>{
            let res = this.controller.deleteArrow(this.state.selectedItemId)
            if(res){
                this.updateSelectedItem(-1);
                App.instance.allComponentsRef.current?.forceUpdate()
            }
            return res;
        })
    }

    genHandleTagSelected(selected: string){
        return ()=>{
            this.setState({
                selectedTag: selected
            })
        }
    }

    renderMenu(){
        return <div style={{display: 'flex'}}>
            <div style={{flex: '1', 
                backgroundColor: this.state.selectedTag === HelperGUI.TAG_DISP_CDT? "#d6d6d6": "#ffffff"}}
                onClick={this.genHandleTagSelected(HelperGUI.TAG_DISP_CDT).bind(this)}>
                候选方案{this.state.selectedTag === HelperGUI.TAG_DISP_CDT?"✍︎": ""}
            </div>

            <div style={{flex: '1', 
                backgroundColor: this.state.selectedTag === HelperGUI.TAG_DISP_SET? "#d6d6d6": "#ffffff"}}
                onClick={this.genHandleTagSelected(HelperGUI.TAG_DISP_SET).bind(this)}>
                设置{this.state.selectedTag === HelperGUI.TAG_DISP_SET?"✍︎": ""}
            </div>
        </div>
    }

    handleLigntnessInc(){
        if(!this.state.itemAttrObj.has('lightness')){
            return;
        }
        this.controller.getElement(this.state.selectedItemId).changeLightness(1);
        App.instance.allComponentsRef.current?.forceUpdate()
        this.updateSelectedItem();
    }

    handleLigntnessDec(){
        Controller.saveIfSuccess(()=>{
            if(!this.state.itemAttrObj.has('lightness')){
                return false;
            }
            this.controller.getElement(this.state.selectedItemId).changeLightness(-1);
            App.instance.allComponentsRef.current?.forceUpdate()
            this.updateSelectedItem();
            return true
        })
    }

    genColorSelect(cn: string){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                if(!this.state.itemAttrObj.has('color')){
                    return false;
                }
                this.controller.getElement(this.state.selectedItemId).changeColor(cn);
                App.instance.allComponentsRef.current?.forceUpdate()
                this.updateSelectedItem();
                return true;
            })
            
        }
    }

    downloadContent(){
        let eleLink = document.createElement('a');
        eleLink.download = `content.json`;
        eleLink.style.display = 'none';
        let blob = new Blob([JSON.stringify(this.controller.exportAsJson())], {"type": "text/json"});
        eleLink.href = URL.createObjectURL(blob);

        document.body.appendChild(eleLink);
        eleLink.click();
        document.body.removeChild(eleLink);
    }

    clearTrace(){
        App.instance.traces = [];
        App.instance.forceUpdate()
    }

    async handleUploadFileClick(){
        await Controller.saveIfSuccessAsync(async()=>{
            try{
                let fileData = await reader(this.uploadFileRef.current!.files![0])
                loadFile(Controller.getInstance(), JSON.parse(fileData));
                App.instance.forceUpdate()
                return true;
            } catch(error) {
                alert('文件载入出错')
                return false;
            }
        })
    }

    renderTools(){
        if(this.state.selectedTag !== HelperGUI.TAG_DISP_SET){
            return null;
        }

        let selectedItem = this.state.selectedItemId > 0? this.controller.getElement(this.state.selectedItemId): undefined;
        return <div>
            <div>
                <button onClick={this.downloadContent.bind(this)}>点击下载</button>
                <button onClick={this.clearTrace.bind(this)}>清空路径</button>

                <div>
                    <input type="file" name="file" ref={this.uploadFileRef} ></input>
                    <button onClick={this.handleUploadFileClick.bind(this)}>上传文件</button>    
                </div>
            </div>
            <div>
                <button onClick={()=>{
                    Controller.undo();
                    this.updateSelectedItem(-1)
                    App.instance.allComponentsRef.current?.updateCdt(false);
                    this.showCdtRef.current!.checked = false;
                    App.instance.forceUpdate(); // 全局刷新
                }} disabled={!Controller.canUndo()}>撤销 {'<-'}</button>
                <button onClick={()=>{
                    Controller.redo();
                    this.updateSelectedItem(-1)
                    App.instance.allComponentsRef.current?.updateCdt(false);
                    this.showCdtRef.current!.checked = false;
                    App.instance.forceUpdate(); // 全局刷新
                }} disabled={!Controller.canRedo()}>重做 {'->'}</button>
            </div>
            <div>
                <span style={{verticalAlign: '-webkit-baseline-middle'}}>显示后续位置？</span>
                <label className="switch">
                    <input ref={this.showCdtRef} 
                        onChange={this.handleShowCdtClicked.bind(this)}
                        type="checkbox"
                        defaultChecked={App.instance.allComponentsRef.current?.state.showCdt}
                        />
                    <span className="slider round"></span>
                </label>
            </div>
            <div>
                <span style={{verticalAlign: '-webkit-baseline-middle'}}>显示调试信息？</span>
                <label className="switch">
                    <input ref={this.showDebugInfoRef} 
                        onChange={this.handleShowDebugInfoClicked.bind(this)}
                        type="checkbox"
                        defaultChecked={App.instance.allComponentsRef.current?.state.showDebug}
                        />
                    <span className="slider round"></span>
                </label>
            </div>
            {this.state.selectedItemId >= 0? <div>
                <div>
                    <input ref={this.editTextRef} type="text" 
                        defaultValue={this.controller.elements.get(this.state.selectedItemId)?.attributes.get('text')?.val.val || ""}
                    /><button onClick={()=>{
                        Controller.saveIfSuccess(()=>{
                            this.controller.addTextToEle(this.state.selectedItemId, this.editTextRef.current!.value);
                            App.instance.allComponentsRef.current?.forceUpdate();
                            return true;
                        })
                    }}>修改文本</button>
                </div>

                {this.state.itemAttrObj.get('color') == undefined?null: <div>
                    <div style={{display: 'flex', height: '50px'}}>
                        <div style={{flex: 'none', verticalAlign: '-webkit-baseline-middle'}}>
                            深浅设置：
                        </div>
                        <div style={{flex: '1', verticalAlign: '-webkit-baseline-middle'}}
                            onClick={this.handleLigntnessInc.bind(this)}>
                            变深
                        </div>
                        <div style={{flex: '1', verticalAlign: '-webkit-baseline-middle'}}>
                            {this.state.itemAttrObj.get('lightness')}
                        </div>
                        <div style={{flex: '1', verticalAlign: '-webkit-baseline-middle'}}
                            onClick={this.handleLigntnessDec.bind(this)}>
                            变浅
                        </div>
                    </div>

                    <div style={{display: 'flex', flexWrap: 'wrap'}}>
                            {ColorNames.map((cn, idx)=>{
                                return <div style={{
                                    textAlign: 'center',
                                    verticalAlign: '-webkit-baseline-middle',
                                    flex: '50px',
                                    height: '50px',
                                    backgroundColor: ALLCOLORS[`${cn}-${this.state.itemAttrObj.get('lightness')}`]}}
                                    onClick={this.genColorSelect(cn).bind(this)}
                                    key={`cdt-color-${cn}`}>
                                        <span style={{textAlign: 'center', verticalAlign: '-webkit-baseline-middle'}}>
                                            {ColorNamesCN[idx]}{this.state.itemAttrObj.get('color') === cn? '\n✅': ''}
                                            </span>
                                </div>
                            })}


                        </div>
                
                </div>}

                {selectedItem!.type === ElementType.ARROW?<div>
                    <div>
                        <span style={{verticalAlign: '-webkit-baseline-middle'}}>起点箭头？</span>
                        <label className="switch">
                            <input 
                                onChange={this.genPointerClicked(true).bind(this)}
                                type="checkbox"
                                defaultChecked={
                                    getOrDefault(this.state.itemAttrObj, 'pointerAtBeginning', this.controller.attrNameToDefault.get('pointerAtBeginning'))}
                                />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div>
                        <span style={{verticalAlign: '-webkit-baseline-middle'}}>终点箭头？</span>
                        <label className="switch">
                            <input 
                                onChange={this.genPointerClicked(false).bind(this)}
                                type="checkbox"
                                defaultChecked={
                                    getOrDefault(this.state.itemAttrObj, 'pointerAtEnding', this.controller.attrNameToDefault.get('pointerAtEnding'))}
                                />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div>
                        <span style={{verticalAlign: '-webkit-baseline-middle'}}>虚线？</span>
                        <label className="switch">
                            <input 
                                onChange={(e)=>{
                                    this.controller.getElement(this.state.selectedItemId)
                                        .changeCertainAttribute('dashEnabled', e.target.checked)
                                    this.updateSelectedItem()
                                    App.instance.allComponentsRef.current?.forceUpdate()
                                }}
                                type="checkbox"
                                defaultChecked={
                                    getOrDefault(this.state.itemAttrObj, 'dashEnabled', this.controller.attrNameToDefault.get('dashEnabled'))}
                                />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div>
                        <button onClick={this.handleDeleteArrow.bind(this)}>删除箭头</button>
                    </div>
                </div>: null}

            </div>:
                <div>选中界面元素以进行更加深入设置</div>}
        </div>
    }

    renderCDT(){
        if(this.state['selectedTag'] !== HelperGUI.TAG_DISP_CDT){
            return null;
        }
        return <div style={{height: '95vh', overflow: 'scroll'}}>
            {this.controller.candidates.map((cdt, idx)=>{
                return [<div  key={`${idx}-div`}
                    style={{backgroundColor: idx === this.state.cdtIdx? "#47bbf755": "#00000000", cursor: 'pointer'}}
                    onClick={this.genCdtDispClicked(idx).bind(this)}
                    
                ><Stage key={`${idx}-stage`}
                    width={window.innerWidth / 4.0} 
                    height={window.innerHeight / 4.0}
                    listening={true}
                    onTap={this.genCdtDispClickedKonva(idx).bind(this)}>
                    <Layer>
                        <Group>
                            {this.genShapes(cdt[1], cdt[2])}
                        </Group>
                    </Layer>
                </Stage></div>, <hr key={`${idx}-hr`}/>]
            })}
        </div>
        
    }

    render(){
        return <div>
            {this.renderMenu()}
            {this.renderTools()}
            {this.renderCDT()}
        </div>
    }
}

class App extends Component {
    allComponentsRef: React.RefObject<AllComponents>;
    helpGUIRef: React.RefObject<HelperGUI>;
    forceUnchangedRef: React.RefObject<HTMLInputElement>;
    inferChangedRef: React.RefObject<HTMLInputElement>;
    traces: Array<Array<[number, number]>>;
    isDown: boolean;

    traceRelationRef: React.RefObject<HTMLInputElement>;
    elemRelationRef: React.RefObject<HTMLInputElement>;

    static colors: string[] = ['red', 'green', 'blue', 'orange', 'magenta', 'cyan', 'purple'];
    elemRangeRef: React.RefObject<HTMLInputElement>;
    addArrowRef: React.RefObject<HTMLInputElement>;
    textForNewEleRef: React.RefObject<HTMLInputElement>;
    static instance: App;
    constructor(props: any) {
        super(props);
        this.allComponentsRef = React.createRef<AllComponents>();
        testBackend();
        // Parser.prototype.parse("修改这个矩形的宽度为这个矩形的宽度和那个矩形的高度的差的三分之一");
        // Parser.prototype.parse("新建一个矩形在这里");
        // Parser.prototype.parse("修改这个红色矩形的颜色浅一点");
        // Parser.prototype.parse("A的大小");
        // Parser.prototype.parse("A的大小等于B的大小");
        // Parser.prototype.parse("A和B的水平距离等于A和C的竖直距离");
        let p = new Parser()
        let x = p.parse("新建矩形C在A的下方使A和B的水平距离等于A和C的竖直距离且A和B的水平距离等于A和C的竖直距离");
        console.log(x)
        // Parser.prototype.parse("新建矩形A");
        // Parser.prototype.parse("新建矩形B在A的右方");
        // Parser.prototype.parse("修改C的颜色为红色");
        // Parser.prototype.parse("修改C的大小为C的二分之一");
        // Parser.prototype.parse("移动C到B的右方");
        // Parser.prototype.parse("修改B的颜色深一点");
        // Parser.prototype.parse("修改C的大小大一点");
        // Parser.prototype.parse("移动C往右边");
        // Parser.prototype.parse("移动C到A和B的中点");
        this.traces = [];
        this.isDown = false;

        this.forceUnchangedRef = React.createRef();
        this.inferChangedRef = React.createRef();

        // new stage
        this.traceRelationRef = React.createRef();
        this.elemRelationRef = React.createRef();
        this.elemRangeRef = React.createRef();
        this.helpGUIRef = React.createRef();
        App.instance = this;
        this.addArrowRef = React.createRef();
        this.textForNewEleRef = React.createRef()
    }

    nextSolution() {
        Controller.saveIfSuccess(()=>{
            this.allComponentsRef.current?.controller.nextSolution()
            return true;
        })
        
        // this.forceUpdate();
    }

    handlePointerDown(event: Konva.KonvaEventObject<MouseEvent>) {
        this.isDown = true;
        let crtTrace: Array<[number, number]> = [[event.evt.clientX, event.evt.clientY]];
        this.traces.push(crtTrace);
    }

    handleTouchDown(event: Konva.KonvaEventObject<TouchEvent>) {
        this.isDown = true;
        let crtTrace: Array<[number, number]> = [[event.evt.touches[event.evt.touches.length-1].clientX, event.evt.touches[event.evt.touches.length-1].clientY]];
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

    handleTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
        if (!this.isDown) {
            return;
        }
        let crtTrace = this.traces[this.traces.length - 1];
        if (crtTrace == null) {
            return;
        }
        crtTrace.push([event.evt.touches[event.evt.touches.length-1].clientX, event.evt.touches[event.evt.touches.length-1].clientY]);
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

    handleTouchUp(event: Konva.KonvaEventObject<TouchEvent>) {
        if (!this.isDown) {
            return;
        }
        // let crtTrace = this.traces[this.traces.length - 1];
        // crtTrace.push([event.evt.touches[event.evt.touches.length-1].clientX, event.evt.touches[event.evt.touches.length-1].clientY]);
        this.isDown = false;
        // console.log(crtTrace)
        this.forceUpdate()
    }

     applyCmd() {
        let traceEleRelationStr = this.traceRelationRef.current!.value;
        let elemRelStr = this.elemRelationRef.current!.value;
        let unchangedStr = this.forceUnchangedRef.current!.value;
        let inferChangeStr = this.inferChangedRef.current!.value;
        let eleRangeStr = this.elemRangeRef.current!.value;
        let newEleText = this.textForNewEleRef.current!.value;
        Controller.saveIfSuccess(()=>{
            try{
                let res = this.allComponentsRef.current!.controller.handleUserCommand(
                    this.traces, traceEleRelationStr, elemRelStr, eleRangeStr, unchangedStr, inferChangeStr, newEleText
                );
                if(res){
                    this.traces = [];
                    this.forceUpdate();
                }
                return res;
            } catch(error){
                console.error(error);
                alert('运行出错，请检查指令')
                return false;
            }
            
        })
    }

    handleCanvasClicked(e: KonvaEventObject<MouseEvent>){
        if(e.target.attrs['idInController'] === undefined){
            this.allComponentsRef.current?.setState({
                selectedItemId: -1
            })
            // this.helpGUIRef.current?.setState({
            //     selectedItemId: -1
            // })
            this.helpGUIRef.current?.updateSelectedItem(-1)
            return;
        }
        this.allComponentsRef.current?.setState({
            selectedItemId: Number(e.target.attrs['idInController'])
        })
        // this.helpGUIRef.current?.setState({
        //     selectedItemId: Number(e.target.attrs['idInController'])
        // })
        this.helpGUIRef.current?.updateSelectedItem(Number(e.target.attrs['idInController']))
        return;
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'row', overflow: 'hidden', position:'fixed'}}>
                <div style={{flex: '3', backgroundColor: '#f0f0f0'}}>
                    <Stage width={window.innerWidth / 4.0 * 3.0} 
                        height={window.innerHeight - 200}
                        onMouseDown={this.handlePointerDown.bind(this)}
                        onMouseMove={this.handlePointerMove.bind(this)}
                        onMouseUp={this.handlePointerUp.bind(this)}

                        onTouchStart={this.handleTouchDown.bind(this)}
                        onTouchMove={this.handleTouchMove.bind(this)}
                        onTouchEnd={this.handleTouchUp.bind(this)}

                        listening={true}
                        onClick={this.handleCanvasClicked.bind(this)}
                        onTap={this.handleCanvasClicked.bind(this)}
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
                    新元素文本：<input ref={this.textForNewEleRef} type='text'/>
                    <hr/>
                    <button onClick={this.applyCmd.bind(this)}>应用用户指令</button>
                    <Button
                    type="primary"
                    onClick={this.nextSolution.bind(this)}
                    >下一个解</Button>
                    <br/>
                    添加箭头：<input ref={this.addArrowRef} type='text'/>
                    <button onClick={()=>{
                        Controller.saveIfSuccess(()=>{
                            this.allComponentsRef.current?.controller.addArrowByStr(this.addArrowRef.current!.value);
                            this.allComponentsRef.current?.forceUpdate()
                            return true;
                        })
                        }}>添加箭头</button>
                </div>
                <div style={{flex: '1'}}>
                    <HelperGUI ref={this.helpGUIRef}/>
                </div>
            </div>
        );
    }
}

export default App;
