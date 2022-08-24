
/* description: Parses and executes mathematical expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
"新建"                   return 'NEW'
"画"                     return 'NEW'
"移动"                   return 'MOVE'
"修改"                   return 'CHANGE'
"改"                     return 'CHANGE'
"这个"                   return 'THIS'
"那个"                   return 'THAT'
"这里"                   return 'HERE'
"那里"                   return 'THERE'
"大小"                   return 'SIZE'
"高度"                   return 'HEIGHT'
"宽度"                   return 'WIDTH'
"颜色"                   return 'COLOR'
"文字"                   return 'TEXT'
"文本"                   return 'TEXT'
"水平位置"               return 'HORILOC'
"竖直位置"               return 'VERTILOC'
"位置"                   return 'LOC'
"水平距离"               return 'HORIDIST'
"竖直距离"               return 'VERTIDIST'
"距离"                   return 'DISTANCE'
"深"                     return 'DEEP'
"浅"                     return 'SHALLOW'
"大"                     return 'BIG'
"小"                     return 'SMALL'
"左边"                   return 'LEFT'
"右边"                   return 'RIGHT'
"上边"                   return 'UP'
"下边"                   return 'DOWN'
"左方"                   return 'LEFT'
"右方"                   return 'RIGHT'
"上方"                   return 'UP'
"下方"                   return 'DOWN' 
"左"                     return 'LEFT'
"右"                     return 'RIGHT'
"上"                     return 'UP'
"下"                     return 'DOWN' 
"中点"                   return 'MIDDLE' 
"的"                     return 'D'
"和"                     return 'AND'
"到"                     return 'DAO'
"在"                     return 'AT'
"往"                     return 'WANG'
"为"                     return 'IS'
"是"                     return 'IS'
"成"                     return 'IS'
"倍"                     return 'TIME'
"差"                     return 'DIFF'
"使得"                   return 'FOR'
"使"                     return 'FOR'
"且"                     return 'ALSO'
"等于"                   return 'EQUAL'
"大于"                   return 'GEQ'
"小于"                   return 'LEQ'
"红色"                   return 'RED'
"粉色"                   return 'PINK'
"紫色"                   return 'PURPLE'
"蓝色"                   return 'BLUE'
"青色"                   return 'CYAN'
"蓝绿色"                 return 'TEAL'
"绿色"                   return 'GREEN'
"黄色"                   return 'YELLOW'
"橙色"                   return 'ORANGE'
"棕色"                   return 'BROWN'
"灰色"                   return 'GREY'
"蓝灰色"                 return 'BLUEGREY'
"一个"                   return 'SINGLEONE'
"它"                     return 'IT'
"形状"                   return 'SHAPE'
"矩形"                   return 'RECT'
"箭头"                   return 'ARROW'
"圆形"                   return 'CIRCLE'
"元素"                   return 'ELEMENT'
"把"                     return 'LET'

"一点"                   return 'BIT'
"分之一"                 return 'FRACTION'
"一"                     return 'ONE'
"二"                     return 'TWO'
"三"                     return 'THREE'
"四"                     return 'FOUR'
"五"                     return 'FIVE'
"六"                     return 'SIX'
"七"                     return 'SEVEN'
"八"                     return 'EIGHT'
"九"                     return 'NINE'
"十"                     return 'TEN'

"保持"                   return 'REMAIN'
"不变"                   return 'NOCHANGE'
"不动"                   return 'NOCHANGE'
"其它"                   return 'OTHER'
"其他"                   return 'OTHER'


// [\u4e00-\u9fa5]+?(?=[新建移动修改这那里大小高宽度颜色文字水平位置竖直距离深浅左右上下边方的和到在往为中点])            return 'INPUTTEXT'
// [\u4e00-\u9fa5A-Za-z0123456789]+?(?=[和的到往在为使深浅大小等于红粉紫蓝青蓝黄橙棕灰色它这那个保持不变不动新建画移动修改\n])            return 'INPUTTEXT'
[\u4e00-\u9fa5A-Za-z0123456789]+?(?=[和的到往在为使深浅大小等保不新画移修改\n])            return 'INPUTTEXT'


"\n"                     return 'BREAK_LINE'


<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

// %left '+' '-'
// %left '*' '/'
// %left '^'
// %right '!'
// %right '%'
// %left UMINUS

%start expressions

%% /* language grammar */

