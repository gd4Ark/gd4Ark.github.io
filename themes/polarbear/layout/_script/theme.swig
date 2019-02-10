<script type="text/javascript" src="{{ url_for('js/src') }}/theme.js?v={{ theme.version }}"></script>
<script type="text/javascript" src="{{ url_for('js/src') }}/bootstrap.js?v={{ theme.version }}"></script>

<!--prettify代码高亮脚本引入-->
{% if config.prettify.enable %}
    <script src="/plugins/prettify/prettify.js"></script>
    <script type="text/javascript">
    jQuery(function($){
        $('pre').addClass('prettyprint');
        prettyPrint();
    });
    </script>
{% endif %}

<!--百度统计-->
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?b733e1eaeacbf8f87d3be047f28c3973";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
</script>
