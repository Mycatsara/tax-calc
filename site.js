// taxtool.kr 공통 스크립트 — 제목 목록 페이지 번호 (2026-09-06)
// 대상: <ol class="post-list archive" data-page-size="10"> 항목이 페이지 크기를 넘으면 아래에 1·2·3 번호를 만든다.
// 주소 ?page=N 으로 페이지를 기억한다. 검색 필터가 켜지면(list:filter 이벤트, active=true) 번호를 숨기고 전부 보여준다.
(function () {
  var ol = document.querySelector('ol.post-list.archive');
  if (!ol) return;
  var items = [].slice.call(ol.children);
  var qs = function (k) { var m = location.search.match(new RegExp('[?&]' + k + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : ''; };
  var size = parseInt(qs('psize'), 10) || parseInt(ol.getAttribute('data-page-size'), 10) || 10; // psize는 점검용
  var pages = Math.ceil(items.length / size);
  if (pages < 2) return;
  var page = Math.min(Math.max(parseInt(qs('page'), 10) || 1, 1), pages);
  var qInput = document.getElementById('q');
  var filtering = !!(qInput && qInput.value.trim()); // ?q=로 들어와 이미 검색 중이면 번호 없이 전부

  var nav = document.createElement('nav');
  nav.className = 'pager';
  nav.setAttribute('aria-label', '목록 페이지');
  ol.parentNode.insertBefore(nav, ol.nextSibling);

  function render() {
    items.forEach(function (li, i) {
      var inPage = i >= (page - 1) * size && i < page * size;
      li.hidden = filtering ? false : !inPage; // 검색 중엔 필터 스크립트가 표시를 맡는다
    });
    nav.hidden = filtering;
    var html = '';
    for (var p = 1; p <= pages; p++) {
      html += p === page
        ? '<span class="cur" aria-current="page">' + p + '</span>'
        : '<a href="?page=' + p + '" data-page="' + p + '">' + p + '</a>';
    }
    nav.innerHTML = html;
  }
  nav.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-page]'); if (!a) return;
    e.preventDefault();
    page = parseInt(a.getAttribute('data-page'), 10);
    try { history.replaceState(null, '', page === 1 ? location.pathname : '?page=' + page); } catch (x) {}
    render();
    ol.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.addEventListener('list:filter', function (e) {
    filtering = !!(e.detail && e.detail.active);
    render();
  });
  render();
})();
