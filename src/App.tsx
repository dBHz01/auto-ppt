import React, { Component } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow, Label, Tag, Ellipse, Line} from "react-konva";
import './App.css';
import './toggle.css'
import { Attribute, Controller, ElementType, RawNumber, SingleElement } from './components/backend';
import { Parser } from './jison/inputParser';
import { Parser as ArrowParser } from './jison/arrowParser';
import { Button, Tag as AntdTag } from 'antd';
import Konva from 'konva';

import { abs, max, min, number, sqrt } from 'mathjs';
import { KonvaEventObject } from 'konva/lib/Node';
import { convertObjToMap, floatEq, getOrDefault, reader, splitRange} from './components/utility';
import { loadFile } from './components/load_file';
import { check, Display } from './components/backendDisplay';
import { ControllerOp, ElementPlaceholder } from './NLParser';
import { ASR } from './ASR';
import { Log } from './components/Log';
import JSZip from 'jszip';

const ALLCOLORS = require("./components/colors.json");
const ColorNames = 'red pink purple blue cyan teal green yellow orange brown grey bluegrey'.split(' ');
const ColorNamesCN = '红 粉 紫 蓝 青 青绿 绿 黄 橙 棕 灰 蓝灰'.split(' ');
const { CheckableTag } = AntdTag;

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
        showHints: boolean
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
            showDebug: false,
            showHints: true
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

    updateHints(showHints=true){
        this.setState({
            showHints,
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
                                    strokeWidth={1}
                                    stroke={'black'}
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
                            lineHeight={1.5}
                        />);
                    }
                    break;

                case ElementType.ARROW:
                    // console.log(i);
                    let startElemet = this.controller.getElement(Number(i.getCertainAttribute("startElement").val.val));
                    let endElemet = this.controller.getElement(Number(i.getCertainAttribute("endElement").val.val));
                    let startCenter = [startElemet.getAttribute("x")!.val.val, startElemet.getAttribute("y")!.val.val];
                    let endCenter = [endElemet.getAttribute("x")!.val.val, endElemet.getAttribute("y")!.val.val];
                    let startWidth = startElemet.getAttribute("w")!.val.val;
                    let startHeight = startElemet.getAttribute("h")!.val.val;
                    let endWidth = endElemet.getAttribute("w")!.val.val;
                    let endHeight = endElemet.getAttribute("h")!.val.val;
                    let startBorder = [startCenter[0] - startWidth / 2, startCenter[1] - startHeight / 2, startCenter[0] + startWidth / 2, startCenter[1] + startHeight / 2] // left up right down
                    let endBorder = [endCenter[0] - endWidth / 2, endCenter[1] - endHeight / 2, endCenter[0] + endWidth / 2, endCenter[1] + endHeight / 2] // left up right down
                    let startCorners = startElemet.getCorner();
                    let endCorners = endElemet.getCorner();
                    let startOption = [0, 1, 2, 3, 4, 5, 6, 7];
                    let removeOption = function(arr: Array<Number>, option: Number) {
                        arr.forEach(function(item, index, arr) {
                            if(item === option) {
                                arr.splice(index, 1);
                            }
                        });
                    }
                    if (startBorder[0] <= endBorder[2]) {
                        removeOption(startOption, 5);
                        removeOption(startOption, 6);
                        removeOption(startOption, 7);
                    }
                    if (startBorder[1] <= endBorder[3]) {
                        removeOption(startOption, 0);
                        removeOption(startOption, 1);
                        removeOption(startOption, 7);
                    }
                    if (startBorder[2] >= endBorder[0]) {
                        removeOption(startOption, 1);
                        removeOption(startOption, 2);
                        removeOption(startOption, 3);
                    }
                    if (startBorder[3] >= endBorder[1]) {
                        removeOption(startOption, 3);
                        removeOption(startOption, 4);
                        removeOption(startOption, 5);
                    }
                    // console.log(startOption);
                    let startCornerIndex = 0;
                    if (startOption.length === 1) {
                        // 只有一个备选项
                        startCornerIndex = startOption[0];
                    } else {
                        // 多个备选项，选择和目标点积值最小的那一个
                        let vectorMinus = function(vec_0: number[], vec_1: number[]) {
                            return [vec_0[0] - vec_1[0], vec_0[1] - vec_1[1]]
                        }
                        let vectorNormalize = function(vec: number[]) {
                            let l = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
                            return [vec[0] / l, vec[1] / l];
                        }
                        let vectorDot = function(vec_0: number[], vec_1: number[]) {
                            return vec_0[0] * vec_1[0] + vec_0[1] * vec_1[1];
                        }
                        let dotValues: number[] = [];
                        let targetVector = vectorNormalize(vectorMinus(endCenter, startCenter));
                        for (let tmpStartIndex of startOption) {
                            let tmpEndIndex = (tmpStartIndex + 4) % 8;
                            let tmpVector = vectorNormalize(vectorMinus(endCorners[tmpEndIndex], startCorners[tmpStartIndex]));
                            dotValues.push(vectorDot(targetVector, tmpVector));
                        }
                        let maxDotValueIndex = dotValues.indexOf(Math.max(...dotValues));
                        startCornerIndex = startOption[maxDotValueIndex];
                    }
                    let endCornerIndex = (startCornerIndex + 4) % 8
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
                            
                            <Tag fill={'#ffffff'/*"#f0f0f0"*/}></Tag>
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

        let hints = [];
        if(this.state.showHints)
        {
            let hintcolor = ['red', 'purple', 'blue', 'orange', 'magenta', 'cyan', 'purple','black',"grey"];
            let text_points = [[0,0,0]];
            let arrow_points = [[0,0,0,0]];
            for (let i of this.controller.hints.values()){
                if(i.type == ElementType.LINE)
                {
                    for (let j of this.controller.hints.values())
                    {
                        if(j.type == ElementType.LINE && i.id != j.id)
                        {
                            let i_point = [i.getAttribute("point1_x")?.val.val,i.getAttribute("point1_y")?.val.val,i.getAttribute("point2_x")?.val.val,i.getAttribute("point2_y")?.val.val];
                            let j_point = [j.getAttribute("point1_x")?.val.val,j.getAttribute("point1_y")?.val.val,j.getAttribute("point2_x")?.val.val,j.getAttribute("point2_y")?.val.val];
                            i_point[0] = Math.round(i_point[0]); i_point[1] = Math.round(i_point[1]); i_point[2] = Math.round(i_point[2]); i_point[3] = Math.round(i_point[3]);
                            j_point[0] = Math.round(j_point[0]); j_point[1] = Math.round(j_point[1]); j_point[2] = Math.round(j_point[2]); j_point[3] = Math.round(j_point[3]);
                            if ((i_point[0] == i_point[2]) && (j_point[0] == j_point[2]) && (i_point[0] == j_point[0]))
                            {
                                if((i_point[1] > i_point[3]) && (j_point[1] >= i_point[1]) && (j_point[3] <= i_point[3]))
                                    {
                                        this.controller.deleteHint(i.id);
                                        break;
                                    }
                                if((i_point[1] < i_point[3]) && (j_point[1] <= i_point[1]) && (j_point[3] >= i_point[3]))
                                    {
                                        this.controller.deleteHint(i.id);
                                        break;
                                    }
                            }
                            if ((i_point[1] == i_point[3]) && (j_point[1] == j_point[3]) && (i_point[1] == j_point[1]))
                            {
                                if((i_point[0] > i_point[2]) && (j_point[0] >= i_point[0]) && (j_point[2] <= i_point[2]))
                                    {
                                        this.controller.deleteHint(i.id);
                                        break;
                                    }
                                if((i_point[0] < i_point[2]) && (j_point[0] <= i_point[0]) && (j_point[2] >= i_point[2]))
                                    {
                                        this.controller.deleteHint(i.id);
                                        break;
                                    }
                            }
                        }
                    }
                }
                if(i.type == ElementType.ARROW)
                {
                    let flag = 1;
                    let tmp_point = [i.getAttribute("point1_x")?.val.val,i.getAttribute("point1_y")?.val.val,i.getAttribute("point2_x")?.val.val,i.getAttribute("point2_y")?.val.val];
                    for (let j of arrow_points)
                    {
                        if (Math.round(tmp_point[0])==Math.round(j[0]) && Math.round(tmp_point[1])==Math.round(j[1]) && Math.round(tmp_point[2])==Math.round(j[2]) && Math.round(tmp_point[3])==Math.round(j[3])) 
                        {
                            this.controller.deleteHint(i.id);
                            flag = 0;
                            break;
                        }
                    }
                    if(flag) arrow_points.push(tmp_point);
                }
                if(i.type == ElementType.TEXT)
                {
                    let flag = 1;
                    let tmp_point = [i.getAttribute("x")?.val.val,i.getAttribute("y")?.val.val,i.getAttribute("length")?.val.val];
                    for (let j of text_points)
                    {
                        if (Math.round(tmp_point[0])==Math.round(j[0]) && Math.round(tmp_point[1])==Math.round(j[1]) && Math.round(tmp_point[2])==Math.round(j[2])) 
                        {
                            this.controller.deleteHint(i.id);
                            flag = 0;
                            break;
                        }
                    }
                    if(flag) text_points.push(tmp_point);
                }
            }
            for (let i of this.controller.hints.values()) {
                switch (i.type) {
                    case ElementType.LINE:                   
                        hints.push(
                            <Line
                                points = {[i.getAttribute("point1_x")?.val.val,i.getAttribute("point1_y")?.val.val,i.getAttribute("point2_x")?.val.val,i.getAttribute("point2_y")?.val.val]}
                                stroke = {hintcolor[i.getAttribute("color")?.val.val]}
                                dash = {i.getAttribute("dash")?.val.val==1?[4,2]:[1,0]} 
                                strokeWidth = {1}
                                key = {-i.id-1}
                            />
                        );
                        break;
                    case ElementType.TEXT:                   
                        hints.push(
                            <Text
                                x={i.getAttribute("x")?.val.val}
                                y={i.getAttribute("y")?.val.val}
                                fill = {hintcolor[i.getAttribute("color")?.val.val]}
                                fontSize={10}
                                text={`${Math.round(i.getAttribute("length")?.val.val)}px`}
                                key = {-i.id-1}
                            />
                        );
                        break;
                    case ElementType.ARROW:                   
                        hints.push(
                            <Arrow
                                points = {[i.getAttribute("point1_x")?.val.val,i.getAttribute("point1_y")?.val.val,i.getAttribute("point2_x")?.val.val,i.getAttribute("point2_y")?.val.val]}
                                stroke = {hintcolor[i.getAttribute("color")?.val.val]}
                                pointerLength = {5}
                                pointerWidth = {5}
                                fill = {hintcolor[i.getAttribute("color")?.val.val]}
                                pointerAtBeginning = {true}
                                key = {-i.id-1}
                            />
                        );
                        break;
                    default:
                        break;
                }
            }
        }

        return (
            <Group>
                {elements}
                {nextCdts}
                {hints}
            </Group>
        );
    }
}

