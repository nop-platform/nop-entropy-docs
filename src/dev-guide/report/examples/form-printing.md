# 套打

套打的做法如下：

1. 在报表中插入图片
2. 设置图片打印的时候不显示

![](form-printing/form-printing.png)

## 动态生成图片

如果不是静态图片，必须根据条件动态生成图片，则需要配置数据生成表达式。

在图片上点击右键【查看可选文字】，然后在【替换文字】信息中通过dataExpr表达式来生成图片数据，返回格式为byte\[\]或者IResource对象。

注意：需要插入单独的一行`-----`表示后续是表达式部分。

![](form-printing/data-expr.png)

具体如何加载图片需要应用自行编写，这里的myHelper仅仅是一个示例对象。应用可以在【展开前】使用inject从bean容器中获取自己的帮助对象。
或者使用import语法导入外部帮助类。