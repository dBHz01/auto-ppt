import { SingleElement, Controller } from "./backend";

enum ShipType {
    X,  //x坐标
    LX, //左边界x坐标
    RX, //右边界x坐标
    Y,  //y坐标
    UY, //上边界y坐标
    DY, //下边界y坐标
    DIS,   //距离
    WIDTH,  //宽度
    HEIGHT  //高度
}

function distance(x0: number, y0: number, x1: number, y1: number): number {
    return Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1))
}

class Ship {
    type: ShipType;
    related: SingleElement[];
    complex: number;
    value?: number;
    checked: boolean;

    constructor(_type: ShipType, _related: SingleElement[]) {
        this.type = _type;
        this.related = _related;
        this.complex = _related.length;
        this.checked = false;
        if (_type === ShipType.X) {
            if (this.complex !== 1) {
                throw new Error("the X should be between 1 objects");
            }
            else {
                let x = _related[0].getAttribute("x");
                if (x === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = x.val.val;
                }
            }
        }
        else if (_type === ShipType.Y) {
            if (this.complex !== 1) {
                throw new Error("the Y should be between 1 objects");
            }
            else {
                let y = _related[0].getAttribute("y");
                if (y === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = y.val.val;
                }
            }
        }
        else if (_type === ShipType.LX) {
            if (this.complex !== 1) {
                throw new Error("the LX should be between 1 objects");
            }
            else {
                let x = _related[0].getAttribute("x");
                let width = _related[0].getAttribute("w");
                if (x === undefined || width === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = x.val.val - (width.val.val / 2);
                }
            }
        }
        else if (_type === ShipType.RX) {
            if (this.complex !== 1) {
                throw new Error("the RX should be between 1 objects");
            }
            else {
                let x = _related[0].getAttribute("x");
                let width = _related[0].getAttribute("w");
                if (x === undefined || width === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = x.val.val + (width.val.val / 2);
                }
            }
        }
        else if (_type === ShipType.UY) {
            if (this.complex !== 1) {
                throw new Error("the UY should be between 1 objects");
            }
            else {
                let y = _related[0].getAttribute("y");
                let height = _related[0].getAttribute("h");
                if (y === undefined || height === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = y.val.val + (height.val.val / 2);
                }
            }
        }
        else if (_type === ShipType.DY) {
            if (this.complex !== 1) {
                throw new Error("the DY should be between 1 objects");
            }
            else {
                let y = _related[0].getAttribute("y");
                let height = _related[0].getAttribute("h");
                if (y === undefined || height === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = y.val.val - (height.val.val / 2);
                }
            }
        }
        else if (_type === ShipType.WIDTH) {
            if (this.complex !== 1) {
                throw new Error("the WIDTH should be between 1 objects");
            }
            else {
                let width = _related[0].getAttribute("w");
                if (width === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = width.val.val;
                }
            }
        }
        else if (_type === ShipType.HEIGHT) {
            if (this.complex !== 1) {
                throw new Error("the HEIGHT should be between 1 objects");
            }
            else {
                let height = _related[0].getAttribute("h");
                if (height === undefined) {
                    this.value = undefined;
                }
                else {
                    this.value = height.val.val;
                }
            }
        }
        else if (_type === ShipType.DIS) {
            if (this.complex !== 2) {
                throw new Error("the DIS should be between 2 objects");
            }
            else {
                let x0Attr = _related[0].getAttribute("x");
                let x1Attr = _related[1].getAttribute("x");
                let y0Attr = _related[0].getAttribute("y");
                let y1Attr = _related[1].getAttribute("y");
                if (x0Attr === undefined || x1Attr === undefined || y0Attr === undefined || y1Attr === undefined) {
                    this.value = undefined;
                }
                else {
                    let x0 = x0Attr.val.val;
                    let x1 = x1Attr.val.val;
                    let y0 = y0Attr.val.val;
                    let y1 = y1Attr.val.val;
                    this.value = distance(x0, y0, x1, y1);
                }
            }
        }
    }
    match(elements: SingleElement[]) {
        if (elements.length === this.complex) {
            for (let i = 0; i < this.complex; i++) {
                if (elements[i] !== this.related[i]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
}

enum DisplayType {
    MULTIPLE,//距离倍数关系
    EQUAL,//等距
    XALIGN,//x对齐
    YALIGN,//y对齐
    EWIDTH,//等宽
    EHEIGHT,//等高
}

class Display {
    related: Ship[];
    complex: number;
    displaytype: DisplayType;
    times?: number;//倍数

    constructor(_related: Ship[], _type: DisplayType, _times?: number) {
        this.related = _related;
        this.complex = _related.length;
        this.displaytype = _type;
        this.times = _times;
    }
}

function same(a: number | undefined, b: number | undefined): boolean {
    if (a === undefined || b === undefined) {
        return false;
    }
    if (a >= b && a - b < 0.0001) {
        return true;
    }
    if (b > a && b - a < 0.0001) {
        return true;
    }
    return false;
}

function multiple(a: number, b: number): number {

    let spare = (a / b) % 1;
    if (same(spare, 0)) {
        return (a / b) - spare;
    }
    if (same(spare, 1)) {
        return (a / b) - spare + 1;
    }
    return -1;
}

function single(elements: SingleElement[]): SingleElement[] {
    let pure: SingleElement[] = [];
    let len = elements.length;
    for (let i = 0; i < len; i++) {
        let purelen = pure.length;
        let isin = false;
        for (let j = 0; j < purelen; j++) {
            if (elements[i] === pure[j]) {
                isin = true;
                break;
            }
        }
        if (!isin) {
            pure.push(elements[i]);
        }
    }
    return pure;
}

function Neighbor(controller: Controller, now: SingleElement[]): SingleElement[] {
    let neighbor: SingleElement[] = [];
    let equations = controller.equations;
    let elements: SingleElement[] = [];
    for (let [key, value] of controller.elements) {
        elements.push(value);
    }
    let len = now.length;
    let lenEqu = equations.length;
    for (let i = 0; i < len; i++) {
        let center = now[i];
        for (let j = 0; j < lenEqu; j++) {
            let combine = equations[j].leftArgs.concat(equations[j].rightArgs);
            let lenC = combine.length;
            let isin = false;
            for (let k = 0; k < lenC; k++) {
                if (combine[k].element === center) {
                    isin = true;
                    break;
                }
            }
            if (isin) {
                for (let k = 0; k < lenC; k++) {
                    neighbor.push(combine[k].element);
                }
            }
        }
    }
    return neighbor;
}

function findNeighbor(controller: Controller, now: SingleElement[], times: number): SingleElement[] {
    let neighbors = now;
    for (let i = 0; i < times; i++) {
        neighbors = Neighbor(controller, neighbors);
    }
    neighbors = single(neighbors);
    return neighbors;
}

let displays: Display[] = [];

function find_EQUAL(all: SingleElement[], center: SingleElement) {
    // console.log("等距关系");
    let distances: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        if (all[i] !== center) {
            let oneShip = new Ship(ShipType.DIS, [center, all[i]]);
            distances.push(oneShip);
        }
    }
    let ShipNum = distances.length;
    for (let i = 0; i < len; i++) {
        let sameShip: Ship[] = [];
        let thisShip;
        let tomatch: SingleElement[] = [center, all[i]];
        for (let i = 0; i < ShipNum; i++) {
            if (distances[i].match(tomatch)) {
                thisShip = distances[i];
                break;
            }
        }
        if (thisShip != undefined) {
            if (thisShip.checked === false) {
                thisShip.checked = true;
                sameShip.push(thisShip);
                let thisValue = thisShip.value;
                for (let i = 0; i < ShipNum; i++) {
                    if (distances[i].checked === false) {
                        let checkValue = distances[i].value;
                        if (same(thisValue, checkValue)) {
                            distances[i].checked = true;
                            sameShip.push(distances[i]);
                        }
                    }
                }
                if (sameShip.length > 1) {
                    console.log("等距关系");
                    displays.push(new Display(sameShip, DisplayType.EQUAL));
                    for (let i = 0; i < sameShip.length; i++) {
                        console.log(sameShip[i].related);
                    }
                }
            }
        }
    }
}

function find_MULTIPLE(all: SingleElement[], center: SingleElement) {
    //console.log("距离倍数关系");
    let distances: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        if (all[i] !== center) {
            let oneShip = new Ship(ShipType.DIS, [center, all[i]]);
            distances.push(oneShip);
        }
    }
    let ShipNum = distances.length;
    for (let i = 0; i < len; i++) {
        let thisShip;
        let tomatch: SingleElement[] = [center, all[i]];
        for (let i = 0; i < ShipNum; i++) {
            if (distances[i].match(tomatch)) {
                thisShip = distances[i];
                break;
            }
        }
        if (thisShip != undefined && thisShip.value != undefined) {
            let thisValue = thisShip.value;
            for (let i = 0; i < ShipNum; i++) {
                let mulShip: Ship[] = [];
                let checkValue = distances[i].value;
                if (checkValue !== undefined) {
                    let mul;
                    if (multiple(thisValue, checkValue) > 1) {
                        mulShip.push(thisShip);
                        mulShip.push(distances[i]);
                        mul = multiple(thisValue, checkValue);
                        console.log("距离倍数关系");
                        displays.push(new Display(mulShip, DisplayType.MULTIPLE, mul));
                        for (let i = 0; i < mulShip.length; i++) {
                            console.log(mulShip[i].related);
                        }
                        console.log("倍数:", mul);
                    }
                }
            }
        }
    }
}

function find_XALIGN(all: SingleElement[], center: SingleElement) {
    // console.log("x对齐关系");
    let xaligns: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        let xShip = new Ship(ShipType.X, [all[i]]);
        xaligns.push(xShip);
        let lxShip = new Ship(ShipType.LX, [all[i]]);
        xaligns.push(lxShip);
        let rxShip = new Ship(ShipType.RX, [all[i]]);
        xaligns.push(rxShip);
    }
    let xShipNum = xaligns.length;
    let xsameShip: Ship[] = [];
    let lxsameShip: Ship[] = [];
    let rxsameShip: Ship[] = [];
    let xthisShip;
    let lxthisShip;
    let rxthisShip;
    let tomatch: SingleElement[] = [center];
    for (let i = 0; i < xShipNum; i++) {
        if (xaligns[i].match(tomatch) && xaligns[i].type === ShipType.X) {
            xthisShip = xaligns[i];
            break;
        }
    }
    for (let i = 0; i < xShipNum; i++) {
        if (xaligns[i].match(tomatch) && xaligns[i].type === ShipType.LX) {
            lxthisShip = xaligns[i];
            break;
        }
    }
    for (let i = 0; i < xShipNum; i++) {
        if (xaligns[i].match(tomatch) && xaligns[i].type === ShipType.RX) {
            rxthisShip = xaligns[i];
            break;
        }
    }
    //中心x
    if (xthisShip != undefined) {
        xsameShip.push(xthisShip);
        let thisValue = xthisShip.value;
        for (let i = 0; i < xShipNum; i++) {
            if (xaligns[i] !== xthisShip) {
                let checkValue = xaligns[i].value;
                if (same(thisValue, checkValue)) {
                    xsameShip.push(xaligns[i]);
                }
            }
        }
        if (xsameShip.length > 1) {
            console.log("x对齐关系");
            displays.push(new Display(xsameShip, DisplayType.XALIGN));
            for (let i = 0; i < xsameShip.length; i++) {
                console.log(xsameShip[i]);
            }
        }
    }
    //左x
    if (lxthisShip != undefined) {
        lxsameShip.push(lxthisShip);
        let thisValue = lxthisShip.value;
        for (let i = 0; i < xShipNum; i++) {
            if (xaligns[i] !== lxthisShip) {
                let checkValue = xaligns[i].value;
                if (same(thisValue, checkValue)) {
                    lxsameShip.push(xaligns[i]);
                }
            }
        }
        if (lxsameShip.length > 1) {
            console.log("x对齐关系");
            displays.push(new Display(lxsameShip, DisplayType.XALIGN));
            for (let i = 0; i < lxsameShip.length; i++) {
                console.log(lxsameShip[i]);
            }
        }
    }
    //右x
    if (rxthisShip != undefined) {
        rxsameShip.push(rxthisShip);
        let thisValue = rxthisShip.value;
        for (let i = 0; i < xShipNum; i++) {
            if (xaligns[i] !== rxthisShip) {
                let checkValue = xaligns[i].value;
                if (same(thisValue, checkValue)) {
                    rxsameShip.push(xaligns[i]);
                }
            }
        }
        if (rxsameShip.length > 1) {
            console.log("x对齐关系");
            displays.push(new Display(rxsameShip, DisplayType.XALIGN));
            for (let i = 0; i < rxsameShip.length; i++) {
                console.log(rxsameShip[i]);
            }
        }
    }
}

function find_YALIGN(all: SingleElement[], center: SingleElement) {
    // console.log("y对齐关系");
    let yaligns: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        let yShip = new Ship(ShipType.Y, [all[i]]);
        yaligns.push(yShip);
        let uyShip = new Ship(ShipType.UY, [all[i]]);
        yaligns.push(uyShip);
        let dyShip = new Ship(ShipType.DY, [all[i]]);
        yaligns.push(dyShip);
    }
    let yShipNum = yaligns.length;
    let ysameShip: Ship[] = [];
    let uysameShip: Ship[] = [];
    let dysameShip: Ship[] = [];
    let ythisShip;
    let uythisShip;
    let dythisShip;
    let tomatch: SingleElement[] = [center];
    for (let i = 0; i < yShipNum; i++) {
        if (yaligns[i].match(tomatch) && yaligns[i].type === ShipType.Y) {
            ythisShip = yaligns[i];
            break;
        }
    }
    for (let i = 0; i < yShipNum; i++) {
        if (yaligns[i].match(tomatch) && yaligns[i].type === ShipType.UY) {
            uythisShip = yaligns[i];
            break;
        }
    }
    for (let i = 0; i < yShipNum; i++) {
        if (yaligns[i].match(tomatch) && yaligns[i].type === ShipType.DY) {
            dythisShip = yaligns[i];
            break;
        }
    }
    //中心y
    if (ythisShip != undefined) {
        ysameShip.push(ythisShip);
        let thisValue = ythisShip.value;
        for (let i = 0; i < yShipNum; i++) {
            if (yaligns[i] !== ythisShip) {
                let checkValue = yaligns[i].value;
                if (same(thisValue, checkValue)) {
                    ysameShip.push(yaligns[i]);
                }
            }
        }
        if (ysameShip.length > 1) {
            console.log("y对齐关系");
            displays.push(new Display(ysameShip, DisplayType.YALIGN));
            for (let i = 0; i < ysameShip.length; i++) {
                console.log(ysameShip[i]);
            }
        }
    }
    //上y
    if (uythisShip != undefined) {
        uysameShip.push(uythisShip);
        let thisValue = uythisShip.value;
        for (let i = 0; i < yShipNum; i++) {
            if (yaligns[i] !== uythisShip) {
                let checkValue = yaligns[i].value;
                if (same(thisValue, checkValue)) {
                    uysameShip.push(yaligns[i]);
                }
            }
        }
        if (uysameShip.length > 1) {
            console.log("y对齐关系");
            displays.push(new Display(uysameShip, DisplayType.YALIGN));
            for (let i = 0; i < uysameShip.length; i++) {
                console.log(uysameShip[i]);
            }
        }
    }
    //下y
    if (dythisShip != undefined) {
        dysameShip.push(dythisShip);
        let thisValue = dythisShip.value;
        for (let i = 0; i < yShipNum; i++) {
            if (yaligns[i] !== dythisShip) {
                let checkValue = yaligns[i].value;
                if (same(thisValue, checkValue)) {
                    dysameShip.push(yaligns[i]);
                }
            }
        }
        if (dysameShip.length > 1) {
            console.log("y对齐关系");
            displays.push(new Display(dysameShip, DisplayType.YALIGN));
            for (let i = 0; i < dysameShip.length; i++) {
                console.log(dysameShip[i]);
            }
        }
    }
}

