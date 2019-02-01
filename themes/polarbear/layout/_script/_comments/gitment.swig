{% if theme.gitment.enable %}

    {% if theme.gitment.lazy %}
        <div onclick="showGitment()" id="gitment-display-button">{{  __('gitmentbutton') }}</div>
        <div id="gitment-container" style="display:none"></div>
    {% else %}
        <div id="gitment-container"></div>
    {% endif %}

    {% set owner = theme.gitment.owner %}
    {% set repo = theme.gitment.repo %}
    {% set cid = theme.gitment.client_id %}
    {% set cs = theme.gitment.client_secret %}
    <script src="https://cdn.jsdelivr.net/gh/theme-next/theme-next-gitment@1/gitment.browser.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/theme-next/theme-next-gitment@1/default.css"/>
    {% if theme.gitment.lazy %}
        <script type="text/javascript">
            function showGitment(){
                document.getElementById("gitment-display-button").style.display = "none";
                document.getElementById("gitment-container").style.display = "block";
                var gitment = new Gitment({
                        id: window.location.pathname, 
                        owner: '{{owner}}',
                        repo: '{{repo}}',
                        oauth: {
                            client_id: '{{cid}}',
                            client_secret: '{{cs}}',
                        }});
                gitment.render('gitment-container');
            }
        </script>
    {% else %}
        <script type="text/javascript">
            var gitment = new Gitment({
                    id: window.location.pathname, 
                    owner: '{{owner}}',
                    repo: '{{repo}}',
                    oauth: {
                        client_id: '{{cid}}',
                        client_secret: '{{cs}}',
                    }});
            gitment.render('gitment-container');
        </script>
    {% endif %}
{% endif %}