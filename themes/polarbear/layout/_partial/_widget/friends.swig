{% if theme.widget.Friends %}
    <section id="friends" class="widget-area widget_friends">
        <h3 class="widget-title">{{ __('menu.friends') }}</h3>
        <ul class="friend-list">
        {% for title,link in theme.friend_list %}
            <li class="friend-list-item">
                <a href="{{ link }}" target="_blank" class="friend-list-link">{{ title }}</a>
            </li>
        {% endfor %}
        </ul>
    </section>
{% endif %}
