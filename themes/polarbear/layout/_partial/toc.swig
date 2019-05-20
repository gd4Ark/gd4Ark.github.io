{% if toc(page.content) != "" %}
  <div class="toc-wrap">
     <span>目录</span>
    {{ toc(page.content,{
        list_number : false
    }) }}
  </div> 
{% endif %}