class ModifyRecommand {
    // 描述推荐的修改内容
    modifyAttrName: string;
    tgtVal: any;

    filterAttrName: string;
    filterAttrVal: any;
    static attrToName: Map<string, string>;
    constructor(modifyAttrName: string, tgtVal: any, filterAttrName: string, filterAttrVal: any){
        this.modifyAttrName = modifyAttrName;
        this.tgtVal = tgtVal;
        this.filterAttrName = filterAttrName;
        this.filterAttrVal = filterAttrVal;
    }

    apply(){
        Controller.saveIfSuccess(()=>{
            [... Controller.getInstance().elements.values()].forEach((ele)=>{
                if(ele.id <= 0){
                    return;
                }
                if(typeof this.filterAttrVal === 'number'){
                    if(!floatEq(ele.getAttrVal(this.filterAttrName, undefined), this.filterAttrVal)){
                        return;
                    }
                } else if(ele.getAttrVal(this.filterAttrName, undefined) != this.filterAttrVal){
                    return;
                }
    
                ele.changeCertainAttribute(this.modifyAttrName, this.tgtVal, false);
            })
            Log.logDefault('应用推荐修改', {
                modifyAttrName: this.modifyAttrName, 
                tgtVal: this.tgtVal,
                filterAttrName: this.filterAttrName,
                filterAttrVal: this.filterAttrVal
            })
            App.instance.allComponentsRef.current?.forceUpdate();
            HelperGUI.instance.updateRecommand();
            return true;
        })
    }

    check(){
        if(!ModifyRecommand.attrToName.has(this.filterAttrName)){
            return false;
        }
        let toModEles = [... Controller.getInstance().elements.values()].filter((crtEle)=>{
            if(crtEle.id <= 0){
                return false;
            }
            
            let v1 = crtEle.getAttrVal(this.filterAttrName, null);
            let v2 = this.filterAttrVal;
            if(typeof this.filterAttrVal === 'number'){
                if(!floatEq(v1, v2)){
                    return false;
                }
            } else if(v1 !== v2){
                return false;
            }

            v1 = crtEle.getAttrVal(this.modifyAttrName, undefined);
            v2 = this.tgtVal
            if(typeof v2 === 'number' && floatEq(v1, v2)){
                return false
            }
            else if(crtEle.getAttrVal(this.modifyAttrName, undefined) === this.tgtVal){
                return false;
            }

            return true;
        })

        return toModEles.length > 0;
    }

    toStrToDisp(val: any){
        if(typeof val === 'string'){
            if(val.length === 0){
                return '空'
            }
        }

        if(typeof val === 'boolean'){
            if(val){
                return '真'
            } else {
                return '假'
            }
        }

        if(typeof val === 'number'){
            return `${val.toFixed(0)}`;
        }

        return val
    }