// eof
//     : EOF
//         {$$ = $1}
//     | BREAK_LINE EOF
//         {$$ = $1}
//     ;

expressions
    : predicate target adverbial remain EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": undefined, "remain": $4});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": undefined, "remain": $4}; }
    | predicate target adverbial FOR conditions remain EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": $5, "remain": $6});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": $5, "remain": $6}; }
    | predicate target FOR conditions remain EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": $4, "remain": $5});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": $4, "remain": $5}; }
    | predicate FOR conditions remain EOF
        { console.log({"type": "simple", "predicate": $1, "target": undefined, "adverbial": undefined, "conditions": $3, "remain": $4});
          return {"type": "simple", "predicate": $1, "target": undefined, "adverbial": undefined, "conditions": $3, "remain": $4}; }
    | predicate target remain EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": undefined, "remain": $3});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": undefined, "remain": $3}; }
    | LET target predicate adverbial FOR conditions remain EOF
        { console.log({"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": $6, "remain": $7});
          return {"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": $6, "remain": $7}; }
    | LET target predicate adverbial remain EOF
        { console.log({"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": undefined, "remain": $5});
          return {"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": undefined, "remain": $5}; }
    | adverbial predicate target remain EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": undefined, "remain": $4});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": undefined, "remain": $4}; }
    | adverbial predicate target FOR conditions remain EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": $5, "remain": $6});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": $5, "remain": $6}; }

    | remain predicate target adverbial EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $4, "conditions": undefined, "remain": $1});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $4, "conditions": undefined, "remain": $1}; }
    | remain predicate target adverbial FOR conditions EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $4, "conditions": $6, "remain": $1});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $4, "conditions": $6, "remain": $1}; }
    | remain predicate target FOR conditions EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": undefined, "conditions": $5, "remain": $1});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": undefined, "conditions": $5, "remain": $1}; }
    | remain predicate FOR conditions EOF
        { console.log({"type": "simple", "predicate": $2, "target": undefined, "adverbial": undefined, "conditions": $4, "remain": $1});
          return {"type": "simple", "predicate": $2, "target": undefined, "adverbial": undefined, "conditions": $4, "remain": $1}; }
    | remain predicate target EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": undefined, "conditions": undefined, "remain": $1});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": undefined, "conditions": undefined, "remain": $1}; }
    | remain LET target predicate adverbial FOR conditions EOF
        { console.log({"type": "simple", "predicate": $4, "target": $3, "adverbial": $5, "conditions": $7, "remain": $1});
          return {"type": "simple", "predicate": $4, "target": $3, "adverbial": $5, "conditions": $7, "remain": $1}; }
    | remain LET target predicate adverbial EOF
        { console.log({"type": "simple", "predicate": $4, "target": $3, "adverbial": $5, "conditions": undefined, "remain": $1});
          return {"type": "simple", "predicate": $4, "target": $3, "adverbial": $5, "conditions": undefined, "remain": $1}; }
    | remain adverbial predicate target EOF
        { console.log({"type": "simple", "predicate": $3, "target": $4, "adverbial": $2, "conditions": undefined, "remain": $1});
          return {"type": "simple", "predicate": $3, "target": $4, "adverbial": $2, "conditions": undefined, "remain": $1}; }
    | remain adverbial predicate target FOR conditions EOF
        { console.log({"type": "simple", "predicate": $3, "target": $4, "adverbial": $2, "conditions": $6, "remain": $1});
          return {"type": "simple", "predicate": $3, "target": $4, "adverbial": $2, "conditions": $6, "remain": $1}; }
    
    | predicate target adverbial EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": undefined, "remain": undefined});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": undefined, "remain": undefined}; }
    | predicate target adverbial FOR conditions EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": $5, "remain": undefined});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": $3, "conditions": $5, "remain": undefined}; }
    | predicate target FOR conditions EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": $4, "remain": undefined});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": $4, "remain": undefined}; }
    | predicate FOR conditions EOF
        { console.log({"type": "simple", "predicate": $1, "target": undefined, "adverbial": undefined, "conditions": $3, "remain": undefined});
          return {"type": "simple", "predicate": $1, "target": undefined, "adverbial": undefined, "conditions": $3, "remain": undefined}; }
    | predicate target EOF
        { console.log({"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": undefined, "remain": undefined});
          return {"type": "simple", "predicate": $1, "target": $2, "adverbial": undefined, "conditions": undefined, "remain": undefined}; }
    | LET target predicate adverbial FOR conditions EOF
        { console.log({"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": $6, "remain": undefined});
          return {"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": $6, "remain": undefined}; }
    | LET target predicate adverbial EOF
        { console.log({"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": undefined, "remain": undefined});
          return {"type": "simple", "predicate": $3, "target": $2, "adverbial": $4, "conditions": undefined, "remain": undefined}; }
    | adverbial predicate target EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": undefined, "remain": undefined});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": undefined, "remain": undefined}; }
    | adverbial predicate target FOR conditions EOF
        { console.log({"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": $5, "remain": undefined});
          return {"type": "simple", "predicate": $2, "target": $3, "adverbial": $1, "conditions": $5, "remain": undefined}; }
    ;

