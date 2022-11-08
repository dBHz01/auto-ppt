declare var Voice: any;
class ASR {
    sr: any;
    res: string;
    finished: boolean;
    cb: ((arg0: string, arg1: boolean) => void);
    static self: ASR;
    constructor(cb: ((arg0: string, arg1: boolean) => void)){
        ASR.self = this;
        this.cb = cb;
        this.sr = new Voice({

            // 服务接口认证信息 注：apiKey 和 apiSecret 的长度都差不多，请要填错哦，！
            appId: '5f72e7b7',
            apiSecret: '0d7e9ff5bf8f70a2025cb13dc7d8b3f5', 
            apiKey: '343debbc2ea3d7a52f30c018ab502004',
            // 注：要获取以上3个参数，请到迅飞开放平台：https://www.xfyun.cn/services/voicedictation 【注：这是我的迅飞语音听写（流式版）每天服务量500（也就是调500次），如果你需求里大请购买服务量：https://www.xfyun.cn/services/voicedictation?target=price】

            onWillStatusChange: function (oldStatus: any, newStatus: any) {
                //可以在这里进行页面中一些交互逻辑处理：注：倒计时（语音听写只有60s）,录音的动画，按钮交互等！
            },
            onTextChange: function (text: any) {
                //监听识别结果的变化
                ASR.self.res = text;
                ASR.self.cb(ASR.self.res, this.finished);
            }
        });

        this.res = "";
        this.finished = false;
    }

    start(){
        this.sr.start()
    }

    stop(){
        this.finished = true;
        this.sr.stop();
        this.cb(this.res, this.finished);
    }
}

export {ASR}