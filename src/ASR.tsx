
class ASR {
    sr: SpeechRecognition;
    res: string;
    constructor(cb: ((arg0: string) => void)){
        
        this.sr = new window.webkitSpeechRecognition();
        this.res = "";
        this.sr.lang = 'zh-CN';
        this.sr.onresult = (ev)=>{
            this.res = ev.results[0][0].transcript;
            cb(this.res);
        }
    }

    start(){
        this.sr.start()
    }

    stop(){
        this.sr.stop();
    }
}
export {ASR}