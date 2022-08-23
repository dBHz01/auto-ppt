
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
                .replaceAll('兴建', '新建')
                .replaceAll('他', '它')
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