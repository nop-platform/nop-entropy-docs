# Nop如何克服DSL只能应用于特定领域的限制？

   Nop平台可以看作是一个语言工作台（Language Workbench），它为DSL(领域特定语言，Domain Specific Language)的设计和研发提供了完整的理论支撑和底层工具集。使用Nop平台来开发，主要是使用DSL来表达业务逻辑，而不是使用通用的程序语言来表达。有些人可能会有疑问：既然DSL是所谓的领域特定语言，那岂不是意味着它只能应用于某个特定领域，这样在描述业务的时候是不是会存在本质性的限制？以前ROR(Ruby On Rails)框架流行的时候，热炒过一段时间DSL的概念，但现在不也悄无声息了，Nop又有何特异之处？对这个问题的回答很简单：Nop平台是基于可逆计算理论从零开始构建的下一代低代码平台，而可逆计算理论是一个系统化的关于DSL设计和构建的理论，它在理论层面解决了传统DSL设计和应用所存在的问题。

## 一.  横向DSL分解: DSL特性向量空间

图灵机能够实现图灵完备的根本原因在于图灵机可以被看作是一种虚拟机，它可以模拟所有其他的自动计算机器，而如果我们不断提升虚拟机的抽象层次，就会得到可以直接"运行"所谓领域特定语言(DSL)的虚拟机，但是因为DSL关注的重点是特定领域概念，它必然无法以最便利的方式表达所有通用计算逻辑（否则它就成为了通用语言），必然会导致某种信息溢出，成为所谓的Delta项。  

**在第一代、第二代、第三代程序语言的发展过程中，不断的提升抽象层次，但它们仍然都是通用程序语言，但是发展到第四代程序语言，我们很可能得到的不是另一种通用程序语言，而是大量领域特定语言所构成的DSL森林**，通过它们我们可以形成对原有程序结构的一种新的表示和认知。

根据可逆计算的核心构造公式 `App = Delta x-extends Generator<DSL>`，我们可以连续应用Delta分解，得到如下公式

```
App = G1<DSL1> + G2<DSL2> + ... + Delta
App ~ [DSL1, DSL2, ..., Delta]
```

我们可以利用一系列的DSL语言，通过Generator和Delta项把它们粘结在一起。**如果我们把Generator看作是一种可以被忽略的背景知识（在表达业务的时候不需要明确表达），则可以将每个DSL看作是一个特性维度（Feature），而应用程序可以投影到多维的特性空间**。每一个DSL确实存在表达上的限制，但是多个特性维度组合在一起，再加上额外的Delta信息，就可以建立一个完整的描述。

## 二. 纵向DSL分解：多阶段、多层次的软件生产线

前一节介绍的是可逆计算理论中的横向DSL分解，与此类似，我们在纵向也可以引入多层级的DSL分解，它可以克服传统模型驱动架构（MDA）的固有缺陷。

![](../tutorial/delta-pipeline.png)

在日常开发中，我们经常可以发现一些逻辑结构之间存在相似性和某种**不精确的衍生关系**，例如后端数据模型与前端页面之间密切的关联，对于最简单的情况，我们可以根据数据模型直接推导得到它对应的增删改查页面，或者反向根据表单字段信息推导得到数据库存储结构。但是，这种不精确的衍生关系很难被现有的技术手段所捕获和利用，如果强行约定一些关联规则，则只能应用于非常受限的特定场景，而且还会导致与其他技术手段的不兼容性，难以复用已有的工具技术，也难以适应需求从简单到复杂的动态演化。 这正是**传统模型驱动架构所面临的两难抉择：模型要发挥最大作用就必须内置大量知识进行自动推理，但是内置的知识越多就越容易绑定在某个应用场景，难以处理预料之外的新需求**。

Nop平台基于可逆计算理论为实现这种面向动态相似性的复用提供了标准的技术路线：  

1. 借助于嵌入式元编程和代码生成，**任意结构A和C之间都可以建立一条推理管线**  

2. **将推理管线分解为多个步骤 :  A =\> B =\> C**  

3. **进一步将推理管线差量化**：A =\> `_B` =\> B =\> `_C` =\> C  

4. **每一个环节都允许暂存和透传本步骤不需要使用的扩展信息**  

具体来说，Nop内置的模型驱动生产线可以分解为四个主要模型：  

1. XORM：面向存储层的领域模型  

2. XMeta：针对GraphQL接口层的领域模型，可以直接生成GraphQL的类型定义  

3. XView：在业务层面理解的前端逻辑，采用表单、表格、按钮等少量UI元素，与前端框架无关  

4. XPage：具体使用某种前端框架的页面模型

在模型推导的时候我们只是推导得到一个备选的结果（一般存放在以下划线为前缀的模型文件中），然后我们可以选择继承这个备选的模型，增加手工修正和依赖额外信息的Delta推理部分（存放在不以下划线为前缀的模型）。整个推理关系的各个步骤都是可选环节：**我们可以从任意步骤直接开始，也可以完全舍弃此前步骤所推理得到的所有信息**。例如我们可以手动增加`xview`模型，并不需要它一定具有特定的`xmeta`支持，也可以直接新建`page.yaml`文件，按照AMIS组件规范编写JSON代码，AMIS框架的能力完全不会受到推理管线的限制。借助于这种类似深度学习的深度分解模式，我们可以完全释放模型驱动的威力，同时在必要时可以通过Delta差量引入额外信息，最终成品的能力不会受到模型表达能力的限制。这也使得**我们建模时不需要再追求对各种细节需求的覆盖，只需要集中精力关注最核心、最普适的通用需求部分即可**。

