
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
"水平位置"               return 'HORILOCA'
"竖直位置"               return 'VERTILOVA'
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
"的"                     return 'D'
"和"                     return 'AND'
"到"                     return 'DAO'
"在"                     return 'AT'
"往"                     return 'WANG'
"为"                     return 'IS'

[\u4e00-\u9fa5]+?(?=[新建移动修改这那里大小高宽度颜色文字水平位置竖直距离深浅左右上下边方的和到在往为])            return 'OBJ'


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
    : NEW THIS OBJ WANG LEFT IS EOF
        { console.log($1);
          console.log($2);
          console.log($3);
          console.log($4);
          console.log($5);
          return $1; }
    ;

