$(function(){

    var hotSwap = function(page, pushSate){
        if (pushSate) history.pushState(null, null, '/' + page);
        $('.pure-menu-selected').removeClass('pure-menu-selected');
        $('a[href="/' + page + '"]').parent().addClass('pure-menu-selected');
        $.get("/get_page", {id: page}, function(data){
            $('main').html(data);
        }, 'html')
    };

    $('.hot-swapper').click(function(event){
        if (event.which !== 1) return;
        var pageId = $(this).attr('href').slice(1);
        hotSwap(pageId, true);
        event.preventDefault();
        return false;
    });

    window.addEventListener('load', function() {
        setTimeout(function() {
            window.addEventListener("popstate", function(e) {
                hotSwap(location.pathname.slice(1));
            });
        }, 0);
    });

    window.statsSource = new EventSource("/api/live_stats");

});

/* ================= bMine dark mode (site-wide) =================
   Runs from <head> on every page: applies the saved theme before
   first paint (no flash), then adds a Dark/Light toggle to the
   header menu. The header survives page hot-swaps, so the toggle
   is always available. Class goes on <html> and is mirrored to
   <body> so page-scoped dark styles (stats page) keep working. */
(function () {
    'use strict';

    var KEY = 'bmDark';

    function isDark() {
        try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
    }

    function apply(on, save) {
        document.documentElement.classList.toggle('bmDark', on);
        if (document.body) document.body.classList.toggle('bmDark', on);
        if (save) {
            try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
        }
        var btn = document.getElementById('bmDarkNavToggle');
        if (btn) {
            btn.innerHTML = on
                ? '<i class="fas fa-sun fa-fw"></i> <span>Light</span>'
                : '<i class="fas fa-moon fa-fw"></i> <span>Dark</span>';
        }
    }

    /* pre-paint apply — this file loads in <head>, so no visual flash */
    apply(isDark(), false);

    document.addEventListener('DOMContentLoaded', function () {
        var ul = document.querySelector('header .pure-menu-list');
        if (ul && !document.getElementById('bmDarkNavToggle')) {
            var li = document.createElement('li');
            li.className = 'pure-menu-item';
            li.innerHTML = '<a class="pure-menu-link" id="bmDarkNavToggle" href="#" title="Toggle dark mode"></a>';
            ul.appendChild(li);
            li.firstChild.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                apply(!document.documentElement.classList.contains('bmDark'), true);
            });
        }
        /* sync icon + body class now that DOM exists */
        apply(isDark(), false);
    });
})();
