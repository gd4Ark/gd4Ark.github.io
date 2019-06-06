{% if toc(page.content) != "" %}
  <div class="toc-container">
    {{ toc(page.content,{
        list_number : false
    }) }}
  </div> 
{% endif %}