FILLER
    : D
        {}
    | /* null */
        {}
    ;

// not_ref
//     : SINGLEONE
//         {$$ = ""}
//     | /* null */
//         {$$ = ""}
//     ;

ref
    : THIS
        {$$ = "ref"}
    | THAT
        {$$ = "ref"}
    ;

shape
    : RECT
        { $$ = "rect" }
    | CIRCLE
        { $$ = "circle" }
    | ARROW
        { $$ = "arrow" }
    | ELEMENT
        { $$ = "" }
    ;

constValue
    : color
        {$$ = {"type": "color", "val": $1};}
    // | const
    //     {$$ = {"type": "const", "val": $1};}
    | shape
        {$$ = {"type": "shape", "val": $1};}
    | INPUTTEXT
        {$$ = {"type": "text", "val": $1};}
    ;

// attrName
//     : COLOR
//         {$$ = "color"}
//     | TEXT
//         {$$ = "text"}
//     | SHAPE
//         {$$ = "shape"}
//     ;

// adjective
//     : attrName EQUAL constValue
//         {$$ = {"type": $1, "val": $3};}
//     | attrName IS constValue
//         {$$ = {"type": $1, "val": $3};}
//     | color
//         {$$ = {"type": "color", "val": $1};}
//     ;

// noun
//     : shape
//         {$$ = {"type": "shape", "val": $1};}
//     | ELEMENT
//         {$$ = {"type": "", "val": $1};}
//     | INPUTTEXT
//         {$$ = {"type": "text", "val": $1};}
//     ;

// adjectives
//     : adjectives FILLER adjective
//         {$1.push($3);
//          $$ = $1; }
//     | adjective
//         {$$ = [$1]}
//     ;

color_or_not
    : color 
        {$$ = {"type": "color", "val": $1};}
    | 
        {$$ = "";}
    ;

shape_or_inputText
    : shape 
        {$$ = [{"type": "shape", "val": $1}];}
    | INPUTTEXT
        {$$ = [{"type": "text", "val": $1}];}
    | shape INPUTTEXT
        {$$ = [{"type": "shape", "val": $1}, {"type": "text", "val": $2}];}
    ;

