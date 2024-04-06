#!/bin/bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# ����Ҫ�ϲ���Ŀ¼·��
source_dir="."
# ��������ļ���·��
output_file="merged.md"
# ����ָ��е�����
separator="   "

cat << EOF > "$output_file"
---
CJKmainfont: KaiTi
---

EOF

# �ݹ����Ŀ¼���ϲ�Markdown�ļ�
function merge_markdowns() {
    # ������ļ�

    # ����Ŀ¼
    for file in $(find "$source_dir" -type f -name "*.md"); do
        # ��ȡMarkdown�ļ����ݲ���ӵ�����ļ�
        cat "$file" >> "$output_file"
        # ��ӷָ���
        echo "$separator" >> "$output_file"
    done
}
# ���ú���ִ�кϲ�����
merge_markdowns

#iconv -f gbk -t utf-8 merged.md > merged-utf8.md

#pandoc --pdf-engine=xelatex merged.md -o nop.docx  -s

