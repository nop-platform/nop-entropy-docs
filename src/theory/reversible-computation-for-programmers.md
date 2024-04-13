# 写给程序员的可逆计算理论辨析

可逆计算理论是Docker、React、Kustomize等一系列基于差量的技术实践背后存在的统一的软件构造规律，它的理论内容相对比较抽象，导致一些程序员理解起来存在很多误解，难以理解这个理论和软件开发到底有什么关系，能够解决哪些实际的软件开发问题。
在本文中，我将尽量采用程序员熟悉的概念讲解差量以及差量合并的概念，并分析一些常见的理解为什么是错误的。

如果对可逆计算理论不了解，请先阅读文章

[可逆计算：下一代软件构造理论](https://zhuanlan.zhihu.com/p/64004026)

## 一. 从Delta差量的角度去理解类继承

首先，Java的类继承机制是内置在Java语言中的一种对原有逻辑进行Delta修正的技术手段。例如

```java
public class NopAuthUserBizModel extends CrudBizModel<NopAuthUser> {
    @Override
    protected void defaultPrepareSave(EntityData<NopAuthUser> entityData, IServiceContext context) {
        super.defaultPrepareSave(entityData, context);

        user.setStatus(NopAuthConstants.USER_STATUS_ACTIVE);
        user.setDelFlag(DaoConstants.NO_VALUE);
    }
}
```

很多人对可逆的概念都感到很难理解，什么是差量，到底怎么逆，逆向执行吗？**这里说的可逆不是运行期的逆向执行，而是在程序的编译期所进行的结构变换**。比如说我们可以通过类继承的方式在不修改基类源码的情况下改变类的行为。

```javascript
CrudBizModel<?> crud = loadBizModel("NopAuthUser");
crud.save(entityData);
```

同样的CrudBizModel类型，如果实际对应的Java类不同，则执行的业务逻辑就不同。继承可以看作是向已经存在的基类补充Delta信息。

1. **B = A + Delta, 所谓的Delta,就是在不修改A的情况下向A补充一些信息,将它转化为B**。

2. **可逆指的是我们可以通过Delta来删除基类中已经存在的结构。**

当然Java本身并不支持通过继承来删除基类中的方法，但是我们可以通过继承将该函数重载为空函数，然后可以寄希望于运行期的JIT编译器能够识别这个情况，从而在JIT编译结果中完全删除这个空函数的调用，最终达到完全删除基类结构的效果。

还可以举另外一个例子，假设我们已经编写了一个银行核心系统，在某个银行部署的时候客户要求进行定制化开发，要求删除账户上某些多余的字段，同时要增加一些行内业务要用到的定制字段。此时，如果不允许修改基础产品中的代码，我们可以采用如下方案

```Java
class BankAccountEx extends BankAccount{
   String refAccountId;

   public String getRefAccountId(){
      return refAccountId;
   }

   public void setRefAccountId(String refAccountId){
      this.refAccountId = refAccountId;
   }
}
```

我们可以增加一个扩展账户对象，它从原有的账户对象继承，从而具有原有账户对象的所有字段，然后在扩展对象上我们可以引入扩展字段。然后我们在ORM配置中使用扩展对象，

```xml
  <entity name="bank.BankAccount" className="mybank.BankAccountEx">...</entity>
```

以上配置表示保持原有的实体名不变，将实体所对应的Java实体类改成BankAccountExt。这样的话，如果我们此前编程中创建实体对象的时候都是使用如下方法

```javascript
 BankAccount account = dao.newEntity(); 
 或者
 BankAccount acount = ormTemplate.newEntity(BankAccount.class.getName());
```

则我们实际创建的实体对象是扩展类对象。而且因为ORM引擎内部知道每个实体类名所对应的具体的实现类，所以通过关联对象语法加载的所有Account对象也是扩展类型。

```javascript
BankAccount parentAccount = account.getParent(); // parent返回的是BankAccountEx类型
```

原有的代码使用BankAccount类型不需要发生改变，而新写的代码如果用到扩展字段，则可以将account强制转型为BankAccountEx来使用。

关于删除字段的需求，Java并不支持删除基类中的字段，我们该怎么做呢？实际上我们可以通过定制ORM模型来实现某种删除字段的效果。

```xml
<orm x:extends="super">
  <entity name="bank.BankAccount" className="mybank.BankAccountEx"  >
    <columns>
       <column name="refAccountId" code="REF_ACCOUNT_ID" sqlType="VARCHAR" length="20" />
       <column name="phone3" code="PHONE3" x:override="remove" />        
    </columns>
  </entity>
</orm>  
```

根节点上的`x:extends="super"`表示继承基础产品中的ORM模型文件（如果不写，则表示新建一个模型，完全放弃此前的配置）。字段phone3上标记了`x:override="remove"`，它表示从基础模型中删除这个字段。

如果在ORM模型中删除了字段，则ORM引擎就会忽略Java实体类上的对应字段，不会为它生成建表语句、Insert语句、Update语句等。这样的话，从实际的效果上说，就达到了删除字段的效果。

> 无论如何操作被删除的字段phone3，我们都观测不到系统中有任何的变化，而一个无法被观测、对外部世界也没有影响的量，我们可以认为它是不存在的。

更进一步的，Nop平台中的GraphQL引擎会自动根据ORM模型来生成GraphQL类型的基类，因此如果ORM模型中删除了某个字段，则自动的在GraphQL服务中也会自动删除这个字段，不会为它生成DataLoader。

## Trait: 独立存在的Delta差量

`class B extends A`是在类A的基础上补充Delta信息，但是这个Delta是依附于A而存在的，也就是说B中所定义的Delta是只针对A而实现的，脱离了A的Delta没有任何意义。 鉴于这种情况，有些程序员可能对"可逆计算理论要求差量独立存在"这一点感到疑惑，差量不是对base的修改吗，它怎么可能脱离base而独立存在呢？

带着这个疑问，我们来看一下Scala语言的核心创新之一：Trait机制，关于它的介绍可以参见网上的文章，例如 [Scala Trait 详解（实例）](https://blog.csdn.net/Godfrey1/article/details/70316850)。

```scala
trait HasRefId{
  var refAccountId:String = null;

  def getRefAccountId() = refAccountId;

  def setRefAccountId(accountId: String): Unit ={
    this.refAccountId = accountId;
  }
}

class BankAccountEx extends BankAccount with HasRefId{
}

class BankCardEx extends BankCard with HasRefId{
}
```

trait HasRefId相当于是一种Delta，它表示为基础对象增加一个refAccountId属性，我们在声明BankAccountEx类时只需要混入这个trait就可以自动实现在BankAccount类的基础上增加属性。

需要特别注意的是, **HasRefId这个trait是独立编译、独立管理的**。也就是说，即使编译的时候没有BankAccount对象，HasRefId这个trait也是具有自己的业务含义，可以被分析、存放的。而且我们注意到，同样的trait可以作用于多个不同的基础对象，它并不和某个基类绑定。例如上面的BanCardEx也混入了同样的HasRefId。

在编程的时候，我们也可以针对trait类型编程，不需要使用到任何base对象的信息

```scala
def myFunc(acc: HasRefId with HasUserId): Unit = {
    print(acc.getRefAccountId());
  }
```

上面的函数接收一个参数acc，只要求acc满足两个trait的结构要求。

如果从数学的角度上分析一下，我们会发现，类的继承对应于 B \> A ， 表示B比A多，但是多出来的东西并没有办法被独立出来。但是Scala的trait相当于是 B = A with C, 这个被明确抽象出来的C可以应用到多个不同的基类上，比如 D = E with C等。在这个意义上，我们当然可以说C是独立于A或者E而独立存在的。

Scala的这个trait机制后来被Rust语言继承并发扬光大，成为这个当红炸子鸡的所谓零开销抽象的独门秘技之一。

## DeltaJ: 具备删除语义的Delta差量

从Delta差量的角度看，Scala的trait的功能并不完整，它无法实现删除字段或者函数的功能。德国的一个教授Shaefer察觉到软件工程领域中删除语义的缺乏，提出了一种包含删除操作的Delta定义方式：[DeltaJ语言](https://deltaj.sourceforge.net/)，并提出了Delta Oriented Programming的概念。

![deltaj](https://pic1.zhimg.com/80/v2-0f302d143afd51877e4080a8dcd21480_720w.webp)

详细介绍可以参见 [从可逆计算看Delta Oriented Programming](https://zhuanlan.zhihu.com/p/377740576)

## Delta合并与继承的区别

可逆计算理论中提出的Delta合并算子类似于继承概念，但是又有着一些本质性的区别。

传统的编程理论非常强调封装性，但是可逆计算是面向演化的，而**演化必然是破坏封装性的**。在可逆计算理论中，封装性并没有那么重要，所以Delta合并可以具有删除语义，并且是把基础模型作为白盒结构来看待，而不是不可被分析的黑盒对象。Delta合并对封装性的最终破坏程度由XDef元模型约束来限制，避免它突破最终的形式约束。

继承会产生新的类名，而原有类型指向的对象结构并不会发生变化。但是根据可逆计算理论设计的Delta定制机制相当于是直接修改模型路径所对应的模型结构，并不会产生新的模型路径。例如对于模型文件/bank/orm/app.orm.xml，我们可以在delta目录下增加一个相同子路径的文件来覆盖它，然后在这个文件中再通过`x:extends="super"`来继承原有的模型。所有使用/bank/orm/app.orm.xml的地方实际装载的将是定制后的模型。

```xml
<!-- /_delta/default/bank/orm/app.orm.xml -->
<orm x:extends="super">
  ...
</orm>  
```

因为Delta定制并不会改变模型路径，所以所有根据模型路径和对象名建立的概念网络都不会因为定制而产生扭曲和移动，它保证了**定制是一种完全局域化的操作**。可以想见，如果是一般的面向对象继承，在不修改源码的情况下我们不可能在局部把硬编码的基类名替换成派生类的类名，这样就只能扩大重载范围，比如重载整个函数，替换整个页面等。很多情况下，我们都无法有效控制局部需求变化的影响范围，我们还为这种现象起了一个名字：抽象泄露。一旦抽象泄露，就可能出现影响范围不断扩大，最终甚至导致架构崩溃。

Delta定制与继承的第三个区别在于**继承定义在短程关联之上**。面向对象的继承在结构层面可以被看作是Map之间的覆盖：每个类相当于是一个Map，它的key是属性名和方法名。Map是一种典型的短程关联，它只有容器-元素这样一级结构关系。而**Delta定制是定义在树形结构这一典型的长程关联之上**：父节点控制着所有递归包含的子节点，如果删除了父节点，所有递归包含的子节点都会被删除。Delta定制在结构层面可以被看作是树形结构之间的覆盖：Tree = Tree x-extends Tree。在后面的章节中，我会在理论层面解释树形结构相比于Map结构的优势之处。

## 二. Docker作为可逆计算理论的实例

可逆计算理论指出，在图灵机理论和Lambda演算理论之外，存在着第三条通向图灵完备的中间路径，我们可以用一个公式来表达这条技术路线

```
App = Delta x-extends Generator<DSL>
```

* x-extends是一个词，它表示对面向对象的extends机制的一种扩展。有些人可能把它误认为x减去extends，结果导致非常困惑。

* `Generator<DSL>`是一种类似泛型的写法，它表示Generator采用类似[C++模板元编程](https://zhuanlan.zhihu.com/p/137853957)的技术，在编译期将DSL作为数据对象进行加工转换，动态生成Delta所将要覆盖的基类。
  
  > 一个复杂的结构化的类型声明如果进一步引入执行语义就会自动成为DSL（Domain Specific Language)，所以Generator相当于是一个模板宏函数，它接受一个类似类型定义的DSL，在编译期动态生成一个基类。

Docker镜像的整体构造模式可以看作是

```
App = DockerBuild<DockerFile> overlay-fs BaseImage
```

DockerFile就是一种DSL语言，而Docker镜像的build工具相当于是一种生成器，它解释DockerFile中定义的apt install等DSL语句，动态将它们展开为硬盘上对文件系统的一种差量化修改（新建文件、修改文件、删除文件等）。

[OverlayFS](https://blog.csdn.net/qq_15770331/article/details/96702613) 是一种**堆叠文件系统**，它依赖并建立在其它的文件系统之上（例如 ext4fs 和 xfs 等等），并不直接参与磁盘空间结构的划分，**仅仅将原来底层文件系统中不同的目录进行 “合并”，然后向用户呈现，这也就是联合挂载技术**。OverlayFS在查找文件的时候会先在上层找，找不到的情况下再到下层找。如果需要列举文件夹内的所有文件，则会合并上层目录和下层目录的所有文件统一返回。如果用Java语言实现一种类似OverlayFS的虚拟文件系统，结果代码就类似于[Nop平台中的DeltaResourceStore](https://gitee.com/canonical-entropy/nop-entropy/blob/master/nop-core/src/main/java/io/nop/core/resource/store/DeltaResourceStore.java)。OverlayFS的这种合并过程就是一种标准的树状结构差量合并过程，特别是我们可以通过增加一个Whiteout文件来表示删除一个文件或者目录，所以它符合`x-extends`算子的要求。

## Docker镜像与虚拟机增量备份的对比

有些程序员对于Docker技术存在误解，认为它就是一种轻量级的虚拟化封装技术或者说是一种很方便的应用打包工具，与Delta差量有什么关系呢？当然，从使用层面上说Docker确实相当于是一种轻量级的虚拟机，但关键是它是凭借什么技术实现轻量级的？它作为一种打包工具与其他的打包工具相比有什么本质上的优势？

在Docker之前，虚拟机技术就可以实现增量备份，但是虚拟机的增量是定义在字节空间中，虚拟机的增量文件在脱离了基础镜像的情况下是没有业务含义的，也不能为独立的被构造、独立的被管理。而Docker则不同，**Docker镜像的Delta差量是定义在文件系统空间中，所谓的Delta的最小单位不是字节而是文件**。比如说，如果我们现在有一个10M的文件，如果我们为这个文件增加一个字节，则镜像会增大10M，因为OverlayFS要经历一个[copy up](https://blog.csdn.net/qq_15770331/article/details/96702613)过程，将下层的整个文件拷贝到上层，然后再在上层进行修改。

**在Docker所定义的差量空间中，半个文件A+半个文件B不是一个合法定义的差量，我们也不可能用Docker的工具构造出这样一个差量镜像出来**。所有的镜像中包含的都是完整的文件，它的特殊性在于还包含某种**负文件**。例如，某个镜像可以表示`(+A,-B)`，增加文件A，同时删除文件B，而修改文件的某个部分这一概念无法被直接表达，它将被替换为增加文件A2。A2对应于修改后产生的结果文件。

**Docker镜像是独立于基础镜像存在的Delta差量**，我们可以在完全不下载基础镜像的情况下独立的制作一个应用镜像。实际上Docker镜像就是一个tar文件，用zip工具打开之后我们会看到每一层都对应于一个目录，我们只要通过拷贝操作将文件拷贝到对应目录中，然后计算hash码，生成元数据，再调用tar打包就可以生成一个镜像文件了。对比虚拟机的字节空间中的差量备份文件，我们缺少合适的、针对虚拟机字节空间的、稳定可靠的技术操作手段。而在文件系统空间中，所有的生成、转换、删除文件的命令行程序都自动成为这个Delta差量空间中的变换算子。

> 在数学上，不同的数学结构空间中它们允许存在的算子的丰富性是不同的。如果是一个贫瘠的结构空间，例如字节空间，那么我们就缺少一些强大的结构变换手段。

## Docker镜像与Git版本的对比

有些同学可能会疑惑，Docker的这种差量是否与Git是类似的？确实，**Git也是一种差量管理技术，但是它所管理的差量是定义在文本行空间中的**。这两种技术的区别从可逆计算的角度去看，只在于它们对应的差量空间不同，进而导致这两个空间中存在的算子（Operator）不同。Docker所对应的文件系统空间可用的算子特别多，每个命令行工具都自动成为这个差量空间上的合法操作。而在文本行空间，如果我们随便操作，很容易就导致产生的源码文件语法结构出现混乱，无法通过编译。因此，在Docker的差量空间中，我们有很多的Generator可以生成Delta，而在Git的差量空间中，所有的变更操作都是由人手工完成的，而不是由某个程序自动生成的。比如说我们要给某个表增加字段A，我们是手工修改源码文件，而不是期待通过某个Git集成的工具自动对源码进行修改。有趣的一点是，**如果我们为Git配备一个结构化的比较与合并工具**，比如集成Nop平台的Delta合并工具等，则可以将Git所面对的Delta空间修改为DSL所在的领域模型空间，而不再是文本行空间。**在领域模型空间中，通过Delta合并算子进行的变换可以保证结果格式一定是合法的XML格式，而且所有的属性名、节点名都是XDef元模型文件中定义的合法名称**。

再次强调一下，**差量概念是否有用关键在于它到底定义在哪个差量模型空间中，在这个空间中我们能够建立多少有用的差量运算关系**。在一个贫瘠的结构空间中定义的差量并没有多大的价值，差量与差量并不是生而平等的。

有些人可能怀疑Delta差量是不是就是给一个json加上版本号，然后用新版本替换旧版本？问题没有这么简单。差量化处理首先要定义差量所在的空间。在Nop平台中差量是定义在领域模型空间，而不是文件空间中的，不是说整个JSON文件加个版本号，然后将整个JSON文件替换为新的版本，而是**在文件内部我们可以对每一个节点、每一个属性进行单独的差量定制**，也就是说在Nop平台的差量空间中，每一个最小的元素都是具有领域语义的业务层面上稳定的概念。另外一个区别在于，根据XDSL规范，Nop平台中所有的领域模型都支持`x:gen-extends`和`x:post-extends`编译期元编程机制，可以在编译期动态生成领域模型，然后再进行差量合并。这样整体上可以满足  `DSL = Delta x-extends Geneator<DSL0>`的计算范式要求。很显然，一般的JSON相关技术，包括JSON Patch技术并没有内置的Generator的概念。

## 三. Delta定制的理论和实践意义

基于可逆计算理论的指导，Nop平台在实操中可以做到的效果就是： **一个复杂的银行核心应用可以在完全不修改基础产品源码的情况下，通过Delta定制进行定制化开发，为特定的银行实现完全定制的数据结构、后台逻辑、前端界面等**。

从软件工程的角度去理解，**可逆计算理论解决了粗粒度的系统级软件复用的问题**，即我们可以复用整个软件系统，不需要把它拆解为分立的模块、组件。组件技术在理论方面存在缺陷，所谓的组件复用是**相同可以复用**，我们复用的是A和B之间的公共的部分，但是A和B的公共部分是比A和B都要小的，这直接导致组件技术的复用粒度无法扩展到比较宏观的层次。因为一个东西的粒度越大就越难找到和它完全一样的东西。

可逆计算理论指出 X = A + B + C, Y = A + B + D = X + (-C + D) = X + Delta，在引入逆元的情况下，任意的X和任意的Y都可以建立运算关系，从而在不修改X的情况下，可以通过补充Delta信息实现对X的复用。也就是说，**可逆计算理论将软件的复用原理从"相同可复用"扩展到了"相关可复用"**。组件的复用是基于整体-部分之间的组合关系，而**可逆计算指出对象之间除了组合关系之外还可以建立更灵活的转化关系**。

Y = X + Delta， 在可逆计算的视角下， **Y 是在X上补充Delta信息得到的，但是它可能比X更小，而不是说它一定比X要大**，这个观点和组件理论有着本质性区别。想象一下 Y = X + （- C) 表示从X中删除一个C得到Y。实际得到的Y是比X更小的结构。

美国的卡内基梅隆大学软件工程研究所是软件工程领域的权威机构，它们提出了一个所谓的[软件产品线工程理论](https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=513819)，指出软件工程的发展历程就是不断提升软件复用度，从函数级复用、对象级复用、组件级复用、模块级复用，最终实现系统级复用的发展历程。软件产品线理论试图为软件的工业化生产建立理论基础，可以像工业生产线一样源源不断的生成软件产品，但是它并没有能够找到一种很好的技术手段能够以很低廉的成本实现系统级复用。软件产品线传统的构建方式要使用到类似C语言的宏开关的机制，维护成本很高。而可逆计算理论相当于是为落实软件产品线工程的技术目标提供了一条可行的技术路线。具体分析可以参见 [从可逆计算看Delta Oriented Programming](https://zhuanlan.zhihu.com/p/377740576)

为了具体说明如何进行Delta定制，我提供了一个示例工程 [nop-app-mall](https://gitee.com/canonical-entropy/nop-app-mall)，
介绍文章 [如何在不修改基础产品源码的情况下实现定制化开发](https://zhuanlan.zhihu.com/p/628770810)
演示视频 [B站](https://www.bilibili.com/video/BV16L411z7cH/)

## Delta定制与插件化的区别

有些程序员一直有疑问，我们传统的"正交分解"、"模块化"、"插件系统"按照功能进行聚类，将相关功能集合为一个库、包等，不也能实现复用吗？可逆计算的复用有什么特殊之处？**差别就在于复用的粒度不同**。传统的复用方式无法实现系统级别的复用。想象一下，系统中包含1000多个页面，某个客户说我要在页面A上增加按钮B，删除按钮C，使用传统的复用技术怎么做？为每一个按钮都写一个运行时控制开关吗？如果不修改页面对应的源码，能实现客户的需求吗？如果后来基础产品升级了，它在前台页面中增加了一个新的快捷键操作方式，我们的定制代码是否能够自动继承基础产品已经实现的功能，还是必须由程序员手工进行代码合并？

**传统的可扩展技术依赖于我们对未来变化点的可靠预测，比如插件系统我们必须要定义插件到底挂接在哪些扩展点**。但现实情况是，我们不可能把系统中所有可能扩展的地方都设计成扩展点，比如说我们很难为每个按钮的每个属性都设计一个开关控制变量。缺少细粒度的开关很容易导致我们的扩展粒度因为技术受限而变大，比如客户只是要修改一下某个界面上的某个字段的显示控件，结果我们必须要定制整个页面，本来是一个字段级别的定制问题因为系统缺少灵活定制的能力而不得不上升为页面级别的定制问题。

K8s在1.14版本之后力推所谓的Kustomize声明式配置管理技术，这是为了解决类似的可扩展性问题而发明的一种解决方案，它可以被看作是可逆计算理论的一个应用实例，而且基于可逆计算理论我们还很容易的看出Kustomize技术未来可能的改进方向。具体参见 [从可逆计算看kustomize](https://zhuanlan.zhihu.com/p/64153956)

## Delta差量与数据差量处理的关系

Delta差量的思想其实在数据处理领域并不罕见。比如说

1. 数据存储领域使用的[LSM树(Log-Structured-Merge-Tree)](https://zhuanlan.zhihu.com/p/181498475)，它就相当于是按照分层的方式进行差量管理，每次查询数据的时候都会检查所有的层，合并差量运算结果之后返回给调用者。而LSM树的压缩操作可以看作是对Delta进行合并运算的过程。

2. MapReduce算法中的[Map端Combiner优化](https://blog.csdn.net/heiren_a/article/details/115480053)可以看作是利用运算的结合律对Delta差量进行了预合并，从而减轻Reduce阶段的负担

3. [事件溯源(Event Sourceing)](https://zhuanlan.zhihu.com/p/38968012)架构模式中我们将针对某个对象的修改历史记录下来，然后在查询当前状态数据时通过Aggregate聚合操作合并所有Delta修改记录，得到最终结果。

4. 大数据领域中目前最热门的所谓流批一体，[流表二象性（Stream Table Duality)](https://developer.aliyun.com/article/667566)。我们对表的修改将会通过binlog成为Delta变更数据流，而把这些Delta合并在一起得到的快照就是所谓的动态表。

5. 数仓领域的Apache Doris内置了所谓的[Aggregate数据模型](https://doris.apache.org/zh-CN/docs/dev/data-table/data-model/)，在导入数据的时候就执行Delta差量预合并计算，从而极大的减轻查询时的计算量。而DataBricks公司直接把它的数据湖技术核心命名为[Delta Lake](https://learn.microsoft.com/zh-cn/azure/databricks/delta/)，在存储层直接支持增量数据处理。

6. 甚至在前端编程领域，所谓的Redux框架，它的具体做法也就是把一个个的action看作是对State的差量化变更，通过记录所有这些Delta实现时光旅行。

程序员们现在已经习惯了不可变数据的概念，因此在不可变数据的基础上发生的变化的数据很自然的就成为了Delta。但是正如我在此前的文章中指出的，数据和函数是对偶的关系，数据可以看作是作用于函数之上的泛函（函数的函数），**我们同样需要建立不可变逻辑的概念**。如果我们把代码看作是逻辑的一种资源化表示，那么我们应该也可以对逻辑结构进行Delta修正。**大部分程序员现在并没有意识到逻辑结构也是像数据一样可以被程序操纵，并通过Delta修正来调整的**。 Lisp语言虽然很早就确立了“代码即数据”的设计思想，但是它并没有进一步提出一种系统化的支持可逆差量运算的技术方案。

在软件领域的实践中，Delta、差量、可逆等概念的应用正越来越多，**在5到10年内，我们可以期待整个业界发生一次从全量到差量的概念范式转换，我愿将它称之为差量革命**。

> 有趣的是，在深度学习领域，可逆、残差连接等概念已经成为标准理论的一部分，而神经网络的每一层结构都可以看作是 Y = F(X) + Delta这样一种计算模式。

## 四. 可逆计算理论的概念辨析

## 什么是领域模型坐标系

我在介绍可逆计算理论的时候会反复提及领域模型坐标系的概念，Delta差量的独立存在隐含的要求领域坐标的稳定存在。那么，什么是领域坐标？一般的程序员所接触到的坐标只有平面坐标、三维坐标等，可能对于抽象的、数学意义上的坐标概念感到难以理解。下面，我将详细解释一下可逆计算理论中的领域坐标概念到底包含什么内容，它的引入又会给我们的世界观造成什么不一样的影响。

首先，在可逆计算理论中我们谈到坐标，指的是存取值的时候所使用的某种唯一标识，对于任何支持如下两个运算的唯一标识，我们都可以认为它是一个坐标：

1. value = get(path)
2. set(path, value)

而**所谓的一个坐标系统，就是为系统中涉及到的每一个值都赋予一个唯一的坐标**。

具体来说，对于如下的一个XML结构，我们可以将它展平后写成一个Map形式

```xml
<entity name="MyEntity" table="MY_ENTITY">
  <columns>
     <column name="status" sqlType="VARCHAR" lenght="10" />
  </columns>
</entity>
```

对应于

```
{
  "/@name"： "MyEntity",
  "/@table": "MY_ENTITY",
  "/columns/column[@name='status']/@name": "status",
  "/columns/column[@name='status']/@sqlType": "VARCHAR" 
  "/columns/column[@name='status']/@length": 10 
}
```

每一个属性值都有一个唯一的对应的XPath可以直接定位到它。通过调用get(rootNode, xpath)我们可以读取到对应属性的值。
在MangoDB这种支持JSON格式字段的数据库中，JSON对象实际上就是被展平成类似的Map结构来存储，从而可以为JSON对象中的值建立索引。只不过JSON对象的索引中使用的是JSON Path而不是XPath。这里的XPath就是我们所谓的领域坐标。

> XPath规范中规定的XPath具备匹配多个节点的能力，但是在Nop平台中我们只使用具有唯一定位功能的XPath，而且对于集合元素我们只支持根据唯一键字段来定位子元素。

对于上面的Map结构，我们也可以把它简写为多维向量的形式：

```
['MyEntity','MY_ENTITY', 'status','VARCHAR',10]
```

我们只需要记住这个向量的第一个维度对应于`/@name`处的值，而第二个维度对应于`/@table`处的值，依此类推。

> 可以想象一下，所有可能的DSL所构成的坐标系实际上是一个无限维的向量空间。例如，一个列表中可以增加任意多条子元素，那么对应到领域坐标系的向量表示中就可能对应无穷多个不同的变化维度。

如果把DSL模型对象看作是定义了一个领域语义空间，那么DSL描述中的每个值现在就是在这个语义空间中的某个位置处的值，而这个位置所对应的坐标就是XPath，它的每个部分都是领域内部有意义的概念，因为整个XPath在领域语义空间中也具有明确的业务含义，所以我们将它简称为领域坐标，强调它是在领域语义空间中具有领域含义的坐标表示。与此相反，Git Diff中我们定位差异时使用的坐标是哪个文件的哪一行，这个坐标表示是与具体业务领域中的领域概念完全无关的，因此我们说Git所使用的Delta差量空间不是领域语义空间，它所使用的定位标识也不是领域坐标。

在物理学中，当我们为相空间中的每一点都指定一个坐标以后，就从牛顿力学的基于质点的世界观转向了所谓的场论的世界观。后续电动力学、相对论、量子力学的发展所采用的都是场论的世界观。简单的说，在场论的世界观下，我们关注的重点不再是单个对象怎么和其他对象发生相互作用，而是在一个无所不在的坐标系中观察对象上的属性值如何在给定坐标点处发生变化。

基于领域坐标系的概念，无论业务逻辑如何发展，我们描述业务所用的DSL对象在领域坐标系中一定是具有唯一的表示的。比如最初DSL对应的表示是 \['MyEntity','MY\_ENTITY', 'status','VARCHAR',10\]，后来演化成了 \['MyEntity','MY\_ENTITY', 'status','VARCHAR',20\]，
这个20所对应的坐标是 "/columns/column\[@name='status'\]/@length"，因此它表示我们将status字段的长度值调整到了20。

当我们需要对已有的系统进行定制的时候，只需要在领域模型向量中找到对应的位置，直接修改它的值就可以了。这就类似于我们在一个平面上根据x-y坐标找到对应的点，然后修改这个位置处的值。这种定制方式完全不依赖于系统内部是否已经内置了某种扩展接口、插件体系。因为所有的业务逻辑都是在领域坐标系中进行定义的，**所有的业务逻辑变化都是建立在领域坐标基础上的一个Delta差量**。

## Delta合并满足结合律的证明

函数式编程语言中有一个出身很高贵的概念：Monad，是否理解这个概念是判断函数式爱好者是否已经入门的标志性事件。Monad从抽象数学的角度去理解，基本对应于数学和物理学中的半群概念，即具有单位元且满足结合律。所谓的结合律指的是运算关系的结合顺序不影响最终结果：

```
  a + b + c = (a + b) + c = a + (b + c)
```

这里的运算关系采用加号来表示有些误导，因为加法满足交换律（a + b = b + a），但是一般的结合运算并不需要满足交换律，比如函数之间的复合关系就满足结合律，但是一般情况下f(g(x))并不等价于g(f(x))。为了避免误解，下面我会使用符号⊕ 来表示两个量之间的结合运算关系。

> 关于Monad的知识，可以参考我的文章 [写给小白的Monad指北](https://zhuanlan.zhihu.com/p/65449477)。曾有网友反映这是全网最通俗易懂的关于State Monad的介绍。

首先，我们可以证明:如果一个向量的每个维度都满足结合律，则整个向量之间的运算也满足结合律。

```
([A1, A2] ⊕ [B1,B2]) ⊕ [C1,C2] = [A1 ⊕  B1, A2 ⊕ B2] ⊕ [C1,C2] 
                                = [(A1 ⊕ B1) ⊕ C1, (A2 ⊕ B2) ⊕ C2] 
                                = [A1 ⊕ (B1 ⊕ C1), A2 ⊕ (B2 ⊕ C2)]
                                = [A1, A2] ⊕ ([B1, B2] ⊕ [C1,C2])  
```

考虑到上一节中我们对于领域坐标系的定义，为了证明Delta合并满足结合律，**我们只需要证明在单个坐标处的合并运算满足结合律即可**。

最简单的情况是我们常见的覆盖更新：每次运算都是用后面的值覆盖前面的值。我们可以选择用一个特殊的值来表示删除，这样的话就可以将删除也纳入到覆盖更新的情况中来。如果后面的值表示删除，则无论前面的值是什么，最终的结果都是删除。数据库领域的BinLog机制其实就是采用的这种做法：每次对数据库行的修改都会产生一条变更记录，变更记录中记录了行的最新的值，只要接收到变更记录，我们就可以放弃此前的值。在数学上它对应于 A ⊕ B = B ，显然

```
 (A ⊕ B) ⊕ C  = B ⊕ C = C = B ⊕ C = A ⊕ (B ⊕ C)
```

覆盖操作是满足结合律的。

另外一个稍微复杂一些的结合运算是类似AOP的运算，我们可以在基础结构的前面和后面追加一些内容。

```
 B = a super b,  C = c super d  
```

B通过super引用基础结构，然后在基础结构的前面增加a, 而在后面增加b

 ```
  (A ⊕ B) ⊕ C = (a A b) ⊕ C = c a A b d = A ⊕ ( c a super b d) = A ⊕ (B ⊕ C)
 ```

以上就证明了Delta合并运算是满足结合律的。

## 如何理解差量是独立的

有些程序员对于Delta差量是独立存在的这一概念始终感到费解，难道删除操作能独立于基础结构存在吗？如果基础表上压根没有这个字段，删除字段不就报错了吗？如果一个Delta表示修改基础表中某个字段的类型，难道它能独立于基础表存在吗？如果将它应用到一个压根就没有这个字段的表上，不就报错了吗？

出现这种疑问很正常，因为作为逆元存在的负差量是很难理解的。在科学领域，对于负数的认知也是很晚近的事情。连17世纪微积分的发明人莱布尼兹都在信件中抱怨负数的逻辑基础不牢靠。参见 [负数简史：承认负数是一次思想的飞跃](https://mp.weixin.qq.com/s?__biz=MzU0NDQzNDU1NQ==&mid=2247491026&idx=1&sn=59f777aaabb8a242cac192d4e914b058&chksm=fb7d6dc6cc0ae4d0d7d79282226b7aaac1466e9ff4b43ed45f3e51704e131a1eff94343de8a6&scene=27)

为了认识这一概念，我们首先要区分抽象的逻辑世界，以及我们真实所在的物理世界。在抽象的逻辑世界中，我们可以承认如下定义合法：

```
表A(增加字段A,修改字段B的类型为VARCHAR，删除字段C)
```

即使表A上没有字段B和字段C也不会影响这个定义的合法性。如果接受了这一点，我们就可以证明在表A上应用任何差量运算得到的结果都是这个空间中的合法存在的一个元素（这在数学上称为是封闭律）。

在完全不考虑表A中具有什么字段的前提下，我们在逻辑空间中可以合并多个对表A进行操作的Delta，例如

```
表A(增加字段A,修改字段B的类型为VARCHAR，删除字段C) + 表A(_,修改字段B的类型为INTEGER，_) = 
    表A(增加字段A,修改字段B的类型为INTEGER，删除字段C)  
```

> 这种做法有些类似于函数式语言中的延迟处理。函数式语言中  range(0, Infinity).take(5).take(2)的第一步就无法执行，但实际上take(5)和take(2)可以无视这一点，先行复合在一起，然后再作用到range(0,Infinity)上得到有限的结果。

在一个存在单位元的差量化空间中，全量可以被看作是差量的特例，例如

```
表A(字段A,字段B) = 空 + 表A(增加字段A,增加字段B)
```

那么如何解决在现实中我们无法从不存在字段C的表中执行删除字段C的操作这一难题呢？答案很简单，我们引入一个观测投影算符，规定从逻辑空间投影到物理空间中时自动删除所有不存在的字段。例如

```
表A(增加字段A, 修改字段B的类型为VARCHAR, 删除字段C) ->  表A(字段A)
```

也就是说，如果是修改或者删除操作，但是表A上没有对应的字段，则可以直接忽略这个操作。

这种说法听起来可能有些抽象。具体在Nop平台中的做法如下：

```xml
<entity name="test.MyEntity">
  <columns>
    <column name="fieldB" sqlType="VARCHAR" x:virtual="true" />
    <column name="fieldC" x:override="remove" />
  </columns>
</entity>
```

Nop平台中的Delta合并算法规定，所有的差量合并完毕之后，检查所有具有`x:override="remove"`属性的节点，**自动删除这些节点**。另外，也检查所有具有`x:virtual="true"`的节点，因为合并过程中只要覆盖到基础节点上，就会自动删除x:virtual属性，所以如果最后仍然保留了`x:virtual`属性，就表明合并过程中最终也没有在基础模型中找到对应的节点，那么这些节点也会被自动删除。

> 差量运算的结果所张成的空间是一个很大的空间，我们可以认为它是所有可行的运算所导致的结果空间。但是我们实际能够观测到的物理世界仅仅是这个可行的空间的一个投影结果。这个视角有些类似于量子力学中的波包塌缩的概念：量子态的演化是在一个抽象的数学空间中，但是我们所观测的所有物理事实是波包塌缩以后的结果，也就是说在数学空间中薛定谔的猫可以处在既死又活的量子叠加态中，但是我们实际观测到的物理结果只能是猫死了或者猫活着。

基于可逆计算理论设计的低代码平台NopPlatform已开源：

- gitee: [canonical-entropy/nop-entropy](https://gitee.com/canonical-entropy/nop-entropy)
- github: [entropy-cloud/nop-entropy](https://github.com/entropy-cloud/nop-entropy)
- 开发示例：[docs/tutorial/tutorial.md](https://gitee.com/canonical-entropy/nop-entropy/blob/master/docs/tutorial/tutorial.md)
- [可逆计算原理和Nop平台介绍及答疑\_哔哩哔哩\_bilibili](https://www.bilibili.com/video/BV1u84y1w7kX/)