object
    // : ref adjectives FILLER noun
    //     {$2.push($4);
    //      let pos_1 = $1 ? @1.first_column : @2.first_column;
    //      $$ = {"type": $1, "adj": $2, "pos": pos_1, "end": @4.last_column};}
    // | ref noun
    //     {let pos_2 = $1 ? @1.first_column : @2.first_column;
    //      $$ = {"type": $1, "adj": [$2], "pos": pos_2, "end": @2.last_column};}
    // | ref adjectives D
    //     {let pos_3 = $1 ? @1.first_column : @2.first_column;
    //      $$ = {"type": $1, "adj": [$2], "pos": pos_3, "end": @3.last_column};}
    // | IT
    //     {$$ = {"type": "it", "adj": [], "pos": @1.first_column, "end": @1.last_column};}
    // ;
    // : ref_or_not color_or_not FILLER shape_or_inputText
    //     {$$ = {"obj": $2, "adj": [$2, $4], "pos": @1.first_column, "end": @1.last_column};}
    : SINGLEONE color_or_not shape_or_inputText
        {$3.push($2);
         $$ = {"type": "", "adj": $3, "pos": @1.first_column, "end": @3.last_column};}
    | SINGLEONE color D shape_or_inputText
        {$4.push({"type": "color", "val": $2});
         $$ = {"type": $1, "adj": $4, "pos": @1.first_column, "end": @4.last_column};}
    | ref color_or_not shape_or_inputText
        {$3.push($2);
         $$ = {"type": $1, "adj": $3, "pos": @1.first_column, "end": @3.last_column};}
    | ref color D shape_or_inputText
        {$4.push({"type": "color", "val": $2});
         $$ = {"type": $1, "adj": $4, "pos": @1.first_column, "end": @4.last_column};}
    | color shape_or_inputText
        {$2.push($1);
         $$ = {"type": "", "adj": $2, "pos": @1.first_column, "end": @2.last_column};}
    | color D shape_or_inputText
        {$3.push({"type": "color", "val": $1});
         $$ = {"type": "", "adj": $3, "pos": @1.first_column, "end": @3.last_column};}
    | shape_or_inputText
        {$$ = {"type": "", "adj": $1, "pos": @1.first_column, "end": @1.last_column};}
    | IT
        {$$ = {"type": "it", "adj": [], "pos": @1.first_column, "end": @1.last_column};}
    | ref
        {$$ = {"type": $1, "adj": [], "pos": @1.first_column, "end": @1.last_column};}
    ;

objects
    : objects AND object
        {
         $1.push($3);
         $$ = $1;
        }
    | object
        {$$ = [$1];}
    ;

attribute
    : SIZE
        {$$ = "size"}
    | HEIGHT
        {$$ = "height"}
    | WIDTH
        {$$ = "width"}
    | COLOR
        {$$ = "color"}
    | TEXT
        {$$ = "text"}
    | HORILOC
        {$$ = "horiloc"}
    | VERTILOC
        {$$ = "vertiloc"}
    | LOC
        {$$ = "loc"}
    | SHAPE
        {$$ = "shape"}
    ;

computableAttribute
    : HORILOC
        {$$ = "x"}
    | VERTILOC
        {$$ = "y"}
    | LOC
        {$$ = "loc"}
    ;

uncomputableAttribute
    : SIZE
        {$$ = "size"}
    | HEIGHT
        {$$ = "height"}
    | WIDTH
        {$$ = "width"}
    | COLOR
        {$$ = "color"}
    | TEXT
        {$$ = "text"}
    | SHAPE
        {$$ = "shape"}
    ;

doubleAttribute
    : HORIDIST
        {$$ = "horidist"}
    | VERTIDIST
        {$$ = "vertidist"}
    | DISTANCE
        {$$ = "dist"}
    ;

adverb
    : DEEP BIT
        {$$ = "deep"}
    | SHALLOW BIT
        {$$ = "shallow"}
    | BIG BIT
        {$$ = "big"}
    | SMALL BIT
        {$$ = "small"}
    ;

direction
    : LEFT
        {$$ = "left"}
    | RIGHT
        {$$ = "right"}
    | UP
        {$$ = "up"}
    | DOWN
        {$$ = "down"}
    ;

location
    : HERE
        {$$ = {"loc": "here", "type": "ref", "pos": @1.first_column, "end": @1.last_column}}
    | THERE
        {$$ = {"loc": "there", "type": "ref", "pos": @1.first_column, "end": @1.last_column}}
    | object D direction
        {$$ = {"obj": $1, "type": "single", "direction": $3}}
    | object AND object D MIDDLE
        {$$ = {"obj_1": $1, "obj_2": $3, "type": "double", "loc": "middle"}}
    ;

const
    : ONE
        {$$ = 1}
    | TWO
        {$$ = 2}
    | THREE
        {$$ = 3}
    | FOUR
        {$$ = 4}
    | FIVE
        {$$ = 5}
    | SIX
        {$$ = 6}
    | SEVEN
        {$$ = 7}
    | EIGHT
        {$$ = 8}
    | NINE
        {$$ = 9}
    | TEN
        {$$ = 10}
    ;

color
    : RED
        { $$ = "red" }
    | PINK
        { $$ = "pink" }
    | PURPLE
        { $$ = "purple" }
    | BLUE
        { $$ = "blue" }
    | CYAN
        { $$ = "cyan" }
    | TEAL
        { $$ = "teal" }
    | GREEN
        { $$ = "green" }
    | YELLOW
        { $$ = "yellow" }
    | ORANGE
        { $$ = "orange" }
    | BROWN
        { $$ = "brown" }
    | GREY
        { $$ = "grey" }
    | BLUEGREY
        { $$ = "bluegrey" }
    ;

