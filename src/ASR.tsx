
class ASR {
    sr: SpeechRecognition;
    res: string;
    finished: boolean;
    static grammarList: SpeechGrammarList;
    constructor(cb: ((arg0: string, arg1: boolean) => void)){
        
        this.sr = new window.webkitSpeechRecognition();
        this.sr.grammars = ASR.grammarList;
        this.res = "";
        this.sr.lang = 'zh-CN';
        this.sr.continuous = true;
        this.sr.onresult = (ev)=>{
            this.res = ev.results[0][0].transcript
                .replaceAll('举行', '矩形')
                .replaceAll('剧情', '矩形')
                .replaceAll('局行', '矩形')
                .replaceAll('支行', '矩形')
                .replaceAll('兴建', '新建')
                .replaceAll('新晋', '新建')
                .replaceAll('梦境', '新建')
                .replaceAll('听见', '新建')
                .replaceAll('引线', '新建')
                .replaceAll('清洁', '新建')
                .replaceAll('新鲜', '新建')
                .replaceAll('新件', '新建')
                .replaceAll('是得', '使得')
                .replaceAll('时的', '使得')
                .replaceAll('式的', '使得')
                .replaceAll('取得', '使得')
                .replaceAll('写得', '使得')
                .replaceAll('数值', '竖直')
                .replaceAll('数据', '竖直')
                .replaceAll('监控', '箭头')
                .replaceAll('大象', '大小')
                .replaceAll('人住', '元素')
                .replaceAll('人数', '元素')
                .replaceAll('一栋', '移动')
                .replaceAll('你懂', '移动')
                .replaceAll('不该', '修改')
                .replaceAll('他', '它')
                .replaceAll('她', '它')
                .replaceAll('达', '大')
                .replaceAll('实现', '实线')
                .replaceAll('分度', '宽度')
                .replaceAll('银杏', '新建')
                .replaceAll('镜头', '箭头')
                .replaceAll('线头', '箭头')
                .replaceAll('虚险', '虚线')
                .replaceAll('规划', '归一化')
                .replaceAll('叠加于归一化', '叠加与归一化')
                .replaceAll('民间', '新建')
                .replaceAll('执行', '直线')
                .replaceAll('局限', '直线')
                .replaceAll('梦见', '新建')
                .replaceAll('成色', '橙色')
                .replaceAll('上访', '上方')
                .replaceAll('车停', '矩形')
                .replaceAll('车底', '这里')
                .replaceAll('车型', '矩形')
                .replaceAll('坐标边吗', '坐标编码')
                .replaceAll('视图', '使得')
                .replaceAll('为止', '位置')
                .replaceAll('文书', '元素')
                .replaceAll('元后', '元素') 
            console.log(this.res)
            cb(this.res, this.finished);
        }

        this.sr.onend = (ev)=>{
            cb(this.res, this.finished);
        }

        this.sr.onaudiostart = (ev)=>{console.log('onaudiostart')}
        this.sr.onaudioend = (ev)=>{console.log('onaudioend')}
        this.sr.onerror = (ev)=>{
            console.log(ev)
        }

        this.finished = false;
    }

    start(){
        this.sr.start()
    }

    stop(){
        this.finished = true;
        this.sr.stop();
    }
}

ASR.grammarList = new webkitSpeechGrammarList();
ASR.grammarList.addFromString("#JSGF V1.0; grammar shapes; public <shape> = 矩形 | 圆形", 1)
export {ASR}