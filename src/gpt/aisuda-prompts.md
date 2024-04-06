�������ֳ����ɱ������ֶεȶ�����֣�����few-shot��ʾ��ʽ

```
���룺����һ�� ��̳ ϵͳ��Ҫ��Щ���ݿ�� 
������û���/user�����ӱ�/post�������/category��֪ͨ��/notificatoin�������/group

���룺����һ�� ���� ϵͳ��Ҫ��Щ���ݿ�� 
��������±�/article�������/category����ǩ��/tag�����۱�/commont���û���/user

���룺����һ�� IT���� ϵͳ��Ҫ��Щ���ݿ�� 
������ʲ���/asset�����ű�/department���û���/user�������/catetory��λ�ñ�/location����˾��/company

���룺����һ�� {system} ϵͳ��Ҫ��Щ���ݿ�� 
�����
```


```
���ݿ����������¼��֣�int��text��datetime��decimal��float

���룺����һ�� ���� ϵͳ�� ���±� ��Ҫ��Щ���ݿ��ֶμ����ͣ�
�����id/int��title/text��content/text��publish_date/datetime��tag_id/int

���룺����һ�� ��ѧ ϵͳ�� ѧ���� ��Ҫ��Щ���ݿ��ֶμ����ͣ�
�����id/int��name/text��age/int��gender/text��class_id/int

���룺����һ�� {system} �� {table} ��Ҫ��Щ���ݿ��ֶμ����ͣ�
�����
```

Chain of Thought
��ʾ�ʵ�ʾ���а���һ�����������
Self-Consistency
�� Chain of Thought ���������ɶ���𰸣��������Ӷ���
Tree of Thoughts
ÿ�����ɶ�������ÿ�������ȡ������õ�ǰ������һ�����ɣ����� Beam Search
Least-to-Most
��һ�������ô�ģ�ͽ������ֳ������⣬��To solve xxx, we need to first solve: ��
�ڶ������ֱ��ô�ģ��ȥ�����Щ�����⣬��������Ľ�������ʾ���У����ʼ������
Generated Knowledge Prompting
��ģ�������ɹ�����������֪ʶ�㣬��ȥ�ش�����
Automatic Prompt Engineer
��ģ�����ɺ�����������Ƶ����⣬Ȼ��������Щ�����ĸ����ã���ȥ��ģ�ͣ��൱���ô�ģ���Ȱ�æ�Ż�һ����ʾ��


Framerͨ�� TypeScript ������ָ�� GPT �ķ��ظ�ʽ���ֶ�Ҫ��

```
/** Image keys that are available for use. */
type ImageKey = "single_object" | "sky" | "forest" | "close_up_of_plant" | "silhouette_female" 

type Section =
// A heading with four images under it
  | { id: "gallery"; galleryTitleMax3Words: string; picture1: ImageKey; picture2: }
// A big heading with a smaller text next to it
  | { id: "generic_text_1"; heading: string; paragraph: string }
// A small category/label followed by a big text (a sentence or so)
  | { id: "generic_text_2"; labelOrCategory: string; shortSentence: string }
// Title and description, next to it is a list of four items with years
  | { id: "text_list"; sectionTitle: string; sectionParagraph: string; listTitle: string; item1Title: string; }
// Has 3 differently priced plans in format $4.99/mo etc

interface Page {
/** Several sections with the content that will appear on the page (top to bottom). */
sections: Section[]
}
```


��Ԥѵ���׶���������Ŀ��ֱ���һ���ı�ȥ�����һ�� token ��ȥ����һ�� token�����������ǡ�Once upon a time�������Ŀ���ǡ�upon a time in����������ָ��΢���������ǽ�ָ���������������������ǽ�ָ��ָĳ�һ������ֵ���ڼ��� loss ��ʱ������
�����ڷ��򴫲���ʱ���ֻ�д𰸲�����㡣

```
def preprocess(
    sources: Sequence[str],
    targets: Sequence[str],
    tokenizer: transformers.PreTrainedTokenizer,
) -> Dict:
    """Preprocess the data by tokenizing."""
    examples = [s + t for s, t in zip(sources, targets)]
    examples_tokenized, sources_tokenized = [_tokenize_fn(strings, tokenizer) for strings in (examples, sources)]
    input_ids = examples_tokenized["input_ids"]
    labels = copy.deepcopy(input_ids)
    for label, source_len in zip(labels, sources_tokenized["input_ids_lens"]):
        label[:source_len] = IGNORE_INDEX
    return dict(input_ids=input_ids, labels=labels)
```