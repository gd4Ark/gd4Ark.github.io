<div class="site-header-inner">
    <h1 class="site-title">
        <a href="{{ url_for('.') }}" class="logo">{{ config.title }}</a>
    </h1>

    <nav id="nav-top">
        {% if theme.menu %}
            <ul id="menu-top" class="nav-top-items">
                {% for name, path in theme.menu %}
                    {% if  path + "/index.html" === url_for(page.path)  %}
                        <li class="menu-item active">
                    {% else %}
                        <li class="menu-item">
                    {% endif %}
                        <a href="{{ url_for(path) }}">
                            {% set itemName = 'menu.' + name.toLowerCase() %}
                            {% if itemName.startsWith('menu') %}
                                {{ name }}
                            {% else %}
                                {{ __(itemName) }}
                            {% endif %}
                        </a>
                    </li>
                {% endfor %}
            </ul>
        {% endif %}
  </nav>
</div>
