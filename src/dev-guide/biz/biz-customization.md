# �ӿ�����㿴��˷������Ŀ���չ���

�ܶ�ʹ���ƽ̨�ĺ�����ʵ����һ��CRUDģ�ͣ�һ��ͨ�����õ���չ�㣨�������ǰ�������ȣ����ṩһ���Ŀɶ����ԡ�Nopƽ̨��CRUDģ��û���κε������ԣ������õ�CrudBizModel������һ����ͨ��BizModelģ�ͣ���Nopƽ̨�����в�û���κ����CRUD��չ������⴦���ڱ����У��ҽ���CrudBizModelΪ��������һ��Nopƽ̨��ʵ�ֺ�̨����ʱ�ĳ�����չ������

## һ. ͨ���ص������ṩ����ʱ��

CrudBizModel�еĴ󲿷ַ���������������������ϲ㺯�������²��ʵ�ֺ���ʱͨ�������ͻص�������ʵ�ֶ��ơ�

```javascript
    public PageBean<T> findPage(@Optional @Name("query") QueryBean query,
                                FieldSelectionBean selection, 
                                IServiceContext context) {
        return doFindPage0(query, getBizObjName(), prepareQuery, 
                   selection, context);
    }

    @BizAction
    public PageBean<T> doFindPage0(@Name("query") QueryBean query,
                                   @Name("authObjName") String authObjName,
                                   @Name("prepareQuery") BiConsumer<QueryBean, 
                                   IServiceContext> prepareQuery, 
                                   FieldSelectionBean selection,
                                   IServiceContext context) {
         query = prepareFindPageQuery(query, authObjName, 
                     METHOD_FIND_PAGE, prepareQuery, context);                      
        ...
    }
```

findPage������ͨ��`doFindPage0`�������չ�ĺ�����ʵ�֣�`doFindPage0`�ṩ�����������õĲ���

1. **authObjName** : ȱʡ���������ֵ��Ӧ�ڵ�ǰ��ҵ�������(bizObjName)��ָ����ͬ��ֵ�����ڲ�ͬҵ�񳡾���Ӧ�ò�ͬ������Ȩ�޹���������
2. **prepareQuery**: query������Ӧ��ǰ�˴���Ĳ�ѯ��������̨����XMetaģ������У�����в�ѯ�ֶκͲ�ѯ�������������Χ֮�ڡ�prepareQuery�ص�����������ǰ̨�����query�������������Ӷ���Ĳ�ѯ����������������׷�ӵĲ�ѯ��������Ҫ����У�顣

ʹ�ûص������൱�����ṩ��һ�ֻ�����ϵ���չ��ʽ�����Ȼ�����̳кͺ������صķ�ʽҪ������

## ��. ����XMetaԪ����ģ��ͳһ��̬����ģʽ

һ��ĺ�������ֻ�Ǹ���һģһ���Ĵ����߼��������ͨ�������ص��������ṩ���޵���չ�㣬���ܶ�ʱ�򲢲�������ȫһ���Ĵ����߼���**�����ܹ�����ֻ��һ�ִ���ģʽ**�����磬save�����Ļ��������߼����£�

1. ��֤ǰ̨�ύ���ֶ���Ϣ
2. ����֧���߼�ɾ����ʵ�壬��Ҫ����Ƿ���ڱ��Ϊɾ����ʵ��
3. ������ݿ��в������ظ��ļ�¼�����粻�������û�����ͬ�������֤��
4. �����������ݴ���ʵ����󣬶��ڸ��ӵ����ӱ�ṹ��Ҫ�������⴦��

ÿ�ֲ�ͬʵ���save�߼�������ṹ����ȫһ�µģ��������ϸ�ڲ�ͬ������ÿ���ֶε����ͺ�У����򶼲�ͬ�������ֶλ���Ҫִ��ת���߼�����ǰ̨�����ֵת��Ϊ��̨Ҫ��ĸ�ʽ�ȡ���ͬʵ������������Ψһ�Ե��ֶ�Ҳ��ͬ��
��Nopƽ̨��ÿ��ҵ����󶼿��Թ���һ��XMeta�ļ���ͨ�������Զ���ҵ������Ԫ���ݡ�

> XMetaԪ���ݱ�Java��ע��Ҫ��������ǿ����֧��Ԫ��̺��Զ�����չ��ͨ��XDefԪģ���Զ����нṹУ�顣����XMeta�Ľ��ܣ��μ�[xmeta.md](../xlang/xmeta.md)

