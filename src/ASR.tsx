
class ASR {
    sr: SpeechRecognition;
    res: string;
    finished: boolean;
    constructor(cb: ((arg0: string, arg1: boolean) => void)){
        
        this.sr = new window.webkitSpeechRecognition();
        this.res = "";
        this.sr.lang = 'zh-CN';
        this.sr.continuous = true;
        this.sr.onresult = (ev)=>{
            this.res = ev.results[0][0].transcript;
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
export {ASR}