value
    : value D const TIME
        {$$ = {"val": $1, "const": $3, "type": "time"};}
    | value D const FRACTION
        {$$ = {"val": $1, "const": $3, "type": "fraction"};}
    | value AND value D DIFF
        {$$ = {"val_1": $1, "val_2": $3, "type": "diff"};}
    | value AND value D AND
        {$$ = {"val_1": $1, "val_2": $3, "type": "sum"};}
    | value AND value D MIDDLE
        {$$ = {"val_1": $1, "val_2": $3, "type": "middle"};}
    | object D computableAttribute
        {$$ = {"obj": $1, "type": "single", "val": $3};}
    | object AND object D doubleAttribute
        {$$ = {"obj_1": $1, "obj_2": $3, "type": "double", "val": $5};}
    ;

uncomputableValue
    : object D uncomputableAttribute
        {$$ = {"obj": $1, "type": "single", "val": $3};}
    ;

relation
    : value EQUAL value
        {$$ = {"type": "equation", "val_1": $1, "val_2": $3, "op": "="};}
    | value IS value
        {$$ = {"type": "equation", "val_1": $1, "val_2": $3, "op": "="};}
    | value LEQ value
        {$$ = {"type": "equation", "val_1": $1, "val_2": $3, "op": "<"};}
    | value GEQ value
        {$$ = {"type": "equation", "val_1": $1, "val_2": $3, "op": ">"};}
    | object AT object D direction
        {$$ = {"type": "direction", "obj_1": $1, "obj_2": $3, "direction": $5};}
    // | uncomputableValue EQUAL constValue
    //     {$$ = {"type": "assignment", "left_value": $1, "right_value": $3};}
    | uncomputableValue IS constValue
        {$$ = {"type": "assignment", "left_value": $1, "right_value": $3};}
    | uncomputableValue EQUAL uncomputableValue
        {$$ = {"type": "assignment-eq", "left_value": $1, "right_value": $3};}
    // | uncomputableValue IS uncomputableValue
    //     {$$ = {"type": "assignment", "left_value": $1, "right_value": $3};}
    ;

predicate
    : NEW
        {$$ = "new";}
    | MOVE
        {$$ = "move";}
    | CHANGE
        {$$ = "change";}
    ;
        
target
    : object
        {$$ = {"obj": $1, "type": "single", "val": "loc"};}
    | object D attribute
        {$$ = {"obj": $1, "type": "single", "val": $3};}
    | object AND object D doubleAttribute
        {$$ = {"obj_1": $1, "obj_2": $3, "type": "double", "val": $5};}
    ;

adverbial
    : DAO location
        {$$ = {"type": "loc", "loc": $2};}
    | AT location
        {$$ = {"type": "loc", "loc": $2};}
    | WANG direction
        {$$ = {"type": "direction", "direction": $2};}
    | IS value
        {$$ = {"type": "computable", "value": $2};}
    | IS uncomputableValue
        {$$ = {"type": "uncomputable", "value": $2};}
    | IS color
        {$$ = {"type": "color", "value": $2};}
    | IS shape
        {$$ = {"type": "shape", "value": $2};}
    | IS INPUTTEXT
        {$$ = {"type": "text", "value": $2};}
    | EQUAL value
        {$$ = {"type": "computable", "value": $2};}
    | EQUAL uncomputableValue
        {$$ = {"type": "uncomputable", "value": $2};}
    | EQUAL color
        {$$ = {"type": "color", "value": $2};}
    | EQUAL shape
        {$$ = {"type": "shape", "value": $2};}
    | EQUAL INPUTTEXT
        {$$ = {"type": "text", "value": $2};}
    | adverb
        {$$ = {"type": "adverb", "value": $1};}
    ;

conditions
    : conditions ALSO relation
        { $1.push($3);
          $$ = $1; }
    | relation
        { $$ = [$1]; }
    ;

remain
    : REMAIN objects NOCHANGE
        { $$ = $2; }
    | REMAIN OTHER NOCHANGE
        { $$ = "other"; }
    ;