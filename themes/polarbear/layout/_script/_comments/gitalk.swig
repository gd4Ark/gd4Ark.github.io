{% if theme.gitalk.enable %}

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.css">
    <script src="https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js"></script>

    {% set owner = theme.gitalk.owner %}
    {% set repo = theme.gitalk.repo %}
    {% set cid = theme.gitalk.client_id %}
    {% set cs = theme.gitalk.client_secret %}
    {% set admin = theme.gitalk.admin %}
    {% set dfm = theme.gitalk.distractionFreeMode %}

    <div id="gitalk-container"></div>

    <script>
        var gitalk = new Gitalk({
            clientID: '{{cid}}',
            clientSecret: '{{cs}}',
            repo: '{{repo}}',
            owner: '{{owner}}',
            admin: '{{admin}}',
            id: location.pathname,      // Ensure uniqueness and length less than 50
            distractionFreeMode: '{{dfm}}'  // Facebook-like distraction free mode
        })

        gitalk.render('gitalk-container')
    </script>

{% endif %}