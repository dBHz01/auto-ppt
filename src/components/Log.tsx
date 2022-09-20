import { Stage } from "konva/lib/Stage";
import { ControllerOp, ElementPlaceholder } from "../NLParser";
import { Controller } from "./backend";
import Cookies from "js-cookie"
class Log{
    static logs: any[];
    static pics: Array<{
        name: string,
        data: string
    }>;
    static picIdx = 0;
    static subIdx = 0;
    static init(){
        Log.logs = [];
        Log.pics = []; // 截图

        (window as any).obj['cookies'] = Cookies;
    }

    static l(obj: any){
        let ts = new Date().getTime();
        obj['ts'] = ts;

        Log.logs.push(obj)
    }

    static export(){
        return Log.logs;
    }

    static logDefault(msg:string, otherInfo?: {[key: string]: any}, cond: boolean=true){
        if(cond){
            Log.l(Object.assign({msg}, otherInfo || {}))
        }
    }

    static logUttrIntoSystem(uttr: string, traceNum: number){
        Log.l({
            msg: '系统接收指令输入', uttr, traceNum
        })
    }

    static logParseResult(res: ControllerOp){
        Log.l({
            msg: '解析结束', 
            create: res.isCreate,
            copy: res.isCopy,
            arrow: res.isArrow || res.isLine,
            arrowOp: res.arrowOperation,
            traceEleNum: [... res.obj2trace.keys()].filter((x)=>(x instanceof ElementPlaceholder)).length,
            tracePosNum: [... res.obj2trace.keys()].filter((x)=>(!(x instanceof ElementPlaceholder))).length,
            involvedEleNum: res.phs2id?.size || 0,
            itEleNum: [... (res.phs2id?.entries() || [])].filter((v)=>(v[1] != 'new' && v[0].attrRequires.size === 0)).length,
            attrChange: (res.extraMap?.size || 0) + (res.extraAttrMap?.size || 0) 
                + ((res.targetAttr && res.targetAttr?.name !== 'x' && res.targetAttr?.name !== 'y')? 1: 0),
            posRelated: res.isCreate || res.isCopy || res.targetAttr?.name === 'x' || res.targetAttr?.name === 'y' || (res.extraEqs && res.extraEqs.length > 0) || (res.extraRanges && res.extraRanges.length > 0) || res.pos
        })
    }

    static savePic(stage: Stage, name: string){
        Log.subIdx += 1;
        Log.pics.push({
            data: stage.toDataURL(),
            name: `${Log.picIdx}-${Log.subIdx}-${name}.png`
        })

        localStorage.setItem('log', JSON.stringify(this.logs))
        try{
            localStorage.setItem('pics', JSON.stringify(this.pics));
        } catch(e){
            localStorage.setItem('pics', "");
        }
        localStorage.setItem('content', JSON.stringify(Controller.getInstance().exportAsJson()));
    }

    static incPicIdx(){
        Log.picIdx += 1;
        Log.subIdx = 0;
    }

    static logExecuteCmd(cdtNum?: number){
        if(cdtNum === undefined){
            cdtNum = Controller.getInstance().candidates.length;
        }
        Log.l({
            msg: '指令执行结束',
            cdtNum,
        })
    }

}

Log.init()

export {Log}