    disp(){
        return <div key={`${this.modifyAttrName}-${this.tgtVal}-${this.filterAttrName}-${this.filterAttrVal}`}>
            将所有 <b>{ModifyRecommand.attrToName.get(this.filterAttrName)}</b> 为 {this.toStrToDisp(this.filterAttrVal)} 的元素的
            <br/>
            {ModifyRecommand.attrToName.get(this.modifyAttrName)}修改为{this.toStrToDisp(this.tgtVal)}
            <br/>
            <button onClick={this.apply.bind(this)}>确认</button>
            <hr/>
        </div>
    }
}

ModifyRecommand.attrToName = new Map();
ModifyRecommand.attrToName.set('x', '水平位置')
ModifyRecommand.attrToName.set('y', '竖直位置')
ModifyRecommand.attrToName.set('color', '颜色')
ModifyRecommand.attrToName.set('lightness', '亮度')
ModifyRecommand.attrToName.set('w', '宽度')
ModifyRecommand.attrToName.set('h', '高度')

class HelperGUI extends React.Component {
    controller: Controller;
    static TAG_DISP_CDT = 'TAG_DISP_CDT'  // 展示候选内容
    static TAG_DISP_SET = 'TAG_DISP_SET' // 展示设置内容
    static TAG_DISP_MOD = 'TAG_DISP_MOD' // 展示推荐修改内容
    static TAG_DISP_SET_GLOBAL = 'TAG_DISP_SET_GLOBAL' // 全局
    static TAG_DISP_INS = 'TAG_DISP_INS' // 指令展示
    static ratio = 1.0 / 3.5
    state: {cdtIdx: number, selectedTag: string, 
        selectedItemId: number,
        itemAttrObj: Map<string, any>,
        nextModifyRecommand: ModifyRecommand[],
        instructionDisplay: [string[], (SingleElement | undefined)[]],
        chosenTag: number
    };