> `XORM = Generator<ExcelModel> + Delta`
> 
> `XMeta = Generator<XORM> + Delta`
> 
> `XView = Generator<XMeta> + Delta`
> 
> `XPage = Generator<XView> + Delta` 

## 三. 非编程指的是非命令式编程

Nop是**Nop is nOt Programming**的递归缩写，Nop非编程指的是它不是传统意义上的命令式编程，而是尽可能的扩大描述式编程的应用范围。**所谓的DSL**可以看作是一种对于业务逻辑的描述式表达方法，它**关注的是如何用业务领域内部的概念来描述业务本身**，而不是用通用程序语言的术语来表达如何一步步的实现业务功能。反过来思考，如果我们可以找到一种针对当前业务的描述式表达方式，然后用最精简的文本结构把它保存下来，那自然就成为一种DSL。

实际上，在传统编程领域，当我们希望提高编程的抽象层次，提升软件的灵活性和适应性的时候，也会不断强调领域概念的重要性，比如说DDD(Domain Driven Design)中的统一语言（Ubiquitous Language）。但是，在传统编程领域，领域概念最终仍然是由通用语言内部的通用程序结构来承载的，因此它在表达的自由性和丰富性方面受到底层通用语言语法结构的限制。另一方面，很多设计优秀的程序框架，本身底层的心智模型就对应于一个隐式存在的DSL，但是我们并没有把它明确表达出来。比如说，SpringBoot的条件化bean组装机制完全可以在spring1.0的语法基础上扩充少量条件标签来实现，但是SpringBoot的实现中却没有定义这样一种DSL，结果最终SpringBoot丧失了自己引以为傲的声明式组装能力，也丧失了对于全局组装结果的直观洞察能力。详细分析，参见[如果重写SpringBoot，我们会做哪些不同的选择？](https://mp.weixin.qq.com/s/_ZVXESRqjSbObmrkDZoGMQ)

Nop平台没有使用Spring和Quarkus这种第三方框架，而是选择从零开始编写IoC/ORM/Workflow/BatchJob等一系列底层引擎，这里最重要的原因就是要根据可逆计算理论对这些引擎的设计进行改造。**每一个具有独立存在价值的引擎都必然对应于一个内在的模型，而这个模型也必然对应着一种DSL语言**。Nop平台的关键点是**为每一种引擎都明确定义出一个DSL，然后借助于Nop平台的基础设施，自动的实现DSL的解析、验证、缓存、分解合并、元编程等**。在这种情况下，所有的引擎都只需要处理自己特有的运行时逻辑即可，而且因为大量的可扩展设计都可以在编译期借助于Nop平台来完成，所以引擎的运行时结构可以得到极大的简化。在Nop平台中，每个引擎的代码量一般会比对应的开源实现要小一个数量级，同时还提供更丰富的功能、更好的可扩展性、更优异的性能。参见[Nop平台与SpringCloud的功能对比 ](https://mp.weixin.qq.com/s/Dra8yf2O5VMJyEPox4dGBw)。


> Nop平台提供了大量底层引擎，可以对标SpringCloud生态的相应部分，它可以成为AI时代的一种类似SpringCloud的基础技术底座。

## 四. 统一的元模型，统一的DSL结构构造规律

对于DSL的反对意见最常见的是以下三点：

1. 构造和维护DSL的成本很高

2. 不同的DSL语法形式差别很大，导致学习成本也很高

3. DSL和通用语言之间的交互困难

因此，很多人推荐使用嵌入在通用语言中的所谓内部DSL(Internal DSL)。内部DSL利用宿主通用编程语言的语法和结构来构建领域特定的语言，不需要独立的语法分析器或编译器，可以利用现有编程语言的工具和生态系统，比如代码编辑、调试、打包和部署等，而且学习成本相对较低，因为用户不需要学习一套全新的语言。

但是，常见的内部DSL所存在的问题是，它们过于强调DSL语法与自然语言之间的表观相似性（实际上也不是与自然语言相似，只是与英语相似），实际上只是引入了不必要的形式复杂性。此外，一般内部DSL只是利用底层语言内置的类型系统来进行形式约束，往往并不能保证DSL语法的稳定性，完全可能存在多种等价的表达方式来表达同样的领域逻辑，所谓的DSL语法仅仅是一种不成文的约定而已。内部DSL的解析一般要依赖于底层语法的解析器，难以脱离于底层语言之外进行解析和转换，这也导致内部DSL的语法和语义与底层语言纠缠在一起，很少有人会关注内部DSL自身的概念完整性、可扩展性和结构可逆性。

Nop平台的做法是引入统一的XDef元模型来规范化所有DSL的语法和语义结构，并提供了统一的开发和调试工具来辅助DSL的开发。只要掌握了元模型，就可以立刻掌握所有DSL的语法和分解合并、差量定制等标准方案，不需要针对每个DSL单独学习。使用Nop平台来开发一个新的引擎时，我们可以通过`xdef:ref`来引用已有的DSL，实现多个DSL的自然融合，通过XPL模板语言实现描述式向命令式的自动转换。具体参见[低代码平台中的元编程(Meta Programming)](https://mp.weixin.qq.com/s/LkTIVGSrK9zomPW4bNiqqA)。