```java
   public T save(@Name("data") Map<String, Object> data, IServiceContext context) {
        return doSave(data, null, this::defaultPrepareSave, context);
   }

    @BizAction
    public T doSave(@Name("data") Map<String, Object> data, 
                    @Name("inputSelection") FieldSelectionBean inputSelection,
                    @Name("prepareSave") BiConsumer<EntityData<T>, 
                    IServiceContext> prepareSave, 
                    IServiceContext context) {
        if (CollectionHelper.isEmptyMap(data))
            throw new NopException(ERR_BIZ_EMPTY_DATA_FOR_SAVE)
                 .param(ARG_BIZ_OBJ_NAME, getBizObjName());

        // 1. ����XMeta����ʵ������У���ת��
        ObjMetaBasedValidator validator = 
            new ObjMetaBasedValidator(bizObjectManager, bizObj.getBizObjName(),
                objMeta,context, true);

        Map<String, Object> validated = 
              validator.validateForSave(data, inputSelection);

        // 2. ����ORMʵ��ģ�Ͳ����ж��Ƿ������߼�ɾ��
        T entity = recoverLogicalDeleted(data, objMeta);
        boolean recover = true;
        if (entity == null) {
            recover = false;
            entity = dao().newEntity();
        }

        EntityData entityData = new EntityData<>(data, validated, entity, objMeta); 

        // 3. ����XMeta�����õ�Ψһ������ظ���¼
        checkUniqueForSave(entityData);

        // 4. ����XMeta����ȷ����ν����ӱ��������õ��½���ʵ�������
        new OrmEntityCopier(daoProvider, bizObjectManager)
                .copyToEntity(entityData.getValidatedData(),
                    entityData.getEntity(), null, entityData.getObjMeta(), 
                    getBizObjName(), BizConstants.METHOD_SAVE, 
                    context.getEvalScope());

        // 5. ���ʵ���������Ժ���������Ȩ��Ҫ�󣬶Ե�ǰ�û��ɼ�
        checkDataAuth(BizConstants.METHOD_SAVE, entityData.getEntity(), context);

        // 6. ִ�ж���Ķ����߼�
        if (prepareSave != null)
            prepareSave.accept(entityData, context);

        doSaveEntity(entityData, context);

        return entityData.getEntity();
    }
```

Nopƽ̨�ṩ��ͨ�õ�ObjMetaBasedValidator��OrmEntityCopier�����ǿ�������XMetaԪ����ģ���е���Ϣ��**ͳһʵ��**����У���Լ�ʵ����󹹽���

���Ƶķ���Ƶ�����ڸ���ͨ�ô������У�����findTreeEntityPage����XMeta�е�TreeModel�������������Խṹ�Ĳ�ѯ��䡣

ʹ��XMeta����һ���ô���֧��Delta���ơ������ڲ�ͬ��Ӧ���ж���ͬһ��ҵ��������ʹ�ò�ͬ��XMetaģ�ͣ��Ӷ�����ʵ�ʴ�������ݡ����ʹ��ǿ���͵�DTO����ͺ����ڲ��޸Ļ�����ƷԴ��������ʵ���߼����ơ�

**GraphQL�Ķ������������XMeta�Ķ���ṹ�����������Լ��������Ĳ��������������һ�𣬿��Խ��󲿷�CRUD��ص��߼��̻�������һ�㲻��Ҫ��дCRUD��صĴ��룬Ҳ����Ҫ��Բ�ͬ�ĳ������ɴ�������**��ͨ��ͳһ��ʵ�ּ���������������������ֻ��Ҫ��CRUDģ�Ͳ���ƫ���׼CRUD������̵Ĳ�����Ϣ���ɡ�

## ��. ͨ��ǰ׺�����﷨�ھֲ���չ����ģ��

Nopƽ̨�ṩ����һ���������Ա�̷�ʽ(Language Oriented Programming)��Ҳ����˵��Ϊ�˽����ǰ��ҵ�����⣬���ǲ���ֱ��ʹ��ͨ�����ԣ������Ƚ���һ�������ض�����(DSL)��Ȼ�����������ȥ���ҵ���߼���

���ð�DSL�����ر����ظ��ӣ�����ʵֻ��ģ�͵�һ���ı�չ����ʽ��DSL���ı�����ģ�ͻ���ֻҪ���Ƕ�ҵ�����⽨����һ������ģ�ͣ�Ȼ��Ϊ��ѡ��һ���ı������ʽ��������Ȼ��Ϊ��һ��DSL��

��ǰ��˷����΢����ı����£�ǰ�˺ͺ��֮�䡢��˷���֮������н�����Ҫͨ�����л���Ķ������ݡ������������������Ϲ�£��صĹ��ܣ�����ֻ��¶���������ȵķ���ӿڣ���ô�������ӿڵĲ������൱����ĳ��DSL��

**���������Կ�����ĳ��ִ��DSL�������������Ĳ�����ͬ��ָ�������ִ�в�ͬ�Ĵ����߼�**���ٸ���������ӣ�CrudBizModel���ṩ��findPage/findList��ͨ�ò�ѯ���������������յĲ�ѯ��������QueryBean�Ϳ��Կ�����һ��DSL�������������һ�����Ӷ���ṹ����ϲ�ѯ������

```
POST /r/NopAuthDept__findPage

{
   "query": {
      "filter": {
          "$type": "or",
          "$body": [
             {
                "$type": "eq",
                "name": "status",
                "value": 1
             },
             {
                "$type": "gt",
                "name": "parent.status",
                "value": 2
             }
          ]
      },
      "orderBy":[
         {
           "name": "status",
           "desc" : false
         }
      ]
   }
}
```

query�����ں�̨��Ӧ��QueryBean�ṹ������һ��ͨ�õĲ�ѯģ�ͣ�������XML��ʽ��JSON��ʽ֮������ת����

```xml
<query>
  <filter>
     <or>
       <eq name="status" value="1" />
       <gt name="parent.status" value="2" />
     </or>
  </filter>
  <orderBy>
     <field name="status" desc="false" />
  </orderBy>
</query>
```

ͨ��QueryBean��ѯģ�ͣ����ǿ��Ա�����Ƕ��and/or��ϵ�ĸ��Ӳ�ѯ���������ҽ�����NopORM����Ĺ�����ѯ���������ǿ���ͨ��`parent.status`���ָ��������﷨���Զ�ʵ�����ӱ������ѯ��

> һ�������ͨ��һ��ͳһ��findPage������������ɸ���ҵ���ѯ������Ҫ������д�����Ĳ�ѯ����������ͨ��XMetaģ����������Щ�ֶ��ܹ�֧����Щ��ѯ����������һ���ܲ�ѯ�����ֶεȣ���ֹǰ�˹��츴�Ӳ�ѯ�γɾܾ����񹥻���

**ÿ��ģ�Ͷ��ǿ��Կ�����һ��DSL����ͬһ��DSL�ڲ�ͬ��Ӧ�ó����¿����ò�ͬ�Ľ�����ȥ��������**����Ȼ����QueryBeanģ��Ϊ�������ǿ��Խ���ת��ΪSQL����͵����ݿ���ִ�У�Ҳ���Խ�������Ϊ�ڴ������е�Predicate�����������������ʹ��QueryBeanģ������︴���ж���������ǰ̨��ҵ�������������Ը���DSL�������Զ����ɿ��ӻ�չ�ֺͱ༭���ߵȡ�

![](../rule/images/rule-model.png)

Nopƽ̨�����˴���DSL�������ṩ�˸��ֱ���任�ֶΣ�����ÿ��DSL���Զ�����Excel���������̿���ͨ��Excel������֧��DSL֮����޷�Ƕ�롣��ʹ����������һ���ҵ�񿪷���ʱ�򲢲���Ҫ�����µ�DSL��
�����Ⲣ����ζ������ֻ��ʹ��Nopƽ̨���õ�ģ�����塣Nopƽ̨�����е�ģ����ʵ��ִ��֮ǰ���ᾭ�����ģ�ͱ任����������������ǿ��������Լ���DSL�﷨������򣬴Ӷ�Ϊ���е�DSLģ�������µ���չ���塣

һ����Nopƽ̨�г��õļ�����ʹ��ǰ׺�����﷨��������˵��������һ���ر��ǰ׺������`@filter:`��ͨ����**��һ��ֵ��ǿΪһ�����Ա���������ǿ������ṹ**��

> ����ǰ׺�����﷨����ϸ���ܣ��μ��ҵ����� [DSL�ֲ��﷨��Ƽ�ǰ׺�����﷨](https://zhuanlan.zhihu.com/p/548314138)

���������ĺô��ǿ��Ի�����֤ԭ��DSLģ�͵�������ʽ���䣬���ھֲ�������չ���Ӷ����Ժ��������﷨�ṹ�����һ��

�����������һ������Ĳ�ѯ����ϣ���ܹ��Լ��ķ�ʽ���˵��Ѿ���ѡ�еļ�¼����һ�������ʹ��ǰ׺�����﷨��ʾΪ

```xml
<notIn name="id" value="@filter:selectedItemIds" />
```

CrudBizModel�����еĲ�ѯ��������Ӧ��ȫ�ֵ�IQueryTransformerת������

```java
public interface IQueryTransformer {
    void transform(QueryBean filter, String authObjName, String action,
                   IBizObject bizObj, IServiceContext context);
}
```

�����һ����XMeta�����������ǿ���ͨ��bizObj��ȡ��XMeta�е���չ������Ϣ���Ӷ�����`@filter:`ǰ׺����ı��ʽ��ν��͡�һ�ֿ��е�������ֱ�ӽ���ӳ��Ϊĳ��Xplģ���ǩ��Ȼ�������Ӳ�ѯ�����߶�̬��ȡ����Ӧ�����ݼ��ϡ�

## ��. ͨ��XBizģ�����ӷ�����

Nopƽ̨���߼���ȫ����֯�ṹ����㷺��������Docker������Ƭ�ķֲ���ӽṹ�����ں�̨������ԣ�Nopƽ̨�������ǽ�ҵ�����BizObject�ֽ�Ϊ���в�ͬ���ȼ��Ķ����Ƭ��

![](gather-and-scatter.png)

������˵��Java��д��CrudBizModel���Կ�����һ����������Ϊ��Ƭ��������ProCodeģʽ������ÿ��ҵ�������һ����Ե�XBizģ���ļ���XML��ʽ�������൱����һ����չBizModel��DSL���ԣ�
���������ǿ���ʹ��XML�﷨������ҵ�񷽷���XBizģ���൱����һ�����ȼ����ߵ���Ϊ��Ƭ���������ڵײ��CrudBizModel֮�ϡ������XBizģ���ж�����ͬ���ķ��񷽷������ֱ�Ӹ���Java�е�ʵ�֡����û�����������Ϊҵ���������ҵ�񷽷����ڸ��ϲ㣬�������޴�����ģʽ������Ķ�̬��Ϊ��Ƭ�������Ա��������ݿ��ĳ����̬ģ�Ͷ�����У���������ʱ���Զ����ط���Ϊ�����ļ�ϵͳ�е�һ��ģ���ļ���Ȼ�����������ļ�ϵͳ��Delta���ƻ��Ƹ���ԭ�е�XBiz�ļ���

```xml
<biz x:schema="/nop/schema/biz/xbiz.xdef" xmlns:x="/nop/schema/xdsl.xdef"
     x:extends="_NopAuthUser.xbiz" xmlns:bo="bo" xmlns:c="c">

    <actions>
        <query name="active_findPage" x:prototype="findPage">

            <source>
                <c:import class="io.nop.auth.api.AuthApiConstants" />

                <bo:DoFindPage query="${query}" selection="${selection}" xpl:lib="/nop/biz/xlib/bo.xlib">
                    <filter>
                        <eq name="status" value="${AuthApiConstants.USER_STATUS_ACTIVE}" />
                    </filter>
                </bo:DoFindPage>
            </source>
        </query>
    </actions>
</biz>
```

* XBizģ�Ϳ���ͨ��ͨ�õ�`x:extends`�﷨���̳����е�ģ���ļ����ߴ����������Զ����ɵ�ģ���ļ���
* ��`<source>`�������ǿ���ʹ��Xplģ�������е��Զ����ǩ��ʵ���Զ����װ��**Xplģ�������ṩ����ʽ�����ͱ����ڱ任�Ȼ��ƣ�����ʵ�ֱ�һ��������Ը����������ض����**��

����`bo.xlib`��ǩ���ṩ�˶���CrudBizModel��`doFindPage/doFindList`�Ⱥ����ķ�װ��

```xml
<source>
    <bo:DoFindPage bizObjName="NopAuthUser" xpl:lib="/nop/biz/xlib/bo.xlib" selection="items{name,status}">
       <filter>
          <c:if test="${xxx}">
             <eq name="status" value="1" />
          </c:if>  

          <!--����ʹ�ø����ı�﷽ʽ -->
          <eq name="status" value="1" xpl:if="xxx" />
       </filter>
    </bo:DoFindPage>
</source>
```

* `<bo:DoFindPage>`��ǩ���ָ����`bizObjName`�����ͻ����ָ��ҵ������ϵķ������������õ�ǰ�������е�`thisObj`�����ϵķ�����
* ���ָ����selection����������ڻ�ȡ��ʵ�����֮���Զ�����`dao.batchLoadSelection(entityList,selection)`������������������ָ�������ԣ������������ʱ��������ӳټ���Ӱ�����ܡ�
* `<bo:DoFindPage>`��ǩ��filter�ӽڵ㱾�������ṩ�˵�һ�����ᵽ��`doFindPage`������`prepareQuery`�ص��������������ʹ��Xplģ����������̬���ɲ�ѯ������

�����ǩ�е�bizObjName���Ժ�selection���Եľ���ʵ�ַ�ʽ������˼�����Ƕ���������Xpl�Զ����ǩ�ı�����ת��������ʵ�֡�

```xml
 <DoFindPage>
    <attr name="query" optional="true" type="io.nop.api.core.beans.query.QueryBean"/>
    <attr name="authObjName" optional="true" type="String" />
    <attr name="selection" optional="true" type="io.nop.api.core.beans.FieldSelectionBean"/>
    <attr name="bizObjName" optional="true" />
    <attr name="thisObj" implicit="true" type="io.nop.biz.api.IBizObject"/>
    <attr name="svcCtx" implicit="true" type="io.nop.core.context.IServiceContext"/>


    <transform>
         <c:script><![CDATA[
            const bizObjName = node.attrText('bizObjName');
            if(bizObjName != null){
               $.checkArgument(bizObjName.$isValidSimpleVarName(),"bizObjName");
               node.setAttr(node.attrLoc('bizObjName'),'thisObj', "${inject('nopBizObjectManager').getBizObject('" +bizObjName+"')}");
            }
            const selection = node.attrText('selection');
            if(selection and !selection.contains('${')){
                node.setAttr(node.attrLoc('selection'),'selection', "${selection('"+selection+"')}");
            }
        ]]></c:script>
    </transform>
    <source>
      ...
    </source>
</DoFindPage>        
```

�ڱ����ڷ�����bizObjName����selection�����ǿգ����Զ�������ת��Ϊ���ʽ

```xml
<bo:DoFindPage thisObj="${inject('nopBizObjectManager').getBizObject('NopAuthUser')}"
    selection="${selection('items{name,status}')}">
  ...
</bo:DoFindPage>
```

* selection������һ��ȫ�ֺ꺯���������ڱ����ڽ����Լ��Ĳ�������ת��Ϊһ��`FieldSelectionBean`������������ֱ��ʹ�ý����õĽ���������ظ�������

* �����ʹ��Java����ȥʵ��ͬ���������Ƚϣ��������Է���Xpl��ǩ�ڵ��õ�ʱ����Ӽ�࣬���Ա����ظ������Щ�����Զ��Ƶ���������Ϣ��

* ��������һ�����Ҫ��� "ָ����bizObjName�����͵���ָ�����󣬷���͵���thisObj��ǰ����"��һ�߼���α������ǲ���Ҫʹ��thisObj��ʱ���ܷ���DSL��������ȫ������һ���

## ��. ͨ��Ԫ�����ǿXBizģ��

һ������XBiz������DSLģ���ļ����Ϳ�������ʩչ��׼����Ԫ�����·��ΪDSLģ�����������Զ�����չ�����磬��XBiz�ļ��У����ǿ���ͨ�����·�ʽ�����߼�����֧�֡�

```xml
<biz>
  <x:post-extends>
    <biz-gen:TaskFlowSupport xpl:lib="/nop/core/xlib/biz-gen.xlib"/>
  </x:post-extends>

  <actions>
    <mutation name="callTask" task:name="test/DemoTask"/>
  </actions>
</biz>
```

* `x:post-extends`��ģ�ͽ����ı������Զ�ִ�У�ͨ��`<biz-gen:TaskFlowSupport>`��ǩ���Զ��Ծ���`task:name`�ĺ����ڵ���б任���Զ����ɵ���TaskFlowManager�Ĵ��롣

* ���ǿ���ʹ�ÿ��ӻ����߼���������������`Task`��Ȼ����XBizģ����ֻҪΪ������ָ������������`task:name`���ɡ�

��ϸ�Ľ��ܲμ� 

* [ͨ��NopTaskFlow�߼�����ʵ�ֺ�̨������](../workflow/task-flow-for-biz.md)

* [XDSL��ͨ�õ������ض��������](https://zhuanlan.zhihu.com/p/612512300)


