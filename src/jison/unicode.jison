
/* description: Parses and executes mathematical expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
"新建"                   return 'NEW'
"移动"                   return 'MOVE'
"修改"                   return 'CHANGE'
"这个"                   return 'THIS'
"那个"                   return 'THAT'
"这里"                   return 'HERE'
"那里"                   return 'THERE'
"大小"                   return 'SIZE'
"高度"                   return 'HEIGHT'
"宽度"                   return 'WIDTH'
"颜色"                   return 'COLOR'
"文字"                   return 'TEXT'
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
"中点"                   return 'MIDDLE' 
"的"                     return 'D'
"和"                     return 'AND'
"到"                     return 'DAO'
"在"                     return 'AT'
"往"                     return 'WANG'
"为"                     return 'IS'
"倍"                     return 'TIME'
"差"                     return 'DIFF'
"使得"                   return 'FOR'
"使"                     return 'FOR'

[\u4e00-\u9fa5]+?(?=[新建移动修改这那里大小高宽度颜色文字水平位置竖直距离深浅左右上下边方的和到在往为])            return 'OBJ'

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

expressions
    : predicate target adverbial conditions EOF
        { console.log($1);
          console.log($2);
          console.log($3);
          console.log($4);
          return {"predicate": $1}; }
    ;

object
    : OBJ
        {$$ = {"name": $1, "type": "obj"};}
    | THIS
        {$$ = {"name": $1, "type": "ref"};}
    | THAT
        {$$ = {"name": $1, "type": "ref"};}
    | THIS OBJ
        {$$ = {"name": $2, "type": "ref"};}
    | THAT OBJ
        {$$ = {"name": $2, "type": "ref"};}
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
    : DEEP '一点'
        {$$ = "deep"}
    | SHALLOW '一点'
        {$$ = "shallow"}
    | BIG '一点'
        {$$ = "big"}
    | SMALL '一点'
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
        {$$ = {"loc": "here", "type": "ref"}}
    | THERE
        {$$ = {"loc": "there", "type": "ref"}}
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

value
    : value D const TIME
        {$$ = {"val": $1, "const": $3, "type": "time"};}
    | value D const FRACTION
        {$$ = {"val": $1, "const": $3, "type": "fraction"};}
    // | value AND value D DIFF
    //     {$$ = {"val_1": $1, "val_2": $3, "type": "diff"};}
    // | value AND value D AND
        // {$$ = {"val_1": $1, "val_2": $3, "type": "sum"};}
    | object D attribute
        {$$ = {"obj": $1, "type": "single", "val": $3};}
    | object AND object D doubleAttribute
        {$$ = {"obj_1": $1, "obj_2": $3, "type": "double", "val": $5};}
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
        {$$ = {"type": "value", "value": $2};}
    ;

conditions
    : FOR
        { $$ = $1; }
    ;