    showCdtRef: React.RefObject<HTMLInputElement>;
    editTextRef: React.RefObject<HTMLTextAreaElement>;
    showDebugInfoRef: React.RefObject<HTMLInputElement>;
    uploadFileRef: React.RefObject<HTMLInputElement>;
    showHintsRef: React.RefObject<HTMLInputElement>;
    static instance: HelperGUI;
    constructor(props: any){
        super(props);
        HelperGUI.instance = this;
        this.controller = Controller.getInstance();
        this.state = {
            cdtIdx: 0,
            selectedTag: HelperGUI.TAG_DISP_CDT,
            selectedItemId: -1,
            itemAttrObj: new Map(),
            nextModifyRecommand: [],
            instructionDisplay: [[], []],
            chosenTag: -1
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
        this.showHintsRef = React.createRef()
    }

    addhints(displays:Display[]){
        for(let i of displays)
            {
                switch(i.displaytype)   
                {
                    //倍数展示
                    case 0:                       
                        for(let j=0; j<i.complex; j++)
                        {
                            if(Math.round(i.related[j].related[0].getAttribute("x")?.val.val)==Math.round(i.related[j].related[1].getAttribute("x")?.val.val))
                            {
                                let newEle = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val+50));
                                this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val-50));
                                this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle, "color", new RawNumber(0));
                                let newEle1 = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle1, "point1_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val+50));
                                this.controller.addHintAttribute(newEle1, "point1_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val-50));
                                this.controller.addHintAttribute(newEle1, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle1, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle1, "color", new RawNumber(0));
                                let newEle2 = this.controller.createHint(ElementType.ARROW);
                                this.controller.addHintAttribute(newEle2, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val-40));
                                this.controller.addHintAttribute(newEle2, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val-40));
                                this.controller.addHintAttribute(newEle2, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "color", new RawNumber(0));
                            }
                            else if(Math.round(i.related[j].related[0].getAttribute("y")?.val.val)==Math.round(i.related[j].related[1].getAttribute("y")?.val.val))
                            {
                                let newEle = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val+50));
                                this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val-50));
                                this.controller.addHintAttribute(newEle, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle, "color", new RawNumber(0));
                                let newEle1 = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle1, "point1_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point1_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val+50));
                                this.controller.addHintAttribute(newEle1, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val-50));
                                this.controller.addHintAttribute(newEle1, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle1, "color", new RawNumber(0));
                                let newEle2 = this.controller.createHint(ElementType.ARROW);
                                this.controller.addHintAttribute(newEle2, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val-40));
                                this.controller.addHintAttribute(newEle2, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val-40));
                                this.controller.addHintAttribute(newEle2, "color", new RawNumber(0));   
                            }
                        }
                        if(Math.round(i.related[0].related[0].getAttribute("x")?.val.val)==Math.round(i.related[0].related[1].getAttribute("x")?.val.val))
                        {
                            let length = i.related[0].related[1].getAttribute("y")?.val.val - i.related[0].related[0].getAttribute("y")?.val.val;
                            let feetlen;
                            if(i.times!=undefined) 
                            {
                                feetlen = length/i.times;
                                for(let j=0 ; j<i.times; j++)
                                {
                                    let newEle = this.controller.createHint(ElementType.ARROW);
                                    this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[0].related[0].getAttribute("x")?.val.val-40));
                                    this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[0].related[0].getAttribute("y")?.val.val+j*feetlen));
                                    this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[0].related[1].getAttribute("x")?.val.val-40));
                                    this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[0].related[0].getAttribute("y")?.val.val+(j+1)*feetlen));
                                    this.controller.addHintAttribute(newEle, "color", new RawNumber(0));
                                }
                            }
                        } 
                        if(Math.round(i.related[0].related[0].getAttribute("y")?.val.val)==Math.round(i.related[0].related[1].getAttribute("y")?.val.val))
                        {
                            let length = i.related[0].related[1].getAttribute("x")?.val.val - i.related[0].related[0].getAttribute("x")?.val.val;
                            let feetlen;
                            if(i.times!=undefined) 
                            {
                                feetlen = length/i.times;
                                for(let j=0 ; j<i.times; j++)
                                {
                                    let newEle = this.controller.createHint(ElementType.ARROW);
                                    this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[0].related[0].getAttribute("x")?.val.val+j*feetlen));
                                    this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[0].related[0].getAttribute("y")?.val.val-40));
                                    this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[0].related[0].getAttribute("x")?.val.val+(j+1)*feetlen));
                                    this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[0].related[1].getAttribute("y")?.val.val-40));
                                    this.controller.addHintAttribute(newEle, "color", new RawNumber(0));
                                }
                            }
                        } 
                        break;  
                    //等距展示  
                    case 1:                       
                        for(let j=0; j<i.complex; j++)
                        {
                            if(Math.round(i.related[j].related[0].getAttribute("x")?.val.val)==Math.round(i.related[j].related[1].getAttribute("x")?.val.val))
                            {
                                let newEle = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val+50));
                                this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val-50));
                                this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle, "color", new RawNumber(1));
                                let newEle1 = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle1, "point1_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val+50));
                                this.controller.addHintAttribute(newEle1, "point1_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val-50));
                                this.controller.addHintAttribute(newEle1, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle1, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle1, "color", new RawNumber(1));
                                let newEle2 = this.controller.createHint(ElementType.ARROW);
                                this.controller.addHintAttribute(newEle2, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "color", new RawNumber(1));
                                let newEle3 = this.controller.createHint(ElementType.TEXT);
                                this.controller.addHintAttribute(newEle3, "x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val/2+i.related[j].related[1].getAttribute("x")?.val.val/2-25));
                                this.controller.addHintAttribute(newEle3, "y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val/2+i.related[j].related[1].getAttribute("y")?.val.val/2));
                                let length = Math.sqrt((i.related[j].related[0].getAttribute("x")?.val.val - i.related[j].related[1].getAttribute("x")?.val.val) * (i.related[j].related[0].getAttribute("x")?.val.val - i.related[j].related[1].getAttribute("x")?.val.val) + (i.related[j].related[0].getAttribute("y")?.val.val - i.related[j].related[1].getAttribute("y")?.val.val) * (i.related[j].related[0].getAttribute("y")?.val.val - i.related[j].related[1].getAttribute("y")?.val.val));
                                if(length < 0) length = -length;
                                this.controller.addHintAttribute(newEle3, "length", new RawNumber(length));
                                this.controller.addHintAttribute(newEle3, "color", new RawNumber(1)); 
                            }
                            else //if(Math.round(i.related[j].related[0].getAttribute("y")?.val.val)==Math.round(i.related[j].related[1].getAttribute("y")?.val.val))
                            {
                                let newEle = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val+50));
                                this.controller.addHintAttribute(newEle, "point2_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle, "point2_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val-50));
                                this.controller.addHintAttribute(newEle, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle, "color", new RawNumber(1));
                                let newEle1 = this.controller.createHint(ElementType.LINE);
                                this.controller.addHintAttribute(newEle1, "point1_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point1_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val+50));
                                this.controller.addHintAttribute(newEle1, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle1, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val-50));
                                this.controller.addHintAttribute(newEle1, "dash", new RawNumber(1));
                                this.controller.addHintAttribute(newEle1, "color", new RawNumber(1));
                                let newEle2 = this.controller.createHint(ElementType.ARROW);
                                this.controller.addHintAttribute(newEle2, "point1_x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point1_y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_x", new RawNumber(i.related[j].related[1].getAttribute("x")?.val.val));
                                this.controller.addHintAttribute(newEle2, "point2_y", new RawNumber(i.related[j].related[1].getAttribute("y")?.val.val));
                                this.controller.addHintAttribute(newEle2, "color", new RawNumber(1));
                                let newEle3 = this.controller.createHint(ElementType.TEXT);
                                this.controller.addHintAttribute(newEle3, "x", new RawNumber(i.related[j].related[0].getAttribute("x")?.val.val/2+i.related[j].related[1].getAttribute("x")?.val.val/2));
                                this.controller.addHintAttribute(newEle3, "y", new RawNumber(i.related[j].related[0].getAttribute("y")?.val.val/2+i.related[j].related[1].getAttribute("y")?.val.val/2-10));
                                let length = Math.sqrt((i.related[j].related[0].getAttribute("x")?.val.val - i.related[j].related[1].getAttribute("x")?.val.val) * (i.related[j].related[0].getAttribute("x")?.val.val - i.related[j].related[1].getAttribute("x")?.val.val) + (i.related[j].related[0].getAttribute("y")?.val.val - i.related[j].related[1].getAttribute("y")?.val.val) * (i.related[j].related[0].getAttribute("y")?.val.val - i.related[j].related[1].getAttribute("y")?.val.val));
                                if(length < 0) length = -length;
                                this.controller.addHintAttribute(newEle3, "length", new RawNumber(length));
                                this.controller.addHintAttribute(newEle3, "color", new RawNumber(1));    
                            }
                        }
                        break;  
                    case 2:
                        let ymax4 = i.related[0].related[0].getAttribute("y")?.val.val;
                        let ymin4 = ymax4;
                        for(let j=1; j<i.complex; j++)
                        {
                            let y = i.related[j].related[0].getAttribute("y")?.val.val;
                            if(y > ymax4) ymax4 = y;
                            if(y < ymin4) ymin4 = y;   
                        }
                        let shift4 = 0;
                        if(i.related[0].type==1) shift4 = -i.related[0].related[0].getAttribute("w")?.val.val/2;
                        if(i.related[0].type==2) shift4 = i.related[0].related[0].getAttribute("w")?.val.val/2;
                        let newEle3 = this.controller.createHint(ElementType.LINE);
                        this.controller.addHintAttribute(newEle3, "point1_x", new RawNumber(i.related[0].related[0].getAttribute("x")?.val.val+shift4));
                        this.controller.addHintAttribute(newEle3, "point1_y", new RawNumber(ymax4+50));
                        this.controller.addHintAttribute(newEle3, "point2_x", new RawNumber(i.related[0].related[0].getAttribute("x")?.val.val+shift4));
                        this.controller.addHintAttribute(newEle3, "point2_y", new RawNumber(ymin4-50));
                        this.controller.addHintAttribute(newEle3, "dash", new RawNumber(1));
                        this.controller.addHintAttribute(newEle3, "color", new RawNumber(2)); 
                        break;   
                    //y对齐展示  
                    case 3:
                        let xmax5 = i.related[0].related[0].getAttribute("x")?.val.val;
                        let xmin5 = xmax5;
                        for(let j=1; j<i.complex; j++)
                        {
                            let x = i.related[j].related[0].getAttribute("x")?.val.val;
                            if(x > xmax5) xmax5 = x;
                            if(x < xmin5) xmin5 = x;   
                        }
                        let shift5 = 0;
                        if(i.related[0].type==4) shift5 = i.related[0].related[0].getAttribute("h")?.val.val/2;
                        if(i.related[0].type==5) shift5 = -i.related[0].related[0].getAttribute("h")?.val.val/2;
                        let newEle5 = this.controller.createHint(ElementType.LINE);
                        this.controller.addHintAttribute(newEle5, "point1_x", new RawNumber(xmax5+50));
                        this.controller.addHintAttribute(newEle5, "point1_y", new RawNumber(i.related[0].related[0].getAttribute("y")?.val.val+shift5));
                        this.controller.addHintAttribute(newEle5, "point2_x", new RawNumber(xmin5-50));
                        this.controller.addHintAttribute(newEle5, "point2_y", new RawNumber(i.related[0].related[0].getAttribute("y")?.val.val+shift5));
                        this.controller.addHintAttribute(newEle5, "dash", new RawNumber(1));
                        this.controller.addHintAttribute(newEle5, "color", new RawNumber(3)); 
                        break;                    
                }                 
            }
    }

    deletehints(){
        for (let i of this.controller.hints.values())
        {
            this.controller.deleteHint(i.id);
        }
    }

    updateSelectedItem(itemId?: number){
        if(itemId == undefined){
            itemId = this.state.selectedItemId;
            this.deletehints();
        }
        if(itemId < 0){
            this.setState({
                selectedItemId: -1,
                itemAttrObj: new Map(),
            })
            this.deletehints();
            return;
        }

        let ele = this.controller.getElement(itemId);
        this.setState({
            selectedItemId: itemId,
            itemAttrObj: ele.copyAttrMap(),
        })
        let displays:Display[] = check(this.controller,ele);
        this.deletehints();
        this.addhints(displays);
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
        let ele2AttrVals: Map<SingleElement, Map<string, any>> = new Map();
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
                    ['x', 0], ['y', 0]
                ]))
            }
            ele2AttrVals.get(attr.element)!.set(attr.name, values[i]);
        }
        
        return [... ele2AttrVals.entries()].map((v)=>{
            let ele: SingleElement = v[0];
            let attrVMap: Map<string, number> = v[1];
            let color = ele.getCertainAttribute("color").val.val + "-" + ele.getCertainAttribute("lightness").val.val.toString()
            if(ele.type === ElementType.RECTANGLE){
                return <Rect
                    x={(attrVMap.get('x')! - ele.getAttrVal('w', 50) / 2) * HelperGUI.ratio}
                    y={(attrVMap.get('y')! - ele.getAttrVal('h', 50) / 2) *  HelperGUI.ratio }
                    width={ele.getAttrVal('w', 50) * HelperGUI.ratio}
                    height={ele.getAttrVal('h', 50) * HelperGUI.ratio}
                    fill={ALLCOLORS[color]}
                    key={`${ele.id}-cdt`}
                />
            } else {
                return <Ellipse
                    x={(attrVMap.get('x')!) * HelperGUI.ratio}
                    y={(attrVMap.get('y')!) *  HelperGUI.ratio }
                    radiusX={ele.getAttrVal('w', 50)  * HelperGUI.ratio / 2}
                    radiusY={ele.getAttrVal('h', 50)  * HelperGUI.ratio / 2}
                    fill={ALLCOLORS[color]}
                    key={`${ele.id}-cdt`}
                />
            }
        })

    }

    genCdtDispClicked(idx:number){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                Log.logDefault('选择候选', {idx, length: this.controller.candidates.length})
                this.controller.crtCdtIdx = idx;
                this.controller.update_attr();
                Log.savePic(App.instance.stageRef.current, `候选结果切换-${idx}`);
                return true;
            })
        }
    }

    genCdtDispClickedKonva(idx:number){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                Log.logDefault('选择候选', {idx, length: this.controller.candidates.length})
                this.controller.crtCdtIdx = idx;
                this.controller.update_attr();
                Log.savePic(App.instance.stageRef.current, `候选结果切换-${idx}`);
                return true;
            })
        }
    }

    handleShowCdtClicked(e: React.ChangeEvent<HTMLInputElement>){
        Log.logDefault('显示后续可能位置', {show: e.target.checked})
        App.instance.allComponentsRef.current?.updateCdt(e.target.checked);
    }

    handleShowDebugInfoClicked(e: React.ChangeEvent<HTMLInputElement>){
        Log.logDefault('显示调试信息', {show: e.target.checked})
        App.instance.allComponentsRef.current?.updateDebug(e.target.checked);
    }

    handleShowHintsClicked(e: React.ChangeEvent<HTMLInputElement>){
        Log.logDefault('显示关系信息', {show: e.target.checked})
        App.instance.allComponentsRef.current?.updateHints(e.target.checked);
    }

    genPointerClicked(start: boolean){
        let attrName = start? 'pointerAtBeginning': 'pointerAtEnding'
        return (e: React.ChangeEvent<HTMLInputElement>)=>{
            Log.logDefault('修改箭头显示情况', {pointerPos: attrName, show: e.target.checked})

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
                Log.logDefault('删除箭头')
                this.updateSelectedItem(-1);
                App.instance.allComponentsRef.current?.forceUpdate()
            }
            return res;
        })
    }

    genHandleTagSelected(selected: string){
        return ()=>{
            Log.logDefault(`切换功能栏${selected}`)
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
                元素微调{this.state.selectedTag === HelperGUI.TAG_DISP_SET?"✍︎": ""}
            </div>

            <div style={{flex: '1', 
                backgroundColor: this.state.selectedTag === HelperGUI.TAG_DISP_MOD? "#d6d6d6": "#ffffff"}}
                onClick={this.genHandleTagSelected(HelperGUI.TAG_DISP_MOD).bind(this)}>
                修改预测{this.state.selectedTag === HelperGUI.TAG_DISP_MOD?"✍︎": ""}
            </div>

            <div style={{flex: '1', 
                backgroundColor: this.state.selectedTag === HelperGUI.TAG_DISP_SET_GLOBAL? "#d6d6d6": "#ffffff"}}
                onClick={this.genHandleTagSelected(HelperGUI.TAG_DISP_SET_GLOBAL).bind(this)}>
                设置{this.state.selectedTag === HelperGUI.TAG_DISP_SET_GLOBAL?"✍︎": ""}
            </div>

            <div style={{flex: '1', 
                backgroundColor: this.state.selectedTag === HelperGUI.TAG_DISP_INS? "#d6d6d6": "#ffffff"}}
                onClick={this.genHandleTagSelected(HelperGUI.TAG_DISP_INS).bind(this)}>
                指令展示{this.state.selectedTag === HelperGUI.TAG_DISP_INS?"✍︎": ""}
            </div>
        </div>
    }

    handleLigntnessInc(){
        Controller.saveIfSuccess(()=>{
            if(!this.state.itemAttrObj.has('lightness')){
                return false;
            }
            Log.logDefault('增加亮度')
            this.controller.getElement(this.state.selectedItemId).changeLightness(1);
            App.instance.allComponentsRef.current?.forceUpdate()
            this.updateSelectedItem();
            return true;
        })
    }

    handleLigntnessDec(){
        Controller.saveIfSuccess(()=>{
            if(!this.state.itemAttrObj.has('lightness')){
                return false;
            }
            Log.logDefault('增加亮度')
            this.controller.getElement(this.state.selectedItemId).changeLightness(-1);
            App.instance.allComponentsRef.current?.forceUpdate()
            this.updateSelectedItem();
            return true
        })
    }

    genSizeAdjustHandler(type: string, inc: boolean){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                let res = false;
                if(type === 'w'){
                    res = this.controller.getElement(this.state.selectedItemId).changeWidthByDelta(inc);
                } else if(type === 'h'){
                    res = this.controller.getElement(this.state.selectedItemId).changeHeightByDelta(inc);
                }

                if(res){
                    Log.logDefault('调节元素大小', {type, inc})
                    App.instance.allComponentsRef.current?.forceUpdate();
                }

                return res;
            });
        }
    }

    genColorSelect(cn: string){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                if(!this.state.itemAttrObj.has('color')){
                    return false;
                }
                Log.logDefault('选择颜色', {color: cn})
                this.controller.getElement(this.state.selectedItemId).changeColor(cn);
                App.instance.allComponentsRef.current?.forceUpdate()
                this.updateSelectedItem();
                return true;
            })
            
        }
    }

    genChangeTypeHandler(type: ElementType){
        return ()=>{
            Controller.saveIfSuccess(()=>{
                Log.logDefault('修改元素类型', {type})
                this.controller.getElement(this.state.selectedItemId).changeElementType(type);
                App.instance.allComponentsRef.current?.forceUpdate();
                return true;
            })}
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

    async downloadUserLog(){
        let zip = new JSZip();
        let img = zip.folder('img')
        Log.pics.forEach((info)=>{
            img?.file(info.name, info.data.replace(/^data:image\/(png|jpg);base64,/, ""), {base64: true});
        })

        zip.file('log.json', JSON.stringify(Log.logs));
        let content = await zip.generateAsync({type:"blob"});

        let eleLink = document.createElement('a');
        eleLink.download = `${App.instance.userName}-${App.instance.taskId}-${new Date().getTime()}.zip`;
        eleLink.style.display = 'none';
        eleLink.href = URL.createObjectURL(content);
        document.body.appendChild(eleLink);
        eleLink.click();
        document.body.removeChild(eleLink);
    }

    clearTrace(){
        Log.logDefault('清空路径')
        App.instance.traces = [];
        App.instance.forceUpdate()
    }

    recommandOnNonPosAttrChange(attrName: string, element: SingleElement, attrValBefore: any){
        // 将满足以下条件的元素的“attrName”修改成“element.attrName”
        let results: ModifyRecommand[] = [];
        element.attributes.forEach((attr, name)=>{
            let val = attr.val.val;
            if(name === attrName){
                // 与原来的元素相同
                val = attrValBefore;
            }

            let crt = new ModifyRecommand(attrName, element.getAttrVal(attrName, undefined), name, val)
            if(crt.check()){
                results.push(crt);
            }
        })

        let lastRecommand = this.state.nextModifyRecommand.filter((x)=>x.check());
        results.push(... lastRecommand); // 在交互过程中显式清空

        this.setState({
            nextModifyRecommand: results
        })
    }

    updateRecommand(clear=false){
        if(clear){
            this.setState({
                nextModifyRecommand: []
            })
            return;
        }

        // 检查所有的元素中是否有可以修改的
        let newMR = this.state.nextModifyRecommand.filter((x)=>x.check());
        this.setState({
            nextModifyRecommand: newMR
        })

    }

    async handleUploadFileClick(){
        await Controller.saveIfSuccessAsync(async()=>{
            try{
                let fileData = await reader(this.uploadFileRef.current!.files![0])
                loadFile(Controller.getInstance(), JSON.parse(fileData));
                Controller.getInstance().updateValsByEquations();
                App.instance.forceUpdate()
                return true;
            } catch(error) {
                alert('文件载入出错')
                return false;
            }
        })
    }

    handleCheck(tag: number, checked: boolean) {
        console.log("checked");
    }

    renderGlobalTool(){
        if(this.state.selectedTag !== HelperGUI.TAG_DISP_SET_GLOBAL){
            return null;
        }
        return <div>
            <div>
                <button onClick={this.downloadContent.bind(this)}>下载当前内容</button>
                <button onClick={this.downloadUserLog.bind(this)}>下载当前日志</button>
                <br/>
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
                    this.updateRecommand(true);
                    App.instance.allComponentsRef.current?.updateCdt(false);
                    this.showCdtRef.current!.checked = false;
                    Log.logDefault('撤销')
                    App.instance.forceUpdate(); // 全局刷新
                }} disabled={!Controller.canUndo()}>撤销 {'<-'}</button>

                <button onClick={()=>{
                    Controller.redo();
                    this.updateSelectedItem(-1);
                    this.updateRecommand(true);
                    App.instance.allComponentsRef.current?.updateCdt(false);
                    this.showCdtRef.current!.checked = false;
                    Log.logDefault('重做')
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
            <div>
                <span style={{verticalAlign: '-webkit-baseline-middle'}}>显示关系展示？</span>
                <label className="switch">
                    <input ref={this.showHintsRef} 
                        onChange={this.handleShowHintsClicked.bind(this)}
                        type="checkbox"
                        defaultChecked={App.instance.allComponentsRef.current?.state.showHints}
                        />
                    <span className="slider round"></span>
                </label>
            </div>
            
        </div>
    }

    renderTools(){
        if(this.state.selectedTag !== HelperGUI.TAG_DISP_SET){
            return null;
        }

        let selectedItem = this.state.selectedItemId > 0? this.controller.getElement(this.state.selectedItemId): undefined;
        return <div>
            {this.state.selectedItemId >= 0? <div>
                <div style={{display: 'none'}}>
                    <textarea ref={this.editTextRef} 
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
                    <div>
                        <button onClick={this.genSizeAdjustHandler('w', false).bind(this)}>变窄</button>
                        宽度调整
                        <button onClick={this.genSizeAdjustHandler('w', true).bind(this)}>变宽</button>
                        ----------
                        <button onClick={this.genSizeAdjustHandler('h', false).bind(this)}>变矮</button>
                        高度调整
                        <button onClick={this.genSizeAdjustHandler('h', true).bind(this)}>变高</button>
                    </div>

                    <div>
                        类型调整：
                        <button onClick={this.genChangeTypeHandler(ElementType.RECTANGLE).bind(this)}>矩形</button>
                        <button onClick={this.genChangeTypeHandler(ElementType.CIRCLE).bind(this)}>圆形</button>
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
                                    Log.logDefault('虚线设置', {dashEnabled: e.target.checked})

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
        return <div style={{width: '100vw',
            overflow: 'scroll',
            display: 'flex',
            flexDirection:'row'
            }}>
            {this.controller.candidates.map((cdt, idx)=>{
                return [<div  key={`${idx}-div`}
                    style={{backgroundColor: idx === this.state.cdtIdx? "#47bbf755": "#00000000", 
                    cursor: 'pointer', flex: 'none'}}
                    onClick={this.genCdtDispClicked(idx).bind(this)}
                    
                ><Stage key={`${idx}-stage`}
                    width={App.instance.stageWidth * HelperGUI.ratio} 
                    height={App.instance.stageHeight * HelperGUI.ratio}
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

    renderNextMod(){
        if(this.state['selectedTag'] !== HelperGUI.TAG_DISP_MOD){
            return null;
        }

        return <div style={{height: '30vh', overflow: 'scroll'}}>
            {this.state.nextModifyRecommand.map((x)=>x.disp())}
        </div>

    }

    renderInstruction() {
        if (this.state['selectedTag'] !== HelperGUI.TAG_DISP_INS) {
            return null;
        }
        let displayArray = this.state.instructionDisplay;
        console.log(displayArray);
        let inputTexts = [];
        for (let i = 0; i < displayArray[0].length; i++) {
            if (displayArray[1][i]) {
                inputTexts.push(
                    <CheckableTag key={`tag-${i}`} checked={true} onChange={checked => this.handleCheck(i, checked)}><div>{displayArray[0][i]}</div></CheckableTag>
                );
            } else {
                inputTexts.push(
                    <CheckableTag key={`tag-${i}`} checked={false}><div>{displayArray[0][i]}</div></CheckableTag>
                );
            }
        }
        return inputTexts;
    }

    render(){
        return <div>
            {this.renderMenu()}
            {this.renderTools()}
            {this.renderCDT()}
            {this.renderNextMod()}
            {this.renderGlobalTool()}
            {this.renderInstruction()}
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
    crtASR?: ASR;
    // curText?: string;
    // curParsedResult?: Object;
    // curControllerOp?: ControllerOp;
    
    static instance: App;
    cmdInputRef: React.RefObject<HTMLTextAreaElement>;
    stageRef: React.RefObject<any>;
    state: {
        curText: string | undefined,
        curParsedResult: any | undefined,
        curControllerOp: ControllerOp | undefined,
        listening: boolean
    };
    stageWidth: number;
    stageHeight: number;
    taskId: number = 0;
    userName: string = 'test';
    constructor(props: any) {
        super(props);
        console.log(window.location.pathname)
        
        let attrs = window.location.pathname.trim()
        if(attrs[0] === '/'){
            attrs = attrs.slice(1)
        }
        let attrSplit = attrs.split('/');
        if(attrSplit.length < 2){
            alert('没有输入任务和用户信息')
        } else {
            this.taskId = Number(attrSplit[0]);
            this.userName = attrSplit[1];
        }

        Controller.getInstance(this.taskId)

        this.allComponentsRef = React.createRef<AllComponents>();
        // let u = new TestParser();
        // u.parse("这个红色的矩形\n");
        let p = new Parser()
        /*// let x = p.parse("新建矩形C在A的下方使A和B的水平距离等于A和C的竖直距离且A和B的水平距离等于A和C的竖直距离且B在C的左边");
        // let x = p.parse("修改A和B的水平距离为A和B的水平距离的三分之一");
        // let x = p.parse("新建一个矩形在这里");
        // let c = new ControllerOp(x, []);
        // console.log(c)

        // let x1 = p.parse("新建一个矩形在这里使它和这个的水平距离等于它和这个的竖直距离");
        // let c1 = new ControllerOp(x1, [[[100, 100]], [[100, 200]], [[200, 100]]]);
        // console.log(c1)

        // let x = p.parse("修改A和B的水平距离为A和B的水平距离的三分之一\n");
        // let x = p.parse("修改这个矩形的宽度为A和B的水平距离和A和B的水平距离的差的三分之一\n");
        // let x = p.parse("修改这个矩形的颜色为A的颜色\n");
        // x = p.parse("新建一个形状为矩形的矩形\n");
        // x = p.parse("新建一个矩形在这里使它的文字为BBB\n");
        // x = p.parse("修改这个绿色的的颜色为红色的\n");
        // x = p.parse("修改ABC的文字为你好啊\n");
        // x = p.parse("修改ABC的形状为矩形\n");
        // x = p.parse("修改ABC的颜色使它的颜色为红色\n");
        // x = p.parse("新建灰色形状为矩形的ABC在这个箭头的左边\n");
        // x = p.parse("新建一个矩形在这里\n");
        // x = p.parse("修改这个红色矩形的颜色浅一点\n");
        // x = p.parse("修改这个矩形的宽度为A和B的水平距离和A和B的水平距离的差的三分之一\n");
        // x = p.parse("新建元四在这里使得它和元三的水平距离等于元二和元三的水平距离\n");
        // x = p.parse("修改A和B的水平距离为A和B的水平距离的三分之一\n");
        // x = p.parse("新建形状为矩形的红色C在A的下方使A和B的水平距离等于A和C的竖直距离且A和B的水平距离等于A和C的竖直距离且B在C的左边\n");
        // x = p.parse("修改这个矩形的文字为你好啊\n");
        // x = p.parse("把这个矩形的文字修改为你好啊\n");
        // x = p.parse("新建一个元素在这个元素的右边\n");
        // x = p.parse("修改这个矩形的宽度为这个矩形的水平位置和那个矩形的竖直位置的差的三分之一\n");
        */
        // let curText=("新建一个红色的元素A使它的水平位置等于A的水平位置和B的竖直位置的差的三分之一\n");
        // curText=("修改它的颜色为绿色\n");
        // let curParsedResult = p.parse(curText);
        // let c = new ControllerOp(curParsedResult!, []);
        // let curControllerOp = c;
        // console.log(c)

        this.state = {
            curText: undefined,
            curParsedResult: undefined,
            curControllerOp: undefined,
            listening: false
        }
        
        // Parser.prototype.parse("新建矩形A");
        // Parser.prototype.parse("新建矩形B在A的右方");
        // Parser.prototype.parse("修改C的颜色为红色");
        // Parser.prototype.parse("修改C的大小为B的大小的二分之一");
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
        this.cmdInputRef = React.createRef()
        this.stageWidth = window.innerWidth;
        this.stageHeight = window.innerHeight / 4 * 3 - 200;

        this.stageRef = React.createRef();
    }

    displayText(text?: string, parsedResult?: Object, controllerOp?: ControllerOp): [string[], (SingleElement | undefined)[]] {
        // 返回[分组后的text, 对应的element]
        if(text == undefined || parsedResult == undefined || controllerOp == undefined){
            return [[], []];
        }
        text = text.trim();
        console.log(text);
        console.log(parsedResult);
        console.log(controllerOp);
        let r: number[][] = [];
        let allElements: ElementPlaceholder[] = [];
        for (let i of controllerOp.allElements) {
            r.push([i.pos, i.end]);
            allElements.push(i);
        }
        allElements.sort((a, b) => {return a.pos - b.pos;});
        let ranges = splitRange(text.length, r);
        let splitText: string[] = [];
        let allElementsWithNull: (ElementPlaceholder | undefined)[] = []
        let cnt = 0;
        for (let i of ranges) {
            splitText.push(text.substring(i[0], i[1]));
            if (r.includes(i)) {
                allElementsWithNull.push(allElements[cnt]);
                cnt += 1;
            } else {
                allElementsWithNull.push(undefined);
            }
        }
        console.log(allElementsWithNull)
        return [splitText, allElementsWithNull.map((x) => {
            if (x) {
                if (x.actualEle!.id != 65535) {
                    return x.actualEle;
                }
            }
            return undefined;
        })];
    }

    nextSolution() {
        Controller.saveIfSuccess(()=>{
            this.allComponentsRef.current?.controller.nextSolution()
            App.instance.forceUpdate()
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
                    this.traces, traceEleRelationStr, elemRelStr, eleRangeStr, unchangedStr, inferChangeStr, convertObjToMap({
                        'text': newEleText
                    })
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
            Log.logDefault(`取消元素选择`, undefined, this.allComponentsRef.current!.state!.selectedItemId! != -1)
            this.allComponentsRef.current?.setState({
                selectedItemId: -1
            })
            // this.helpGUIRef.current?.setState({
            //     selectedItemId: -1
            // })
            this.helpGUIRef.current?.updateSelectedItem(-1)
            return;
        }

        Log.logDefault(`选中图表元素`);
        this.allComponentsRef.current?.setState({
            selectedItemId: Number(e.target.attrs['idInController'])
        })
        // this.helpGUIRef.current?.setState({
        //     selectedItemId: Number(e.target.attrs['idInController'])
        // })
        this.helpGUIRef.current?.updateSelectedItem(Number(e.target.attrs['idInController']))
        return;
    }

    handleInputFinished(uttr: string, raw_traces?: Array<Array<[number, number]>>){
        Controller.saveIfSuccess(()=>{
            if(raw_traces == undefined){
                raw_traces = this.traces;
            }

            Log.logUttrIntoSystem(uttr, raw_traces.length);
            Log.incPicIdx()
            Log.savePic(App.instance.stageRef.current, uttr);

            uttr = uttr.replaceAll('两', '二')
            uttr = uttr.replaceAll('并且', '且')
            uttr = uttr.replaceAll('，', '')
            uttr = uttr.replaceAll('。', '')

            // uttr 预处理
            if(uttr.includes('使得')){
                let splitIdx = uttr.indexOf('使得');
                let firstHalf = uttr.slice(0, splitIdx);
                let secondHalf = uttr.slice(splitIdx + 2);
                let processedSecond = secondHalf.split('且').map((s)=>{
                    if(s.includes('等于')){
                        if(!s.split('等于')[1].includes('的')){
                            return s.replaceAll('等于', '为')
                        }
                    } else if(s.includes('为')){
                        if(s.split('为')[1].includes('的')){
                            return s.replaceAll('为', '等于')
                        }
                    }
                    return s;
                }).join('且');

                uttr = firstHalf + '使得' + processedSecond;
            }

            uttr = uttr + "\n";
            // console.log(uttr);

            try{

                let parseRes: any;
    
                if (uttr.includes("箭头") || uttr.includes("线")) {
                    parseRes = new ArrowParser().parse(uttr);
                    console.log(parseRes);
                } else {
                    parseRes = new Parser().parse(uttr);
                }

                let conOp = new ControllerOp(parseRes, raw_traces);
                Log.logParseResult(conOp);
                if(conOp.isCreate){
                    conOp.executeOnControllerNewEle(Controller.getInstance());
                } else if (conOp.isArrow || conOp.isLine) {
                    switch (conOp.arrowOperation) {
                        case "new":
                            conOp.executeOnAddArrow(Controller.getInstance());
                            break;

                        case "delete":
                            conOp.executeOnDeleteArrow(Controller.getInstance());
                            break;

                        case "change":
                            conOp.executeOnChangeArrow(Controller.getInstance());
                            break;
                    
                        default:
                            break;
                    }
                } else {
                    conOp.executeOnControllerModify(Controller.getInstance());
                }
                
                this.updateUttrParseState(uttr, parseRes, conOp);
                this.traces = [];
                this.forceUpdate(()=>{
                    Log.savePic(App.instance.stageRef.current, '运行结果');
                });
                return true;
            } catch(error){
                console.error(error);
                alert('运行出错，请检查指令')
                return false;
            
            }
        }) 
    }

    updateUttrParseState(text: string | undefined, parseRes: object | undefined, conOp: ControllerOp | undefined){
        this.setState({
            curText: text,
            curParsedResult: parseRes,
            curControllerOp: conOp
        })
    }

    handleListenClick(){
        if(!this.state.listening){
            Log.logDefault('开始语音输入')
            this.traces = [];
            this.crtASR = new ASR(((txt, finished)=>{
                this.cmdInputRef.current!.value = txt;
                if(finished){
                    this.setState({
                        listening: false
                    })
                    this.crtASR = undefined;
                } else {
                    try{
                        this.crtASR!.start();
                    } catch(e){

                    }
                    
                }
            }));
            this.crtASR.start();
            this.setState({
                listening: true
            })
        } else {
            Log.logDefault('结束语音输入')
            this.crtASR!.stop();
        }
    }

    handleListenInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        try {
            let text = e.target.value + "\n";
            let parseRes: any;
            if (text.includes("箭头") || text.includes("线")) {
                parseRes = new ArrowParser().parse(text);
                console.log(parseRes);
            } else {
                parseRes = new Parser().parse(text);
            }
            let conOp = new ControllerOp(parseRes, this.traces);
            if(conOp.isCreate){
                conOp.executeOnControllerNewEle(Controller.getInstance(), true);
            } else if (conOp.isArrow || conOp.isLine) {
                switch (conOp.arrowOperation) {
                    case "new":
                        conOp.executeOnAddArrow(Controller.getInstance(), true);
                        break;

                    case "delete":
                        conOp.executeOnDeleteArrow(Controller.getInstance(), true);
                        break;

                    case "change":
                        conOp.executeOnChangeArrow(Controller.getInstance(), true);
                        break;
                
                    default:
                        break;
                }
            } else {
                conOp.executeOnControllerModify(Controller.getInstance(), true);
            }
            let instructionDisplay = this.displayText(text, parseRes, conOp);
            this.helpGUIRef.current?.setState({
                instructionDisplay: instructionDisplay
            })
            this.helpGUIRef.current?.forceUpdate();
        } catch (error) {
            this.helpGUIRef.current?.setState({
                instructionDisplay: [[], []]
            })
            console.log(error);
        }
    }

    render() {
        let inputTexts = [];
        let displayArray = this.displayText(this.state.curText, this.state.curParsedResult, this.state.curControllerOp)
        // console.log(displayArray);
        for (let i in displayArray[0]) {
            if (displayArray[1][i]) {
                inputTexts.push(
                    <AntdTag key={`tag-${i}`} color="red"><div>{displayArray[0][i]}</div></AntdTag>
                );
            } else {
                inputTexts.push(
                    <AntdTag key={`tag-${i}`}><div>{displayArray[0][i]}</div></AntdTag>
                );
            }
        }
        return (
            <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden', position:'fixed', touchAction: 'none', overscrollBehavior: 'none'}}>
                <div style={{flex: '3', backgroundColor: '#ffffff' /*'#f0f0f0'*/}}>
                    <Stage /*width={window.innerWidth / 4.0 * 3.0} */
                        /*height={window.innerHeight - 200}*/
                        ref={this.stageRef}
                        width={this.stageWidth}
                        height={this.stageHeight}
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
                    <div style={{'display': 'none'}}>
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
                    </div>

                    <div>
                        <hr/>
                        输入指令：<textarea ref={this.cmdInputRef} onChange={(e)=>this.handleListenInput(e)}/>
                        <button style={{height: '50px'}}
                            onClick={()=>{
                            this.handleInputFinished(this.cmdInputRef.current!.value);
                        }}>确认</button>
                        --------
                        <button 
                            style={{height: '50px'}}
                            onClick={this.handleListenClick.bind(this)}>{this.state.listening? "结束输入":"开始输入"}</button>
                    </div>
                    <div style={{display: 'none'}}>
                        添加箭头：<input ref={this.addArrowRef} type='text'/>
                        <button onClick={()=>{
                            Controller.saveIfSuccess(()=>{
                                this.allComponentsRef.current?.controller.addArrowByStr(this.addArrowRef.current!.value);
                                this.allComponentsRef.current?.forceUpdate()
                                return true;
                            })
                            }}>添加箭头</button>
                    </div>
                    <div>
                        {inputTexts}
                    </div>
                </div>
                <div style={{flex: '1'}}>
                    <HelperGUI ref={this.helpGUIRef}/>
                </div>
            </div>
        );
    }
}

export default App;
