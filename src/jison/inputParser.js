/* parser generated by jison 0.4.18 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var inputParser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,8],$V1=[1,9],$V2=[1,10],$V3=[11,12,13],$V4=[7,28,30,31,32,63,67,68,69],$V5=[7,28,30,31,32,41,42,63,67,68,69],$V6=[1,29],$V7=[1,30],$V8=[1,34],$V9=[1,35],$Va=[1,36],$Vb=[1,37],$Vc=[7,8],$Vd=[1,45],$Ve=[1,46],$Vf=[1,47],$Vg=[1,48],$Vh=[1,49],$Vi=[1,50],$Vj=[1,51],$Vk=[1,52],$Vl=[7,8,70],$Vm=[1,60],$Vn=[1,61],$Vo=[1,62],$Vp=[1,63],$Vq=[7,8,28,30,31,32,41,42,60,61,62,63,67,68,69,70],$Vr=[7,70],$Vs=[1,74],$Vt=[1,75],$Vu=[1,76],$Vv=[1,77],$Vw=[1,78],$Vx=[1,79],$Vy=[1,80],$Vz=[1,81],$VA=[1,82],$VB=[1,83],$VC=[1,88],$VD=[1,89],$VE=[1,90],$VF=[56,57],$VG=[7,8,41,42,60,61,62,70];
var parser = {trace: function trace () { },
yy: {},
symbols_: {"error":2,"expressions":3,"predicate":4,"target":5,"adverbial":6,"EOF":7,"FOR":8,"conditions":9,"object":10,"OBJ":11,"THIS":12,"THAT":13,"attribute":14,"SIZE":15,"HEIGHT":16,"WIDTH":17,"COLOR":18,"TEXT":19,"HORILOC":20,"VERTILOC":21,"LOC":22,"doubleAttribute":23,"HORIDIST":24,"VERTIDIST":25,"DISTANCE":26,"adverb":27,"DEEP":28,"BIT":29,"SHALLOW":30,"BIG":31,"SMALL":32,"direction":33,"LEFT":34,"RIGHT":35,"UP":36,"DOWN":37,"location":38,"HERE":39,"THERE":40,"D":41,"AND":42,"MIDDLE":43,"const":44,"ONE":45,"TWO":46,"THREE":47,"FOUR":48,"FIVE":49,"SIX":50,"SEVEN":51,"EIGHT":52,"NINE":53,"TEN":54,"value":55,"TIME":56,"FRACTION":57,"DIFF":58,"relation":59,"EQUAL":60,"LEQ":61,"GEQ":62,"AT":63,"NEW":64,"MOVE":65,"CHANGE":66,"DAO":67,"WANG":68,"IS":69,"ALSO":70,"$accept":0,"$end":1},
terminals_: {2:"error",7:"EOF",8:"FOR",11:"OBJ",12:"THIS",13:"THAT",15:"SIZE",16:"HEIGHT",17:"WIDTH",18:"COLOR",19:"TEXT",20:"HORILOC",21:"VERTILOC",22:"LOC",24:"HORIDIST",25:"VERTIDIST",26:"DISTANCE",28:"DEEP",29:"BIT",30:"SHALLOW",31:"BIG",32:"SMALL",34:"LEFT",35:"RIGHT",36:"UP",37:"DOWN",39:"HERE",40:"THERE",41:"D",42:"AND",43:"MIDDLE",45:"ONE",46:"TWO",47:"THREE",48:"FOUR",49:"FIVE",50:"SIX",51:"SEVEN",52:"EIGHT",53:"NINE",54:"TEN",56:"TIME",57:"FRACTION",58:"DIFF",60:"EQUAL",61:"LEQ",62:"GEQ",63:"AT",64:"NEW",65:"MOVE",66:"CHANGE",67:"DAO",68:"WANG",69:"IS",70:"ALSO"},
productions_: [0,[3,4],[3,6],[3,3],[10,1],[10,1],[10,1],[10,2],[10,2],[14,1],[14,1],[14,1],[14,1],[14,1],[14,1],[14,1],[14,1],[23,1],[23,1],[23,1],[27,2],[27,2],[27,2],[27,2],[33,1],[33,1],[33,1],[33,1],[38,1],[38,1],[38,3],[38,5],[44,1],[44,1],[44,1],[44,1],[44,1],[44,1],[44,1],[44,1],[44,1],[44,1],[55,4],[55,4],[55,5],[55,5],[55,3],[55,5],[59,3],[59,3],[59,3],[59,5],[4,1],[4,1],[4,1],[5,1],[5,3],[5,5],[6,2],[6,2],[6,2],[6,2],[6,1],[9,3],[9,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 console.log({"predicate": $$[$0-3], "target": $$[$0-2], "adverbial": $$[$0-1], "conditions": undefined});
          return {"predicate": $$[$0-3], "target": $$[$0-2], "adverbial": $$[$0-1], "conditions": undefined}; 
break;
case 2:
 console.log({"predicate": $$[$0-5], "target": $$[$0-4], "adverbial": $$[$0-3], "conditions": $$[$0-1]});
          return {"predicate": $$[$0-5], "target": $$[$0-4], "adverbial": $$[$0-3], "conditions": $$[$0-1]}; 
break;
case 3:
 console.log({"predicate": $$[$0-2], "target": $$[$0-1], "adverbial": undefined, "conditions": undefined});
          return {"predicate": $$[$0-2], "target": $$[$0-1], "adverbial": undefined, "conditions": undefined}; 
break;
case 4:
this.$ = {"name": $$[$0], "type": "obj"};
break;
case 5: case 6: case 7: case 8:
this.$ = {"name": $$[$0], "type": "ref"};
break;
case 9:
this.$ = "size"
break;
case 10:
this.$ = "height"
break;
case 11:
this.$ = "width"
break;
case 12:
this.$ = "color"
break;
case 13:
this.$ = "text"
break;
case 14:
this.$ = "horiloc"
break;
case 15:
this.$ = "vertiloc"
break;
case 16:
this.$ = "loc"
break;
case 17:
this.$ = "horidist"
break;
case 18:
this.$ = "vertidist"
break;
case 19:
this.$ = "dist"
break;
case 20:
this.$ = "deep"
break;
case 21:
this.$ = "shallow"
break;
case 22:
this.$ = "big"
break;
case 23:
this.$ = "small"
break;
case 24:
this.$ = "left"
break;
case 25:
this.$ = "right"
break;
case 26:
this.$ = "up"
break;
case 27:
this.$ = "down"
break;
case 28:
this.$ = {"loc": "here", "type": "ref"}
break;
case 29:
this.$ = {"loc": "there", "type": "ref"}
break;
case 30:
this.$ = {"obj": $$[$0-2], "type": "single", "direction": $$[$0]}
break;
case 31:
this.$ = {"obj_1": $$[$0-4], "obj_2": $$[$0-2], "type": "double", "loc": "middle"}
break;
case 32:
this.$ = 1
break;
case 33:
this.$ = 2
break;
case 34:
this.$ = 3
break;
case 35:
this.$ = 4
break;
case 36:
this.$ = 5
break;
case 37:
this.$ = 6
break;
case 38:
this.$ = 7
break;
case 39:
this.$ = 8
break;
case 40:
this.$ = 9
break;
case 41:
this.$ = 10
break;
case 42:
this.$ = {"val": $$[$0-3], "const": $$[$0-1], "type": "time"};
break;
case 43:
this.$ = {"val": $$[$0-3], "const": $$[$0-1], "type": "fraction"};
break;
case 44:
this.$ = {"val_1": $$[$0-4], "val_2": $$[$0-2], "type": "diff"};
break;
case 45:
this.$ = {"val_1": $$[$0-4], "val_2": $$[$0-2], "type": "sum"};
break;
case 46: case 56:
this.$ = {"obj": $$[$0-2], "type": "single", "val": $$[$0]};
break;
case 47: case 57:
this.$ = {"obj_1": $$[$0-4], "obj_2": $$[$0-2], "type": "double", "val": $$[$0]};
break;
case 48:
this.$ = {"type": "equation", "val_1": $$[$0-2], "val_2": $$[$0], "op": "="};
break;
case 49:
this.$ = {"type": "equation", "val_1": $$[$0-2], "val_2": $$[$0], "op": "<"};
break;
case 50:
this.$ = {"type": "equation", "val_1": $$[$0-2], "val_2": $$[$0], "op": ">"};
break;
case 51:
this.$ = {"type": "direction", "obj_1": $$[$0-4], "obj_1": $$[$0-2], "direction": $$[$0]};
break;
case 52:
this.$ = "new";
break;
case 53:
this.$ = "move";
break;
case 54:
this.$ = "change";
break;
case 55:
this.$ = {"obj": $$[$0], "type": "single", "val": "loc"};
break;
case 58: case 59:
this.$ = {"type": "loc", "loc": $$[$0]};
break;
case 60:
this.$ = {"type": "direction", "direction": $$[$0]};
break;
case 61:
this.$ = {"type": "value", "value": $$[$0]};
break;
case 62:
this.$ = {"type": "adverb", "value": $$[$0]};
break;
case 63:
 $$[$0-2].push($$[$0]);
          this.$ = $$[$0-2]; 
break;
case 64:
 this.$ = [$$[$0]]; 
break;
}
},
table: [{3:1,4:2,64:[1,3],65:[1,4],66:[1,5]},{1:[3]},{5:6,10:7,11:$V0,12:$V1,13:$V2},o($V3,[2,52]),o($V3,[2,53]),o($V3,[2,54]),{6:11,7:[1,12],27:17,28:[1,18],30:[1,19],31:[1,20],32:[1,21],63:[1,14],67:[1,13],68:[1,15],69:[1,16]},o($V4,[2,55],{41:[1,22],42:[1,23]}),o($V5,[2,4]),o($V5,[2,5],{11:[1,24]}),o($V5,[2,6],{11:[1,25]}),{7:[1,26],8:[1,27]},{1:[2,3]},{10:31,11:$V0,12:$V1,13:$V2,38:28,39:$V6,40:$V7},{10:31,11:$V0,12:$V1,13:$V2,38:32,39:$V6,40:$V7},{33:33,34:$V8,35:$V9,36:$Va,37:$Vb},{10:39,11:$V0,12:$V1,13:$V2,55:38},o($Vc,[2,62]),{29:[1,40]},{29:[1,41]},{29:[1,42]},{29:[1,43]},{14:44,15:$Vd,16:$Ve,17:$Vf,18:$Vg,19:$Vh,20:$Vi,21:$Vj,22:$Vk},{10:53,11:$V0,12:$V1,13:$V2},o($V5,[2,7]),o($V5,[2,8]),{1:[2,1]},{9:54,10:57,11:$V0,12:$V1,13:$V2,55:56,59:55},o($Vc,[2,58]),o($Vc,[2,28]),o($Vc,[2,29]),{41:[1,58],42:[1,59]},o($Vc,[2,59]),o($Vc,[2,60]),o($Vl,[2,24]),o($Vl,[2,25]),o($Vl,[2,26]),o($Vl,[2,27]),o($Vc,[2,61],{41:$Vm,42:$Vn}),{41:$Vo,42:$Vp},o($Vc,[2,20]),o($Vc,[2,21]),o($Vc,[2,22]),o($Vc,[2,23]),o($V4,[2,56]),o($Vq,[2,9]),o($Vq,[2,10]),o($Vq,[2,11]),o($Vq,[2,12]),o($Vq,[2,13]),o($Vq,[2,14]),o($Vq,[2,15]),o($Vq,[2,16]),{41:[1,64]},{7:[1,65],70:[1,66]},o($Vr,[2,64]),{41:$Vm,42:$Vn,60:[1,67],61:[1,68],62:[1,69]},{41:$Vo,42:$Vp,63:[1,70]},{33:71,34:$V8,35:$V9,36:$Va,37:$Vb},{10:72,11:$V0,12:$V1,13:$V2},{44:73,45:$Vs,46:$Vt,47:$Vu,48:$Vv,49:$Vw,50:$Vx,51:$Vy,52:$Vz,53:$VA,54:$VB},{10:39,11:$V0,12:$V1,13:$V2,55:84},{14:85,15:$Vd,16:$Ve,17:$Vf,18:$Vg,19:$Vh,20:$Vi,21:$Vj,22:$Vk},{10:86,11:$V0,12:$V1,13:$V2},{23:87,24:$VC,25:$VD,26:$VE},{1:[2,2]},{10:57,11:$V0,12:$V1,13:$V2,55:56,59:91},{10:39,11:$V0,12:$V1,13:$V2,55:92},{10:39,11:$V0,12:$V1,13:$V2,55:93},{10:39,11:$V0,12:$V1,13:$V2,55:94},{10:95,11:$V0,12:$V1,13:$V2},o($Vc,[2,30]),{41:[1,96]},{56:[1,97],57:[1,98]},o($VF,[2,32]),o($VF,[2,33]),o($VF,[2,34]),o($VF,[2,35]),o($VF,[2,36]),o($VF,[2,37]),o($VF,[2,38]),o($VF,[2,39]),o($VF,[2,40]),o($VF,[2,41]),{41:[1,99],42:$Vn},o($VG,[2,46]),{41:[1,100]},o($V4,[2,57]),o($Vq,[2,17]),o($Vq,[2,18]),o($Vq,[2,19]),o($Vr,[2,63]),o($Vr,[2,48],{41:$Vm,42:$Vn}),o($Vr,[2,49],{41:$Vm,42:$Vn}),o($Vr,[2,50],{41:$Vm,42:$Vn}),{41:[1,101]},{43:[1,102]},o($VG,[2,42]),o($VG,[2,43]),{42:[1,104],44:73,45:$Vs,46:$Vt,47:$Vu,48:$Vv,49:$Vw,50:$Vx,51:$Vy,52:$Vz,53:$VA,54:$VB,58:[1,103]},{23:105,24:$VC,25:$VD,26:$VE},{33:106,34:$V8,35:$V9,36:$Va,37:$Vb},o($Vc,[2,31]),o($VG,[2,44]),o($VG,[2,45]),o($VG,[2,47]),o($Vr,[2,51])],
defaultActions: {12:[2,3],26:[2,1],65:[2,2]},
parseError: function parseError (str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function(match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex () {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin (condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState () {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules () {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState (n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState (condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 64
break;
case 2:return 65
break;
case 3:return 66
break;
case 4:return 12
break;
case 5:return 13
break;
case 6:return 39
break;
case 7:return 40
break;
case 8:return 15
break;
case 9:return 16
break;
case 10:return 17
break;
case 11:return 18
break;
case 12:return 19
break;
case 13:return 20
break;
case 14:return 21
break;
case 15:return 22
break;
case 16:return 24
break;
case 17:return 25
break;
case 18:return 26
break;
case 19:return 28
break;
case 20:return 30
break;
case 21:return 31
break;
case 22:return 32
break;
case 23:return 34
break;
case 24:return 35
break;
case 25:return 36
break;
case 26:return 37
break;
case 27:return 34
break;
case 28:return 35
break;
case 29:return 36
break;
case 30:return 37 
break;
case 31:return 34
break;
case 32:return 35
break;
case 33:return 36
break;
case 34:return 37 
break;
case 35:return 43 
break;
case 36:return 41
break;
case 37:return 42
break;
case 38:return 67
break;
case 39:return 63
break;
case 40:return 68
break;
case 41:return 69
break;
case 42:return 56
break;
case 43:return 58
break;
case 44:return 8
break;
case 45:return 8
break;
case 46:return 70
break;
case 47:return 60
break;
case 48:return 62
break;
case 49:return 61
break;
case 50:return 11
break;
case 51:return 29
break;
case 52:return 57
break;
case 53:return 45
break;
case 54:return 46
break;
case 55:return 47
break;
case 56:return 48
break;
case 57:return 49
break;
case 58:return 50
break;
case 59:return 51
break;
case 60:return 52
break;
case 61:return 53
break;
case 62:return 54
break;
case 63:return 7
break;
case 64:return 'INVALID'
break;
}
},
rules: [/^(?:\s+)/,/^(?:新建)/,/^(?:移动)/,/^(?:修改)/,/^(?:这个)/,/^(?:那个)/,/^(?:这里)/,/^(?:那里)/,/^(?:大小)/,/^(?:高度)/,/^(?:宽度)/,/^(?:颜色)/,/^(?:文字)/,/^(?:水平位置)/,/^(?:竖直位置)/,/^(?:位置)/,/^(?:水平距离)/,/^(?:竖直距离)/,/^(?:距离)/,/^(?:深)/,/^(?:浅)/,/^(?:大)/,/^(?:小)/,/^(?:左边)/,/^(?:右边)/,/^(?:上边)/,/^(?:下边)/,/^(?:左方)/,/^(?:右方)/,/^(?:上方)/,/^(?:下方)/,/^(?:左)/,/^(?:右)/,/^(?:上)/,/^(?:下)/,/^(?:中点)/,/^(?:的)/,/^(?:和)/,/^(?:到)/,/^(?:在)/,/^(?:往)/,/^(?:为)/,/^(?:倍)/,/^(?:差)/,/^(?:使得)/,/^(?:使)/,/^(?:且)/,/^(?:等于)/,/^(?:大于)/,/^(?:小于)/,/^(?:[\u4e00-\u9fa5A-Za-z]+?(?=[和的到往在为深浅大小]))/,/^(?:一点)/,/^(?:分之一)/,/^(?:一)/,/^(?:二)/,/^(?:三)/,/^(?:四)/,/^(?:五)/,/^(?:六)/,/^(?:七)/,/^(?:八)/,/^(?:九)/,/^(?:十)/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = inputParser;
exports.Parser = inputParser.Parser;
exports.parse = function () { return inputParser.parse.apply(inputParser, arguments); };
exports.main = function commonjsMain (args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}