function find_EWIDTH(all: SingleElement[], center: SingleElement) {
    // console.log("等宽关系");
    let widths: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        let wShip = new Ship(ShipType.WIDTH, [all[i]]);
        widths.push(wShip);
    }
    let wShipNum = widths.length;
    let wsameShip: Ship[] = [];
    let wthisShip;
    let tomatch: SingleElement[] = [center];
    for (let i = 0; i < wShipNum; i++) {
        if (widths[i].match(tomatch)) {
            wthisShip = widths[i];
            break;
        }
    }
    if (wthisShip != undefined) {
        wsameShip.push(wthisShip);
        let thisValue = wthisShip.value;
        for (let i = 0; i < wShipNum; i++) {
            if (widths[i] !== wthisShip) {
                let checkValue = widths[i].value;
                if (same(thisValue, checkValue)) {
                    wsameShip.push(widths[i]);
                }
            }
        }
        if (wsameShip.length > 1) {
            console.log("等宽关系");
            displays.push(new Display(wsameShip, DisplayType.EWIDTH));
            for (let i = 0; i < wsameShip.length; i++) {
                console.log(wsameShip[i].related);
            }
        }
    }
}

function find_EHEIGHT(all: SingleElement[], center: SingleElement) {
    // console.log("等高关系");
    let heights: Ship[] = [];
    let len = all.length;
    for (let i = 0; i < len; i++) {
        let hShip = new Ship(ShipType.HEIGHT, [all[i]]);
        heights.push(hShip);
    }
    let hShipNum = heights.length;
    let hsameShip: Ship[] = [];
    let hthisShip;
    let tomatch: SingleElement[] = [center];
    for (let i = 0; i < hShipNum; i++) {
        if (heights[i].match(tomatch)) {
            hthisShip = heights[i];
            break;
        }
    }
    if (hthisShip != undefined) {
        hsameShip.push(hthisShip);
        let thisValue = hthisShip.value;
        for (let i = 0; i < hShipNum; i++) {
            if (heights[i] !== hthisShip) {
                let checkValue = heights[i].value;
                if (same(thisValue, checkValue)) {
                    hsameShip.push(heights[i]);
                }
            }
        }
        if (hsameShip.length > 1) {
            console.log("等高关系");
            displays.push(new Display(hsameShip, DisplayType.EWIDTH));
            for (let i = 0; i < hsameShip.length; i++) {
                console.log(hsameShip[i].related);
            }
        }
    }
}

function check(all: Controller, center: SingleElement): Display[] {
    displays = [];
    let elements = findNeighbor(all, [center], 2);
    find_EQUAL(elements, center);
    find_MULTIPLE(elements, center);
    find_XALIGN(elements, center);
    find_YALIGN(elements, center);
    find_EWIDTH(elements, center);
    find_EHEIGHT(elements, center);
    return displays;
}

export { Ship, Display, check };